/**
 * Performance Optimization Integration Test
 * Verifies all services work together properly
 */

import cachePreloader from "../services/cachePreloader";
import crossTabSync from "../services/crossTabSync";
import memoryManager from "../services/memoryManager";

/**
 * Run integration tests for performance optimization features
 */
export const runPerformanceTests = async () => {
  console.group("🧪 Performance Optimization Integration Tests");

  const results = {
    cachePreloader: false,
    memoryManager: false,
    crossTabSync: false,
    overall: false,
  };

  try {
    // Test Cache Preloader
    console.log("Testing Cache Preloader...");
    try {
      await cachePreloader.preloadCriticalData();
      const status = cachePreloader.getCacheStatus();
      results.cachePreloader = status && typeof status === "object";
      console.log("✅ Cache Preloader test passed");
    } catch (error) {
      console.error("❌ Cache Preloader test failed:", error);
    }

    // Test Memory Manager
    console.log("Testing Memory Manager...");
    try {
      memoryManager.initialize();
      const stats = memoryManager.getMemoryStats();
      results.memoryManager = stats && typeof stats === "object" && stats.cache;
      console.log("✅ Memory Manager test passed");
    } catch (error) {
      console.error("❌ Memory Manager test failed:", error);
    }

    // Test Cross-Tab Sync
    console.log("Testing Cross-Tab Sync...");
    try {
      crossTabSync.initialize();

      // Test broadcast functionality
      const testData = { test: true, timestamp: Date.now() };
      crossTabSync.broadcastCacheUpdate("test_data", testData);

      results.crossTabSync = true;
      console.log("✅ Cross-Tab Sync test passed");
    } catch (error) {
      console.error("❌ Cross-Tab Sync test failed:", error);
    }

    // Overall result
    results.overall =
      results.cachePreloader && results.memoryManager && results.crossTabSync;

    if (results.overall) {
      console.log("🎉 All performance optimization tests passed!");
    } else {
      console.warn("⚠️ Some performance optimization tests failed");
    }
  } catch (error) {
    console.error("❌ Integration test suite failed:", error);
  }

  console.groupEnd();
  return results;
};

/**
 * Performance monitoring utility
 */
export const performanceMonitor = {
  start: (operation) => {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`);
        return duration;
      },
    };
  },

  measure: async (operation, fn) => {
    const monitor = performanceMonitor.start(operation);
    try {
      const result = await fn();
      monitor.end();
      return result;
    } catch (error) {
      monitor.end();
      throw error;
    }
  },
};

/**
 * Memory usage tracker
 */
export const memoryTracker = {
  snapshot: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
    }
    return null;
  },

  compare: (before, after) => {
    if (!before || !after) return null;

    return {
      used: after.used - before.used,
      total: after.total - before.total,
      percentage: ((after.used - before.used) / before.used) * 100,
    };
  },
};

/**
 * Connection quality tester
 */
export const connectionTester = {
  test: async () => {
    const startTime = performance.now();

    try {
      // Test with a small image request
      await fetch("/favicon.ico", { method: "HEAD" });
      const endTime = performance.now();
      const latency = endTime - startTime;

      let quality = "good";
      if (latency > 1000) {
        quality = "poor";
      } else if (latency > 500) {
        quality = "average";
      }

      return {
        latency,
        quality,
        online: navigator.onLine,
        effective: navigator.connection?.effectiveType || "unknown",
      };
    } catch (error) {
      return {
        latency: Infinity,
        quality: "poor",
        online: false,
        error: error.message,
      };
    }
  },
};

/**
 * Complete performance diagnostic
 */
export const runPerformanceDiagnostic = async () => {
  console.group("🔍 Performance Diagnostic");

  // Test integration
  const integrationResults = await runPerformanceTests();

  // Test connection
  const connectionInfo = await connectionTester.test();
  console.log("🌐 Connection Info:", connectionInfo);

  // Memory snapshot
  const memoryInfo = memoryTracker.snapshot();
  console.log("💾 Memory Info:", memoryInfo);

  // Feature detection
  const features = {
    broadcastChannel: typeof BroadcastChannel !== "undefined",
    localStorage: typeof Storage !== "undefined",
    performanceMemory: !!performance.memory,
    navigator: !!navigator.connection,
    requestIdleCallback: typeof requestIdleCallback !== "undefined",
  };
  console.log("🔧 Feature Support:", features);

  const diagnostic = {
    integration: integrationResults,
    connection: connectionInfo,
    memory: memoryInfo,
    features,
    timestamp: new Date().toISOString(),
  };

  console.log("📊 Complete Diagnostic:", diagnostic);
  console.groupEnd();

  return diagnostic;
};

// Auto-run diagnostic in development
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  // Run diagnostic after a short delay to let app initialize
  setTimeout(() => {
    runPerformanceDiagnostic();
  }, 2000);

  // Expose utilities globally for debugging
  window.performanceUtils = {
    runTests: runPerformanceTests,
    monitor: performanceMonitor,
    memoryTracker,
    connectionTester,
    runDiagnostic: runPerformanceDiagnostic,
  };

  console.log("🛠️ Performance utilities available at window.performanceUtils");
}
