#!/bin/bash
set -e

# Test script to verify alpha_prime logic with simplified code
# Usage: ./test-alpha-prime-simplified.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-alpha"

echo "=========================================="
echo "Testing alpha_prime with RANCHER_IMAGE_TAG=${RANCHER_IMAGE_TAG}"
echo "=========================================="

# Simulate init.sh logic for alpha_prime
echo ""
echo "=== Step 1: Setting up Helm repos ==="
RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
HELM_REPO_NAME=rancher-prime
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}" || true
helm repo add rancher-alpha https://charts.optimus.rancher.io/server-charts/alpha || true
helm repo update >/dev/null 2>&1

echo "RANCHER_CHART_URL=${RANCHER_CHART_URL}"
echo "HELM_REPO_NAME=${HELM_REPO_NAME}"

# Simulate finding RANCHER_VERSION (chart version)
echo ""
echo "=== Step 2: Finding chart version ==="
version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
echo "version_string=${version_string}"

major_minor=$(echo "${version_string}" | sed 's/^v//' | cut -d. -f1-2)
echo "major_minor=${major_minor}"

RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "^${HELM_REPO_NAME}/rancher[[:space:]]" | grep "${major_minor}" | head -n 1 | cut -f2 | tr -d '[:space:]')
echo "RANCHER_VERSION (chart version)=${RANCHER_VERSION}"

# Simulate finding alpha image tag (simplified - always search)
echo ""
echo "=== Step 3: Finding alpha image tag (always search) ==="
found_version=$(helm search repo rancher-alpha --devel --versions | grep -E "^rancher-alpha/(rancher|rancher-prime)[[:space:]]" | grep "${version_string}" | head -n 1 | cut -f2 | tr -d '[:space:]')
echo "found_version=${found_version}"

if [[ -n "${found_version}" ]]; then
  RANCHER_IMAGE_TAG_FOR_CORRAL="v${found_version}"
  echo "✓ Found alpha version: ${RANCHER_IMAGE_TAG_FOR_CORRAL}"
else
  echo "✗ Error: Could not find alpha version for ${RANCHER_IMAGE_TAG} in rancher-alpha repo"
  exit 1
fi

# Set corral variables (simulated)
echo ""
echo "=== Step 4: Final values ==="
echo "rancher_chart_repo=prime"
echo "rancher_chart_url=https://charts.rancher.com/server-charts"
echo "rancher_image=stgregistry.suse.com/rancher/rancher"
echo "rancher_image_tag=${RANCHER_IMAGE_TAG_FOR_CORRAL}"
echo "rancher_version=${RANCHER_VERSION}"
echo "env_var_map=[\"CATTLE_AGENT_IMAGE|stgregistry.suse.com/rancher/rancher-agent:${RANCHER_IMAGE_TAG_FOR_CORRAL}, RANCHER_VERSION_TYPE|prime\"]"

echo ""
echo "=== Test Summary ==="
echo "Input: ${RANCHER_IMAGE_TAG}"
echo "Chart Version: ${RANCHER_VERSION}"
echo "Image Tag: ${RANCHER_IMAGE_TAG_FOR_CORRAL}"
echo ""
echo "✓ Test passed!"
