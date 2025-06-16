/**
 * Test script to verify SettingsDataPage immediate data display implementation
 * Run this in browser console on SettingsDataPage to test caching behavior
 */

// Test immediate data display and caching for SettingsDataPage
function testSettingsDataPageCaching() {
  console.log("🧪 Testing SettingsDataPage Immediate Data Display");

  // Check if useSettingsData hook is working
  const settingsDataElements =
    document.querySelector('[data-testid="settings-data-page"]') ||
    document.querySelector(".settings-content");

  if (!settingsDataElements) {
    console.warn(
      "⚠️ SettingsDataPage not found. Navigate to Settings > Data page first."
    );
    return;
  }

  console.log("✅ SettingsDataPage detected");

  // Test tab switching behavior
  const tabs = document.querySelectorAll(
    '[role="tab"], .tab-button, .tab-switcher button'
  );

  if (tabs.length === 0) {
    console.warn("⚠️ No tabs found. Make sure TabSwitcher is rendered.");
    return;
  }

  console.log(`✅ Found ${tabs.length} tabs`);

  // Check for table or data display
  const dataTable = document.querySelector(
    'table, .data-table, [data-testid="data-table"]'
  );
  const loadingSkeleton = document.querySelector(
    ".skeleton, .table-skeleton, .loading"
  );

  if (dataTable) {
    console.log("✅ Data table found - data is displayed");

    // Check if data is populated
    const rows = dataTable.querySelectorAll("tbody tr");
    console.log(`📊 Table has ${rows.length} data rows`);

    if (loadingSkeleton && loadingSkeleton.style.display !== "none") {
      console.warn(
        "⚠️ Loading skeleton visible even with data - this should not happen"
      );
    } else {
      console.log("✅ No unnecessary loading skeleton visible");
    }
  } else if (loadingSkeleton) {
    console.log(
      "⏳ Loading skeleton visible - likely first load with no cached data"
    );
  } else {
    console.warn("⚠️ Neither data table nor loading skeleton found");
  }

  // Test tab switching
  if (tabs.length > 1) {
    console.log("🔄 Testing tab switching...");

    const originalTab = document.querySelector(
      '[role="tab"][aria-selected="true"], .tab-button.active, .active'
    );
    const testTab = Array.from(tabs).find(
      (tab) =>
        !tab.classList.contains("active") && !tab.getAttribute("aria-selected")
    );

    if (testTab) {
      const startTime = performance.now();

      // Click the tab
      testTab.click();

      // Wait a moment and check if data appears quickly
      setTimeout(() => {
        const endTime = performance.now();
        const switchTime = endTime - startTime;

        const newDataTable = document.querySelector("table, .data-table");
        const newSkeleton = document.querySelector(
          ".skeleton, .table-skeleton, .loading"
        );

        if (
          newDataTable &&
          (!newSkeleton || newSkeleton.style.display === "none")
        ) {
          console.log(
            `✅ Tab switch completed in ${switchTime.toFixed(
              2
            )}ms with immediate data display`
          );
        } else if (newSkeleton) {
          console.log(
            `⏳ Tab switch showing skeleton - either no cached data or first load`
          );
        }

        // Switch back to original tab
        if (originalTab) {
          originalTab.click();
        }
      }, 100);
    }
  }

  // Check browser console for caching logs
  console.log("📝 Check browser console for caching debug logs starting with:");
  console.log('   - "⚡ SettingsData: Using cached data"');
  console.log('   - "🔄 SettingsData: Auto-refreshing stale data"');
  console.log('   - "🚀 SettingsData: Prefetching adjacent tabs"');

  // Check if immediate data display guide exists
  fetch("/IMMEDIATE_DATA_DISPLAY_GUIDE.md")
    .then((response) => {
      if (response.ok) {
        console.log("✅ Implementation guide available");
      }
    })
    .catch(() => {
      console.log("📚 Implementation guide might not be in public folder");
    });

  console.log("🎉 Test completed. Check the logs above for results.");
}

// Auto-run if on settings page
if (
  window.location.pathname.includes("settings") &&
  window.location.pathname.includes("data")
) {
  setTimeout(testSettingsDataPageCaching, 1000);
} else {
  console.log(
    "💡 Navigate to Settings > Data page and run: testSettingsDataPageCaching()"
  );
}

// Export for manual testing
window.testSettingsDataPageCaching = testSettingsDataPageCaching;
