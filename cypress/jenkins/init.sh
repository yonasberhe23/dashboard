#!/bin/bash

set -x
set -e

if cat /etc/os-release | grep -iq "Alpine Linux"; then
 apk update && apk add --no-cache gcompat g++ make
fi

OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=amd64;;
    Darwin*)    MACHINE=darwin-amd64;;
esac

case "${MACHINE}" in
 amd64*)        GOLANG_PGK_SUFFIX=linux-amd64 ;;
 darwin-amd64*) GOLANG_PGK_SUFFIX=darwin-amd64 ;;
esac

GO_DL_URL="https://go.dev/dl" 
GO_DL_VERSION="${GO_DL_VERSION:-1.20.5}"
GO_PKG_FILENAME="go${GO_DL_VERSION}.${GOLANG_PGK_SUFFIX}.tar.gz"
GO_DL_PACKAGE="${GO_DL_URL}/${GO_PKG_FILENAME}"
DASHBOARD_REPO="${DASHBOARD_REPO:-rancher/dashboard.git}"
DASHBOARD_BRANCH="${DASHBOARD_BRANCH:-master}"
GITHUB_URL="https://github.com/"
RANCHER_TYPE="${RANCHER_TYPE:-local}"
RANCHER_HELM_REPO="${RANCHER_HELM_REPO:-latest}"
HELM_VERSION="${HELM_VERSION:-3.13.2}"
NODEJS_VERSION="${NODEJS_VERSION:-14.19.1}"
CYPRESS_VERSION="${CYPRESS_VERSION:-13.2.0}"
YARN_VERSION="${YARN_VERSION:-1.22.19}"
KUBECTL_VERSION="${KUBECTL_VERSION:-v1.29.8}"
YQ_BIN="mikefarah/yq/releases/latest/download/yq_linux_amd64"

mkdir -p "${WORKSPACE}/bin"
wget "${GITHUB_URL}${YQ_BIN}" -O "${WORKSPACE}/bin/yq"
chmod +x "${WORKSPACE}/bin/yq"

curl -L -o "${GO_PKG_FILENAME}" "${GO_DL_PACKAGE}"
tar -C "${WORKSPACE}" -xzf "${GO_PKG_FILENAME}"

curl -sSL https://raw.githubusercontent.com/parleer/semver-bash/latest/semver -o semver
chmod +x semver
mv semver "${WORKSPACE}/bin"

# Install Ansible and dependencies
# Check if Ansible is already installed
if ! command -v ansible-playbook &> /dev/null; then
    echo "Installing Ansible..."
    python3 -m pip install --user ansible kubernetes || python3 -m pip install --break-system-packages ansible kubernetes
    export PATH="${HOME}/.local/bin:${PATH}"
fi

# Install Ansible collections
ansible-galaxy collection install cloud.terraform kubernetes.core || true

ls -al "${WORKSPACE}"
export PATH=$PATH:"${WORKSPACE}/go/bin:${WORKSPACE}/bin"
export GOROOT="${WORKSPACE}/go"
echo "${PATH}"

ls -al "${WORKSPACE}/go"
go version

if [[ ! -d "${WORKSPACE}/.ssh" ]]; then mkdir -p "${WORKSPACE}/.ssh"; fi
export PRIV_KEY="${WORKSPACE}/.ssh/jenkins_ecdsa"

if [ -f "${PRIV_KEY}" ]; then rm "${PRIV_KEY}"; fi
ssh-keygen -t ecdsa -b 521 -N "" -f "${PRIV_KEY}"
ls -al "${WORKSPACE}/.ssh/"

create_initial_clusters() {
  shopt -u nocasematch
  # Initialize variables
  RANCHER_IMAGE="${RANCHER_IMAGE:-rancher/rancher}"
  ENV_VAR_MAP="${ENV_VAR_MAP:-}"
  RANCHER_CHART_URL_FINAL="${RANCHER_CHART_URL_FINAL:-}"
  
  if [[ -n "${RANCHER_IMAGE_TAG}" ]]; then
    TARFILE="helm-v${HELM_VERSION}-linux-amd64.tar.gz"
    curl -L -o "${TARFILE}" "https://get.helm.sh/${TARFILE}"
    tar -C "${WORKSPACE}/bin" --strip-components=1 -xzf "${TARFILE}"
    if [[ -n "${RANCHER_HELM_REPO}" ]]; then
      if [[ "${RANCHER_HELM_REPO}" == "prime" ]]; then
        RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
        helm repo add rancher-prime "${RANCHER_CHART_URL}"
        helm repo update
        RANCHER_IMAGE="registry.suse.com/rancher/rancher"
        ENV_VAR_MAP='["CATTLE_AGENT_IMAGE|registry.suse.com/rancher/rancher-agent:'${RANCHER_IMAGE_TAG}', RANCHER_PRIME|true, CATTLE_UI_BRAND|suse"]'
      elif [[ "${RANCHER_HELM_REPO}" == "optimus_prime" ]]; then
        RANCHER_HELM_REPO=optimus
        RANCHER_CHART_URL=https://charts.optimus.rancher.io/server-charts/latest
        helm repo add rancher-optimus "${RANCHER_CHART_URL}"
        helm repo update
        RANCHER_IMAGE="stgregistry.suse.com/rancher/rancher"
        ENV_VAR_MAP='["CATTLE_AGENT_IMAGE|stgregistry.suse.com/rancher/rancher-agent:'${RANCHER_IMAGE_TAG}', RANCHER_PRIME|true, CATTLE_UI_BRAND|suse"]'
      elif [[ "${RANCHER_HELM_REPO}" == "alpha" ]]; then
        RANCHER_CHART_URL=https://releases.rancher.com/server-charts/alpha
        helm repo add rancher-alpha "${RANCHER_CHART_URL}"
        helm repo update
      elif [[ "${RANCHER_HELM_REPO}" == "stable" ]]; then
        RANCHER_CHART_URL=https://releases.rancher.com/server-charts/stable
        helm repo add rancher-stable "${RANCHER_CHART_URL}"
        helm repo update
      else
        RANCHER_CHART_URL=https://releases.rancher.com/server-charts/latest
        helm repo add rancher-latest "${RANCHER_CHART_URL}"
        helm repo update
      fi
      if [[ "${RANCHER_HELM_REPO}" == "optimus" ]]; then
        RANCHER_CHART_URL_FINAL="${RANCHER_CHART_URL}"
      else
        RANCHER_CHART_URL_FINAL=$(echo "${RANCHER_CHART_URL}" | grep -o '.*server-charts')
      fi
    fi
    version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
    if [[ "${RANCHER_IMAGE_TAG}" == "head" ]]; then
      RANCHER_VERSION=$(helm search repo "rancher-${RANCHER_HELM_REPO}" --devel --versions | sed -n '1!p' | head -1 | cut -f2 | tr -d '[:space:]')
    else
      RANCHER_VERSION=$(helm search repo "rancher-${RANCHER_HELM_REPO}" --devel --versions | grep "${version_string}" | head -n 1 | cut -f2 | tr -d '[:space:]')
    fi
  fi
  
  # Generate random prefix for hostnames
  prefix_random=$(cat /dev/urandom | env LC_ALL=C tr -dc 'a-z0-9' | fold -w 8 | head -n 1)
  
  if [[ "${JOB_TYPE}" == "recurring" ]]; then
    RANCHER_HOST="jenkins-${prefix_random}.${AWS_ROUTE53_ZONE}"
  fi
  
  # Note: Custom nodes and import cluster creation will be handled by Ansible playbook
  # The Ansible playbook will use the variables set in the vars file to create these resources
  export CREATE_INITIAL_CLUSTERS_FLAG="yes"
  export RANCHER_IMAGE
  export ENV_VAR_MAP
  export RANCHER_CHART_URL_FINAL
  export prefix_random
  export RANCHER_HOST
  export RANCHER_VERSION
}

if [[ "${JOB_TYPE}" == "recurring" ]]; then 
  RANCHER_TYPE="recurring"
  create_initial_clusters
fi

if [[ "${JOB_TYPE}" == "existing" ]]; then
  RANCHER_TYPE="existing"
  shopt -s nocasematch
  if [[ "${CREATE_INITIAL_CLUSTERS}" == "yes" ]]; then
    create_initial_clusters
  fi
  shopt -u nocasematch
fi

echo "Rancher type: ${RANCHER_TYPE}"

# Set default RANCHER_VERSION if not already set
RANCHER_VERSION="${RANCHER_VERSION:-v2.10.3}"

if semver lt "${RANCHER_VERSION}" "2.9.99" && [[ "${RANCHER_IMAGE_TAG}" != "head" ]]; then NODEJS_VERSION="16.20.2"; fi

# Disable vai where it doesn't exist or is turn off by default
case "${RANCHER_IMAGE_TAG}" in
    "v2.7-head" | "v2.8-head" | "v2.9-head" )
        CYPRESS_TAGS="${CYPRESS_TAGS}+-@noVai"
        ;;
    *)
esac

# === ANSIBLE SECTION ===
# Set kubeconfig file path (required by playbook)
KUBECONFIG_FILE="${KUBECONFIG_FILE:-${WORKSPACE}/kubeconfig.yaml}"

# Generate Ansible vars file from environment variables
cat > "${WORKSPACE}/ansible-vars.yaml" <<EOF
# Generated by init.sh from dashboard repo
job_type: ${JOB_TYPE:-recurring}
rancher_type: ${RANCHER_TYPE:-local}
rancher_version: ${RANCHER_VERSION:-v2.10.3}
rancher_image_tag: ${RANCHER_IMAGE_TAG:-}
rancher_image: ${RANCHER_IMAGE:-rancher/rancher}
rancher_hostname: ${RANCHER_HOST:-}
rancher_bootstrap_password: ${BOOTSTRAP_PASSWORD:-password}
rancher_password: ${RANCHER_PASSWORD:-password}
rancher_username: ${RANCHER_USERNAME:-}
rancher_chart_repo: ${RANCHER_HELM_REPO:-latest}
rancher_chart_url: ${RANCHER_CHART_URL_FINAL:-}
env_var_map: ${ENV_VAR_MAP:-}
kubeconfig_file: ${KUBECONFIG_FILE}
k3s_kubernetes_version: ${K3S_KUBERNETES_VERSION:-v1.32.1+k3s1}
cert_manager_version: ${CERT_MANAGER_VERSION:-1.13.0}
dashboard_repo: ${DASHBOARD_REPO:-rancher/dashboard.git}
dashboard_branch: ${DASHBOARD_BRANCH:-master}
nodejs_version: ${NODEJS_VERSION:-14.19.1}
yarn_version: ${YARN_VERSION:-1.22.19}
cypress_version: ${CYPRESS_VERSION:-13.2.0}
kubectl_version: ${KUBECTL_VERSION:-v1.29.8}
cypress_tags: ${CYPRESS_TAGS:-@adminUser}
chrome_version: ${CHROME_VERSION:-}
workspace_path: ${WORKSPACE}
go_version: ${GO_DL_VERSION}
create_initial_clusters: ${CREATE_INITIAL_CLUSTERS_FLAG:-${CREATE_INITIAL_CLUSTERS:-no}}
server_count: ${SERVER_COUNT:-3}
agent_count: ${AGENT_COUNT:-0}
# Cloud provider credentials
aws_access_key_id: ${AWS_ACCESS_KEY_ID:-}
aws_secret_access_key: ${AWS_SECRET_ACCESS_KEY:-}
aws_ssh_user: ${AWS_SSH_USER:-ubuntu}
aws_ami: ${AWS_AMI:-}
aws_region: ${AWS_REGION:-}
aws_security_group: ${AWS_SECURITY_GROUP:-}
aws_subnet: ${AWS_SUBNET:-}
aws_vpc: ${AWS_VPC:-}
aws_volume_size: ${AWS_VOLUME_SIZE:-}
aws_volume_type: ${AWS_VOLUME_TYPE:-}
aws_volume_iops: ${AWS_VOLUME_IOPS:-}
aws_route53_zone: ${AWS_ROUTE53_ZONE:-}
aws_instance_type: ${AWS_INSTANCE_TYPE:-}
aws_hostname_prefix: jenkins-${prefix_random}
azure_client_id: ${AZURE_CLIENT_ID:-}
azure_client_secret: ${AZURE_CLIENT_SECRET:-}
azure_aks_subscription_id: ${AZURE_AKS_SUBSCRIPTION_ID:-}
gke_service_account: ${GKE_SERVICE_ACCOUNT:-}
percy_token: ${PERCY_TOKEN:-}
EOF

# Call Ansible playbook instead of Corral
# QA_INFRA_REPO should be set to the path of qa-infra-automation repo
# If not set, assume it's in the workspace or current directory
QA_INFRA_REPO="${QA_INFRA_REPO:-${WORKSPACE}/qa-infra-automation}"

# If QA_INFRA_REPO doesn't exist, try current directory
if [ ! -d "${QA_INFRA_REPO}" ]; then
    if [ -d "${PWD}/qa-infra-automation" ]; then
        QA_INFRA_REPO="${PWD}/qa-infra-automation"
    elif [ -d "${PWD}/../qa-infra-automation" ]; then
        QA_INFRA_REPO="${PWD}/../qa-infra-automation"
    else
        echo "Error: QA_INFRA_REPO not found at ${QA_INFRA_REPO}"
        echo "Please set QA_INFRA_REPO environment variable or ensure qa-infra-automation repo is accessible"
        exit 1
    fi
fi

# Determine inventory file
# If using Terraform, the inventory-template.yml will use Terraform inventory
# Otherwise, you may need a static inventory file
INVENTORY_FILE="${INVENTORY_FILE:-${QA_INFRA_REPO}/ansible/ui-dashboard-tests/inventory-template.yml}"

# Run Ansible playbook
ansible-playbook \
  -i "${INVENTORY_FILE}" \
  "${QA_INFRA_REPO}/ansible/ui-dashboard-tests/ui-dashboard-tests-playbook.yml" \
  -e "@${WORKSPACE}/ansible-vars.yaml" \
  -e "workspace_path=${WORKSPACE}"

echo "Ansible playbook execution completed"

# Extract Rancher configuration from output files (if needed for downstream jobs)
if [ -f "${WORKSPACE}/output/rancher-config.yaml" ]; then
  RANCHER_URL=$(yq e '.rancher_url' "${WORKSPACE}/output/rancher-config.yaml" 2>/dev/null || echo "")
  RANCHER_HOST=$(yq e '.rancher_host' "${WORKSPACE}/output/rancher-config.yaml" 2>/dev/null || echo "")
  export RANCHER_URL
  export RANCHER_HOST
  echo "Rancher URL: ${RANCHER_URL}"
  echo "Rancher Host: ${RANCHER_HOST}"
fi

cd "${WORKSPACE}"
echo "${PWD}"
