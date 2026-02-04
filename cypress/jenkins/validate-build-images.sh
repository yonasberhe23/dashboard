#!/bin/bash
#
# Post-run validation for Jenkins E2E tests (qa-tasks#2159).
# Verifies that the correct Rancher images exist in the expected registries
# using skopeo to inspect metadata without pulling images.
#
# Requires: skopeo, jq (install on Jenkins agent or in CI image).
# Reads: notification_values.txt (written by init.sh) or env vars.
#

set -e

# Default max age in days for image Created date (optional check)
VALIDATE_MAX_AGE_DAYS="${VALIDATE_MAX_AGE_DAYS:-365}"

# Path to notification values written by init.sh
NOTIFICATION_VALUES="${WORKSPACE:-.}/notification_values.txt"

read_notification_value() {
  local key="$1"
  if [ -f "$NOTIFICATION_VALUES" ]; then
    grep "^${key}=" "$NOTIFICATION_VALUES" 2>/dev/null | cut -d'=' -f2- | tr -d '[:space:]' || true
  fi
}

# Resolve expected registry and image name from RANCHER_HELM_REPO (matches init.sh logic)
get_expected_registry_and_image() {
  local helm_repo="$1"
  case "$helm_repo" in
    rancher-prime)
      echo "registry.suse.com/rancher/rancher"
      ;;
    rancher-latest|rancher-alpha)
      echo "stgregistry.suse.com/rancher/rancher"
      ;;
    rancher-com-alpha|rancher-community|rancher-com-rc|*)
      echo "docker.io/rancher/rancher"
      ;;
  esac
}

log() { echo "[validate-build-images] $*"; }
err() { echo "[validate-build-images] ERROR: $*" >&2; }

# Check required tools
if ! command -v skopeo &>/dev/null; then
  err "skopeo is required but not installed. Install skopeo on the Jenkins agent to run post-run validation."
  exit 1
fi
if ! command -v jq &>/dev/null; then
  err "jq is required but not installed. Install jq on the Jenkins agent to run post-run validation."
  exit 1
fi

# Resolve input: prefer notification_values.txt, then env
RANCHER_HELM_REPO="${RANCHER_HELM_REPO:-$(read_notification_value RANCHER_HELM_REPO)}"
RANCHER_IMAGE_TAG="${RANCHER_IMAGE_TAG:-$(read_notification_value RANCHER_IMAGE_TAG)}"
RANCHER_VERSION="${RANCHER_VERSION:-$(read_notification_value RANCHER_VERSION)}"

if [ -z "$RANCHER_HELM_REPO" ] || [ -z "$RANCHER_IMAGE_TAG" ]; then
  log "Skipping validation: RANCHER_HELM_REPO or RANCHER_IMAGE_TAG not set (no notification_values.txt or env)."
  exit 0
fi

expected_registry_image=$(get_expected_registry_and_image "$RANCHER_HELM_REPO")
image_ref="${expected_registry_image}:${RANCHER_IMAGE_TAG}"

log "Validating image: $image_ref (RANCHER_HELM_REPO=$RANCHER_HELM_REPO)"

# Inspect image metadata without pulling (override os/arch for multi-arch manifests)
inspect_json=$(skopeo inspect --override-os linux --override-arch amd64 "docker://${image_ref}" 2>/dev/null) || true
if [ -z "$inspect_json" ]; then
  err "Failed to inspect image: $image_ref (skopeo could not reach registry or image does not exist)."
  exit 1
fi

created=$(echo "$inspect_json" | jq -r '.Created // empty')
repo_digest=$(echo "$inspect_json" | jq -r '.Digest // empty')

if [ -z "$created" ]; then
  err "Could not read Created date for image: $image_ref"
  exit 1
fi

log "Image Created: $created (Digest: ${repo_digest:-N/A})"

# Verify registry matches expected
resolved_registry=$(echo "$image_ref" | cut -d'/' -f1)
expected_registry=$(echo "$expected_registry_image" | cut -d'/' -f1)
if [ "$resolved_registry" != "$expected_registry" ]; then
  err "Registry mismatch: expected $expected_registry, got $resolved_registry"
  exit 1
fi
log "Registry matches expected: $expected_registry"

# Verify tag matches expected version (tag should contain version)
if [ -n "$RANCHER_VERSION" ]; then
  normalized_version="v${RANCHER_VERSION#v}"
  if [[ "$RANCHER_IMAGE_TAG" != *"${RANCHER_VERSION}"* ]] && [[ "$RANCHER_IMAGE_TAG" != *"${normalized_version}"* ]]; then
    log "Note: image tag $RANCHER_IMAGE_TAG does not contain chart version $RANCHER_VERSION (may be RC/alpha tag)."
  else
    log "Tag matches expected version: $RANCHER_IMAGE_TAG / $RANCHER_VERSION"
  fi
fi

# Check image creation date is recent (optional)
if [ -n "$created" ] && [ "$VALIDATE_MAX_AGE_DAYS" -gt 0 ] 2>/dev/null; then
  # Portable date to epoch: Linux uses -d, macOS uses -j -f (strip fractional seconds for macOS)
  created_normalized=$(echo "$created" | sed 's/\.[0-9]*Z$/Z/')
  created_ts=$(date -d "$created" "+%s" 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_normalized" "+%s" 2>/dev/null)
  if [ -n "$created_ts" ]; then
    now_ts=$(date "+%s")
    age_seconds=$((now_ts - created_ts))
    age_days=$((age_seconds / 86400))
    if [ "$age_days" -gt "$VALIDATE_MAX_AGE_DAYS" ]; then
      err "Image is too old: Created $created ($age_days days ago, max allowed: $VALIDATE_MAX_AGE_DAYS days)."
      exit 1
    fi
    log "Image age: $age_days days (max allowed: $VALIDATE_MAX_AGE_DAYS days)."
  fi
fi

log "Validation passed for $image_ref"
