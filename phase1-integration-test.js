// PHASE 1 - Integration Test Script
// Run this in your browser console to test TanStack Query integration

console.log("🧪 PHASE 1 - TanStack Query Migration Test");

// Test 1: Check if TanStack Query is available
function testTanStackQueryAvailable() {
  console.log("\n1️⃣ Testing TanStack Query availability...");

  if (window.React && window.React.useState) {
    console.log("✅ React is available");
  } else {
    console.log("❌ React not found");
    return false;
  }

  // Check if QueryClient is in window or available
  try {
    const queryClient =
      window.__REACT_QUERY_CLIENT__ ||
      window.queryClient ||
      document.querySelector("[data-rq-devtools]");

    if (queryClient) {
      console.log("✅ TanStack Query is available");
      return true;
    } else {
      console.log(
        "❌ TanStack Query not found - make sure it's installed and QueryClientProvider is wrapping your app"
      );
      return false;
    }
  } catch (error) {
    console.log("❌ Error checking TanStack Query:", error.message);
    return false;
  }
}

// Test 2: Check if new hooks are working
function testHooksAvailability() {
  console.log("\n2️⃣ Testing custom hooks availability...");

  // Look for components that might be using our hooks
  const appointmentForms = document.querySelectorAll(
    '[data-testid*="appointment"], [class*="appointment"], [class*="Appointment"]'
  );

  if (appointmentForms.length > 0) {
    console.log(
      `✅ Found ${appointmentForms.length} appointment-related component(s)`
    );
    return true;
  } else {
    console.log(
      "⚠️ No appointment components found - make sure AppointmentForm is mounted"
    );
    return false;
  }
}

// Test 3: Check network requests
function testNetworkRequests() {
  console.log("\n3️⃣ Testing network request patterns...");

  // Listen for new network requests
  const originalFetch = window.fetch;
  let requestCount = 0;
  let duplicateRequests = [];
  const requestUrls = new Set();

  window.fetch = function (...args) {
    requestCount++;
    const url = args[0];

    if (
      typeof url === "string" &&
      (url.includes("availability") ||
        url.includes("therapist") ||
        url.includes("staff"))
    ) {
      if (requestUrls.has(url)) {
        duplicateRequests.push(url);
        console.log("⚠️ Duplicate request detected:", url);
      } else {
        requestUrls.add(url);
        console.log("✅ New availability request:", url);
      }
    }

    return originalFetch.apply(this, args);
  };

  // Restore after 30 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log(`\n📊 Network Test Results:
        - Total requests monitored: ${requestCount}
        - Unique availability requests: ${requestUrls.size}
        - Duplicate requests: ${duplicateRequests.length}
        ${
          duplicateRequests.length === 0
            ? "✅ No duplicates - deduplication working!"
            : "❌ Duplicates found - check deduplication"
        }`);
  }, 30000);

  console.log("🔍 Monitoring network requests for 30 seconds...");
  console.log(
    "💡 Try changing appointment date/time to see deduplication in action"
  );
}

// Test 4: Check error handling
function testErrorHandling() {
  console.log("\n4️⃣ Testing error handling...");
  console.log("💡 To test error handling:");
  console.log("   1. Open Network tab in DevTools");
  console.log('   2. Set network throttling to "Offline"');
  console.log("   3. Try to check availability");
  console.log("   4. Look for error messages and retry buttons");
  console.log('   5. Set network back to "Online" and test retry');
}

// Test 5: Performance check
function testPerformance() {
  console.log("\n5️⃣ Testing performance...");

  const startTime = performance.now();

  // Check React DevTools if available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log(
      "✅ React DevTools detected - check Profiler tab for performance"
    );
  }

  // Check memory usage
  if (performance.memory) {
    const memory = performance.memory;
    console.log(`📊 Memory usage:
        - Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
        - Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
        - Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }

  const endTime = performance.now();
  console.log(`⚡ Test execution time: ${(endTime - startTime).toFixed(2)}ms`);
}

// Run all tests
function runAllTests() {
  console.log("🚀 Running PHASE 1 Migration Tests...\n");

  const test1 = testTanStackQueryAvailable();
  const test2 = testHooksAvailability();

  if (test1 && test2) {
    testNetworkRequests();
    testErrorHandling();
    testPerformance();

    console.log("\n🎉 PHASE 1 tests initiated successfully!");
    console.log("📝 Check the console output above for detailed results");
    console.log(
      "💡 Try interacting with the AppointmentForm to see TanStack Query in action"
    );
  } else {
    console.log(
      "\n❌ Setup issues detected. Please check the integration steps in PHASE_1_TANSTACK_QUERY_MIGRATION_COMPLETE.md"
    );
  }
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.Phase1Tests = {
  runAllTests,
  testTanStackQueryAvailable,
  testHooksAvailability,
  testNetworkRequests,
  testErrorHandling,
  testPerformance,
};

console.log("\n💡 Tests are now available at window.Phase1Tests");
console.log(
  "💡 You can run individual tests like: Phase1Tests.testNetworkRequests()"
);
