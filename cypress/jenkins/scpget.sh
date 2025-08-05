#!/bin/bash

set -x

export PATH=$PATH:"${WORKSPACE}/bin"


PRIV_KEY="${WORKSPACE}/.ssh/corral_private_key"
if [ -f "${PRIV_KEY}" ]; then 
  chmod 700 "${PRIV_KEY}"
else
  echo "$(corral vars ci corral_private_key -o yaml)" > "${PRIV_KEY}"
fi

chmod 400 "${PRIV_KEY}"

NODE_EXTERNAL_IP="$(corral vars ci first_node_ip)"

echo "Copying from: root@${NODE_EXTERNAL_IP}:$1"
echo "Copying to: ${2:-.}"

REPORT_DIR="."

if [[ $# -gt 1 ]]; then
  REPORT_DIR="$2"
  mkdir -p "$2"
  echo "Created directory: $2"
fi

# Check if source exists on remote
ssh -i ${PRIV_KEY} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "root@${NODE_EXTERNAL_IP}" "ls -la $1" || {
  echo "Source path $1 does not exist on remote machine"
  exit 1
}

scp -r -i ${PRIV_KEY} -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null "root@${NODE_EXTERNAL_IP}:$1" "${REPORT_DIR}"

echo "Copy completed. Contents of ${REPORT_DIR}:"
ls -la "${REPORT_DIR}" || echo "Directory not found"
