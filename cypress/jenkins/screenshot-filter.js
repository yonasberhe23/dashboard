/**
 * Screenshot Filter Plugin for Cypress
 *
 * This plugin ensures only first failure screenshots are kept:
 * - Tracks failed tests to identify retries
 * - Deletes screenshots from retry attempts
 * - Works with existing cypress-mochawesome-reporter
 */

const fs = require('fs');

class ScreenshotFilter {
  constructor() {
    this.failedTests = new Set();
  }

  /**
   * Check if this is the first failure for a test
   */
  isFirstFailure(testTitle) {
    return !this.failedTests.has(testTitle);
  }

  /**
   * Mark a test as failed
   */
  markTestFailed(testTitle) {
    this.failedTests.add(testTitle);
  }

  /**
   * Delete a screenshot file
   */
  deleteScreenshot(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);

        return true;
      }
    } catch (error) {
      console.error(`Error deleting screenshot ${ filePath }:`, error.message);
    }

    return false;
  }
}

const screenshotFilter = new ScreenshotFilter();

/**
 * Cypress plugin function
 */
function screenshotFilterPlugin(on, config) {
  // Intercept screenshot events
  on('after:screenshot', (details) => {
    const testTitle = Cypress.currentTest?.title || 'unknown';

    // Only keep screenshot if this is the first failure
    if (!screenshotFilter.isFirstFailure(testTitle)) {
      // Delete the retry screenshot
      if (screenshotFilter.deleteScreenshot(details.path)) {
        console.log(`🗑️  Removed retry screenshot for: ${ testTitle }`);
      }

      return false; // Don't process this screenshot
    }

    // Mark test as failed and keep screenshot
    screenshotFilter.markTestFailed(testTitle);
    console.log(`✅ Kept first failure screenshot for: ${ testTitle }`);

    // Let cypress-mochawesome-reporter handle the screenshot
    return details;
  });

  // Add custom tasks for screenshot management
  on('task', {
    isFirstFailure: (testTitle) => {
      return screenshotFilter.isFirstFailure(testTitle);
    },
    markTestFailed: (testTitle) => {
      screenshotFilter.markTestFailed(testTitle);

      return null;
    },
    deleteScreenshot: (filePath) => {
      return screenshotFilter.deleteScreenshot(filePath);
    }
  });

  return config;
}

module.exports = screenshotFilterPlugin;
