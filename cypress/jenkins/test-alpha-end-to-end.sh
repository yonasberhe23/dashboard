#!/bin/bash
set -e

# End-to-end test: init.sh -> corral install-rancher.sh
# Simulates the full flow for community alpha
# Usage: ./test-alpha-end-to-end.sh v2.13

export RANCHER_IMAGE_TAG="${1:-v2.13}"
export RANCHER_HELM_REPO="rancher-com-alpha"
export WORKSPACE="/tmp/test-workspace"

echo "=========================================="
echo "End-to-End Test: community alpha"
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
helm repo list 2>/dev/null | grep -E "rancher" | awk '{print $1}' | while read repo; do
  echo "Removing repo: $repo"
  helm repo remove "$repo" 2>/dev/null || true
done
# Also try to remove common rancher repo names directly (in case they weren't caught by the grep)
for repo in rancher-prime rancher-latest rancher-alpha rancher-community rancher-com-alpha rancher-com-rc; do
  helm repo remove "$repo" 2>/dev/null || true
done
# Wait a moment for removal to complete
sleep 2
# Verify removal - should have zero rancher repos
remaining=$(helm repo list 2>/dev/null | grep -E "rancher" | wc -l | tr -d ' ' || echo "0")
if [[ "${remaining}" -gt 0 ]]; then
  echo "Warning: ${remaining} rancher repo(s) still exist after cleanup:"
  helm repo list 2>/dev/null | grep -E "rancher" || true
  echo "Attempting force removal..."
  helm repo list 2>/dev/null | grep -E "rancher" | awk '{print $1}' | xargs -I {} helm repo remove {} 2>/dev/null || true
  sleep 1
else
  echo "✓ All rancher repos removed"
fi

# Simulate init.sh logic for community alpha
echo ""
echo "=== Step 2: Simulating init.sh (community alpha case) ==="

# Community alpha - staging
RANCHER_CHART_URL=https://releases.rancher.com/server-charts/alpha
HELM_REPO_NAME=rancher-com-alpha
echo "Adding repo: ${HELM_REPO_NAME} from ${RANCHER_CHART_URL}"
helm repo add "${HELM_REPO_NAME}" "${RANCHER_CHART_URL}"
helm repo update
# Verify only the expected repo is present
echo ""
echo "Verifying only ${HELM_REPO_NAME} repo is present:"
helm repo list | grep -E "rancher" || echo "No rancher repos found (unexpected)"
actual_repos=$(helm repo list 2>/dev/null | grep -E "rancher" | wc -l | tr -d ' ')
if [[ "${actual_repos}" -ne 1 ]]; then
  echo "Warning: Expected 1 rancher repo, found ${actual_repos}"
  helm repo list | grep -E "rancher"
fi

# Set corral variables (simulating init.sh)
CORRAL_rancher_chart_repo="alpha"  # RANCHER_CHART_REPO_FOR_CORRAL mapping
CORRAL_rancher_chart_url=$(echo "${RANCHER_CHART_URL}" | grep -o '.*server-charts')

echo "rancher_chart_repo=${CORRAL_rancher_chart_repo}"
echo "rancher_chart_url=${CORRAL_rancher_chart_url}"

# Find RANCHER_VERSION
# Handle head tags: "head" or "v2.13-head" -> extract version part
if [[ "${RANCHER_IMAGE_TAG}" == "head" ]]; then
  # For "head", get the latest version from repo
  RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | sed -n '1!p' | head -1 | cut -f2 | tr -d '[:space:]')
else
  # For "v2.13-head", extract "v2.13" and search for matching version
  version_string=$(echo "${RANCHER_IMAGE_TAG}" | cut -f1 -d"-")
  RANCHER_VERSION=$(helm search repo "${HELM_REPO_NAME}" --devel --versions | grep "${version_string}" | head -n 1 | cut -f2 | tr -d '[:space:]')
fi
CORRAL_rancher_version="${RANCHER_VERSION}"
echo "RANCHER_VERSION=${RANCHER_VERSION}"

# Community repos use RANCHER_IMAGE_TAG as-is (including -head tags)
CORRAL_rancher_image_tag="${RANCHER_IMAGE_TAG}"
echo "rancher_image_tag=${CORRAL_rancher_image_tag}"
echo "Note: Community builds use *-head images (head, v2.13-head, v2.12-head, etc.)"

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
echo "✓ Version found: ${CORRAL_rancher_version}"
echo "✓ Image tag: ${CORRAL_rancher_image_tag}"
echo "✓ End-to-end flow: PASSED"
