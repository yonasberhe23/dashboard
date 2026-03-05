#!/usr/bin/env bash

# upgrade-rancher-local.sh
#
# Upgrades an existing Rancher instance installed via install-rancher-local.sh.
# Uses Helm upgrade with --reuse-values so existing settings (hostname,
# bootstrap password, replicas) are preserved. Does not tear down the cluster.
#
# Requires: helm, kubectl (and a running k3d cluster with Rancher already installed)
#
# Usage:
#   ./upgrade-rancher-local.sh [OPTIONS]
#
# Options:
#   --cluster-name     Name of the k3d cluster (default: rancher-local)
#   --rancher-version  Rancher chart version to upgrade to (required)
#   --helm-repo        Helm repo name (default: rancher-com-alpha)
#   --helm-repo-url    Helm repo URL (default: https://releases.rancher.com/server-charts/alpha)
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
RANCHER_VERSION=""
HELM_REPO="${HELM_REPO:-rancher-com-alpha}"
HELM_REPO_URL="${HELM_REPO_URL:-https://releases.rancher.com/server-charts/alpha}"

# ============================================================================
# Argument parsing
# ============================================================================
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cluster-name)    CLUSTER_NAME="$2";    shift 2 ;;
    --rancher-version) RANCHER_VERSION="$2";  shift 2 ;;
    --helm-repo)       HELM_REPO="$2";       shift 2 ;;
    --helm-repo-url)   HELM_REPO_URL="$2";   shift 2 ;;
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
# Pre-flight
# ============================================================================
if [[ -z "${RANCHER_VERSION}" ]]; then
  die "Missing --rancher-version. Example: --rancher-version 2.14.0-alpha7"
fi

log "Checking required tools..."
require_cmd helm
require_cmd kubectl

log "Using kubeconfig context k3d-${CLUSTER_NAME}..."
kubectl config use-context "k3d-${CLUSTER_NAME}" || die "Cluster '${CLUSTER_NAME}' not found. Create it first with install-rancher-local.sh."

if ! helm list -n cattle-system 2>/dev/null | grep -q "^rancher"; then
  die "Rancher is not installed in cattle-system. Install it first with install-rancher-local.sh."
fi

log "Current Rancher release found. Upgrading to ${RANCHER_VERSION}..."

# ============================================================================
# Update repo and verify version exists
# ============================================================================
log "Updating Helm repo '${HELM_REPO}'..."
helm repo add "${HELM_REPO}" "${HELM_REPO_URL}" 2>/dev/null || true
helm repo update "${HELM_REPO}"

CHART_FOUND=$(helm search repo "${HELM_REPO}/rancher" --devel --versions 2>/dev/null | grep "${RANCHER_VERSION}" | head -1)
if [[ -z "${CHART_FOUND}" ]]; then
  die "Chart version '${RANCHER_VERSION}' not found in repo '${HELM_REPO}'. Run 'helm search repo ${HELM_REPO}/rancher --devel --versions' to see available versions."
fi
log "Found chart: ${CHART_FOUND}"

# ============================================================================
# Build upgrade args: 2.14+ chart requires extra values when using --reuse-values
# ============================================================================
UPGRADE_EXTRA_SETS=()
if [[ "${RANCHER_VERSION}" =~ ^2\.(1[4-9]|[2-9][0-9]) ]]; then
  log "Target is 2.14+; adding required values for networkExposure and rancherNamespaces."
  UPGRADE_EXTRA_SETS=(--set networkExposure.type=ingress --set rancherNamespaces.enabled=false)
fi

# ============================================================================
# Helm upgrade
# ============================================================================
log "Upgrading Rancher to ${RANCHER_VERSION}..."
helm upgrade rancher "${HELM_REPO}/rancher" \
  --namespace cattle-system \
  --version "${RANCHER_VERSION}" \
  --reuse-values \
  "${UPGRADE_EXTRA_SETS[@]}" \
  --devel \
  --wait \
  --timeout 10m

log "Rancher upgraded successfully."

# ============================================================================
# Summary
# ============================================================================
RANCHER_HOSTNAME=$(helm get values rancher -n cattle-system -o json 2>/dev/null | grep -o '"hostname":"[^"]*"' | cut -d'"' -f4 || echo "localhost")
echo ""
echo "============================================================"
echo "  Rancher Upgrade Complete"
echo "============================================================"
echo "  Cluster:   k3d-${CLUSTER_NAME}"
echo "  Version:   ${RANCHER_VERSION}"
echo ""
echo "  How to access Rancher:"
echo "  1. Open in browser: https://${RANCHER_HOSTNAME}/dashboard"
echo "  2. Accept the self-signed certificate if prompted."
echo "  3. Log in with your existing credentials (bootstrap password unchanged)."
echo ""
echo "  To retrieve the bootstrap password:"
echo "     kubectl get secret -n cattle-system bootstrap-secret -o go-template='{{.data.bootstrapPassword|base64decode}}{{ \"\\n\" }}'"
echo "============================================================"
