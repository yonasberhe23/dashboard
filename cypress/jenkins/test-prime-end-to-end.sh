#!/bin/bash
set -e

# End-to-end test: init.sh -> corral install-rancher.sh
# Simulates the full flow for prime (production)
# Usage: ./test-prime-end-to-end.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-prime"
export WORKSPACE="/tmp/test-workspace"
export HELM_VERSION="3.13.2"

echo "=========================================="
echo "End-to-End Test: prime (production)"
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

# Simulate init.sh logic for prime
echo ""
echo "=== Step 2: Simulating init.sh (prime case) ==="

# Download helm (simplified - assume it's installed)
# In real init.sh: curl -L -o "${TARFILE}" "https://get.helm.sh/${TARFILE}"

# Prime - production
RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
HELM_REPO_NAME=rancher-prime
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}"
helm repo update

# Simulate corral variables (simulating init.sh)
# In real init.sh, these would be: corral config vars set <name> <value>
CORRAL_rancher_image="registry.suse.com/rancher/rancher"
CORRAL_rancher_chart_repo="prime"

# Extract base URL (up to server-charts)
# For prime, don't add trailing slash as corral script adds it
url_string=$(echo "${RANCHER_CHART_URL}" | grep -o '.*server-charts')
CORRAL_rancher_chart_url="${url_string}"

echo "rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "rancher_chart_url=${CORRAL_rancher_chart_url}"

# Find RANCHER_VERSION
version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "${version_string}" | head -n 1 | cut -f2 | tr -d '[:space:]')
CORRAL_rancher_version="${RANCHER_VERSION}"
echo "RANCHER_VERSION=${RANCHER_VERSION}"

# Set image tag (prime uses chart version with 'v' prefix)
RANCHER_IMAGE_TAG_FOR_CORRAL="v${RANCHER_VERSION}"
CORRAL_rancher_image_tag="${RANCHER_IMAGE_TAG_FOR_CORRAL}"
CORRAL_env_var_map='["CATTLE_AGENT_IMAGE|registry.suse.com/rancher/rancher-agent:'${RANCHER_IMAGE_TAG_FOR_CORRAL}', RANCHER_VERSION_TYPE|prime"]'

echo "rancher_image_tag=${RANCHER_IMAGE_TAG_FOR_CORRAL}"

# Simulate corral install-rancher.sh script
echo ""
echo "=== Step 3: Simulating corral install-rancher.sh ==="

# Variables are already set from init.sh simulation above
echo "CORRAL_rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "CORRAL_rancher_chart_url=${CORRAL_rancher_chart_url}"
echo "CORRAL_rancher_version=${CORRAL_rancher_version}"

# Validate repo (from corral script)
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
# Check for double slashes after https:// or http://
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
echo "✓ End-to-end flow: PASSED"
