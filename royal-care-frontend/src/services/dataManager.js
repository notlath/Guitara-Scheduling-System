/**
 * Centralized Data Manager to eliminate redundant API polling across dashboards
 *
 * Key Features:
 * - Single polling source for all dashboards
 * - Smart data caching with TTL
 * - Request deduplication
 * - User activity-based polling intervals
 * - Automatic subscription management
 */

import {
  fetchAppointments,
  fetchNotifications,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../features/scheduling/schedulingSlice";
import store from "../store";
import performanceMonitor from "../utils/performanceMonitor";

class DataManager {
  constructor() {
    this.subscribers = new Map(); // Track which components need what data
    this.cache = new Map(); // Cache data with timestamps
    this.requestsInFlight = new Map(); // Prevent duplicate requests
    this.pollingInterval = null;
    this.isPolling = false;

    // Data freshness tracking
    this.lastFetch = new Map();
    this.cacheTTL = {
      appointments: 30000, // 30 seconds
      todayAppointments: 30000,
      upcomingAppointments: 60000, // 1 minute
      notifications: 45000, // 45 seconds
    };

    // Activity tracking for smart polling
    this.lastUserActivity = Date.now();
    this.setupActivityTracking();

    // Tab visibility tracking for performance
    this.isTabVisible = !document.hidden;
    this.setupVisibilityTracking();
  }

  /**
   * Subscribe a component to specific data types
   * @param {string} componentId - Unique identifier for the component
   * @param {Array} dataTypes - Array of data types ['appointments', 'todayAppointments', etc.]
   * @param {Object} options - Additional options like user role, filters
   */
  subscribe(componentId, dataTypes, options = {}) {
    console.log(`📡 DataManager: ${componentId} subscribing to:`, dataTypes);

    this.subscribers.set(componentId, {
      dataTypes: new Set(dataTypes),
      options,
      lastUpdate: Date.now(),
    });

    // Start polling if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startPolling();
    } else {
      // If polling is already running, fetch needed data immediately for new subscriber
      this.fetchNeededData();
    }

    // Return unsubscribe function
    return () => this.unsubscribe(componentId);
  }

  /**
   * Unsubscribe a component from data updates
   * @param {string} componentId - Component identifier
   */
  unsubscribe(componentId) {
    console.log(`📡 DataManager: ${componentId} unsubscribing`);
    this.subscribers.delete(componentId);

    // Stop polling if no more subscribers
    if (this.subscribers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start centralized polling
   */
  startPolling() {
    if (this.isPolling) return;

    console.log("🔄 DataManager: Starting centralized polling");
    this.isPolling = true;

    // Initial fetch
    this.fetchNeededData();

    // Setup dynamic interval that adjusts based on activity
    this.setupDynamicPolling();
  }

  /**
   * Setup dynamic polling that adjusts interval based on user activity
   */
  setupDynamicPolling() {
    const pollWithDynamicInterval = () => {
      if (!this.isPolling) return;

      this.fetchNeededData();

      // Dynamically adjust next polling interval
      const interval = this.getOptimalPollingInterval();
      this.pollingInterval = setTimeout(pollWithDynamicInterval, interval);
    };

    // Start the dynamic polling cycle
    const initialInterval = this.getOptimalPollingInterval();
    this.pollingInterval = setTimeout(pollWithDynamicInterval, initialInterval);
  }

  /**
   * Stop centralized polling
   */
  stopPolling() {
    if (!this.isPolling) return;

    console.log("⏹️ DataManager: Stopping centralized polling");
    this.isPolling = false;

    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval); // Changed from clearInterval to clearTimeout
      this.pollingInterval = null;
    }
  }

  /**
   * Fetch only the data that subscribers actually need
   */
  async fetchNeededData() {
    const neededDataTypes = new Set();

    // Collect all data types needed by current subscribers
    this.subscribers.forEach(({ dataTypes }) => {
      dataTypes.forEach((type) => neededDataTypes.add(type));
    });

    if (neededDataTypes.size === 0) return;

    console.log(
      "🔄 DataManager: Fetching needed data:",
      Array.from(neededDataTypes)
    );

    // Prioritize critical data types for faster UI response
    const priorityOrder = {
      todayAppointments: 1, // Most critical - current day operations
      appointments: 2, // Important - overall scheduling
      upcomingAppointments: 3, // Moderate - future planning
      notifications: 4, // Lower priority - can be delayed
    };

    // Sort data types by priority
    const sortedDataTypes = Array.from(neededDataTypes).sort((a, b) => {
      return (priorityOrder[a] || 5) - (priorityOrder[b] || 5);
    });

    // Batch API calls with priority-based execution
    const highPriorityTypes = sortedDataTypes.filter(
      (type) => (priorityOrder[type] || 5) <= 2
    );
    const lowPriorityTypes = sortedDataTypes.filter(
      (type) => (priorityOrder[type] || 5) > 2
    );

    try {
      // Fetch high priority data first
      if (highPriorityTypes.length > 0) {
        const highPriorityPromises = highPriorityTypes
          .filter((type) => this.shouldFetchData(type))
          .map((type) => this.fetchDataType(type));

        if (highPriorityPromises.length > 0) {
          await Promise.allSettled(highPriorityPromises);
        }
      }

      // Fetch low priority data with slight delay to not block high priority
      if (lowPriorityTypes.length > 0) {
        setTimeout(async () => {
          const lowPriorityPromises = lowPriorityTypes
            .filter((type) => this.shouldFetchData(type))
            .map((type) => this.fetchDataType(type));

          if (lowPriorityPromises.length > 0) {
            await Promise.allSettled(lowPriorityPromises);
          }
        }, 50); // 50ms delay for low priority data
      }

      console.log("✅ DataManager: Priority-based fetch completed");
    } catch (error) {
      console.error("❌ DataManager: Priority fetch error:", error);
    }
  }

  /**
   * Check if data should be fetched based on cache TTL
   * @param {string} dataType - Type of data to check
   * @returns {boolean} - Whether data should be fetched
   */
  shouldFetchData(dataType) {
    const lastFetch = this.lastFetch.get(dataType);
    if (!lastFetch) return true;

    // Dynamic TTL based on data type importance and user activity
    const timeSinceActivity = Date.now() - this.lastUserActivity;
    const isUserActive = timeSinceActivity < 120000; // 2 minutes

    // Aggressive TTL for active users, conservative for inactive
    const dynamicTTL = {
      todayAppointments: isUserActive ? 15000 : 30000, // 15s active, 30s inactive
      appointments: isUserActive ? 20000 : 45000, // 20s active, 45s inactive
      upcomingAppointments: isUserActive ? 30000 : 60000, // 30s active, 1min inactive
      notifications: isUserActive ? 25000 : 50000, // 25s active, 50s inactive
    };

    const ttl = dynamicTTL[dataType] || 30000;
    const isStale = Date.now() - lastFetch > ttl;

    if (isStale) {
      console.log(
        `⏰ DataManager: ${dataType} is stale (${
          Date.now() - lastFetch
        }ms old, TTL: ${ttl}ms, active: ${isUserActive})`
      );
    }

    return isStale;
  }

  /**
   * Fetch specific data type with deduplication and performance monitoring
   * @param {string} dataType - Type of data to fetch
   */
  async fetchDataType(dataType) {
    // Start performance tracking
    const performanceKey = `fetch_${dataType}_${Date.now()}`;
    performanceMonitor.startTracking(performanceKey, "api_call");

    // Prevent duplicate requests
    if (this.requestsInFlight.has(dataType)) {
      console.log(
        `⏳ DataManager: ${dataType} request already in flight, waiting...`
      );
      const result = await this.requestsInFlight.get(dataType);
      performanceMonitor.endTracking(performanceKey, {
        dataType,
        fromCache: true,
        status: "duplicate_request_avoided",
      });
      return result;
    }

    let fetchPromise;

    try {
      switch (dataType) {
        case "appointments":
          fetchPromise = store.dispatch(fetchAppointments());
          break;
        case "todayAppointments":
          fetchPromise = store.dispatch(fetchTodayAppointments());
          break;
        case "upcomingAppointments":
          fetchPromise = store.dispatch(fetchUpcomingAppointments());
          break;
        case "notifications":
          fetchPromise = store.dispatch(fetchNotifications());
          break;
        default:
          console.warn(`⚠️ DataManager: Unknown data type: ${dataType}`);
          performanceMonitor.endTracking(performanceKey, {
            dataType,
            status: "unknown_data_type",
            error: true,
          });
          return;
      }

      // Track the request
      this.requestsInFlight.set(dataType, fetchPromise);

      // Wait for completion
      const result = await fetchPromise;

      // Update cache and timestamps
      this.lastFetch.set(dataType, Date.now());

      console.log(`✅ DataManager: ${dataType} fetched successfully`);

      // End performance tracking with success
      performanceMonitor.endTracking(performanceKey, {
        dataType,
        status: "success",
        resultSize: result?.payload?.length || 0,
      });

      return result;
    } catch (error) {
      console.error(`❌ DataManager: Failed to fetch ${dataType}:`, error);

      // End performance tracking with error
      performanceMonitor.endTracking(performanceKey, {
        dataType,
        status: "error",
        error: error.message,
        errorType: error.name,
      });
    } finally {
      // Always remove from in-flight requests
      this.requestsInFlight.delete(dataType);
    }
  }

  /**
   * Fetch data with incremental loading strategy
   * @param {string} dataType - Type of data to fetch
   * @param {Object} options - Options for incremental loading
   */
  async fetchDataTypeIncremental(dataType, options = {}) {
    // Prevent duplicate requests
    if (this.requestsInFlight.has(dataType)) {
      console.log(
        `⏳ DataManager: ${dataType} request already in flight, waiting...`
      );
      return this.requestsInFlight.get(dataType);
    }

    let fetchPromise;

    try {
      switch (dataType) {
        case "appointments":
          // Fetch today's appointments first for immediate display
          if (!options.skipTodayFirst) {
            await this.fetchDataType("todayAppointments");
          }
          fetchPromise = store.dispatch(fetchAppointments());
          break;
        case "todayAppointments":
          fetchPromise = store.dispatch(fetchTodayAppointments());
          break;
        case "upcomingAppointments":
          fetchPromise = store.dispatch(fetchUpcomingAppointments());
          break;
        case "notifications":
          fetchPromise = store.dispatch(fetchNotifications());
          break;
        default:
          console.warn(`⚠️ DataManager: Unknown data type: ${dataType}`);
          return;
      }

      // Track the request
      this.requestsInFlight.set(dataType, fetchPromise);

      // Wait for completion
      const result = await fetchPromise;

      // Update cache and timestamps
      this.lastFetch.set(dataType, Date.now());

      console.log(
        `✅ DataManager: ${dataType} fetched successfully (incremental)`
      );
      return result;
    } catch (error) {
      console.error(`❌ DataManager: Failed to fetch ${dataType}:`, error);
    } finally {
      // Always remove from in-flight requests
      this.requestsInFlight.delete(dataType);
    }
  }

  /**
   * Get optimal polling interval based on user activity and subscriber count
   */
  getOptimalPollingInterval() {
    const timeSinceActivity = Date.now() - this.lastUserActivity;
    const subscriberCount = this.subscribers.size;
    const currentHour = new Date().getHours();

    // Check if it's business hours (8 AM - 6 PM) for more aggressive polling
    const isBusinessHours = currentHour >= 8 && currentHour <= 18;

    // Reduce polling frequency when tab is not visible
    const visibilityMultiplier = this.isTabVisible ? 1 : 3;

    // Base intervals based on user activity (more aggressive during business hours)
    let baseInterval;

    if (timeSinceActivity < 30000) {
      // Very active (last 30 seconds) - ultra-frequent updates
      baseInterval = isBusinessHours ? 8000 : 12000; // 8s business, 12s off-hours
    } else if (timeSinceActivity < 120000) {
      // Active (last 2 minutes) - frequent updates
      baseInterval = isBusinessHours ? 15000 : 20000; // 15s business, 20s off-hours
    } else if (timeSinceActivity < 300000) {
      // Moderately active (last 5 minutes) - moderate updates
      baseInterval = isBusinessHours ? 25000 : 35000; // 25s business, 35s off-hours
    } else if (timeSinceActivity < 600000) {
      // Somewhat active (last 10 minutes) - slower updates
      baseInterval = isBusinessHours ? 45000 : 60000; // 45s business, 1min off-hours
    } else {
      // Inactive (over 10 minutes) - very slow updates
      baseInterval = isBusinessHours ? 90000 : 120000; // 1.5min business, 2min off-hours
    }

    // Adjust based on subscriber count (more dashboards = more frequent updates needed)
    if (subscriberCount > 3) {
      baseInterval = Math.max(baseInterval * 0.6, 5000); // Min 5 seconds for high activity
    } else if (subscriberCount > 1) {
      baseInterval = Math.max(baseInterval * 0.8, 7000); // Min 7 seconds for medium activity
    }

    // Apply visibility multiplier
    baseInterval = baseInterval * visibilityMultiplier;

    // Absolute minimum interval to prevent server overload
    baseInterval = Math.max(baseInterval, 5000);

    console.log(
      `⏱️ DataManager: Optimal polling interval: ${baseInterval}ms (activity: ${Math.round(
        timeSinceActivity / 1000
      )}s ago, subscribers: ${subscriberCount}, business hours: ${isBusinessHours}, visible: ${
        this.isTabVisible
      })`
    );
    return baseInterval;
  }

  /**
   * Track user activity for smart polling
   */
  setupActivityTracking() {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const updateActivity = () => {
      this.lastUserActivity = Date.now();
    };

    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Track tab visibility to pause polling when tab is not visible
   */
  setupVisibilityTracking() {
    const handleVisibilityChange = () => {
      const wasVisible = this.isTabVisible;
      this.isTabVisible = !document.hidden;

      if (!wasVisible && this.isTabVisible) {
        // Tab became visible - trigger immediate refresh
        console.log("👁️ DataManager: Tab became visible, triggering refresh");
        this.lastUserActivity = Date.now();
        if (this.isPolling) {
          this.fetchNeededData();
        }
      } else if (wasVisible && !this.isTabVisible) {
        // Tab became hidden - reduce polling frequency
        console.log("🙈 DataManager: Tab became hidden, reducing polling");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  /**
   * Force immediate refresh with debouncing to prevent excessive API calls
   * @param {Array} dataTypes - Data types to refresh immediately
   */
  async forceRefresh(dataTypes = []) {
    // Debounce multiple rapid refresh requests
    const refreshKey = dataTypes.sort().join(",");
    const now = Date.now();
    const lastRefresh = this.lastForceRefresh?.get(refreshKey) || 0;

    // Prevent force refresh more than once every 2 seconds for same data types
    if (now - lastRefresh < 2000) {
      console.log(`🚫 DataManager: Force refresh debounced for:`, dataTypes);
      return;
    }

    if (!this.lastForceRefresh) {
      this.lastForceRefresh = new Map();
    }
    this.lastForceRefresh.set(refreshKey, now);

    console.log("🔥 DataManager: Force refresh requested for:", dataTypes);

    if (dataTypes.length === 0) {
      // Refresh all subscribed data types
      const allNeeded = new Set();
      this.subscribers.forEach(({ dataTypes }) => {
        dataTypes.forEach((type) => allNeeded.add(type));
      });
      dataTypes = Array.from(allNeeded);
    }

    // Clear cache for forced refresh
    dataTypes.forEach((type) => {
      this.lastFetch.delete(type);
      this.requestsInFlight.delete(type);
    });

    // Use incremental loading for better performance
    const criticalTypes = dataTypes.filter((type) =>
      ["todayAppointments", "appointments"].includes(type)
    );
    const nonCriticalTypes = dataTypes.filter(
      (type) => !["todayAppointments", "appointments"].includes(type)
    );

    // Fetch critical data immediately
    if (criticalTypes.length > 0) {
      const criticalPromises = criticalTypes.map((type) =>
        this.fetchDataTypeIncremental(type)
      );
      await Promise.allSettled(criticalPromises);
    }

    // Fetch non-critical data with slight delay
    if (nonCriticalTypes.length > 0) {
      setTimeout(async () => {
        const nonCriticalPromises = nonCriticalTypes.map((type) =>
          this.fetchDataType(type)
        );
        await Promise.allSettled(nonCriticalPromises);
      }, 100);
    }
  }

  /**
   * Get current subscriber information (for debugging)
   */
  getSubscriberInfo() {
    const info = {};
    this.subscribers.forEach((data, componentId) => {
      info[componentId] = {
        dataTypes: Array.from(data.dataTypes),
        options: data.options,
        lastUpdate: data.lastUpdate,
      };
    });
    return info;
  }

  /**
   * Clear all caches and reset state
   */
  reset() {
    console.log("🔄 DataManager: Resetting all caches and state");
    this.cache.clear();
    this.lastFetch.clear();
    this.requestsInFlight.clear();

    // Restart polling if we have subscribers
    if (this.subscribers.size > 0) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Get performance report for debugging
   */
  getPerformanceReport() {
    return performanceMonitor.getAllSummaries();
  }

  /**
   * Log detailed performance report
   */
  logPerformanceReport() {
    performanceMonitor.logPerformanceReport();
  }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
