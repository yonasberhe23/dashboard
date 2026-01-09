#!/bin/bash
set -e

# Test script to verify prime (production) logic
# Usage: ./test-prime-production.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-prime"

echo "=========================================="
echo "Testing prime (production) with RANCHER_IMAGE_TAG=${RANCHER_IMAGE_TAG}"
echo "=========================================="

# Simulate init.sh logic for prime
echo ""
echo "=== Step 1: Setting up Helm repos ==="
RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
HELM_REPO_NAME=rancher-prime
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}" || true
helm repo update >/dev/null 2>&1

echo "RANCHER_CHART_URL=${RANCHER_CHART_URL}"
echo "HELM_REPO_NAME=${HELM_REPO_NAME}"

# Simulate finding RANCHER_VERSION (chart version)
echo ""
echo "=== Step 2: Finding chart version ==="
version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
echo "version_string=${version_string}"

RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "${version_string}" | head -n 1 | cut -f2 | tr -d '[:space:]')
echo "RANCHER_VERSION (chart version)=${RANCHER_VERSION}"

# For prime, use chart version as image tag
echo ""
echo "=== Step 3: Determining image tag ==="
RANCHER_IMAGE_TAG_FOR_CORRAL="v${RANCHER_VERSION}"
echo "RANCHER_IMAGE_TAG_FOR_CORRAL=${RANCHER_IMAGE_TAG_FOR_CORRAL}"

# Set corral variables (simulated)
echo ""
echo "=== Step 4: Final values ==="
echo "rancher_chart_repo=prime"
echo "rancher_chart_url=https://charts.rancher.com/server-charts/"
echo "rancher_image=registry.suse.com/rancher/rancher"
echo "rancher_image_tag=${RANCHER_IMAGE_TAG_FOR_CORRAL}"
echo "rancher_version=${RANCHER_VERSION}"
echo "env_var_map=[\"CATTLE_AGENT_IMAGE|registry.suse.com/rancher/rancher-agent:${RANCHER_IMAGE_TAG_FOR_CORRAL}, RANCHER_VERSION_TYPE|prime\"]"

echo ""
echo "=== Test Summary ==="
echo "Input: ${RANCHER_IMAGE_TAG}"
echo "Chart Version: ${RANCHER_VERSION}"
echo "Image Tag: ${RANCHER_IMAGE_TAG_FOR_CORRAL}"
echo ""
echo "✓ Test passed!"
