/**
 * Automated Validation Script for SchedulingDashboard View Persistence
 * 
 * This script can be run in the browser console to automatically validate
 * that the view persistence feature is working correctly.
 */

class SchedulingViewPersistenceValidator {
  constructor() {
    this.testResults = [];
    this.viewMappings = {
      'calendar': 'Month View',
      'week': 'Week View',
      'today': "Today's Bookings",
      'list': 'Upcoming Bookings',
      'availability': 'Manage Availability'
    };
  }

  log(message, type = 'info') {
    const styles = {
      info: 'color: #2196F3; font-weight: bold',
      success: 'color: #4CAF50; font-weight: bold',
      error: 'color: #f44336; font-weight: bold',
      warning: 'color: #FF9800; font-weight: bold'
    };
    console.log(`%c${message}`, styles[type] || styles.info);
  }

  getCurrentViewFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view') || 'calendar';
  }

  getActiveButton() {
    return document.querySelector('.view-selector button.active');
  }

  getAllViewButtons() {
    return document.querySelectorAll('.view-selector button');
  }

  getCurrentVisibleContent() {
    const contentArea = document.querySelector('.dashboard-content');
    if (!contentArea) return null;

    // Check what content is currently visible
    if (contentArea.querySelector('.calendar-container, .calendar')) return 'calendar';
    if (contentArea.querySelector('.week-view')) return 'week';
    if (contentArea.querySelector('.todays-appointments')) return 'today';
    if (contentArea.querySelector('.upcoming-appointments')) return 'list';
    if (contentArea.querySelector('.availability-manager')) return 'availability';
    
    return 'unknown';
  }

  validateCurrentState() {
    const urlView = this.getCurrentViewFromURL();
    const activeButton = this.getActiveButton();
    const visibleContent = this.getCurrentVisibleContent();

    const result = {
      timestamp: new Date().toISOString(),
      urlView,
      expectedButtonText: this.viewMappings[urlView],
      actualButtonText: activeButton ? activeButton.textContent.trim() : null,
      visibleContent,
      tests: {
        urlParameterPresent: urlView !== 'calendar' || window.location.search === '',
        correctButtonActive: activeButton && activeButton.textContent.trim() === this.viewMappings[urlView],
        correctContentVisible: visibleContent === urlView
      }
    };

    result.allTestsPassed = Object.values(result.tests).every(test => test === true);

    return result;
  }

  async testViewSwitching() {
    this.log('🔄 Testing View Switching Functionality', 'info');
    
    const buttons = this.getAllViewButtons();
    const results = [];

    for (const button of buttons) {
      const buttonText = button.textContent.trim();
      const expectedView = Object.keys(this.viewMappings).find(
        key => this.viewMappings[key] === buttonText
      );

      if (!expectedView) continue;

      this.log(`Testing: ${buttonText}`, 'info');

      // Click the button
      button.click();

      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Validate state after click
      const validation = this.validateCurrentState();
      validation.buttonText = buttonText;
      validation.expectedView = expectedView;

      results.push(validation);

      if (validation.allTestsPassed) {
        this.log(`✅ ${buttonText} - All tests passed`, 'success');
      } else {
        this.log(`❌ ${buttonText} - Some tests failed`, 'error');
        this.displayFailures(validation);
      }
    }

    return results;
  }

  displayFailures(validation) {
    if (!validation.tests.urlParameterPresent) {
      this.log('  - URL parameter not set correctly', 'error');
    }
    if (!validation.tests.correctButtonActive) {
      this.log(`  - Wrong button active: expected "${validation.expectedButtonText}", got "${validation.actualButtonText}"`, 'error');
    }
    if (!validation.tests.correctContentVisible) {
      this.log(`  - Wrong content visible: expected "${validation.expectedView}", got "${validation.visibleContent}"`, 'error');
    }
  }

  testURLPersistence() {
    this.log('🔗 Testing URL Persistence', 'info');
    
    const urlView = this.getCurrentViewFromURL();
    this.log(`Current URL view parameter: ${urlView}`, 'info');

    const validation = this.validateCurrentState();
    
    if (validation.allTestsPassed) {
      this.log('✅ URL persistence validation passed', 'success');
    } else {
      this.log('❌ URL persistence validation failed', 'error');
      this.displayFailures(validation);
    }

    return validation;
  }

  generateRefreshTestURLs() {
    this.log('🔄 Refresh Test URLs', 'info');
    const baseURL = window.location.origin + window.location.pathname;
    
    Object.keys(this.viewMappings).forEach(view => {
      const testURL = `${baseURL}?view=${view}`;
      this.log(`${this.viewMappings[view]}: ${testURL}`, 'info');
    });

    this.log('\n📋 Manual Refresh Test Instructions:', 'warning');
    this.log('1. Copy one of the URLs above', 'info');
    this.log('2. Navigate to it in your browser', 'info');
    this.log('3. Verify the correct view is displayed', 'info');
    this.log('4. Press F5 to refresh', 'info');
    this.log('5. Verify the view persists after refresh', 'info');
  }

  async runFullValidation() {
    this.log('🚀 Starting Full SchedulingDashboard View Persistence Validation', 'info');
    this.log('================================================================', 'info');

    // Test 1: Current state validation
    this.log('\n1️⃣ Testing Current State', 'info');
    const currentStateResult = this.testURLPersistence();

    // Test 2: View switching
    this.log('\n2️⃣ Testing View Switching', 'info');
    const switchingResults = await this.testViewSwitching();

    // Test 3: Generate refresh test URLs
    this.log('\n3️⃣ Refresh Test URLs', 'info');
    this.generateRefreshTestURLs();

    // Summary
    this.log('\n📊 Validation Summary', 'info');
    const allSwitchingPassed = switchingResults.every(r => r.allTestsPassed);
    
    if (currentStateResult.allTestsPassed && allSwitchingPassed) {
      this.log('✅ ALL TESTS PASSED - View persistence is working correctly!', 'success');
    } else {
      this.log('❌ SOME TESTS FAILED - View persistence needs attention', 'error');
    }

    return {
      currentState: currentStateResult,
      viewSwitching: switchingResults,
      summary: {
        currentStatePassed: currentStateResult.allTestsPassed,
        viewSwitchingPassed: allSwitchingPassed,
        overallPassed: currentStateResult.allTestsPassed && allSwitchingPassed
      }
    };
  }

  // Static helper methods for manual testing
  static quickValidation() {
    const validator = new SchedulingViewPersistenceValidator();
    return validator.testURLPersistence();
  }

  static async fullTest() {
    const validator = new SchedulingViewPersistenceValidator();
    return await validator.runFullValidation();
  }
}

// Auto-run if we're on the scheduling dashboard
if (window.location.pathname.includes('scheduling')) {
  const validator = new SchedulingViewPersistenceValidator();
  
  // Run a quick validation first
  console.log('🎯 Auto-running quick validation...');
  validator.testURLPersistence();
  
  console.log('\n🧪 To run full test suite, execute:');
  console.log('SchedulingViewPersistenceValidator.fullTest()');
}

// Make available globally for manual testing
window.SchedulingViewPersistenceValidator = SchedulingViewPersistenceValidator;

export default SchedulingViewPersistenceValidator;
