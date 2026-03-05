#!/usr/bin/env bash

# install-rancher-local.sh
#
# Installs a Rancher instance locally using k3d + Helm.
# Requires: docker, k3d, helm, kubectl
#
# Usage:
#   ./install-rancher-local.sh [OPTIONS]
#
# Options:
#   --cluster-name     Name of the k3d cluster (default: rancher-local)
#   --rancher-version  Rancher chart/app version to install (default: 2.14.0-alpha6)
#   --helm-repo        Helm repo name (default: rancher-com-alpha)
#   --helm-repo-url    Helm repo URL (default: https://releases.rancher.com/server-charts/alpha)
#   --hostname         Hostname for Rancher ingress (default: localhost)
#   --bootstrap-pass   Bootstrap password (default: admin)
#   --replicas         Number of Rancher replicas (default: 1)
#   -h, --help         Show this help message

set -e

# Prefer Homebrew binaries on macOS (e.g. arm64 kubectl over x86_64 in /usr/local/bin)
if [[ -d /opt/homebrew/bin ]]; then
  export PATH="/opt/homebrew/bin:${PATH}"
fi

# ============================================================================
# Defaults
# ============================================================================
CLUSTER_NAME="${CLUSTER_NAME:-rancher-local}"
RANCHER_VERSION="${RANCHER_VERSION:-2.14.0-alpha6}"
HELM_REPO="${HELM_REPO:-rancher-com-alpha}"
HELM_REPO_URL="${HELM_REPO_URL:-https://releases.rancher.com/server-charts/alpha}"
RANCHER_HOSTNAME="${RANCHER_HOSTNAME:-localhost}"
BOOTSTRAP_PASSWORD="${BOOTSTRAP_PASSWORD:-admin}"
REPLICAS="${REPLICAS:-1}"

# ============================================================================
# Argument parsing
# ============================================================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cluster-name)    CLUSTER_NAME="$2";    shift 2 ;;
    --rancher-version) RANCHER_VERSION="$2"; shift 2 ;;
    --helm-repo)       HELM_REPO="$2";       shift 2 ;;
    --helm-repo-url)   HELM_REPO_URL="$2";   shift 2 ;;
    --hostname)        RANCHER_HOSTNAME="$2"; shift 2 ;;
    --bootstrap-pass)  BOOTSTRAP_PASSWORD="$2"; shift 2 ;;
    --replicas)        REPLICAS="$2";        shift 2 ;;
    -h|--help)
      sed -n '/^# Usage:/,/^$/p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ============================================================================
# Helpers
# ============================================================================
log()  { echo "[INFO]  $*"; }
warn() { echo "[WARN]  $*"; }
die()  { echo "[ERROR] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" &>/dev/null || die "'$1' is required but not found. Please install it first."
}

# ============================================================================
# Pre-flight checks
# ============================================================================
log "Checking required tools..."
require_cmd docker
require_cmd k3d
require_cmd helm
require_cmd kubectl

log "Checking Docker is running..."
docker info &>/dev/null || {
  warn "Docker is not running. Attempting to start Docker Desktop..."
  open -a Docker 2>/dev/null || die "Could not start Docker Desktop. Please start it manually."
  for i in {1..24}; do
    docker info &>/dev/null && break
    echo "  Waiting for Docker... ($i/24)"
    sleep 5
  done
  docker info &>/dev/null || die "Docker did not start in time. Please start it manually and re-run."
}
log "Docker is ready."

# ============================================================================
# Step 1: Create k3d cluster
# ============================================================================
log "Step 1: Creating k3d cluster '${CLUSTER_NAME}'..."

if k3d cluster list 2>/dev/null | grep -q "^${CLUSTER_NAME}"; then
  warn "Cluster '${CLUSTER_NAME}' already exists. Skipping creation."
else
  k3d cluster create "${CLUSTER_NAME}" \
    --api-port 6550 \
    --port "443:443@loadbalancer" \
    --port "80:80@loadbalancer" \
    --k3s-arg "--disable=traefik@server:0" \
    --wait
  log "Cluster '${CLUSTER_NAME}' created."
fi

kubectl config use-context "k3d-${CLUSTER_NAME}"
kubectl get nodes

# ============================================================================
# Step 2: Install cert-manager
# ============================================================================
log "Step 2: Installing cert-manager..."

helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update jetstack

if helm list -n cert-manager 2>/dev/null | grep -q "cert-manager"; then
  warn "cert-manager already installed. Skipping."
else
  helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --create-namespace \
    --set crds.enabled=true \
    --wait \
    --timeout 5m
  log "cert-manager installed."
fi

# ============================================================================
# Step 3: Install nginx ingress controller
# ============================================================================
log "Step 3: Installing nginx ingress controller..."
# Traefik is disabled on this cluster, so nginx is required to route traffic.

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update ingress-nginx

if helm list -n ingress-nginx 2>/dev/null | grep -q "ingress-nginx"; then
  warn "ingress-nginx already installed. Skipping."
else
  helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --set controller.service.type=LoadBalancer \
    --set controller.service.ports.http=80 \
    --set controller.service.ports.https=443 \
    --wait \
    --timeout 5m
  log "nginx ingress controller installed."
fi

# ============================================================================
# Step 4: Install Rancher
# ============================================================================
log "Step 4: Installing Rancher ${RANCHER_VERSION} from '${HELM_REPO}'..."

helm repo add "${HELM_REPO}" "${HELM_REPO_URL}" 2>/dev/null || true
helm repo update "${HELM_REPO}"

# Verify the requested version exists in the repo
CHART_FOUND=$(helm search repo "${HELM_REPO}" --devel --versions 2>/dev/null | grep "${RANCHER_VERSION}" | head -1)
if [[ -z "${CHART_FOUND}" ]]; then
  die "Chart version '${RANCHER_VERSION}' not found in repo '${HELM_REPO}'. Run 'helm search repo ${HELM_REPO} --devel --versions' to see available versions."
fi
log "Found chart: ${CHART_FOUND}"

if helm list -n cattle-system 2>/dev/null | grep -q "rancher"; then
  warn "Rancher already installed. Skipping."
else
  helm install rancher "${HELM_REPO}/rancher" \
    --namespace cattle-system \
    --create-namespace \
    --version "${RANCHER_VERSION}" \
    --set hostname="${RANCHER_HOSTNAME}" \
    --set bootstrapPassword="${BOOTSTRAP_PASSWORD}" \
    --set replicas="${REPLICAS}" \
    --devel \
    --wait \
    --timeout 10m
  log "Rancher installed."
fi

# ============================================================================
# Step 5: Patch Rancher ingress to use nginx ingress class
# ============================================================================
log "Step 5: Patching Rancher ingress to use nginx ingress class..."

CURRENT_CLASS=$(kubectl get ingress rancher -n cattle-system -o jsonpath='{.spec.ingressClassName}' 2>/dev/null || echo "")
if [[ "${CURRENT_CLASS}" == "nginx" ]]; then
  warn "Rancher ingress already uses nginx class. Skipping patch."
else
  kubectl patch ingress rancher -n cattle-system \
    --type=json \
    -p='[{"op":"add","path":"/spec/ingressClassName","value":"nginx"}]'
  log "Ingress patched."
fi

# ============================================================================
# Step 6: Wait for ingress address and verify
# ============================================================================
log "Step 6: Waiting for ingress to get an address..."
for i in {1..20}; do
  ADDRESS=$(kubectl get ingress rancher -n cattle-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
  if [[ -n "${ADDRESS}" ]]; then
    log "Ingress address: ${ADDRESS}"
    break
  fi
  echo "  Waiting for ingress address... ($i/20)"
  sleep 5
done

log "Verifying Rancher is reachable..."
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${RANCHER_HOSTNAME}/dashboard" 2>/dev/null || echo "000")
if [[ "${HTTP_CODE}" == "200" || "${HTTP_CODE}" == "302" ]]; then
  log "Rancher is responding (HTTP ${HTTP_CODE})."
else
  warn "Rancher returned HTTP ${HTTP_CODE}. It may still be initializing — try again in a minute."
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "============================================================"
echo "  Rancher Installation Complete"
echo "============================================================"
echo "  Cluster:        k3d-${CLUSTER_NAME}"
echo "  Chart repo:     ${HELM_REPO} (${HELM_REPO_URL})"
echo "  Chart version:  ${RANCHER_VERSION}"
echo "  App version:    v${RANCHER_VERSION}"
echo "  Hostname:       ${RANCHER_HOSTNAME}"
echo "  Bootstrap pass: ${BOOTSTRAP_PASSWORD}"
echo ""
echo "  How to access Rancher:"
echo "  1. Open in browser: https://${RANCHER_HOSTNAME}/dashboard"
echo "  2. Accept the self-signed certificate warning (Advanced -> Proceed)"
echo "  3. Log in with:"
echo "     Username: admin"
echo "     Password: ${BOOTSTRAP_PASSWORD}"
echo ""
echo "  To retrieve the bootstrap password later:"
echo "     kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}{{ \"\\n\" }}'"
echo "============================================================"
