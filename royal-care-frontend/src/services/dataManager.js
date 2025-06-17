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
  fetchClients,
  fetchNotifications,
  fetchServices,
  fetchStaffMembers,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../features/scheduling/schedulingSlice.js";
import store from "../store.js";
import { isValidToken } from "../utils/authUtils.js";

class DataManager {
  constructor() {
    // Core tracking
    this.subscribers = new Map();
    this.cache = new Map();
    this.requestsInFlight = new Map();
    this.pollingInterval = null;
    this.isPolling = false;

    // Enhanced configuration with additional data types
    this.cacheTTL = {
      // Core scheduling data
      appointments: 30000, // 30 seconds
      todayAppointments: 30000, // 30 seconds
      upcomingAppointments: 60000, // 1 minute
      notifications: 45000, // 45 seconds

      // Additional data types for comprehensive system
      patients: 120000, // 2 minutes - patient data changes less frequently
      therapists: 300000, // 5 minutes - staff info is relatively stable
      drivers: 300000, // 5 minutes - driver availability
      routes: 180000, // 3 minutes - route optimization data
      schedules: 60000, // 1 minute - scheduling conflicts/availability
      analytics: 600000, // 10 minutes - dashboard analytics
      settings: 1800000, // 30 minutes - user/system settings
      emergencyAlerts: 15000, // 15 seconds - critical alerts need fresh data
      vehicleStatus: 45000, // 45 seconds - vehicle tracking
      weatherData: 900000, // 15 minutes - weather affects routing
      inventory: 300000, // 5 minutes - inventory status
      reports: 600000, // 10 minutes - generated reports
    };

    // Enhanced memory management and performance tracking - optimized for memory efficiency
    this.memoryThresholds = {
      maxCacheSize: 50, // Reduced from 1000 to prevent memory issues
      maxAge: 900000, // Reduced to 15 minutes from 30 minutes
      cleanupInterval: 300000, // Increased to 5 minutes to reduce overhead
    };

    // Priority levels for different data types
    this.dataPriorities = {
      emergencyAlerts: 1, // Highest priority
      todayAppointments: 2,
      appointments: 3,
      notifications: 4,
      schedules: 5,
      patients: 6,
      therapists: 7,
      drivers: 8,
      routes: 9,
      vehicleStatus: 10,
      analytics: 11,
      settings: 12, // Lowest priority
      weatherData: 12,
      inventory: 12,
      reports: 12,
    };

    // Circuit breaker configuration
    this.circuitBreakers = new Map();
    this.circuitBreakerConfig = {
      failureThreshold: 5,
      timeout: 30000, // 30 seconds
      retryDelay: 60000, // 1 minute
    };

    // Performance tracking for enhanced deduplication - optimized for memory efficiency
    this.recentOperations = [];
    this.maxRecentOperations = 10; // Further reduced from 20 to 10 to prevent constant warnings
    this.lastMetricsWarning = null; // Track last warning to prevent spam
    this.lastMemoryCleanup = 0; // Track last cleanup to prevent excessive cleanup

    // Activity tracking
    this.lastUserActivity = Date.now();
    this.isTabVisible = !document.hidden;

    // Route-based prefetching configuration
    this.routeDataMap = {
      "/operator-dashboard": [
        "appointments",
        "todayAppointments",
        "notifications",
        "emergencyAlerts",
      ],
      "/therapist-dashboard": ["todayAppointments", "patients", "schedules"],
      "/driver-dashboard": [
        "routes",
        "vehicleStatus",
        "todayAppointments",
        "weatherData",
      ],
      "/analytics": ["analytics", "appointments", "patients", "reports"],
      "/scheduling": ["appointments", "therapists", "patients", "schedules"],
      "/inventory": ["inventory", "notifications"],
      "/settings": ["settings", "therapists", "drivers"],
    };

    // Real-time update configuration
    this.realtimeDataTypes = [
      "emergencyAlerts",
      "todayAppointments",
      "vehicleStatus",
      "notifications",
    ];

    // Setup basic tracking
    this.setupBasicTracking();

    // Start memory cleanup
    this.startMemoryCleanup();

    // Initialize performance tracking - optimized for memory efficiency
    this.responseTimeHistory = [];
    this.maxResponseTimeHistory = 25; // Reduced from 100 to 25 to save memory

    // Development mode utilities
    this.isDevelopment =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("dev") ||
        window.location.port);

    console.log("📡 DataManager: Initialized (Simple Mode)");
  }

  /**
   * Basic setup for tracking and initialization
   */
  setupBasicTracking() {
    // Track user activity
    this.lastUserActivity = Date.now();
    this.isTabVisible = !document.hidden;

    if (typeof window !== "undefined") {
      // Track user activity
      ["mousedown", "mousemove", "keypress", "scroll", "touchstart"].forEach(
        (event) => {
          document.addEventListener(
            event,
            () => {
              this.lastUserActivity = Date.now();
            },
            { passive: true }
          );
        }
      );

      // Track tab visibility
      document.addEventListener("visibilitychange", () => {
        this.isTabVisible = !document.hidden;
        if (this.isTabVisible) {
          this.lastUserActivity = Date.now();
          // Optionally trigger refresh when tab becomes visible
          console.log(
            "📱 DataManager: Tab became visible, updating activity timestamp"
          );
        }
      });
    }

    console.log("🚀 DataManager: Basic tracking initialized");
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
      // Only fetch immediately for new subscriber if authenticated
      if (isValidToken()) {
        this.fetchNeededData();
      } else {
        console.log(
          "⚠️ DataManager: Skipping immediate fetch - user not authenticated"
        );
      }
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

    // Initial fetch (only if authenticated)
    if (isValidToken()) {
      this.fetchNeededData();
    }

    // Setup polling interval
    this.pollingInterval = setInterval(() => {
      if (this.subscribers.size > 0 && isValidToken()) {
        this.fetchNeededData();
      } else if (this.subscribers.size > 0 && !isValidToken()) {
        console.log("⚠️ DataManager: Skipping poll - user not authenticated");
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

    // Check authentication before making any API calls
    if (!isValidToken()) {
      console.log(
        "⚠️ DataManager: Skipping data fetch - user not authenticated"
      );
      return;
    }

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

      // Track cache hit
      this.trackOperation(dataType, true, null, {
        responseTime: 0,
        cacheHit: true,
        cacheAge: Date.now() - cached.timestamp,
      });

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

    // Create new request promise with progressive loading and performance tracking
    const startTime = Date.now();
    const requestPromise = this.createRequest(dataType)
      .then((result) => {
        const responseTime = Date.now() - startTime;

        // Track response time
        this.trackResponseTime(dataType, responseTime);

        // Cache the result with metadata
        this.cache.set(dataType, {
          data: result,
          timestamp: Date.now(),
          fetchCount: (cached?.fetchCount || 0) + 1,
          lastError: null,
          responseTime,
        });

        // Track successful operation
        this.trackOperation(dataType, true, null, {
          responseTime,
          cacheHit: false,
        });

        // Trigger intelligent prefetching for related data
        this.prefetchRelatedData([dataType]);

        return result;
      })
      .catch(async (error) => {
        const responseTime = Date.now() - startTime;

        // Track failed operation
        this.trackOperation(dataType, false, error, {
          responseTime,
          cacheHit: false,
        });

        // Try advanced recovery strategies
        try {
          const recoveredData = await this.handleDataRecovery(dataType, error);
          if (recoveredData) {
            // Cache recovered data
            this.cache.set(dataType, {
              data: recoveredData,
              timestamp: Date.now(),
              fetchCount: (cached?.fetchCount || 0) + 1,
              lastError: error,
              recovered: true,
              responseTime,
            });
            return recoveredData;
          }
        } catch (recoveryError) {
          console.warn(
            `🚨 DataManager: Recovery failed for ${dataType}:`,
            recoveryError.message
          );
        }

        // If we have stale cached data, use it as final fallback
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
            responseTime,
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

    // Check authentication before making any API call
    if (!isValidToken()) {
      throw new Error("Authentication required - user not logged in");
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(dataType)) {
      console.warn(`🚫 DataManager: Circuit breaker open for ${dataType}`);
      throw new Error(`Circuit breaker open for ${dataType}`);
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
      // Staff and resource data (using existing Redux actions)
      case "staffMembers":
        apiPromise = store.dispatch(fetchStaffMembers());
        break;
      case "therapists":
        // Filter staff members for therapists
        apiPromise = store.dispatch(fetchStaffMembers()).then((result) => {
          // Handle both fulfilled action and direct payload
          const staffData = result.payload || result;
          if (Array.isArray(staffData)) {
            return staffData.filter((staff) => staff.role === "therapist");
          }
          console.warn(
            "DataManager: therapists - staffData is not an array:",
            staffData
          );
          return [];
        });
        break;
      case "drivers":
        // Filter staff members for drivers
        apiPromise = store.dispatch(fetchStaffMembers()).then((result) => {
          // Handle both fulfilled action and direct payload
          const staffData = result.payload || result;
          if (Array.isArray(staffData)) {
            return staffData.filter((staff) => staff.role === "driver");
          }
          console.warn(
            "DataManager: drivers - staffData is not an array:",
            staffData
          );
          return [];
        });
        break;
      case "clients":
        apiPromise = store.dispatch(fetchClients());
        break;
      case "services":
        apiPromise = store.dispatch(fetchServices());
        break;
      // Availability data
      case "availableTherapists":
        // Note: This requires parameters, handle in specialized method
        console.warn("availableTherapists requires date/time parameters");
        return [];
      case "availableDrivers":
        // Note: This requires parameters, handle in specialized method
        console.warn("availableDrivers requires date/time parameters");
        return [];
      // Date-based appointment data
      case "appointmentsByDate":
        // Note: This requires date parameter, handle in specialized method
        console.warn("appointmentsByDate requires date parameter");
        return [];
      case "weekAppointments":
        // Note: This requires week parameter, handle in specialized method
        console.warn("weekAppointments requires week parameter");
        return [];
      // Analytics and reporting (mock implementation for now)
      case "analytics":
        // Return calculated analytics from existing appointment data
        apiPromise = Promise.resolve({
          totalAppointments:
            store.getState().scheduling?.appointments?.length || 0,
          todayCount:
            store.getState().scheduling?.todayAppointments?.length || 0,
          upcomingCount:
            store.getState().scheduling?.upcomingAppointments?.length || 0,
          lastUpdated: Date.now(),
        });
        break;
      case "attendanceRecords":
        // Mock attendance data - replace with actual API call when available
        apiPromise = Promise.resolve([]);
        break;
      case "inventoryItems":
        // Mock inventory data - replace with actual API call when available
        apiPromise = Promise.resolve([]);
        break;
      case "settings":
        // Mock settings data - replace with actual API call when available
        apiPromise = Promise.resolve({
          theme: "light",
          notifications: true,
          autoRefresh: true,
          lastUpdated: Date.now(),
        });
        break;
      case "emergencyAlerts":
        // Mock emergency alerts - replace with actual API call when available
        apiPromise = Promise.resolve([]);
        break;
      case "weatherData":
        // Mock weather data - replace with actual weather API
        apiPromise = Promise.resolve({
          temperature: 25,
          condition: "sunny",
          lastUpdated: Date.now(),
        });
        break;
      case "vehicleStatus":
        // Mock vehicle status data - replace with actual vehicle tracking API
        apiPromise = Promise.resolve([
          {
            id: 1,
            vehicle: "Vehicle 1",
            driver: "Driver A",
            status: "available",
            location: "Base",
            batteryLevel: 85,
            lastUpdated: Date.now(),
          },
          {
            id: 2,
            vehicle: "Vehicle 2",
            driver: "Driver B",
            status: "in-transit",
            location: "Route to Client",
            batteryLevel: 67,
            lastUpdated: Date.now(),
          },
        ]);
        break;
      // Additional data types
      case "patients":
        // Use clients data as patients
        apiPromise = store.dispatch(fetchClients());
        break;
      case "routes":
        // Mock route data - replace with actual routing API
        apiPromise = Promise.resolve([
          {
            id: 1,
            name: "Route A",
            driver: "Driver A",
            stops: ["Location 1", "Location 2"],
            estimatedTime: "2 hours",
            status: "active",
          },
        ]);
        break;
      case "schedules":
        // Mock schedule data - replace with actual scheduling API
        apiPromise = Promise.resolve([
          {
            id: 1,
            therapist: "Therapist A",
            date: new Date().toISOString(),
            slots: ["09:00", "10:00", "11:00"],
            availability: "available",
          },
        ]);
        break;
      case "inventory":
        // Mock inventory data - replace with actual inventory API
        apiPromise = Promise.resolve([
          {
            id: 1,
            item: "Medical Supplies",
            quantity: 50,
            status: "in-stock",
            lastUpdated: Date.now(),
          },
        ]);
        break;
      case "reports":
        // Mock reports data - replace with actual reporting API
        apiPromise = Promise.resolve([
          {
            id: 1,
            type: "monthly",
            title: "Monthly Report",
            generated: Date.now(),
            status: "ready",
          },
        ]);
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    try {
      const result = await apiPromise;
      this.recordCircuitBreakerSuccess(dataType);

      // Broadcast to other tabs if cross-tab sync is available
      if (this.crossTabSync) {
        this.crossTabSync.syncDataToOtherTabs(dataType, result);
      }

      console.log(`✅ DataManager: Successfully fetched ${dataType}`);
      return result;
    } catch (error) {
      this.recordCircuitBreakerFailure(dataType, error);
      throw error;
    }
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
   * Setup cross-tab synchronization
   */
  setupCrossTabSync() {
    try {
      import("./crossTabSync").then(({ default: crossTabSync }) => {
        this.crossTabSync = crossTabSync;

        // Subscribe to cross-tab cache updates
        this.crossTabSync.subscribe("dataManager", (data) => {
          if (data.type === "cacheUpdate") {
            this.handleCrossTabCacheUpdate(data);
          }
        });

        console.log("🔄 DataManager: Cross-tab sync enabled");
      });
    } catch (error) {
      console.warn(
        "⚠️ DataManager: Cross-tab sync not available:",
        error.message
      );
    }
  }

  /**
   * Handle cache updates from other tabs
   */
  handleCrossTabCacheUpdate(data) {
    const { dataType, cacheData, timestamp } = data;

    // Only update if the cross-tab data is newer
    const existing = this.cache.get(dataType);
    if (!existing || timestamp > existing.timestamp) {
      this.cache.set(dataType, {
        data: cacheData,
        timestamp,
        crossTabUpdate: true,
      });

      console.log(`🔄 DataManager: Updated ${dataType} from cross-tab sync`);
    }
  }

  /**
   * Setup WebSocket connection for real-time updates
   */
  setupWebSocketConnection() {
    if (!window.WebSocket) return;

    try {
      const wsUrl =
        import.meta.env.REACT_APP_WS_URL || "ws://localhost:8080/ws";
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleRealtimeUpdate(data);
      };

      this.ws.onopen = () => {
        console.log("🔌 DataManager: WebSocket connected");
        // Subscribe to real-time updates for critical data
        this.realtimeDataTypes.forEach((dataType) => {
          this.ws.send(
            JSON.stringify({
              action: "subscribe",
              dataType,
            })
          );
        });
      };

      this.ws.onerror = () => {
        console.warn("⚠️ DataManager: WebSocket connection failed");
      };
    } catch (error) {
      console.warn("⚠️ DataManager: WebSocket setup failed:", error);
    }
  }

  /**
   * Handle real-time updates from WebSocket
   */
  handleRealtimeUpdate(data) {
    const { dataType, payload, timestamp } = data;

    // Update cache with real-time data
    this.cache.set(dataType, {
      data: payload,
      timestamp: timestamp || Date.now(),
      isRealtime: true,
    });

    // Notify subscribers immediately for critical updates
    if (this.realtimeDataTypes.includes(dataType)) {
      console.log(`⚡ DataManager: Real-time update for ${dataType}`);
    }
  }

  /**
   * Circuit breaker implementation
   */
  isCircuitBreakerOpen(dataType) {
    const breaker = this.circuitBreakers.get(dataType);
    if (!breaker) return false;

    return (
      breaker.state === "OPEN" &&
      Date.now() - breaker.lastFailure < this.circuitBreakerConfig.timeout
    );
  }

  recordCircuitBreakerSuccess(dataType) {
    const breaker = this.circuitBreakers.get(dataType);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = "CLOSED";
      this.circuitBreakers.set(dataType, breaker);
    }
  }

  recordCircuitBreakerFailure(dataType, error) {
    const breaker = this.circuitBreakers.get(dataType) || {
      failures: 0,
      state: "CLOSED",
      lastFailure: null,
      lastError: null,
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();
    breaker.lastError = error.message || "Unknown error";

    if (breaker.failures >= this.circuitBreakerConfig.failureThreshold) {
      breaker.state = "OPEN";
      console.warn(`🚫 DataManager: Circuit breaker opened for ${dataType}`);
    }

    this.circuitBreakers.set(dataType, breaker);
  }

  /**
   * Intelligent prefetching based on route
   */
  prefetchForRoute(routePath) {
    const requiredData = this.routeDataMap[routePath];
    if (!requiredData) return;

    console.log(`🔮 DataManager: Prefetching data for ${routePath}`);

    requiredData.forEach((dataType) => {
      // Only prefetch if cache is stale or missing
      if (!this.isCacheValid(dataType)) {
        this.fetchDataType(dataType).catch((error) => {
          console.warn(`⚠️ Prefetch failed for ${dataType}:`, error.message);
        });
      }
    });
  }

  /**
   * Priority-based cache eviction
   */
  intelligentCacheEviction() {
    if (this.cache.size <= this.memoryThresholds.maxCacheSize) return;

    // Sort cache entries by priority and age
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const [keyA, cachedA] = a;
      const [keyB, cachedB] = b;

      const priorityA = this.dataPriorities[keyA] || 99;
      const priorityB = this.dataPriorities[keyB] || 99;

      // Higher priority number = lower priority = more likely to evict
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // Same priority, evict older entries first
      return cachedA.timestamp - cachedB.timestamp;
    });

    const toEvict = this.cache.size - this.memoryThresholds.maxCacheSize;
    for (let i = 0; i < toEvict; i++) {
      this.cache.delete(entries[i][0]);
      console.log(
        `🗑️ DataManager: Evicted low-priority cache: ${entries[i][0]}`
      );
    }
  }

  /**
   * Enhanced operation tracking with performance metrics - optimized to prevent memory pressure
   */
  trackOperation(dataType, success, error = null, metadata = {}) {
    // Only track if we're not already at capacity to prevent immediate warnings
    if (this.recentOperations.length >= this.maxRecentOperations) {
      // Remove older operations first before adding new ones
      this.recentOperations = this.recentOperations.slice(
        -Math.floor(this.maxRecentOperations * 0.6)
      );
    }

    const operation = {
      dataType,
      success,
      error: error?.message || null,
      timestamp: Date.now(),
      responseTime: metadata.responseTime || 0,
      cacheHit: metadata.cacheHit || false,
      ...metadata,
    };

    this.recentOperations.push(operation);
  }

  /**
   * Track response times for performance analysis
   */
  trackResponseTime(dataType, responseTime) {
    this.responseTimeHistory.push({
      dataType,
      responseTime,
      timestamp: Date.now(),
    });

    // Keep only recent response times
    if (this.responseTimeHistory.length > this.maxResponseTimeHistory) {
      this.responseTimeHistory.shift();
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
   * Enhanced cache cleanup with selective eviction - optimized for memory efficiency
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    let forceEvicted = 0;

    // First pass: Remove truly expired entries with more aggressive TTL
    for (const [key, cached] of this.cache.entries()) {
      const age = now - cached.timestamp;
      const ttl = this.cacheTTL[key] || 30000;

      // More aggressive expiration - clean after 1.5x TTL instead of 2x
      if (age > Math.max(ttl * 1.5, this.memoryThresholds.maxAge)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Second pass: If cache is still too large, evict LRU entries more aggressively
    const targetSize = Math.floor(this.memoryThresholds.maxCacheSize * 0.8); // Keep at 80% of max
    if (this.cache.size > targetSize) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      ); // Oldest first

      const toEvict = this.cache.size - targetSize;
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
   * Clean up old performance metrics - optimized for memory efficiency and reduced warnings
   */
  cleanupOldMetrics() {
    const now = Date.now();

    // Only run cleanup every 60 seconds to reduce overhead
    if (now - this.lastMemoryCleanup < 60000) {
      return;
    }

    this.lastMemoryCleanup = now;
    const cutoff = now - 300000; // Keep last 5 minutes (increased for stability)
    const originalLength = this.recentOperations.length;

    // More aggressive filtering to reduce memory usage
    this.recentOperations = this.recentOperations.filter(
      (op) => op.timestamp > cutoff
    );

    // Keep only the most recent entries - even more aggressive limit to prevent warnings
    const targetSize = Math.max(5, Math.floor(this.maxRecentOperations * 0.6)); // Keep 60% of max, minimum 5
    if (this.recentOperations.length > targetSize) {
      this.recentOperations = this.recentOperations.slice(-targetSize);
    }

    const cleaned = originalLength - this.recentOperations.length;
    if (cleaned > 0) {
      console.log(`🧹 DataManager: Cleaned ${cleaned} old performance metrics`);
    }
  }

  /**
   * Check for memory pressure and take action - optimized thresholds with intelligent warning suppression
   */
  checkMemoryPressure() {
    const now = Date.now();
    const cacheRatio = this.cache.size / this.memoryThresholds.maxCacheSize;
    const metricsRatio =
      this.recentOperations.length / this.maxRecentOperations;

    // Increased threshold from 0.95 to 0.98 to reduce false warnings
    if (cacheRatio > 0.98) {
      // Only warn every 2 minutes to reduce spam
      if (!this.lastMetricsWarning || now - this.lastMetricsWarning > 120000) {
        console.warn(
          `⚠️ DataManager: High cache usage (${Math.round(cacheRatio * 100)}%)`
        );
        this.lastMetricsWarning = now;
      }

      // Force more aggressive cleanup only when critical
      if (cacheRatio > 0.99) {
        this.aggressiveCleanup();
      }
    }

    // Significantly increased threshold and reduced warning frequency
    if (metricsRatio > 0.9) {
      // Only warn every 2 minutes and only if it's been a problem for a while
      if (!this.lastMetricsWarning || now - this.lastMetricsWarning > 120000) {
        console.warn(
          `⚠️ DataManager: High metrics usage (${Math.round(
            metricsRatio * 100
          )}%) - will auto-cleanup shortly`
        );
        this.lastMetricsWarning = now;
      }

      // Immediately trigger cleanup instead of just warning
      this.cleanupOldMetrics();
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
   * Advanced Features: Intelligent Prefetching
   * Predicts and prefetches data based on user patterns
   */
  setupIntelligentPrefetching() {
    // Track user navigation patterns
    this.navigationPatterns = new Map();
    this.prefetchQueue = [];

    // Monitor route changes for prefetch optimization
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("popstate", () => {
        this.analyzeNavigationPattern();
      });
    }
  }

  async prefetchRelatedData(currentDataTypes) {
    // Prefetch related data based on common usage patterns
    const relatedDataMap = {
      appointments: ["clients", "therapists", "services"],
      todayAppointments: ["notifications", "emergencyAlerts", "vehicleStatus"],
      analytics: ["appointments", "clients", "reports"],
      scheduling: ["availableTherapists", "availableDrivers", "schedules"],
    };

    const prefetchTypes = new Set();
    currentDataTypes.forEach((dataType) => {
      const related = relatedDataMap[dataType];
      if (related) {
        related.forEach((type) => prefetchTypes.add(type));
      }
    });

    // Remove already cached data
    const typesToPrefetch = Array.from(prefetchTypes).filter(
      (type) => !this.isCacheValid(type)
    );

    if (typesToPrefetch.length > 0) {
      console.log("🚀 DataManager: Prefetching related data:", typesToPrefetch);

      // Prefetch in background with lower priority
      setTimeout(() => {
        typesToPrefetch.forEach((type) => {
          this.fetchDataType(type).catch((error) => {
            console.warn(`⚠️ Prefetch failed for ${type}:`, error.message);
          });
        });
      }, 1000); // Delay to not interfere with critical requests
    }
  }

  /**
   * Advanced Analytics and Performance Metrics
   */
  getAdvancedAnalytics() {
    const now = Date.now();
    const analytics = {
      dataFreshness: {},
      errorRates: {},
      responseTimeHistory: this.responseTimeHistory || [],
      memoryUsage: this.getMemoryUsage(),
      cacheEfficiency: this.calculateCacheEfficiency(),
      networkEfficiency: this.calculateNetworkEfficiency(),
      userActivityMetrics: {
        lastActivity: this.lastUserActivity,
        timeSinceActivity: now - this.lastUserActivity,
        isActive: now - this.lastUserActivity < 60000,
        tabVisible: this.isTabVisible,
      },
    };

    // Calculate data freshness
    this.cache.forEach((value, key) => {
      const age = now - value.timestamp;
      const ttl = this.cacheTTL[key] || 30000;
      analytics.dataFreshness[key] = {
        age,
        ttl,
        freshness: Math.max(0, (ttl - age) / ttl),
        stale: age > ttl,
      };
    });

    // Calculate error rates
    this.circuitBreakers.forEach((value, key) => {
      analytics.errorRates[key] = {
        failures: value.failures,
        state: value.state,
        lastFailure: value.lastFailure,
        lastError: value.lastError,
      };
    });

    return analytics;
  }

  calculateCacheEfficiency() {
    const totalRequests = this.recentOperations.length;
    if (totalRequests === 0) return 1;

    const cacheHits = this.recentOperations.filter((op) => op.cacheHit).length;
    return cacheHits / totalRequests;
  }

  calculateNetworkEfficiency() {
    const recentErrors = this.recentOperations.filter(
      (op) => !op.success && Date.now() - op.timestamp < 300000 // Last 5 minutes
    ).length;

    const recentOperations = this.recentOperations.filter(
      (op) => Date.now() - op.timestamp < 300000
    ).length;

    if (recentOperations === 0) return 1;
    return Math.max(0, 1 - recentErrors / recentOperations);
  }

  getMemoryUsage() {
    try {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          percentage:
            (performance.memory.usedJSHeapSize /
              performance.memory.jsHeapSizeLimit) *
            100,
        };
      }
    } catch (error) {
      console.warn("Memory stats not available:", error.message);
    }

    return {
      cacheSize: this.cache.size,
      subscribersCount: this.subscribers.size,
      inFlightRequests: this.requestsInFlight.size,
    };
  }

  /**
   * Advanced Error Recovery and Resilience
   */
  async handleDataRecovery(dataType, error) {
    console.log(`🔧 DataManager: Attempting recovery for ${dataType}`);

    // Try different recovery strategies
    const strategies = [
      () => this.tryFallbackEndpoint(dataType),
      () => this.useStaleCache(dataType),
      () => this.synthesizeData(dataType),
      () => this.requestFromOtherTabs(dataType),
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          console.log(`✅ DataManager: Recovery successful for ${dataType}`);
          return result;
        }
      } catch (recoveryError) {
        console.warn(
          `Recovery strategy failed for ${dataType}:`,
          recoveryError.message
        );
      }
    }

    throw new Error(
      `All recovery strategies failed for ${dataType}: ${error.message}`
    );
  }

  async tryFallbackEndpoint(dataType) {
    // Implement fallback API endpoints if available
    console.log(`🔄 DataManager: Trying fallback endpoint for ${dataType}`);
    return null; // Implement based on available fallback APIs
  }

  useStaleCache(dataType) {
    const cached = this.cache.get(dataType);
    if (cached && cached.data) {
      console.log(`📦 DataManager: Using stale cache for ${dataType}`);
      return cached.data;
    }
    return null;
  }

  synthesizeData(dataType) {
    // Generate synthetic/default data as last resort
    const defaultData = {
      appointments: [],
      notifications: [],
      analytics: { totalAppointments: 0, lastUpdated: Date.now() },
      settings: { theme: "light", notifications: true },
    };

    if (defaultData[dataType]) {
      console.log(`🎭 DataManager: Using synthetic data for ${dataType}`);
      return defaultData[dataType];
    }
    return null;
  }

  async requestFromOtherTabs(dataType) {
    if (this.crossTabSync) {
      return this.crossTabSync.requestDataFromOtherTabs(dataType);
    }
    return null;
  }

  /**
   * Health Check and System Status
   */
  async performHealthCheck() {
    const healthStatus = {
      timestamp: Date.now(),
      status: "healthy",
      issues: [],
      metrics: this.getAdvancedAnalytics(),
      recommendations: [],
    };

    // Check cache health
    if (this.cache.size > this.memoryThresholds.maxCacheSize) {
      healthStatus.issues.push("Cache size exceeds threshold");
      healthStatus.recommendations.push(
        "Consider reducing cache TTL or increasing cleanup frequency"
      );
    }

    // Check error rates
    const errorRate = this.getErrorRate();
    if (errorRate > 0.3) {
      healthStatus.status = "degraded";
      healthStatus.issues.push(
        `High error rate: ${Math.round(errorRate * 100)}%`
      );
      healthStatus.recommendations.push(
        "Check network connectivity and API health"
      );
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.percentage && memoryUsage.percentage > 80) {
      healthStatus.status = "warning";
      healthStatus.issues.push("High memory usage detected");
      healthStatus.recommendations.push(
        "Consider memory cleanup or reducing cache size"
      );
    }

    // Check stale data
    const staleDataTypes = Array.from(this.cache.keys()).filter(
      (type) => !this.isCacheValid(type)
    );
    if (staleDataTypes.length > 3) {
      healthStatus.issues.push(
        `Multiple stale data types: ${staleDataTypes.join(", ")}`
      );
      healthStatus.recommendations.push("Force refresh recommended");
    }

    return healthStatus;
  }

  /**
   * Development and Debugging Utilities
   */
  setupDevUtils() {
    // Expose dataManager to global scope for debugging
    if (typeof window !== "undefined") {
      window.dataManager = this;
      window.dmAnalytics = () => this.getAdvancedAnalytics();
      window.dmHealth = () => this.performHealthCheck();
      window.dmReport = () => this.logPerformanceReport();

      console.log("🛠️ DataManager: Dev utilities exposed to window object");
      console.log(
        "Available: window.dataManager, window.dmAnalytics(), window.dmHealth(), window.dmReport()"
      );
    }
  }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
