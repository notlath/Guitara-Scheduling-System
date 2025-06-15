/**
 * Development debugging utilities for DataManager timeout issues
 * Auto-loaded only in development environments
 */

// Only run in development
if (
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname.includes("dev") ||
    window.location.port)
) {
  // Global debug helpers
  window.dataManagerUtils = {
    // Quick debug command to check current state
    status: () => {
      console.group("📊 DataManager Status");

      // Import dataManager dynamically to avoid circular dependencies
      import("../services/dataManager.js").then(({ default: dataManager }) => {
        console.log("Subscribers:", dataManager.subscribers.size);
        console.log(
          "Requests in flight:",
          Array.from(dataManager.requestsInFlight.keys())
        );
        console.log("Is polling:", dataManager.isPolling);
        console.log("Cache status:", dataManager.getCacheStatus());
        console.log("Circuit breakers:", dataManager.getCircuitBreakerStatus());
        console.groupEnd();
      });
    },

    // Force reset everything
    reset: () => {
      import("../services/dataManager.js").then(({ default: dataManager }) => {
        console.log("🔄 Resetting DataManager...");
        dataManager.reset();
        console.log("✅ DataManager reset complete");
      });
    },

    // Check for React Strict Mode issues
    checkStrictMode: () => {
      console.group("🔍 React Strict Mode Check");
      console.log(
        "Development environment detected:",
        window.location.hostname === "localhost"
      );

      // Check for double logging patterns that indicate Strict Mode
      let logCount = 0;
      const originalLog = console.log;
      console.log = (...args) => {
        if (args[0] && args[0].includes("📡 DataManager:")) {
          logCount++;
        }
        originalLog.apply(console, args);
      };

      setTimeout(() => {
        console.log = originalLog;
        console.log("Subscription log count in last 1s:", logCount);
        if (logCount > 2) {
          console.warn(
            "⚠️ Multiple subscriptions detected - likely React Strict Mode"
          );
          console.log(
            "💡 This is normal in development but causes duplicate API calls"
          );
        }
        console.groupEnd();
      }, 1000);
    },

    // Check timeout performance after updates
    checkTimeoutIssues: () => {
      import("../services/dataManager.js").then(({ default: dataManager }) => {
        console.group("⏱️ Timeout Issue Analysis");

        const circuitBreakers = dataManager.getCircuitBreakerStatus();
        const hasTimeoutIssues = Object.values(circuitBreakers).some(
          (cb) => cb.failures > 0
        );

        if (hasTimeoutIssues) {
          console.warn("⚠️ Timeout issues detected!");
          console.table(circuitBreakers);
          console.log(
            "💡 Backend may be slower than expected (>20s response times)"
          );
          console.log(
            "💡 Try: window.dataManagerUtils.reset() to clear failed states"
          );
        } else {
          console.log("✅ No timeout issues detected");
        }

        // Check for React Strict Mode issues
        dataManager.detectStrictModeIssues();

        console.groupEnd();
      });
    },

    // Monitor API call performance
    monitorAPI: () => {
      import("../utils/performanceMonitor.js").then(
        ({ default: performanceMonitor }) => {
          console.group("📈 API Performance Monitor");
          performanceMonitor.logPerformanceReport();
          console.groupEnd();
        }
      );
    },

    // Help command
    help: () => {
      console.group("🛠️ DataManager Debug Commands");
      console.log("window.dataManagerUtils.status() - Check current state");
      console.log("window.dataManagerUtils.reset() - Reset everything");
      console.log(
        "window.dataManagerUtils.checkStrictMode() - Check for React Strict Mode"
      );
      console.log(
        "window.dataManagerUtils.monitorAPI() - Show API performance"
      );
      console.log("window.dataManagerUtils.help() - Show this help");
      console.groupEnd();
    },
  };

  // Auto-show help on first load
  console.log(
    "🛠️ DataManager debug utilities loaded! Type window.dataManagerUtils.help() for commands."
  );

  // Monitor for excessive API calls
  let apiCallCount = 0;
  const originalFetch = window.fetch;

  window.fetch = (...args) => {
    if (args[0] && args[0].includes("appointments")) {
      apiCallCount++;
      console.log(`📡 API Call #${apiCallCount}: ${args[0]}`);

      // Warn if too many calls in short time
      if (apiCallCount > 5) {
        console.warn(
          "⚠️ Excessive API calls detected! Check for duplicate requests."
        );
      }
    }
    return originalFetch.apply(window, args);
  };

  // Reset counter every 30 seconds
  setInterval(() => {
    if (apiCallCount > 0) {
      console.log(`📊 API calls in last 30s: ${apiCallCount}`);
      apiCallCount = 0;
    }
  }, 30000);
}

export default {}; // Empty export for module compatibility
