#!/bin/bash
set -e

# End-to-end test: init.sh -> corral install-rancher.sh
# Simulates the full flow for alpha_prime
# Usage: ./test-alpha-prime-end-to-end.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-alpha"
export WORKSPACE="/tmp/test-workspace"

echo "=========================================="
echo "End-to-End Test: alpha_prime"
echo "RANCHER_IMAGE_TAG=${RANCHER_IMAGE_TAG}"
echo "RANCHER_HELM_REPO=${RANCHER_HELM_REPO}"
echo "=========================================="

# Clean up workspace
rm -rf "${WORKSPACE}"
mkdir -p "${WORKSPACE}/bin"
export PATH="${WORKSPACE}/bin:${PATH}"

# Remove all rancher repos
echo ""
echo "=== Step 1: Cleaning up rancher repos ==="
helm repo list | grep -E "rancher|rancher-" | awk '{print $1}' | while read repo; do
  helm repo remove "$repo" 2>/dev/null || true
done

# Simulate init.sh logic for alpha_prime
echo ""
echo "=== Step 2: Simulating init.sh (alpha_prime case) ==="

# Prime alpha - staging
RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
HELM_REPO_NAME=rancher-prime
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}"
helm repo add rancher-alpha https://charts.optimus.rancher.io/server-charts/alpha || true
helm repo update

# Set corral variables (simulating init.sh)
CORRAL_rancher_image="stgregistry.suse.com/rancher/rancher"
CORRAL_rancher_chart_repo="prime"  # RANCHER_CHART_REPO_FOR_CORRAL
CORRAL_rancher_chart_url=$(echo "${RANCHER_CHART_URL}" | grep -o '.*server-charts')

echo "rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "rancher_chart_url=${CORRAL_rancher_chart_url}"

# Find RANCHER_VERSION (chart version)
version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
major_minor=$(echo "${version_string}" | sed 's/^v//' | cut -d. -f1-2)
RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "^${HELM_REPO_NAME}/rancher[[:space:]]" | grep "${major_minor}" | head -n 1 | cut -f2 | tr -d '[:space:]')
CORRAL_rancher_version="${RANCHER_VERSION}"
echo "RANCHER_VERSION=${RANCHER_VERSION}"

# Find alpha image tag
found_version=$(helm search repo rancher-alpha --devel --versions | grep "^rancher-alpha/rancher[[:space:]]" | grep "${version_string}" | grep -- "-alpha" | head -n 1 | cut -f2 | tr -d '[:space:]')
if [[ -n "${found_version}" ]]; then
  CORRAL_rancher_image_tag="v${found_version}"
else
  echo "Error: Could not find alpha version for ${RANCHER_IMAGE_TAG} in rancher-alpha repo"
  exit 1
fi
CORRAL_env_var_map='["CATTLE_AGENT_IMAGE|stgregistry.suse.com/rancher/rancher-agent:'${CORRAL_rancher_image_tag}', RANCHER_VERSION_TYPE|prime"]'

echo "rancher_image_tag=${CORRAL_rancher_image_tag}"

# Simulate corral install-rancher.sh script
echo ""
echo "=== Step 3: Simulating corral install-rancher.sh ==="
echo "CORRAL_rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "CORRAL_rancher_chart_url=${CORRAL_rancher_chart_url}"
echo "CORRAL_rancher_version=${CORRAL_rancher_version}"

# Validate repo
repos=("latest" "alpha" "stable" "prime" "optimus")
if [[ ! ${repos[*]} =~ ${CORRAL_rancher_chart_repo} ]]; then
  echo "ERROR: rancher_chart_repo must be one of [\"latest\", \"alpha\", \"stable\", \"prime\", \"optimus\"]"
  exit 1
fi

# Build the URL that corral script would use
if [ "${CORRAL_rancher_chart_repo}" == "optimus" ]; then
  FINAL_URL="${CORRAL_rancher_chart_url}"
else
  FINAL_URL="${CORRAL_rancher_chart_url}/${CORRAL_rancher_chart_repo}"
fi

echo ""
echo "=== Step 4: Testing URL construction ==="
echo "Base URL from init.sh: ${CORRAL_rancher_chart_url}"
echo "Repo name: ${CORRAL_rancher_chart_repo}"
echo "Final URL corral would use: ${FINAL_URL}"

# Test if the URL is valid (no double slashes after protocol)
if echo "${FINAL_URL}" | grep -qE '(https?://[^/]+)//'; then
  echo ""
  echo "✗ ERROR: Double slash detected in URL: ${FINAL_URL}"
  exit 1
fi

# Test if we can add the repo
echo ""
echo "=== Step 5: Testing helm repo add ==="
helm repo remove "rancher-${CORRAL_rancher_chart_repo}" 2>/dev/null || true
if helm repo add "rancher-${CORRAL_rancher_chart_repo}" "${FINAL_URL}"; then
  echo "✓ Successfully added repo with URL: ${FINAL_URL}"
  helm repo update >/dev/null 2>&1
  echo "✓ Repo update successful"
else
  echo "✗ ERROR: Failed to add repo with URL: ${FINAL_URL}"
  exit 1
fi

echo ""
echo "=== Test Summary ==="
echo "✓ URL construction: No double slashes"
echo "✓ Helm repo add: Success"
echo "✓ Alpha version found: ${CORRAL_rancher_image_tag}"
echo "✓ End-to-end flow: PASSED"
