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

    // Activity tracking
    this.lastUserActivity = Date.now();
    this.isTabVisible = !document.hidden;

    // Setup activity listeners
    this.setupActivityTracking();
    this.setupVisibilityTracking();

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
   * Fetch specific data type with simple deduplication
   */
  async fetchDataType(dataType) {
    // Check if request already in flight
    if (this.requestsInFlight.has(dataType)) {
      console.log(
        `⏳ DataManager: ${dataType} request already in flight, waiting...`
      );
      return this.requestsInFlight.get(dataType);
    }

    // Check cache first
    if (this.isCacheValid(dataType)) {
      console.log(`💾 DataManager: Using cached ${dataType}`);
      return this.cache.get(dataType);
    }

    // Create new request
    const requestPromise = this.createRequest(dataType);
    this.requestsInFlight.set(dataType, requestPromise);

    try {
      const result = await requestPromise;

      // Cache the result
      this.cache.set(dataType, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      // Always cleanup
      this.requestsInFlight.delete(dataType);
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
   * Get polling interval based on activity
   */
  getPollingInterval() {
    const timeSinceActivity = Date.now() - this.lastUserActivity;
    const isRecentActivity = timeSinceActivity < 60000; // 1 minute

    if (!this.isTabVisible) {
      return 60000; // 1 minute when tab not visible
    } else if (isRecentActivity) {
      return 15000; // 15 seconds when recently active
    } else {
      return 30000; // 30 seconds when idle
    }
  }

  /**
   * Force refresh data
   */
  async forceRefresh(dataTypes = []) {
    console.log("🔥 DataManager: Force refresh requested");

    // Clear cache for specified types or all
    if (dataTypes.length === 0) {
      this.cache.clear();
    } else {
      dataTypes.forEach((type) => this.cache.delete(type));
    }

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
    };

    console.log(
      "🛠️ DataManager: Development utilities available on window.dataManagerEmergency"
    );
  }

  /**
   * Reset everything
   */
  reset() {
    console.log("🔄 DataManager: Resetting...");

    this.stopPolling();
    this.cache.clear();
    this.requestsInFlight.clear();

    // Restart if we have subscribers
    if (this.subscribers.size > 0) {
      setTimeout(() => this.startPolling(), 1000);
    }

    console.log("✅ DataManager: Reset complete");
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      subscribers: this.subscribers.size,
      isPolling: this.isPolling,
      requestsInFlight: Array.from(this.requestsInFlight.keys()),
      cacheSize: this.cache.size,
      isTabVisible: this.isTabVisible,
      lastActivity: new Date(this.lastUserActivity).toLocaleTimeString(),
    };
  }

  /**
   * Simple diagnostics
   */
  diagnose() {
    const status = this.getStatus();

    console.group("🩺 DataManager Diagnostics");
    console.log("Status:", status);

    if (status.requestsInFlight.length > 0) {
      console.warn("⚠️ Requests in flight:", status.requestsInFlight);
    }

    if (status.subscribers === 0 && status.isPolling) {
      console.warn("⚠️ Polling with no subscribers");
    }

    console.log("Cache contents:");
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      console.log(`  ${key}: ${Math.round(age / 1000)}s old`);
    });

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
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
