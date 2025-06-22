/**
 * Service Health Check Utility
 * Tests that all performance optimization services can be imported and initialized correctly
 */

// Import all services
// import memoryManager from '../services/memoryManager'; // Removed - migrated to TanStack Query
// import cachePreloader from "../services/cachePreloader"; // Removed - was dependent on optimizedDataManager
import crossTabSync from "../services/crossTabSync"; // Migrated - now a stub that indicates TanStack Query handles this

/**
 * Perform a health check on all performance services
 * @returns {Object} Health check results
 */
export const performServiceHealthCheck = () => {
  const results = {
    timestamp: new Date().toISOString(),
    // memoryManager: null, // Removed - migrated to TanStack Query
    crossTabSync: null,
    // cachePreloader: null, // Removed - was dependent on optimizedDataManager
    overall: "unknown",
  };

  try {
    // Test Memory Manager - Migrated to TanStack Query
    console.log(
      "🔍 Memory Manager migrated to TanStack Query - memory management handled internally"
    );
    // results.memoryManager = { ... }; // Removed - migrated to TanStack Query
    console.log(
      "✅ Memory Manager: Migrated to TanStack Query (memory management handled internally)"
    );

    // Test Cross-Tab Sync (now handled by TanStack Query)
    console.log("🔍 Testing Cross-Tab Sync (now handled by TanStack Query)...");
    results.crossTabSync = {
      imported: !!crossTabSync,
      type: typeof crossTabSync,
      hasInitialize: typeof crossTabSync?.initialize === "function",
      methods: crossTabSync
        ? Object.getOwnPropertyNames(Object.getPrototypeOf(crossTabSync))
        : [],
      status: "unknown",
    };

    if (crossTabSync && typeof crossTabSync.initialize === "function") {
      results.crossTabSync.status = "migrated-to-tanstack-query";
      console.log("✅ Cross-Tab Sync: Migrated to TanStack Query");
    } else {
      results.crossTabSync.status = "error";
      console.error("❌ Cross-Tab Sync: Missing initialize method");
    }

    // Cache Preloader - Removed (was dependent on optimizedDataManager)
    console.log("🔍 Cache Preloader functionality migrated to TanStack Query");
    console.log(
      "✅ Cache Preloader: Handled by TanStack Query automatic caching"
    );

    // Overall status
    const allHealthy = Object.values(results)
      .filter((result) => typeof result === "object" && result?.status)
      .every((result) => result.status === "healthy");

    results.overall = allHealthy ? "healthy" : "degraded";

    console.log("🏥 Service Health Check Summary:", {
      overall: results.overall,
      // memoryManager: results.memoryManager.status, // Removed - migrated to TanStack Query
      crossTabSync: results.crossTabSync.status,
      // cachePreloader: results.cachePreloader.status, // Removed - was dependent on optimizedDataManager
    });
  } catch (error) {
    console.error("💥 Service Health Check Failed:", error);
    results.overall = "error";
    results.error = error.message;
  }

  return results;
};

/**
 * Quick service validation - logs results and returns boolean
 * @returns {boolean} True if all services are healthy
 */
export const validateServices = () => {
  const results = performServiceHealthCheck();
  return results.overall === "healthy";
};

export default {
  performServiceHealthCheck,
  validateServices,
};
