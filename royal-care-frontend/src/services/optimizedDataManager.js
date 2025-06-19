/**
 * Optimized Data Manager - Simplified and Performance-Focused
 *
 * Key improvements:
 * - Longer, more efficient cache TTLs
 * - Reduced polling frequency
 * - Simplified request deduplication
 * - Stable dependencies for React hooks
 * - Memory-efficient design
 */

import { fetchAttendanceRecords } from "../features/attendance/attendanceSlice.js";
import {
  fetchAppointments,
  fetchClients,
  fetchNotifications,
  fetchServices,
  fetchStaffMembers,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../features/scheduling/schedulingSlice.js";
import store from "../store.js";
import { isValidToken } from "../utils/authUtils.js";

class OptimizedDataManager {
  constructor() {
    // Core state
    this.subscribers = new Map();
    this.cache = new Map();
    this.requestsInFlight = new Map();
    this.pollingInterval = null;
    this.isPolling = false;

    // Optimized cache configuration - Much longer TTLs for stable data
    this.cacheTTL = {
      // Critical real-time data
      todayAppointments: 300000, // 5 minutes
      notifications: 300000, // 5 minutes (was 3 minutes)

      // Regular scheduling data
      appointments: 600000, // 10 minutes
      upcomingAppointments: 600000, // 10 minutes (was 5 minutes)

      // Stable data - even longer cache times
      patients: 1200000, // 20 minutes (was 10 minutes)
      clients: 1200000, // 20 minutes (was 10 minutes)
      therapists: 3600000, // 1 hour (was 30 minutes)
      staffMembers: 3600000, // 1 hour (was 30 minutes)
      drivers: 3600000, // 1 hour (was 30 minutes)
      services: 7200000, // 2 hours (was 1 hour)

      // Settings and configuration
      settings: 7200000, // 2 hours (was 1 hour)

      // Analytics and reports
      analytics: 1800000, // 30 minutes (was 15 minutes)
      reports: 3600000, // 1 hour (was 30 minutes)

      attendanceRecords: 900000, // 15 minutes - attendance changes less frequently
      "attendanceRecords_*": 900000, // 15 minutes for any date
    };

    // Reduced polling configuration - Much less aggressive
    this.pollingConfig = {
      baseInterval: 600000, // 10 minutes (was 5 minutes)
      backgroundInterval: 1800000, // 30 minutes (was 15 minutes)
      maxInterval: 3600000, // 1 hour max (was 30 minutes)
    };

    // Simple activity tracking
    this.lastUserActivity = Date.now();
    this.isTabVisible = !document.hidden;

    // Setup basic tracking
    this.setupActivityTracking();
    this.setupMemoryCleanup();

    console.log(
      "🚀 OptimizedDataManager: Initialized with efficient configuration"
    );
  }

  /**
   * Setup activity tracking (simplified)
   */
  setupActivityTracking() {
    if (typeof window === "undefined") return;

    // Track user activity
    const events = ["mousedown", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.lastUserActivity = Date.now();
        },
        { passive: true }
      );
    });

    // Track tab visibility
    document.addEventListener("visibilitychange", () => {
      this.isTabVisible = !document.hidden;
      if (this.isTabVisible) {
        this.lastUserActivity = Date.now();
      }
    });
  }

  /**
   * Setup memory cleanup (simplified)
   */
  setupMemoryCleanup() {
    // Clean up stale cache every 10 minutes
    setInterval(() => {
      this.cleanupStaleCache();
    }, 600000);
  }

  /**
   * Subscribe component to data updates
   */
  subscribe(componentId, dataTypes, options = {}) {
    console.log(
      `📡 OptimizedDataManager: ${componentId} subscribing to:`,
      dataTypes
    );

    // Store subscription with stable references
    this.subscribers.set(componentId, {
      dataTypes: new Set(dataTypes),
      options: { ...options },
      timestamp: Date.now(),
    });

    // Start polling if first subscriber
    if (this.subscribers.size === 1) {
      this.startPolling();
    } else if (isValidToken()) {
      // Immediate fetch for new subscriber
      this.fetchNeededData();
    }

    // Return stable unsubscribe function
    return () => this.unsubscribe(componentId);
  }

  /**
   * Unsubscribe component
   */
  unsubscribe(componentId) {
    console.log(`📡 OptimizedDataManager: ${componentId} unsubscribing`);
    this.subscribers.delete(componentId);

    // Stop polling if no subscribers
    if (this.subscribers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Start polling with optimized intervals
   */
  startPolling() {
    if (this.isPolling) return;

    console.log("🔄 OptimizedDataManager: Starting optimized polling");
    this.isPolling = true;

    // Initial fetch
    if (isValidToken()) {
      this.fetchNeededData();
    }

    // Setup polling with dynamic intervals
    this.pollingInterval = setInterval(() => {
      if (this.subscribers.size > 0 && isValidToken()) {
        this.fetchNeededData();
      }
    }, this.getOptimizedPollingInterval());
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (!this.isPolling) return;

    console.log("⏹️ OptimizedDataManager: Stopping polling");
    this.isPolling = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Get optimized polling interval based on activity
   */
  getOptimizedPollingInterval() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastUserActivity;

    // More aggressive intervals when user is active
    if (!this.isTabVisible) {
      return this.pollingConfig.backgroundInterval;
    }

    if (timeSinceActivity < 60000) {
      // Active in last minute
      return this.pollingConfig.baseInterval;
    }

    if (timeSinceActivity < 300000) {
      // Active in last 5 minutes
      return this.pollingConfig.baseInterval * 1.5;
    }

    // Less frequent when inactive
    return this.pollingConfig.maxInterval;
  }

  /**
   * Fetch data needed by current subscribers
   */
  async fetchNeededData() {
    if (this.subscribers.size === 0 || !isValidToken()) return;

    // Collect needed data types
    const neededTypes = new Set();
    this.subscribers.forEach(({ dataTypes }) => {
      dataTypes.forEach((type) => neededTypes.add(type));
    });

    console.log(
      "🔄 OptimizedDataManager: Fetching needed data:",
      Array.from(neededTypes)
    );

    // Fetch in parallel
    const promises = Array.from(neededTypes).map((dataType) =>
      this.fetchDataType(dataType).catch((error) => {
        console.warn(
          `⚠️ OptimizedDataManager: Failed to fetch ${dataType}:`,
          error.message
        );
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Fetch specific data type with optimized caching
   */
  async fetchDataType(dataType) {
    // Check for existing request
    if (this.requestsInFlight.has(dataType)) {
      console.log(
        `⏳ OptimizedDataManager: ${dataType} request in flight, waiting...`
      );
      return this.requestsInFlight.get(dataType);
    }

    // Check cache validity
    if (this.isCacheValid(dataType)) {
      const cached = this.cache.get(dataType);
      console.log(`💾 OptimizedDataManager: Using cached ${dataType}`);
      return cached.data;
    }

    // Create new request
    const requestPromise = this.createAPIRequest(dataType)
      .then((result) => {
        // Cache with timestamp
        this.cache.set(dataType, {
          data: result,
          timestamp: Date.now(),
          fetchCount: (this.cache.get(dataType)?.fetchCount || 0) + 1,
        });

        console.log(
          `✅ OptimizedDataManager: Successfully fetched ${dataType}`
        );
        return result;
      })
      .catch((error) => {
        console.error(
          `❌ OptimizedDataManager: Failed to fetch ${dataType}:`,
          error.message
        );

        // Return stale cache if available
        const cached = this.cache.get(dataType);
        if (cached?.data) {
          console.log(
            `📦 OptimizedDataManager: Using stale cache for ${dataType}`
          );
          return cached.data;
        }

        throw error;
      })
      .finally(() => {
        this.requestsInFlight.delete(dataType);
      });

    this.requestsInFlight.set(dataType, requestPromise);
    return requestPromise;
  }

  /**
   * Create API request for data type
   */
  async createAPIRequest(dataType) {
    console.log(`🌐 OptimizedDataManager: API request for ${dataType}`);

    if (!isValidToken()) {
      throw new Error("Authentication required");
    }

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
      case "clients":
      case "patients":
        apiPromise = store.dispatch(fetchClients());
        break;
      case "services":
        apiPromise = store.dispatch(fetchServices());
        break;
      case "staffMembers":
        apiPromise = store.dispatch(fetchStaffMembers());
        break;
      case "therapists":
        apiPromise = store.dispatch(fetchStaffMembers()).then((result) => {
          const staffData = result.payload || result;
          return Array.isArray(staffData)
            ? staffData.filter((staff) => staff.role === "therapist")
            : [];
        });
        break;
      case "drivers":
        apiPromise = store.dispatch(fetchStaffMembers()).then((result) => {
          const staffData = result.payload || result;
          return Array.isArray(staffData)
            ? staffData.filter((staff) => staff.role === "driver")
            : [];
        });
        break;
      case "attendanceRecords": {
        // For attendance, use today's date as default if no specific date provided
        const todayDate = new Date().toISOString().split("T")[0];
        apiPromise = store.dispatch(
          fetchAttendanceRecords({ date: todayDate })
        );
        break;
      }
      default:
        console.warn(`OptimizedDataManager: Unknown data type: ${dataType}`);
        return [];
    }

    const result = await apiPromise;
    return result.payload || result;
  }

  /**
   * Check if cached data is valid
   */
  isCacheValid(dataType) {
    const cached = this.cache.get(dataType);
    if (!cached) return false;

    // Handle dynamic keys (like attendanceRecords_2025-06-19)
    let ttl = this.cacheTTL[dataType];
    if (!ttl) {
      // Check for pattern matches
      for (const [pattern, patternTTL] of Object.entries(this.cacheTTL)) {
        if (
          pattern.includes("*") &&
          dataType.startsWith(pattern.replace("*", ""))
        ) {
          ttl = patternTTL;
          break;
        }
      }
    }

    if (!ttl) ttl = 300000; // Default 5 minutes

    const isValid = Date.now() - cached.timestamp < ttl;

    if (!isValid) {
      console.log(`⏰ OptimizedDataManager: Cache expired for ${dataType}`);
    }

    return isValid;
  }

  /**
   * Fetch attendance records for a specific date
   */
  async fetchAttendanceForDate(date) {
    const cacheKey = `attendanceRecords_${date}`;

    // Check for existing request
    if (this.requestsInFlight.has(cacheKey)) {
      console.log(
        `⏳ OptimizedDataManager: ${cacheKey} request in flight, waiting...`
      );
      return this.requestsInFlight.get(cacheKey);
    }

    // Check cache validity
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log(`💾 OptimizedDataManager: Using cached ${cacheKey}`);
      return cached.data;
    }

    // Create new request
    const requestPromise = store
      .dispatch(fetchAttendanceRecords({ date }))
      .then((result) => {
        // Cache with timestamp
        this.cache.set(cacheKey, {
          data: result.payload || result,
          timestamp: Date.now(),
          fetchCount: (this.cache.get(cacheKey)?.fetchCount || 0) + 1,
        });

        console.log(
          `✅ OptimizedDataManager: Successfully fetched ${cacheKey}`
        );
        return result.payload || result;
      })
      .catch((error) => {
        console.error(
          `❌ OptimizedDataManager: Failed to fetch ${cacheKey}:`,
          error.message
        );

        // Return stale cache if available
        const cached = this.cache.get(cacheKey);
        if (cached?.data) {
          console.log(
            `📦 OptimizedDataManager: Using stale cache for ${cacheKey}`
          );
          return cached.data;
        }

        throw error;
      })
      .finally(() => {
        this.requestsInFlight.delete(cacheKey);
      });

    this.requestsInFlight.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Get cached data
   */
  getCachedData(dataType) {
    const cached = this.cache.get(dataType);
    return cached?.data || null;
  }

  /**
   * Force refresh attendance records for a specific date
   */
  async forceRefreshAttendance(date) {
    const cacheKey = `attendanceRecords_${date}`;

    // Clear cache for this date
    this.cache.delete(cacheKey);
    this.requestsInFlight.delete(cacheKey);

    console.log(
      `🔥 OptimizedDataManager: Force refreshing attendance for ${date}`
    );

    // Fetch immediately
    return await this.fetchAttendanceForDate(date);
  }

  /**
   * Force refresh specific data types
   */
  async forceRefresh(dataTypes = []) {
    console.log("🔥 OptimizedDataManager: Force refresh requested");

    if (dataTypes.length === 0) {
      this.cache.clear();
      console.log("🔥 OptimizedDataManager: Cleared all cache");
    } else {
      dataTypes.forEach((type) => {
        this.cache.delete(type);
        this.requestsInFlight.delete(type);
        console.log(`🔥 OptimizedDataManager: Cleared cache for ${type}`);
      });
    }

    // Fetch immediately
    await this.fetchNeededData();
  }

  /**
   * Targeted refresh methods for specific data types
   * These are more efficient than full forceRefresh
   */
  async refreshAppointments() {
    console.log("🔄 OptimizedDataManager: Refreshing appointments data");
    await this.forceRefresh([
      "appointments",
      "todayAppointments",
      "upcomingAppointments",
    ]);
  }

  async refreshNotifications() {
    console.log("🔄 OptimizedDataManager: Refreshing notifications");
    await this.forceRefresh(["notifications"]);
  }

  async refreshStaffData() {
    console.log("🔄 OptimizedDataManager: Refreshing staff data");
    await this.forceRefresh(["staffMembers", "therapists", "drivers"]);
  }

  async refreshClientsData() {
    console.log("🔄 OptimizedDataManager: Refreshing clients data");
    await this.forceRefresh(["clients", "patients"]);
  }

  async refreshServicesData() {
    console.log("🔄 OptimizedDataManager: Refreshing services data");
    await this.forceRefresh(["services"]);
  }

  async refreshUserSpecificData() {
    console.log("🔄 OptimizedDataManager: Refreshing user-specific data");
    await this.forceRefresh(["todayAppointments", "notifications"]);
  }

  /**
   * Quick refresh for immediate user actions - only refresh critical data
   */
  async quickRefresh() {
    console.log("⚡ OptimizedDataManager: Quick refresh for user action");
    await this.forceRefresh(["todayAppointments"]);
  }

  /**
   * Clean up stale cache entries
   */
  cleanupStaleCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [dataType, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      const ttl = this.cacheTTL[dataType] || this.cacheTTL.appointments;

      // Remove if 2x TTL age (very stale)
      if (age > ttl * 2) {
        this.cache.delete(dataType);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `🧹 OptimizedDataManager: Cleaned up ${cleanedCount} stale cache entries`
      );
    }
  }

  /**
   * Get cached attendance data for a specific date
   */
  getCachedAttendanceForDate(date) {
    if (!date) {
      date = new Date().toISOString().split("T")[0];
    }

    const cacheKey = `attendanceRecords_${date}`;
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cacheKey)) {
      console.log(
        `✅ OptimizedDataManager: Using cached attendance for ${date}`
      );
      return cached.data;
    }

    console.log(`⚠️ OptimizedDataManager: No cached attendance for ${date}`);
    return null;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      subscribers: this.subscribers.size,
      isPolling: this.isPolling,
      cacheSize: this.cache.size,
      requestsInFlight: Array.from(this.requestsInFlight.keys()),
      pollingInterval: this.getOptimizedPollingInterval(),
      isTabVisible: this.isTabVisible,
    };
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    const status = {};
    this.cache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      const ttl = this.cacheTTL[key] || this.cacheTTL.appointments;
      status[key] = {
        hasData: !!value.data,
        age: age,
        ttl: ttl,
        isValid: age < ttl,
        fetchCount: value.fetchCount || 0,
      };
    });
    return status;
  }
}

// Create singleton instance
const optimizedDataManager = new OptimizedDataManager();

export default optimizedDataManager;
