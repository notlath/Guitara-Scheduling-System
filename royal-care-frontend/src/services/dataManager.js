/**
 * Simple, Robust DataManager - Rewritten to eliminate errors
 *
 * Focus: Reliability over complexity
 * - No aggressive cancellation
 * - Simple request deduplication
 * - Graceful error handling
 * - Clean React integration
 */

import {
  fetchAppointments,
  fetchNotifications,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../features/scheduling/schedulingSlice";
import store from "../store";

class DataManager {
  constructor() {
    // Core tracking
    this.subscribers = new Map();
    this.cache = new Map();
    this.requestsInFlight = new Map();
    this.pollingInterval = null;
    this.isPolling = false;

    // Simple configuration
    this.cacheTTL = {
      appointments: 30000, // 30 seconds
      todayAppointments: 30000, // 30 seconds
      upcomingAppointments: 60000, // 1 minute
      notifications: 45000, // 45 seconds
    };

    // Memory management thresholds
    this.memoryThresholds = {
      maxCacheSize: 1000, // Max items in cache
      maxAge: 1800000, // 30 minutes max age
      cleanupInterval: 300000, // 5 minutes cleanup interval
    };

    // Performance tracking for enhanced deduplication
    this.recentOperations = [];
    this.maxRecentOperations = 50;

    // Activity tracking
    this.lastUserActivity = Date.now();
    this.isTabVisible = !document.hidden;

    // Setup activity listeners
    this.setupActivityTracking();
    this.setupVisibilityTracking();

    // Start memory cleanup
    this.startMemoryCleanup();

    // Development mode utilities
    this.isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname.includes("dev") ||
      window.location.port;

    if (this.isDevelopment) {
      this.setupDevUtils();
    }

    console.log("📡 DataManager: Initialized (Simple Mode)");
  }

  /**
   * Subscribe component to data updates
   */
  subscribe(componentId, dataTypes, options = {}) {
    console.log(`📡 DataManager: ${componentId} subscribing to:`, dataTypes);

    // Store subscription
    this.subscribers.set(componentId, {
      dataTypes: new Set(dataTypes),
      options,
      timestamp: Date.now(),
    });

    // Start polling if first subscriber
    if (this.subscribers.size === 1) {
      this.startPolling();
    } else {
      // Fetch immediately for new subscriber
      this.fetchNeededData();
    }

    // Return unsubscribe function
    return () => this.unsubscribe(componentId);
  }

  /**
   * Unsubscribe component
   */
  unsubscribe(componentId) {
    console.log(`📡 DataManager: ${componentId} unsubscribing`);
    this.subscribers.delete(componentId);

    // Stop polling if no subscribers
    if (this.subscribers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start polling
   */
  startPolling() {
    if (this.isPolling) return;

    console.log("🔄 DataManager: Starting polling");
    this.isPolling = true;

    // Initial fetch
    this.fetchNeededData();

    // Setup polling interval
    this.pollingInterval = setInterval(() => {
      if (this.subscribers.size > 0) {
        this.fetchNeededData();
      }
    }, this.getPollingInterval());
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (!this.isPolling) return;

    console.log("⏹️ DataManager: Stopping polling");
    this.isPolling = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch data needed by current subscribers
   */
  async fetchNeededData() {
    if (this.subscribers.size === 0) return;

    // Collect needed data types
    const neededTypes = new Set();
    this.subscribers.forEach(({ dataTypes }) => {
      dataTypes.forEach((type) => neededTypes.add(type));
    });

    console.log(
      "🔄 DataManager: Fetching needed data:",
      Array.from(neededTypes)
    );

    // Fetch each needed type
    const promises = Array.from(neededTypes).map((dataType) =>
      this.fetchDataType(dataType).catch((error) => {
        console.warn(
          `⚠️ DataManager: Failed to fetch ${dataType}:`,
          error.message
        );
        return null; // Don't let one failure stop others
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Fetch specific data type with enhanced deduplication and progressive loading
   */
  async fetchDataType(dataType) {
    // Enhanced deduplication - return existing promise if in flight
    if (this.requestsInFlight.has(dataType)) {
      console.log(
        `⏳ DataManager: ${dataType} request already in flight, returning shared promise`
      );
      return this.requestsInFlight.get(dataType);
    }

    // Check cache first and return immediately if valid
    const cached = this.cache.get(dataType);
    if (this.isCacheValid(dataType)) {
      console.log(`💾 DataManager: Using cached ${dataType}`);

      // For immediate data display, return cached data right away
      // But also trigger background refresh if cache is getting stale
      const cacheAge = Date.now() - cached.timestamp;
      const ttl = this.cacheTTL[dataType] || 30000;
      const staleThreshold = ttl * 0.7; // Refresh when 70% of TTL elapsed

      if (cacheAge > staleThreshold) {
        console.log(
          `🔄 DataManager: Background refresh for ${dataType} (cache aging)`
        );
        // Trigger background refresh without blocking current request
        setTimeout(() => this.performBackgroundRefresh(dataType), 100);
      }

      return cached.data;
    }

    // Create new request promise with progressive loading
    const requestPromise = this.createRequest(dataType)
      .then((result) => {
        // Cache the result with metadata
        this.cache.set(dataType, {
          data: result,
          timestamp: Date.now(),
          fetchCount: (cached?.fetchCount || 0) + 1,
          lastError: null,
        });

        // Track successful operation
        this.trackOperation(dataType, true);

        return result;
      })
      .catch((error) => {
        // Track failed operation but preserve last good cache if available
        this.trackOperation(dataType, false, error);

        // If we have stale cached data, use it as fallback
        if (cached && cached.data) {
          console.warn(
            `⚠️ DataManager: API failed for ${dataType}, using stale cache`,
            error.message
          );
          // Update cache with error info but keep data
          this.cache.set(dataType, {
            ...cached,
            lastError: error,
            errorTimestamp: Date.now(),
          });
          return cached.data;
        }

        throw error;
      })
      .finally(() => {
        // Always cleanup the in-flight request
        this.requestsInFlight.delete(dataType);
      });

    // Store the promise so other calls can share it
    this.requestsInFlight.set(dataType, requestPromise);

    return requestPromise;
  }

  /**
   * Perform background refresh without blocking UI
   */
  async performBackgroundRefresh(dataType) {
    if (this.requestsInFlight.has(dataType)) {
      return; // Already refreshing
    }

    try {
      console.log(
        `🔄 DataManager: Background refresh starting for ${dataType}`
      );
      await this.fetchDataType(dataType);
      console.log(
        `✅ DataManager: Background refresh completed for ${dataType}`
      );
    } catch (error) {
      console.warn(
        `⚠️ DataManager: Background refresh failed for ${dataType}:`,
        error.message
      );
    }
  }

  /**
   * Create API request
   */
  async createRequest(dataType) {
    console.log(`🌐 DataManager: Making API request for ${dataType}`);

    let apiPromise;
    switch (dataType) {
      case "appointments":
        apiPromise = store.dispatch(fetchAppointments());
        break;
      case "todayAppointments":
        apiPromise = store.dispatch(fetchTodayAppointments());
        break;
      case "upcomingAppointments":
        apiPromise = store.dispatch(fetchUpcomingAppointments());
        break;
      case "notifications":
        apiPromise = store.dispatch(fetchNotifications());
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    const result = await apiPromise;
    console.log(`✅ DataManager: Successfully fetched ${dataType}`);
    return result;
  }

  /**
   * Check if cached data is valid
   */
  isCacheValid(dataType) {
    const cached = this.cache.get(dataType);
    if (!cached) return false;

    const ttl = this.cacheTTL[dataType] || 30000;
    const age = Date.now() - cached.timestamp;

    return age < ttl;
  }

  /**
   * Get polling interval based on activity and error rate
   */
  getPollingInterval() {
    const timeSinceActivity = Date.now() - this.lastUserActivity;
    const errorRate = this.getErrorRate();

    let baseInterval = 30000; // 30 seconds base

    // Activity-based adjustment
    if (!this.isTabVisible) {
      baseInterval = 120000; // 2 minutes when tab not visible
    } else if (timeSinceActivity < 30000) {
      // 30 seconds
      baseInterval = 10000; // More aggressive when very active
    } else if (timeSinceActivity < 60000) {
      // 1 minute
      baseInterval = 15000; // 15 seconds when recently active
    }

    // Error-based exponential backoff
    if (errorRate > 0.2) {
      // >20% error rate
      const backoffMultiplier = Math.min(Math.pow(2, errorRate * 5), 10); // Max 10x
      baseInterval = Math.min(baseInterval * backoffMultiplier, 300000); // Max 5 minutes
      console.log(
        `⚠️ DataManager: High error rate (${Math.round(
          errorRate * 100
        )}%), backing off to ${baseInterval}ms`
      );
    }

    return baseInterval;
  }

  /**
   * Force refresh data with selective invalidation
   */
  async forceRefresh(dataTypes = []) {
    console.log("🔥 DataManager: Force refresh requested");

    // Clear cache for specified types or all
    if (dataTypes.length === 0) {
      this.cache.clear();
      console.log("🔥 DataManager: Cleared all cache");
    } else {
      dataTypes.forEach((type) => {
        this.cache.delete(type);
        console.log(`🔥 DataManager: Cleared cache for ${type}`);
      });
    }

    // Cancel any pending requests for the types being refreshed
    const typesToCancel =
      dataTypes.length === 0
        ? Array.from(this.requestsInFlight.keys())
        : dataTypes.filter((type) => this.requestsInFlight.has(type));

    typesToCancel.forEach((type) => {
      console.log(`🚫 DataManager: Cancelling in-flight request for ${type}`);
      this.requestsInFlight.delete(type);
    });

    // Fetch immediately
    await this.fetchNeededData();
  }

  /**
   * Activity tracking
   */
  setupActivityTracking() {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.lastUserActivity = Date.now();
        },
        { passive: true }
      );
    });
  }

  /**
   * Visibility tracking
   */
  setupVisibilityTracking() {
    document.addEventListener("visibilitychange", () => {
      this.isTabVisible = !document.hidden;
      console.log(
        `👁️ DataManager: Tab visibility changed - visible: ${this.isTabVisible}`
      );
    });
  }

  /**
   * Development utilities
   */
  setupDevUtils() {
    window.dataManagerEmergency = {
      reset: () => this.reset(),
      status: () => this.getStatus(),
      diagnose: () => this.diagnose(),
      clearCache: () => this.cache.clear(),
      // Enhanced debugging utilities
      getErrorRate: () => this.getErrorRate(),
      cleanupNow: () => {
        this.cleanupExpiredCache();
        this.cleanupOldMetrics();
      },
      getRecentOperations: () => this.recentOperations,
      forceRefresh: (types) => this.forceRefresh(types),
    };

    console.log(
      "🛠️ DataManager: Development utilities available on window.dataManagerEmergency"
    );
  }

  /**
   * Reset everything with enhanced cleanup
   */
  reset() {
    console.log("🔄 DataManager: Resetting...");

    this.stopPolling();
    this.cache.clear();
    this.requestsInFlight.clear();

    // Clear performance tracking
    this.recentOperations = [];

    // Restart if we have subscribers
    if (this.subscribers.size > 0) {
      setTimeout(() => this.startPolling(), 1000);
    }

    console.log("✅ DataManager: Reset complete");
  }

  /**
   * Get current status with enhanced metrics
   */
  getStatus() {
    const errorRate = this.getErrorRate();
    const memoryUsage = {
      cacheSize: this.cache.size,
      maxCacheSize: this.memoryThresholds.maxCacheSize,
      recentOperations: this.recentOperations.length,
      maxRecentOperations: this.maxRecentOperations,
    };

    return {
      subscribers: this.subscribers.size,
      isPolling: this.isPolling,
      requestsInFlight: Array.from(this.requestsInFlight.keys()),
      memory: memoryUsage,
      performance: {
        errorRate: Math.round(errorRate * 100) + "%",
        pollingInterval: this.getPollingInterval(),
      },
      isTabVisible: this.isTabVisible,
      lastActivity: new Date(this.lastUserActivity).toLocaleTimeString(),
    };
  }

  /**
   * Enhanced diagnostics with performance insights
   */
  diagnose() {
    const status = this.getStatus();

    console.group("🩺 DataManager Enhanced Diagnostics");
    console.log("Status:", status);

    if (status.requestsInFlight.length > 0) {
      console.warn("⚠️ Requests in flight:", status.requestsInFlight);
    }

    if (status.subscribers === 0 && status.isPolling) {
      console.warn("⚠️ Polling with no subscribers");
    }

    // Memory analysis
    console.log("Memory Usage:");
    console.log(
      `  Cache: ${status.memory.cacheSize}/${status.memory.maxCacheSize} entries`
    );
    console.log(
      `  Recent Operations: ${status.memory.recentOperations}/${status.memory.maxRecentOperations} entries`
    );

    // Performance analysis
    console.log("Performance:");
    console.log(`  Error Rate: ${status.performance.errorRate}`);
    console.log(
      `  Current Polling Interval: ${status.performance.pollingInterval}ms`
    );

    // Cache analysis
    console.log("Cache contents:");
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      const ttl = this.cacheTTL[key] || 30000;
      const isValid = age < ttl;
      console.log(
        `  ${key}: ${Math.round(age / 1000)}s old ${isValid ? "✅" : "❌"}`
      );
    });

    // Recent operations summary
    if (this.recentOperations.length > 0) {
      const successCount = this.recentOperations.filter(
        (op) => op.success
      ).length;
      const errorCount = this.recentOperations.length - successCount;
      console.log(
        `Recent Operations: ${successCount} success, ${errorCount} errors`
      );
    }

    console.groupEnd();

    return status;
  }

  /**
   * Required methods for compatibility
   */
  getSubscriberInfo() {
    const info = {};
    this.subscribers.forEach((data, id) => {
      info[id] = {
        dataTypes: Array.from(data.dataTypes),
        options: data.options,
        subscribed: new Date(data.timestamp).toLocaleTimeString(),
      };
    });
    return info;
  }

  getCircuitBreakerStatus() {
    // Simple implementation - no circuit breaker in this version
    return {};
  }

  getCacheStatus() {
    const status = {};
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      const ttl = this.cacheTTL[key] || 30000;
      status[key] = {
        hasData: !!value.data,
        age: age,
        ttl: ttl,
        isValid: age < ttl,
      };
    });
    return status;
  }

  getPerformanceReport() {
    return {
      subscribers: this.getSubscriberInfo(),
      cache: this.getCacheStatus(),
      polling: {
        isPolling: this.isPolling,
        interval: this.getPollingInterval(),
        isTabVisible: this.isTabVisible,
      },
      requestsInFlight: Array.from(this.requestsInFlight.keys()),
    };
  }

  logPerformanceReport() {
    const report = this.getPerformanceReport();
    console.group("📊 DataManager Performance Report");
    console.log("Subscribers:", Object.keys(report.subscribers).length);
    console.log("Cache status:", report.cache);
    console.log("Polling:", report.polling);
    console.log("Requests in flight:", report.requestsInFlight);
    console.groupEnd();
  }

  /**
   * Start memory cleanup with enhanced thresholds
   */
  startMemoryCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
      this.cleanupOldMetrics();
      this.checkMemoryPressure();
    }, this.memoryThresholds.cleanupInterval);

    console.log("🧹 DataManager: Memory cleanup started");
  }

  /**
   * Enhanced cache cleanup with selective eviction
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    let forceEvicted = 0;

    // First pass: Remove truly expired entries
    for (const [key, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      const ttl = this.cacheTTL[key] || 30000;

      if (age > Math.max(ttl * 2, this.memoryThresholds.maxAge)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Second pass: If cache is still too large, evict LRU entries
    if (this.cache.size > this.memoryThresholds.maxCacheSize) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      ); // Oldest first

      const toEvict = this.cache.size - this.memoryThresholds.maxCacheSize;
      for (let i = 0; i < toEvict; i++) {
        this.cache.delete(entries[i][0]);
        forceEvicted++;
      }
    }

    if (cleaned > 0 || forceEvicted > 0) {
      console.log(
        `🧹 DataManager: Cleaned ${cleaned} expired, evicted ${forceEvicted} LRU entries`
      );
    }
  }

  /**
   * Clean up old performance metrics
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - 300000; // Keep last 5 minutes
    const originalLength = this.recentOperations.length;

    this.recentOperations = this.recentOperations.filter(
      (op) => op.timestamp > cutoff
    );

    // Keep only the most recent if still too many
    if (this.recentOperations.length > this.maxRecentOperations) {
      this.recentOperations = this.recentOperations.slice(
        -this.maxRecentOperations
      );
    }

    const cleaned = originalLength - this.recentOperations.length;
    if (cleaned > 0) {
      console.log(`🧹 DataManager: Cleaned ${cleaned} old performance metrics`);
    }
  }

  /**
   * Check for memory pressure and take action
   */
  checkMemoryPressure() {
    const cacheRatio = this.cache.size / this.memoryThresholds.maxCacheSize;
    const metricsRatio =
      this.recentOperations.length / this.maxRecentOperations;

    if (cacheRatio > 0.8) {
      console.warn(
        `⚠️ DataManager: High cache usage (${Math.round(cacheRatio * 100)}%)`
      );

      // Force more aggressive cleanup
      if (cacheRatio > 0.9) {
        this.aggressiveCleanup();
      }
    }

    if (metricsRatio > 0.8) {
      console.warn(
        `⚠️ DataManager: High metrics usage (${Math.round(
          metricsRatio * 100
        )}%)`
      );
    }
  }

  /**
   * Aggressive cleanup for memory pressure
   */
  aggressiveCleanup() {
    console.log("🔥 DataManager: Performing aggressive cleanup");

    const now = Date.now();
    let cleaned = 0;

    // Remove entries older than half their TTL
    for (const [key, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      const ttl = this.cacheTTL[key] || 30000;

      if (age > ttl * 0.5) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Trim metrics more aggressively
    this.recentOperations = this.recentOperations.slice(
      -Math.floor(this.maxRecentOperations * 0.5)
    );

    console.log(
      `🔥 DataManager: Aggressively cleaned ${cleaned} cache entries`
    );
  }

  /**
   * Enhanced operation tracking with performance metrics
   */
  trackOperation(dataType, success, error = null) {
    const operation = {
      dataType,
      success,
      error: error?.message || null,
      timestamp: Date.now(),
    };

    this.recentOperations.push(operation);

    // Keep only recent operations
    if (this.recentOperations.length > this.maxRecentOperations) {
      this.recentOperations.shift();
    }
  }

  /**
   * Calculate error rate from recent operations
   */
  getErrorRate() {
    if (this.recentOperations.length === 0) return 0;

    const errors = this.recentOperations.filter((op) => !op.success).length;
    return errors / this.recentOperations.length;
  }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
