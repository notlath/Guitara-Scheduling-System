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

    // Batch API calls and deduplicate
    const promises = [];

    for (const dataType of neededDataTypes) {
      if (this.shouldFetchData(dataType)) {
        promises.push(this.fetchDataType(dataType));
      }
    }

    // Execute all needed fetches in parallel
    if (promises.length > 0) {
      try {
        const results = await Promise.allSettled(promises);

        // Log any failures but don't stop the whole process
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `❌ DataManager: Failed to fetch data type ${index}:`,
              result.reason
            );
          }
        });

        console.log("✅ DataManager: Batch fetch completed");
      } catch (error) {
        console.error("❌ DataManager: Batch fetch error:", error);
      }
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

    const ttl = this.cacheTTL[dataType] || 30000;
    const isStale = Date.now() - lastFetch > ttl;

    if (isStale) {
      console.log(
        `⏰ DataManager: ${dataType} is stale (${Date.now() - lastFetch}ms old)`
      );
    }

    return isStale;
  }

  /**
   * Fetch specific data type with deduplication
   * @param {string} dataType - Type of data to fetch
   */
  async fetchDataType(dataType) {
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

      console.log(`✅ DataManager: ${dataType} fetched successfully`);
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

    // Base intervals based on user activity
    let baseInterval;

    if (timeSinceActivity < 60000) {
      // Very active (last minute) - frequent updates
      baseInterval = 15000; // 15 seconds
    } else if (timeSinceActivity < 300000) {
      // Active (last 5 minutes) - moderate updates
      baseInterval = 30000; // 30 seconds
    } else if (timeSinceActivity < 900000) {
      // Somewhat active (last 15 minutes) - slower updates
      baseInterval = 60000; // 1 minute
    } else {
      // Inactive (over 15 minutes) - very slow updates
      baseInterval = 120000; // 2 minutes
    }

    // Adjust based on subscriber count (more dashboards = more frequent updates needed)
    if (subscriberCount > 3) {
      baseInterval = Math.max(baseInterval * 0.7, 10000); // Min 10 seconds
    } else if (subscriberCount > 1) {
      baseInterval = Math.max(baseInterval * 0.85, 12000); // Min 12 seconds
    }

    // Don't go below 10 seconds to avoid overwhelming the server
    baseInterval = Math.max(baseInterval, 10000);

    console.log(
      `⏱️ DataManager: Optimal polling interval: ${baseInterval}ms (activity: ${Math.round(
        timeSinceActivity / 1000
      )}s ago, subscribers: ${subscriberCount})`
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
   * Force immediate refresh of specific data types
   * @param {Array} dataTypes - Data types to refresh immediately
   */
  async forceRefresh(dataTypes = []) {
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

    // Fetch immediately
    const promises = dataTypes.map((type) => this.fetchDataType(type));
    await Promise.allSettled(promises);
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
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
