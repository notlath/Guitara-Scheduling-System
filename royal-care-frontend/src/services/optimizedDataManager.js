/**
 * Optimized DataManager - Simple, Efficient, React-Friendly
 *
 * Key optimizations:
 * - Longer cache TTL with smart invalidation
 * - Reduced polling frequency
 * - Minimal memory footprint
 * - React Query-like approach with Redux integration
 * - Focus on data freshness over constant fetching
 */

import {
  fetchAppointments,
  fetchNotifications,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../features/scheduling/schedulingSlice";
import store from "../store";

class OptimizedDataManager {
  constructor() {
    // Core state
    this.cache = new Map();
    this.subscribers = new Map();
    this.activeRequests = new Map();

    // Optimized configuration - much longer cache times
    this.cacheTTL = {
      appointments: 300000, // 5 minutes (was 30 seconds)
      todayAppointments: 120000, // 2 minutes (was 30 seconds)
      upcomingAppointments: 300000, // 5 minutes (was 1 minute)
      notifications: 180000, // 3 minutes (was 45 seconds)
      patients: 600000, // 10 minutes (was 2 minutes)
      therapists: 1800000, // 30 minutes (was 5 minutes)
      drivers: 1800000, // 30 minutes (was 5 minutes)
      settings: 3600000, // 1 hour (was 30 minutes)
    };

    // Polling configuration - much less aggressive
    this.pollingConfig = {
      baseInterval: 180000, // 3 minutes (was 30 seconds)
      backgroundInterval: 600000, // 10 minutes when tab not visible
      maxInterval: 900000, // 15 minutes max
      enablePolling: true,
    };

    // Simple state tracking
    this.isPolling = false;
    this.pollingTimer = null;
    this.isTabVisible = !document.hidden;
    this.lastUserActivity = Date.now();

    // Setup minimal tracking
    this.setupVisibilityTracking();
    this.setupActivityTracking();

    console.log("📡 OptimizedDataManager: Initialized with longer cache TTL");
  }

  /**
   * Subscribe component to data - simplified
   */
  subscribe(componentId, dataTypes, options = {}) {
    // Store subscription with minimal data
    this.subscribers.set(componentId, {
      dataTypes: new Set(dataTypes),
      priority: options.priority || "normal",
      timestamp: Date.now(),
    });

    console.log(`📡 ${componentId}: Subscribed to [${dataTypes.join(", ")}]`);

    // Start polling only if needed
    if (!this.isPolling && this.pollingConfig.enablePolling) {
      this.startPolling();
    }

    // Fetch data immediately if cache is empty/stale
    this.fetchIfNeeded(dataTypes);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(componentId);
      if (this.subscribers.size === 0) {
        this.stopPolling();
      }
    };
  }

  /**
   * Fetch data only if needed (cache miss or stale)
   */
  async fetchIfNeeded(dataTypes) {
    const needsFetch = dataTypes.filter((type) => !this.isCacheValid(type));

    if (needsFetch.length === 0) {
      console.log("📦 All requested data is cached and fresh");
      return;
    }

    console.log(`🔄 Fetching needed data: [${needsFetch.join(", ")}]`);

    // Fetch in parallel but don't wait for all
    const promises = needsFetch.map((type) => this.fetchDataType(type));

    // Don't await all - let them complete in background
    Promise.allSettled(promises).then((results) => {
      const successful = results.filter((r) => r.status === "fulfilled").length;
      console.log(
        `✅ Completed ${successful}/${needsFetch.length} data fetches`
      );
    });
  }

  /**
   * Fetch specific data type using Redux thunks
   */
  async fetchDataType(dataType) {
    // Prevent duplicate requests
    if (this.activeRequests.has(dataType)) {
      return this.activeRequests.get(dataType);
    }

    const promise = this.createReduxRequest(dataType);
    this.activeRequests.set(dataType, promise);

    try {
      const result = await promise;

      // Cache the result with timestamp
      this.cache.set(dataType, {
        data: result,
        timestamp: Date.now(),
        source: "api",
      });

      return result;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch ${dataType}:`, error.message);
      throw error;
    } finally {
      this.activeRequests.delete(dataType);
    }
  }

  /**
   * Create Redux request using existing thunks
   */
  async createReduxRequest(dataType) {
    const dispatch = store.dispatch;

    switch (dataType) {
      case "appointments": {
        const appointmentsResult = await dispatch(fetchAppointments());
        return appointmentsResult.payload;
      }

      case "todayAppointments": {
        const todayResult = await dispatch(fetchTodayAppointments());
        return todayResult.payload;
      }

      case "upcomingAppointments": {
        const upcomingResult = await dispatch(fetchUpcomingAppointments());
        return upcomingResult.payload;
      }

      case "notifications": {
        const notificationsResult = await dispatch(fetchNotifications());
        return notificationsResult.payload;
      }

      // For other data types, return empty arrays for now
      // These can be implemented as needed
      case "patients":
      case "therapists":
      case "drivers":
      case "settings":
      default:
        console.log(`📝 ${dataType}: Using fallback empty data`);
        return [];
    }
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(dataType) {
    const cached = this.cache.get(dataType);
    if (!cached) return false;

    const ttl = this.cacheTTL[dataType] || 300000; // Default 5 minutes
    const age = Date.now() - cached.timestamp;

    return age < ttl;
  }

  /**
   * Get cached data with fallback to Redux state
   */
  getCachedData(dataType) {
    const cached = this.cache.get(dataType);
    if (cached && this.isCacheValid(dataType)) {
      return cached.data;
    }

    // Fallback to Redux state
    const state = store.getState();
    switch (dataType) {
      case "appointments":
        return state.scheduling?.appointments || [];
      case "todayAppointments":
        return state.scheduling?.todayAppointments || [];
      case "upcomingAppointments":
        return state.scheduling?.upcomingAppointments || [];
      case "notifications":
        return state.scheduling?.notifications || [];
      default:
        return [];
    }
  }

  /**
   * Simplified polling - much less frequent
   */
  startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;

    const pollData = () => {
      if (this.subscribers.size === 0) {
        this.stopPolling();
        return;
      }

      // Only poll if user is active and tab is visible
      const timeSinceActivity = Date.now() - this.lastUserActivity;
      const shouldPoll = this.isTabVisible && timeSinceActivity < 600000; // 10 minutes

      if (shouldPoll) {
        // Get unique data types from all subscribers
        const allDataTypes = new Set();
        this.subscribers.forEach(({ dataTypes }) => {
          dataTypes.forEach((type) => allDataTypes.add(type));
        });

        // Only fetch stale data
        const staleTypes = Array.from(allDataTypes).filter(
          (type) => !this.isCacheValid(type)
        );

        if (staleTypes.length > 0) {
          console.log(
            `🔄 Polling refresh for stale data: [${staleTypes.join(", ")}]`
          );
          this.fetchIfNeeded(staleTypes);
        }
      }

      // Schedule next poll with dynamic interval
      const interval = this.isTabVisible
        ? this.pollingConfig.baseInterval
        : this.pollingConfig.backgroundInterval;

      this.pollingTimer = setTimeout(pollData, interval);
    };

    // Start first poll after short delay
    this.pollingTimer = setTimeout(pollData, 5000);
    console.log("🔄 Optimized polling started");
  }

  stopPolling() {
    if (!this.isPolling) return;

    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log("⏹️ Polling stopped");
  }

  /**
   * Force refresh specific data types
   */
  async forceRefresh(dataTypes = []) {
    if (dataTypes.length === 0) {
      // Clear all cache
      this.cache.clear();
      console.log("🔥 Cleared all cache");
    } else {
      // Clear specific cache entries
      dataTypes.forEach((type) => this.cache.delete(type));
      console.log(`🔥 Cleared cache for: [${dataTypes.join(", ")}]`);
    }

    // Fetch fresh data
    const typesToFetch =
      dataTypes.length === 0
        ? Array.from(
            new Set(
              [...this.subscribers.values()].flatMap((s) =>
                Array.from(s.dataTypes)
              )
            )
          )
        : dataTypes;

    await this.fetchIfNeeded(typesToFetch);
  }

  /**
   * Minimal activity tracking
   */
  setupActivityTracking() {
    if (typeof window === "undefined") return;

    const updateActivity = () => {
      this.lastUserActivity = Date.now();
    };

    ["mousedown", "keydown", "scroll", "touchstart"].forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  setupVisibilityTracking() {
    if (typeof document === "undefined") return;

    document.addEventListener("visibilitychange", () => {
      this.isTabVisible = !document.hidden;

      if (this.isTabVisible) {
        // Tab became visible - check for stale data
        console.log("👁️ Tab visible - checking for stale data");
        const allDataTypes = new Set();
        this.subscribers.forEach(({ dataTypes }) => {
          dataTypes.forEach((type) => allDataTypes.add(type));
        });
        this.fetchIfNeeded(Array.from(allDataTypes));
      }
    });
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      subscribers: this.subscribers.size,
      cacheEntries: this.cache.size,
      isPolling: this.isPolling,
      isTabVisible: this.isTabVisible,
      activeRequests: this.activeRequests.size,
      lastActivity: new Date(this.lastUserActivity).toLocaleTimeString(),
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopPolling();
    this.subscribers.clear();
    this.cache.clear();
    this.activeRequests.clear();
  }
}

// Create singleton instance
const optimizedDataManager = new OptimizedDataManager();

export default optimizedDataManager;
