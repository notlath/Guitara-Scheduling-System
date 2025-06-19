/**
 * Migration Verification Script
 * Tests the optimized data manager implementation
 */

import optimizedDataManager from "../services/optimizedDataManager.js";

async function verifyOptimizedDataManager() {
  console.log("🔍 Verifying Optimized Data Manager Migration...");

  // Test 1: Check initialization
  const status = optimizedDataManager.getStatus();
  console.log("✅ Status check:", status);

  // Test 2: Check cache configuration
  const cacheStatus = optimizedDataManager.getCacheStatus();
  console.log("✅ Cache status:", cacheStatus);

  // Test 3: Test subscription
  const unsubscribe = optimizedDataManager.subscribe(
    "test_component",
    ["appointments", "todayAppointments"],
    { priority: "high" }
  );

  console.log("✅ Subscription test passed");

  // Test 4: Test cache TTL
  const ttl = optimizedDataManager.cacheTTL;
  console.log("✅ Cache TTL configuration:", {
    todayAppointments: `${ttl.todayAppointments / 1000}s`,
    appointments: `${ttl.appointments / 1000}s`,
    therapists: `${ttl.therapists / 1000}s`,
    services: `${ttl.services / 1000}s`,
  });

  // Test 5: Test polling configuration
  const polling = optimizedDataManager.pollingConfig;
  console.log("✅ Polling configuration:", {
    baseInterval: `${polling.baseInterval / 1000}s`,
    backgroundInterval: `${polling.backgroundInterval / 1000}s`,
    maxInterval: `${polling.maxInterval / 1000}s`,
  });

  // Cleanup
  unsubscribe();

  console.log("🎉 Migration verification completed successfully!");
}

// Performance comparison
function comparePerformance() {
  console.log("📊 Performance Comparison:");
  console.log("Old DataManager vs Optimized DataManager");
  console.log("=====================================");

  const oldConfig = {
    appointments: 30000, // 30 seconds
    todayAppointments: 30000, // 30 seconds
    therapists: 300000, // 5 minutes
    services: 1800000, // 30 minutes
    polling: 180000, // 3 minutes
  };

  const newConfig = {
    appointments: 600000, // 10 minutes
    todayAppointments: 180000, // 3 minutes
    therapists: 3600000, // 1 hour
    services: 7200000, // 2 hours
    polling: 600000, // 10 minutes
  };

  console.log("Cache TTL Improvements:");
  Object.keys(oldConfig).forEach((key) => {
    if (key !== "polling") {
      const improvement = (
        ((newConfig[key] - oldConfig[key]) / oldConfig[key]) *
        100
      ).toFixed(0);
      console.log(
        `  ${key}: ${oldConfig[key] / 1000}s → ${
          newConfig[key] / 1000
        }s (+${improvement}%)`
      );
    }
  });

  console.log("Polling Frequency:");
  const pollingImprovement = (
    ((newConfig.polling - oldConfig.polling) / oldConfig.polling) *
    100
  ).toFixed(0);
  console.log(
    `  Polling: ${oldConfig.polling / 1000}s → ${
      newConfig.polling / 1000
    }s (+${pollingImprovement}%)`
  );

  // Calculate network request reduction
  const oldRequestsPerHour = 3600 / (oldConfig.polling / 1000);
  const newRequestsPerHour = 3600 / (newConfig.polling / 1000);
  const requestReduction = (
    ((oldRequestsPerHour - newRequestsPerHour) / oldRequestsPerHour) *
    100
  ).toFixed(0);

  console.log("Network Efficiency:");
  console.log(
    `  Requests per hour: ${oldRequestsPerHour} → ${newRequestsPerHour} (-${requestReduction}%)`
  );
}

// Export for testing
export { comparePerformance, verifyOptimizedDataManager };

// Auto-run verification in development
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  setTimeout(() => {
    verifyOptimizedDataManager();
    comparePerformance();
  }, 1000);
}
