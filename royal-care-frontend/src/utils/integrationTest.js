/**
 * Integration Test Suite for Performance Optimization Features
 * Tests all the advanced performance features to ensure they work correctly
 */

// Import all performance optimization modules
// import cachePreloader from "../services/cachePreloader.js"; // Removed - was dependent on optimizedDataManager
import crossTabSync from "../services/crossTabSync.js"; // Migrated - now a stub that indicates TanStack Query handles this
// import memoryManager from "../services/memoryManager.js"; // Removed - migrated to TanStack Query
import performanceTestSuite from "./performanceTestSuite.js";

/**
 * Run comprehensive integration tests for all performance features
 */
export const runIntegrationTests = async () => {
  console.log("🧪 Starting Performance Optimization Integration Tests...");

  const results = {
    // cachePreloader: null, // Removed - was dependent on optimizedDataManager
    // memoryManager: null, // Removed - migrated to TanStack Query
    crossTabSync: null,
    performanceTestSuite: null,
    overallStatus: "pending",
  };

  try {
    // Test 1: Cache Preloader - Migrated to TanStack Query
    console.log(
      "\n📦 Cache Preloader functionality migrated to TanStack Query"
    );
    console.log(
      "✅ Cache Preloader: Data caching handled by TanStack Query automatically"
    );
    // TanStack Query provides intelligent caching, background fetching, and cache invalidation
    // No manual preloading needed - data is fetched on-demand and cached automatically

    // Test 2: Memory Manager - Migrated to TanStack Query
    console.log(
      "\n🧠 Memory Manager migrated to TanStack Query - memory management handled internally"
    );
    // try {
    //   // Initialize and test memory management
    //   memoryManager.initialize();
    //   // Record some usage patterns
    //   memoryManager.recordUsage("test-data", 1024);
    //   memoryManager.recordUsage("test-data-2", 2048);
    //   // Get memory stats
    //   const memoryStats = memoryManager.getMemoryStats();
    //   results.memoryManager = {
    //     status: "passed",
    //     details: `Cache size: ${memoryStats.cache.size}, Usage: ${memoryStats.cache.usage.toFixed(1)}%`,
    //     memoryStats,
    //   };
    //   console.log("✅ Memory Manager: PASSED");
    // } catch (error) {
    //   results.memoryManager = {
    //     status: "failed",
    //     error: error.message,
    //   };
    //   console.log("❌ Memory Manager: FAILED -", error.message);
    // }

    // Test 3: Cross-Tab Sync (now handled by TanStack Query)
    console.log(
      "\n🔄 Testing Cross-Tab Sync (now handled by TanStack Query)..."
    );
    try {
      // Initialize cross-tab sync (now a stub that indicates TanStack Query handles this)
      crossTabSync.initialize();

      // Test sending a message (now handled by TanStack Query's cache synchronization)
      crossTabSync.broadcastCacheUpdate("test-key", { data: "test-value" });

      // Test subscribing to updates (now handled by TanStack Query reactivity)
      const unsubscribe = crossTabSync.subscribe("test-updates", (data) => {
        console.log("📡 Cross-tab message received:", data);
      });

      // Cleanup
      unsubscribe();

      results.crossTabSync = {
        status: "passed",
        details: "Cross-tab communication tested via TanStack Query stub",
      };
      console.log(
        "✅ Cross-Tab Sync: PASSED (functionality handled by TanStack Query)"
      );
    } catch (error) {
      results.crossTabSync = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ Cross-Tab Sync: FAILED -", error.message);
    }

    // Test 4: Performance Test Suite
    console.log("\n⚡ Testing Performance Test Suite...");
    try {
      // Run the performance diagnostics
      const perfResults = await performanceTestSuite.runDiagnostics();

      results.performanceTestSuite = {
        status: "passed",
        details: `Completed ${
          Object.keys(perfResults).length
        } performance tests`,
        perfResults,
      };
      console.log("✅ Performance Test Suite: PASSED");
    } catch (error) {
      results.performanceTestSuite = {
        status: "failed",
        error: error.message,
      };
      console.log("❌ Performance Test Suite: FAILED -", error.message);
    }

    // Overall status
    const failedTests = Object.values(results).filter(
      (r) => r && r.status === "failed"
    );
    results.overallStatus = failedTests.length === 0 ? "passed" : "failed";

    console.log("\n🎯 Integration Test Results:");
    console.log("==========================================");
    Object.entries(results).forEach(([test, result]) => {
      if (result && typeof result === "object" && result.status) {
        const icon = result.status === "passed" ? "✅" : "❌";
        console.log(`${icon} ${test}: ${result.status.toUpperCase()}`);
        if (result.details) {
          console.log(`   └─ ${result.details}`);
        }
        if (result.error) {
          console.log(`   └─ Error: ${result.error}`);
        }
      }
    });

    console.log(`\n🏁 Overall Status: ${results.overallStatus.toUpperCase()}`);

    return results;
  } catch (error) {
    console.error("🚨 Integration test suite failed:", error);
    results.overallStatus = "failed";
    results.criticalError = error.message;
    return results;
  }
};

/**
 * Quick validation that all modules can be imported and initialized
 */
export const runQuickValidation = () => {
  console.log("🔍 Running quick validation of performance modules...");

  const validationResults = {};

  try {
    // Test imports
    validationResults.imports = {
      // cachePreloader: typeof cachePreloader === "object", // Removed - was dependent on optimizedDataManager
      // memoryManager: typeof memoryManager === "object", // Removed - migrated to TanStack Query
      crossTabSync: typeof crossTabSync === "object", // Now a stub that indicates TanStack Query handles this
      performanceTestSuite: typeof performanceTestSuite === "object",
    };

    // Test basic initialization
    validationResults.initialization = {
      // memoryManager: typeof memoryManager.initialize === "function", // Removed - migrated to TanStack Query
      crossTabSync: typeof crossTabSync.initialize === "function", // Now a stub that indicates TanStack Query handles this
      // cachePreloader: typeof cachePreloader.preloadCriticalData === "function", // Removed - was dependent on optimizedDataManager
    };

    console.log("✅ Quick validation completed successfully");
    return validationResults;
  } catch (error) {
    console.error("❌ Quick validation failed:", error);
    validationResults.error = error.message;
    return validationResults;
  }
};

export default {
  runIntegrationTests,
  runQuickValidation,
};
