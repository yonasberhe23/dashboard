#!/bin/bash
set -e

# End-to-end test: init.sh -> corral install-rancher.sh
# Simulates the full flow for optimus_prime
# Usage: ./test-optimus-prime-end-to-end.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-latest"
export WORKSPACE="/tmp/test-workspace"

echo "=========================================="
echo "End-to-End Test: optimus_prime"
echo "RANCHER_IMAGE_TAG=${RANCHER_IMAGE_TAG}"
echo "RANCHER_HELM_REPO=${RANCHER_HELM_REPO}"
echo "=========================================="

# Clean up workspace
rm -rf "${WORKSPACE}"
mkdir -p "${WORKSPACE}/bin"
export PATH="${WORKSPACE}/bin:${PATH}"

# Remove all rancher repos to simulate clean Jenkins environment
echo ""
echo "=== Step 1: Cleaning up rancher repos ==="
# Remove all repos that contain "rancher" in the name
helm repo list | grep -E "rancher" | awk '{print $1}' | while read repo; do
  echo "Removing repo: $repo"
  helm repo remove "$repo" 2>/dev/null || true
done
# Also try to remove common rancher repo names directly (in case they weren't caught by the grep)
for repo in rancher-prime rancher-latest rancher-alpha rancher-community rancher-com-alpha rancher-com-rc; do
  helm repo remove "$repo" 2>/dev/null || true
done
# Verify removal
remaining=$(helm repo list | grep -E "rancher" | wc -l | tr -d ' ')
if [[ "${remaining}" -gt 0 ]]; then
  echo "Warning: ${remaining} rancher repo(s) still exist after cleanup"
  helm repo list | grep -E "rancher"
else
  echo "✓ All rancher repos removed"
fi

# Simulate init.sh logic for optimus_prime
echo ""
echo "=== Step 2: Simulating init.sh (optimus_prime case) ==="

# Prime - staging (RC versions)
# Use rancher-prime repo (production chart) but with RC image tags from staging registry
RANCHER_CHART_URL=https://charts.rancher.com/server-charts/prime
HELM_REPO_NAME=rancher-prime
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}"
# Also add latest repo to search for RC versions if partial tag is provided
helm repo add rancher-latest https://charts.optimus.rancher.io/server-charts/latest || true
helm repo update

# Set corral variables (simulating init.sh)
CORRAL_rancher_image="stgregistry.suse.com/rancher/rancher"
CORRAL_rancher_chart_repo="prime"  # RANCHER_CHART_REPO_FOR_CORRAL
CORRAL_rancher_chart_url=$(echo "${RANCHER_CHART_URL}" | grep -o '.*server-charts')

echo "rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "rancher_chart_url=${CORRAL_rancher_chart_url}"

# Find RANCHER_VERSION (chart version from rancher-prime)
version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
# Extract major.minor (e.g., "2.13" from "v2.13")
major_minor=$(echo "${version_string}" | sed 's/^v//' | cut -d. -f1-2)
RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "^${HELM_REPO_NAME}/rancher[[:space:]]" | grep "${major_minor}" | head -n 1 | cut -f2 | tr -d '[:space:]')
CORRAL_rancher_version="${RANCHER_VERSION}"
echo "RANCHER_VERSION=${RANCHER_VERSION}"

# Find RC version for image tag (search in rancher-latest)
found_version=$(helm search repo rancher-latest --devel --versions | grep "^rancher-latest/rancher[[:space:]]" | grep "${version_string}" | grep -- "-rc" | head -n 1 | cut -f2 | tr -d '[:space:]')
if [[ -n "${found_version}" ]]; then
  CORRAL_rancher_image_tag="v${found_version}"
else
  echo "Error: Could not find RC version for ${RANCHER_IMAGE_TAG} in rancher-latest repo"
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
echo "✓ End-to-end flow: PASSED"
