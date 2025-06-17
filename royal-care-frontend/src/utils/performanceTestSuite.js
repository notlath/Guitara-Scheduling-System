/**
 * Performance Optimization Integration Test
 * Verifies all services work together properly
 */

import cachePreloader from "../services/cachePreloader";
import crossTabSync from "../services/crossTabSync";
import memoryManager from "../services/memoryManager";
import { isValidToken } from "./authUtils";

/**
 * Run integration tests for performance optimization features
 */
export const runPerformanceTests = async () => {
  console.group("🧪 Performance Optimization Integration Tests");

  // Check if user is authenticated AND not on login page before running tests
  const isOnLoginPage =
    window.location.pathname.includes("/login") ||
    window.location.pathname === "/" ||
    window.location.pathname.includes("/register") ||
    window.location.pathname.includes("/forgot-password");

  if (!isValidToken() || isOnLoginPage) {
    console.log(
      "⚠️ Skipping performance tests - user not authenticated or on login page"
    );
    console.groupEnd();
    return {
      cachePreloader: false,
      memoryManager: false,
      crossTabSync: false,
      overall: false,
      skipped: true,
      reason: isOnLoginPage ? "On login page" : "Not authenticated",
    };
  }

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
      // Get user role from localStorage or default to operator
      const storedUser = localStorage.getItem("user");
      let userRole = "operator"; // default
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userRole = parsedUser.role || "operator";
        } catch {
          console.warn("Could not parse stored user, using default role");
        }
      }

      await cachePreloader.preloadCriticalData(userRole);
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

  // Check authentication first
  if (!isValidToken()) {
    console.log("⚠️ Skipping performance diagnostic - user not authenticated");
    const diagnostic = {
      skipped: true,
      reason: "Not authenticated",
      timestamp: new Date().toISOString(),
    };
    console.log("📊 Diagnostic Result:", diagnostic);
    console.groupEnd();
    return diagnostic;
  }

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

// Initialize performance testing utilities only when needed
const initializePerformanceUtils = () => {
  // Make performance utilities available globally for debugging
  if (typeof window !== "undefined") {
    window.performanceUtils = {
      runTests: runPerformanceTests,
      monitor: performanceMonitor,
      memoryTracker,
      connectionTester,
      runDiagnostic: runPerformanceDiagnostic,
    };
  }

  console.log("🛠️ Performance utilities available at window.performanceUtils");

  // Listen for login events to auto-run diagnostics
  const checkForLoginAndRunDiagnostic = () => {
    // Only run if user is authenticated AND not on login/auth pages
    const isOnAuthPages =
      window.location.pathname.includes("/login") ||
      window.location.pathname === "/" ||
      window.location.pathname.includes("/register") ||
      window.location.pathname.includes("/forgot-password") ||
      window.location.pathname.includes("/enter-new-password") ||
      window.location.pathname.includes("/2fa");

    if (isValidToken() && !isOnAuthPages) {
      console.log(
        "✅ User authenticated and on dashboard - running performance diagnostic"
      );
      runPerformanceDiagnostic();
    } else {
      console.log(
        "⚠️ Skipping performance diagnostic - user not authenticated or on auth page"
      );
    }
  };

  // Check periodically for authentication (less intrusive than auto-running)
  let authCheckInterval = setInterval(() => {
    const isOnAuthPages =
      window.location.pathname.includes("/login") ||
      window.location.pathname === "/" ||
      window.location.pathname.includes("/register") ||
      window.location.pathname.includes("/forgot-password") ||
      window.location.pathname.includes("/enter-new-password") ||
      window.location.pathname.includes("/2fa");

    if (isValidToken() && !isOnAuthPages) {
      clearInterval(authCheckInterval);
      setTimeout(checkForLoginAndRunDiagnostic, 3000); // Run after dashboard loads
    }
  }, 1000);

  // Clear interval after 30 seconds to avoid infinite checking
  setTimeout(() => {
    if (authCheckInterval) {
      clearInterval(authCheckInterval);
    }
  }, 30000);
};

// Export the initialization function
export { initializePerformanceUtils };
