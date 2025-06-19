/**
 * Cache Preloading & Route-Based Prefetching Service
 * Implements Solution #1: Cache preloading with route-based prefetching
 */

import { isValidToken } from "../utils/authUtils.js";
import optimizedDataManager from "./optimizedDataManager.js";

class CachePreloader {
  constructor() {
    this.preloadScheduler = null;
    this.userRolePatterns = new Map();
    this.routeDataPatterns = new Map();
    this.preloadQueue = new Set();
    this.isPreloading = false;

    this.setupRouteDataMapping();
    this.setupUserRoleMapping();
  }

  /**
   * Setup route-based data mapping for intelligent prefetching
   */
  setupRouteDataMapping() {
    this.routeDataPatterns.set("/dashboard/therapist", {
      critical: ["appointments", "todayAppointments"],
      preload: ["upcomingAppointments", "notifications"],
      priority: "high",
    });

    this.routeDataPatterns.set("/dashboard/driver", {
      critical: ["appointments", "todayAppointments"],
      preload: ["upcomingAppointments"],
      priority: "high",
    });

    this.routeDataPatterns.set("/dashboard/operator", {
      critical: ["appointments", "todayAppointments", "notifications"],
      preload: ["upcomingAppointments"],
      priority: "high",
    });

    this.routeDataPatterns.set("/scheduling", {
      critical: ["appointments"],
      preload: ["todayAppointments", "upcomingAppointments"],
      priority: "medium",
    });

    this.routeDataPatterns.set("/settings", {
      critical: [],
      preload: ["appointments"], // Sometimes needed for context
      priority: "low",
    });
  }

  /**
   * Setup user role-based data patterns
   */
  setupUserRoleMapping() {
    this.userRolePatterns.set("therapist", {
      primary: ["appointments", "todayAppointments"],
      secondary: ["upcomingAppointments"],
      context: ["notifications"],
    });

    this.userRolePatterns.set("driver", {
      primary: ["appointments", "todayAppointments"],
      secondary: ["upcomingAppointments"],
      context: [],
    });

    this.userRolePatterns.set("operator", {
      primary: ["appointments", "todayAppointments", "notifications"],
      secondary: ["upcomingAppointments"],
      context: [],
    });
  }

  /**
   * Preload critical data on app startup
   */
  async preloadCriticalData(userRole = null) {
    console.log("📚 CachePreloader: Starting critical data preload");

    // Check if user is authenticated before preloading
    if (!isValidToken()) {
      console.log("⚠️ Skipping critical data preload - user not authenticated");
      return false;
    }

    const criticalDataTypes = new Set(["appointments", "todayAppointments"]);

    // Add role-specific critical data
    if (userRole && this.userRolePatterns.has(userRole)) {
      const rolePattern = this.userRolePatterns.get(userRole);
      rolePattern.primary.forEach((type) => criticalDataTypes.add(type));
    }

    // Preload in parallel without blocking UI
    const preloadPromises = Array.from(criticalDataTypes).map((dataType) =>
      this.preloadDataType(dataType, "critical").catch((error) => {
        console.warn(
          `⚠️ Critical preload failed for ${dataType}:`,
          error.message
        );
        return null; // Don't fail entire preload
      })
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log("📚 Critical data preloaded successfully");

      // Schedule secondary data preload
      this.scheduleSecondaryPreload(userRole);
    } catch (error) {
      console.warn("⚠️ Critical data preload encountered issues:", error);
    }
  }

  /**
   * Schedule secondary data preload (lower priority)
   */
  scheduleSecondaryPreload(userRole) {
    if (this.preloadScheduler) {
      clearTimeout(this.preloadScheduler);
    }

    this.preloadScheduler = setTimeout(() => {
      this.preloadSecondaryData(userRole);
    }, 2000); // Wait 2 seconds after critical data
  }

  /**
   * Preload secondary data based on user patterns
   */
  async preloadSecondaryData(userRole) {
    if (!userRole || !this.userRolePatterns.has(userRole)) return;

    const rolePattern = this.userRolePatterns.get(userRole);
    const secondaryTypes = [...rolePattern.secondary, ...rolePattern.context];

    console.log(`🔄 CachePreloader: Preloading secondary data for ${userRole}`);

    const preloadPromises = secondaryTypes.map((dataType) =>
      this.preloadDataType(dataType, "secondary").catch((error) => {
        console.warn(
          `⚠️ Secondary preload failed for ${dataType}:`,
          error.message
        );
        return null;
      })
    );

    await Promise.allSettled(preloadPromises);
    console.log("🔄 Secondary data preload completed");
  }

  /**
   * Smart cache warming based on user navigation patterns
   */
  warmCacheForRoute(route, userRole = null) {
    const routePattern = this.routeDataPatterns.get(route);
    if (!routePattern) return;

    console.log(`🚀 CachePreloader: Warming cache for route ${route}`);

    // Immediate critical data
    routePattern.critical.forEach((dataType) => {
      this.preloadDataType(dataType, "route-critical");
    });

    // Delayed preload data
    setTimeout(() => {
      routePattern.preload.forEach((dataType) => {
        this.preloadDataType(dataType, "route-preload");
      });
    }, 500);

    // Role-specific enhancements
    if (userRole && this.userRolePatterns.has(userRole)) {
      const rolePattern = this.userRolePatterns.get(userRole);
      setTimeout(() => {
        rolePattern.context.forEach((dataType) => {
          this.preloadDataType(dataType, "role-context");
        });
      }, 1000);
    }
  }

  /**
   * Preload specific data type with priority handling
   */
  async preloadDataType(dataType, priority = "normal") {
    // Check if already cached and valid
    if (optimizedDataManager.isCacheValid(dataType)) {
      console.log(`💾 CachePreloader: ${dataType} already cached, skipping`);
      return;
    }

    // Avoid duplicate preload requests
    const queueKey = `${dataType}-${priority}`;
    if (this.preloadQueue.has(queueKey)) {
      console.log(`⏳ CachePreloader: ${dataType} already queued for preload`);
      return;
    }

    this.preloadQueue.add(queueKey);

    try {
      console.log(`📡 CachePreloader: Preloading ${dataType} (${priority})`);
      await optimizedDataManager.fetchDataType(dataType);
      console.log(`✅ CachePreloader: Successfully preloaded ${dataType}`);
    } catch (error) {
      console.warn(
        `❌ CachePreloader: Failed to preload ${dataType}:`,
        error.message
      );
    } finally {
      this.preloadQueue.delete(queueKey);
    }
  }

  /**
   * Predictive preloading based on user navigation patterns
   */
  analyzeAndPrefetch(currentRoute) {
    // Simple prediction algorithm
    const predictions = this.predictNextRoutes(currentRoute);

    predictions.forEach(({ route, probability }) => {
      if (probability > 0.7) {
        console.log(
          `🔮 CachePreloader: Predictive prefetch for ${route} (${Math.round(
            probability * 100
          )}% confidence)`
        );
        this.warmCacheForRoute(route);
      }
    });
  }

  /**
   * Simple route prediction algorithm
   */
  predictNextRoutes(currentRoute) {
    // Common navigation patterns
    const navigationPatterns = {
      "/dashboard/therapist": [
        { route: "/scheduling", probability: 0.8 },
        { route: "/scheduling/calendar", probability: 0.6 },
      ],
      "/dashboard/driver": [{ route: "/scheduling", probability: 0.7 }],
      "/dashboard/operator": [
        { route: "/scheduling", probability: 0.9 },
        { route: "/settings", probability: 0.5 },
      ],
      "/scheduling": [
        { route: "/scheduling/calendar", probability: 0.8 },
        { route: "/scheduling/week", probability: 0.6 },
      ],
    };

    return navigationPatterns[currentRoute] || [];
  }

  /**
   * Manual cache warming for specific data types
   */
  warmSpecificData(dataTypes = []) {
    console.log(
      "🔥 CachePreloader: Manual cache warming requested for:",
      dataTypes
    );

    dataTypes.forEach((dataType) => {
      this.preloadDataType(dataType, "manual");
    });
  }

  /**
   * Check preload health and status
   */
  getPreloadStatus() {
    return {
      isPreloading: this.preloadQueue.size > 0,
      queueSize: this.preloadQueue.size,
      queuedItems: Array.from(this.preloadQueue),
      routePatterns: Object.fromEntries(this.routeDataPatterns),
      userPatterns: Object.fromEntries(this.userRolePatterns),
    };
  }

  /**
   * Get cache status - alias for getPreloadStatus for compatibility
   */
  getCacheStatus() {
    return this.getPreloadStatus();
  }

  /**
   * Clear all preload state
   */
  reset() {
    if (this.preloadScheduler) {
      clearTimeout(this.preloadScheduler);
      this.preloadScheduler = null;
    }

    this.preloadQueue.clear();
    console.log("🧹 CachePreloader: Reset completed");
  }
}

// Create singleton instance
const cachePreloader = new CachePreloader();

export default cachePreloader;
