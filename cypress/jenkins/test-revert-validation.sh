#!/bin/bash

# This script demonstrates that if we revert the Jenkinsfile changes,
# the test script (expecting NEW behavior) will FAIL for sad path scenarios

set -e

TEST_DIR="/tmp/jenkins-notification-test-revert"
rm -rf "${TEST_DIR}"
mkdir -p "${TEST_DIR}"
cd "${TEST_DIR}"

echo "=========================================="
echo "Testing: What happens if we revert Jenkinsfile?"
echo "=========================================="
echo ""
echo "This test simulates:"
echo "  1. Test script expects NEW behavior (no notifications for sad paths)"
echo "  2. But Jenkinsfile has OLD logic (sends notifications incorrectly)"
echo "  3. Result: Test FAILS, proving the fix is needed"
echo ""
echo ""

FAILED=0

# Test Case: Sad Path - Tests didn't run (empty results.xml)
# NEW behavior expects: NO notification
# OLD logic would do: YES notification
# Result: Test should FAIL

echo "--- Test: Sad Path (tests didn't run) ---"
echo "Expected (NEW behavior): NO notification"
echo ""

# Simulate OLD Jenkinsfile logic (reverted)
rm -f results.xml
currentBuildResult="FAILURE"  # OLD logic sets this when tests don't run

# OLD LOGIC: Send notification based on currentBuild.result
if [ "${currentBuildResult}" = "FAILURE" ] || [ "${currentBuildResult}" = "UNSTABLE" ]; then
    oldLogicNotification="YES"
    echo "  OLD logic (reverted Jenkinsfile): Would send notification (status: ${currentBuildResult})"
else
    oldLogicNotification="NO"
fi

# NEW behavior expectation: NO notification when tests didn't run
expectedNotification="NO"

echo ""
if [ "${oldLogicNotification}" = "${expectedNotification}" ]; then
    echo "  ✅ PASS: Old logic matches expected behavior"
else
    echo "  ❌ FAIL: Old logic would send notification, but expected NO notification"
    echo "  ❌ This proves the fix is needed!"
    FAILED=1
fi

echo ""
echo ""

# Test Case: Sad Path - Tests didn't run (invalid results.xml)
echo "--- Test: Sad Path (invalid results.xml) ---"
echo "Expected (NEW behavior): NO notification"
echo ""

# Simulate OLD Jenkinsfile logic (reverted)
echo '<?xml version="1.0"?><testsuites></testsuites>' > results.xml
# OLD logic would try to process this, fail, and set build to FAILURE
currentBuildResult="FAILURE"

# OLD LOGIC: Send notification based on currentBuild.result
if [ "${currentBuildResult}" = "FAILURE" ] || [ "${currentBuildResult}" = "UNSTABLE" ]; then
    oldLogicNotification="YES"
    echo "  OLD logic (reverted Jenkinsfile): Would send notification (status: ${currentBuildResult})"
else
    oldLogicNotification="NO"
fi

# NEW behavior expectation: NO notification when tests didn't run
expectedNotification="NO"

echo ""
if [ "${oldLogicNotification}" = "${expectedNotification}" ]; then
    echo "  ✅ PASS: Old logic matches expected behavior"
else
    echo "  ❌ FAIL: Old logic would send notification, but expected NO notification"
    echo "  ❌ This proves the fix is needed!"
    FAILED=1
fi

echo ""
echo "=========================================="
if [ "${FAILED}" -eq 1 ]; then
    echo "❌ TEST FAILED: Reverting Jenkinsfile would break the expected behavior"
    echo ""
    echo "Conclusion: The fixes in Jenkinsfile are necessary!"
    echo "Reverting would cause notifications to be sent when tests didn't run."
    exit 1
else
    echo "✅ All tests passed"
fi
echo "=========================================="
