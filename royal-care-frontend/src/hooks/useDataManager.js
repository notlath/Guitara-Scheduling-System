/**
 * React hook for using the centralized DataManager with performance feedback
 * Automatically subscribes/unsubscribes components to prevent redundant API calls
 * Enhanced with intelligent prefetching, health monitoring, and advanced analytics
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import dataManager from "../services/dataManager.js";
import usePerformanceFeedback from "./usePerformanceFeedback";

/**
 * Enhanced hook to subscribe to centralized data management with comprehensive monitoring
 * @param {string} componentName - Unique name for the component
 * @param {Array} dataTypes - Array of data types needed ['appointments', 'todayAppointments', etc.]
 * @param {Object} options - Enhanced options with health monitoring and prefetch settings
 */
export const useDataManager = (componentName, dataTypes = [], options = {}) => {
  const unsubscribeRef = useRef(null);
  const componentIdRef = useRef(`${componentName}_${Date.now()}`);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState({
    subscribeTime: null,
    lastDataFetch: null,
    fetchCount: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    healthStatus: "unknown",
  });

  // Enhanced performance feedback with intelligent thresholds
  const performanceFeedback = usePerformanceFeedback({
    warningThreshold: options.warningThreshold || 8000, // Optimized threshold
    errorThreshold: options.errorThreshold || 15000, // Reduced from 20000
    onLongRunningOperation: (detail) => {
      console.warn(
        `🐌 ${componentName}: Long-running data operation detected:`,
        detail
      );
      // Trigger health check if operation is too slow
      if (detail.duration > 12000) {
        checkHealthStatus();
      }
    },
  });

  // Enhanced data state management
  const [dataState, setDataState] = useState({
    isLoading: false,
    hasError: false,
    lastError: null,
    isStale: false,
    freshness: 1,
  });

  // Health status checker
  const checkHealthStatus = useCallback(async () => {
    try {
      const healthReport = await dataManager.performHealthCheck();
      setSubscriptionMetrics((prev) => ({
        ...prev,
        healthStatus: healthReport.status,
      }));

      // Update data state based on health
      setDataState((prev) => ({
        ...prev,
        hasError:
          healthReport.status === "degraded" || healthReport.status === "error",
        lastError:
          healthReport.issues.length > 0 ? healthReport.issues[0] : null,
      }));
    } catch (error) {
      console.warn(`⚠️ ${componentName}: Health check failed:`, error.message);
    }
  }, [componentName]);

  // Analytics updater
  const updateAnalytics = useCallback(async () => {
    try {
      const analytics = dataManager.getAdvancedAnalytics();
      setSubscriptionMetrics((prev) => ({
        ...prev,
        cacheHitRate: analytics.cacheEfficiency,
        averageResponseTime:
          analytics.responseTimeHistory
            ?.slice(-10)
            ?.reduce((acc, item) => acc + item.responseTime, 0) / 10 || 0,
      }));

      // Update freshness data
      const freshness =
        Object.values(analytics.dataFreshness).reduce(
          (acc, item) => acc + item.freshness,
          0
        ) / Object.keys(analytics.dataFreshness).length || 1;

      setDataState((prev) => ({
        ...prev,
        freshness,
        isStale: freshness < 0.5,
      }));
    } catch (error) {
      console.warn(
        `⚠️ ${componentName}: Analytics update failed:`,
        error.message
      );
    }
  }, [componentName]);

  // Memoized selectors to prevent unnecessary re-renders
  const reduxState = useSelector(
    (state) => ({
      appointments: state.scheduling?.appointments,
      todayAppointments: state.scheduling?.todayAppointments,
      upcomingAppointments: state.scheduling?.upcomingAppointments,
      notifications: state.scheduling?.notifications,
      loading: state.scheduling?.loading,
      error: state.scheduling?.error,
      patients: state.patients?.data || [],
      therapists: state.staff?.therapists || [],
      drivers: state.staff?.drivers || [],
      routes: state.routing?.routes || [],
      schedules: state.scheduling?.schedules || [],
      analytics: state.analytics?.data || {},
      settings: state.settings?.data || {},
      emergencyAlerts: state.alerts?.emergency || [],
      vehicleStatus: state.vehicles?.status || [],
      weatherData: state.weather?.data || {},
      inventory: state.inventory?.data || [],
      reports: state.reports?.data || [],
    }),
    []
  );

  // Extract individual values from memoized Redux state
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    error,
    patients,
    therapists,
    drivers,
    routes,
    schedules,
    analytics,
    settings,
    emergencyAlerts,
    vehicleStatus,
    weatherData,
    inventory,
    reports,
  } = reduxState;

  // Ensure arrays are always defined to prevent loading issues - memoized for performance
  const safeAppointments = useMemo(() => appointments || [], [appointments]);
  const safeTodayAppointments = useMemo(
    () => todayAppointments || [],
    [todayAppointments]
  );
  const safeUpcomingAppointments = useMemo(
    () => upcomingAppointments || [],
    [upcomingAppointments]
  );
  const safeNotifications = useMemo(() => notifications || [], [notifications]);

  // Enhanced immediate data access with cache checking and smart fallbacks
  const [immediateData, setImmediateData] = useState({
    appointments: [],
    todayAppointments: [],
    upcomingAppointments: [],
    notifications: [],
    patients: [],
    therapists: [],
    drivers: [],
    routes: [],
    schedules: [],
    analytics: {},
    settings: {},
    emergencyAlerts: [],
    vehicleStatus: [],
    weatherData: {},
    inventory: [],
    reports: [],
    hasImmediate: false,
    cacheAge: null,
    isStale: false,
  });

  // Memoize dataTypes for stable reference
  // Use ref to track dataTypes changes without causing re-renders
  const dataTypesRef = useRef(dataTypes);
  const dataTypesStringRef = useRef(JSON.stringify(dataTypes));

  // Only update refs when dataTypes actually change
  const currentDataTypesString = JSON.stringify(dataTypes);
  if (currentDataTypesString !== dataTypesStringRef.current) {
    dataTypesRef.current = dataTypes;
    dataTypesStringRef.current = currentDataTypesString;
  }

  // Check for cached data immediately on mount and component updates
  useEffect(() => {
    // Add safety check for dataManager
    if (!dataManager || !dataManager.cache) {
      console.warn(
        `⚠️ ${componentName}: DataManager not available, skipping cache check`
      );
      return;
    }

    const checkCachedData = () => {
      const cachedData = {};
      let hasAnyCache = false;
      let oldestCacheAge = 0;
      let hasStaleData = false;

      // Use current dataTypes directly to avoid dependency issues
      const currentDataTypes = dataTypesRef.current;

      currentDataTypes.forEach((dataType) => {
        const cached = dataManager.cache.get(dataType);
        if (cached && cached.data) {
          const cacheAge = Date.now() - cached.timestamp;
          const ttl = dataManager.cacheTTL[dataType] || 30000;
          const isStale = cacheAge > ttl * 0.8; // Consider stale at 80% of TTL

          cachedData[dataType] = Array.isArray(cached.data) ? cached.data : [];
          hasAnyCache = true;
          oldestCacheAge = Math.max(oldestCacheAge, cacheAge);

          if (isStale) hasStaleData = true;
        }
      });

      if (hasAnyCache) {
        setImmediateData((prev) => {
          // Prevent unnecessary updates by comparing specific fields
          const newData = {
            ...prev,
            ...cachedData,
            hasImmediate: true,
            cacheAge: oldestCacheAge,
            isStale: hasStaleData,
          };

          // Check if data actually changed by comparing key properties
          const dataChanged =
            prev.hasImmediate !== newData.hasImmediate ||
            prev.cacheAge !== newData.cacheAge ||
            prev.isStale !== newData.isStale ||
            Object.keys(cachedData).some(
              (key) => !prev[key] || prev[key].length !== cachedData[key].length
            );

          if (dataChanged) {
            return newData;
          }
          return prev;
        });

        if (oldestCacheAge > 0) {
          console.log(
            `⚡ ${componentName}: Using cached data for immediate display (age: ${Math.round(
              oldestCacheAge / 1000
            )}s, stale: ${hasStaleData})`
          );
        }
      }
    };

    // Only run on mount, not on every dataTypesKey change to prevent loops
    checkCachedData();
  }, [componentName]); // Removed dataTypesKey to prevent infinite loops

  // Update immediate data when Redux data changes (optimized to prevent infinite loops)
  const updateImmediateData = useCallback(() => {
    const hasNewData =
      safeAppointments.length > 0 ||
      safeTodayAppointments.length > 0 ||
      safeUpcomingAppointments.length > 0 ||
      safeNotifications.length > 0 ||
      (patients && patients.length > 0) ||
      (therapists && therapists.length > 0) ||
      (emergencyAlerts && emergencyAlerts.length > 0);

    if (hasNewData) {
      const newData = {
        appointments: safeAppointments,
        todayAppointments: safeTodayAppointments,
        upcomingAppointments: safeUpcomingAppointments,
        notifications: safeNotifications,
        patients: patients || [],
        therapists: therapists || [],
        drivers: drivers || [],
        routes: routes || [],
        schedules: schedules || [],
        analytics: analytics || {},
        settings: settings || {},
        emergencyAlerts: emergencyAlerts || [],
        vehicleStatus: vehicleStatus || [],
        weatherData: weatherData || {},
        inventory: inventory || [],
        reports: reports || [],
        hasImmediate: true,
      };

      setImmediateData(newData);
    }
  }, [
    safeAppointments,
    safeTodayAppointments,
    safeUpcomingAppointments,
    safeNotifications,
    patients,
    therapists,
    drivers,
    routes,
    schedules,
    analytics,
    settings,
    emergencyAlerts,
    vehicleStatus,
    weatherData,
    inventory,
    reports,
  ]);

  // Throttle immediate data updates to prevent excessive re-renders
  const throttleRef = useRef(null);
  useEffect(() => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = setTimeout(() => {
      updateImmediateData();
    }, 100); // 100ms throttle

    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [updateImmediateData]);

  // Memoize performance feedback values to prevent infinite loops
  const isPerformanceLoading = useMemo(
    () => performanceFeedback.isLoading,
    [performanceFeedback.isLoading]
  );

  // Use direct function calls to avoid circular dependencies
  const performanceStartOperation = useCallback(
    (name) => {
      if (
        performanceFeedback &&
        typeof performanceFeedback.startOperation === "function"
      ) {
        performanceFeedback.startOperation(name);
      }
    },
    [performanceFeedback]
  );

  const performanceEndOperation = useCallback(() => {
    if (
      performanceFeedback &&
      typeof performanceFeedback.endOperation === "function"
    ) {
      performanceFeedback.endOperation();
    }
  }, [performanceFeedback]);

  // Track loading state changes for performance feedback
  const prevPerformanceLoadingRef = useRef(isPerformanceLoading);

  useEffect(() => {
    const wasPerformanceLoading = prevPerformanceLoadingRef.current;

    if (loading && !wasPerformanceLoading) {
      performanceStartOperation(`Loading data for ${componentName}`);
    } else if (!loading && wasPerformanceLoading) {
      performanceEndOperation();
      setSubscriptionMetrics((prev) => ({
        ...prev,
        lastDataFetch: Date.now(),
        fetchCount: prev.fetchCount + 1,
      }));
    }

    // Update ref for next render
    prevPerformanceLoadingRef.current = isPerformanceLoading;
  }, [
    loading,
    isPerformanceLoading,
    componentName,
    performanceStartOperation,
    performanceEndOperation,
  ]);

  // Memoize serialized values to prevent unnecessary re-renders (moved up to avoid duplication)
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  useEffect(() => {
    if (dataTypes.length === 0) return;

    // Handle React Strict Mode double execution by checking if already subscribed
    if (unsubscribeRef.current) {
      console.log(
        `🔌 useDataManager: ${componentName} already subscribed, skipping duplicate subscription`
      );
      return;
    }

    console.log(
      `🔌 useDataManager: ${componentName} subscribing to centralized data management`
    );

    // Subscribe to data manager
    unsubscribeRef.current = dataManager.subscribe(
      componentIdRef.current,
      dataTypes,
      options
    );

    // Update subscription metrics
    setSubscriptionMetrics((prev) => ({
      ...prev,
      subscribeTime: Date.now(),
      fetchCount: prev.fetchCount + 1,
    }));

    // Trigger initial analytics update
    updateAnalytics();

    // Set up periodic health checks and analytics updates
    const analyticsInterval = setInterval(() => {
      updateAnalytics();
      checkHealthStatus();
    }, 30000); // Every 30 seconds

    // Cleanup on unmount or re-render
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `🔌 useDataManager: ${componentName} unsubscribing from centralized data management`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearInterval(analyticsInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentName, optionsKey, updateAnalytics, checkHealthStatus]); // Removed dataTypesKey to prevent infinite loops

  // Provide force refresh function for components that need it
  const forceRefresh = (specificDataTypes = []) => {
    return dataManager.forceRefresh(
      specificDataTypes.length > 0 ? specificDataTypes : dataTypes
    );
  };

  return {
    // Enhanced data access - show cached data immediately, fresh data when available
    appointments: immediateData.hasImmediate
      ? immediateData.appointments
      : safeAppointments,
    todayAppointments: immediateData.hasImmediate
      ? immediateData.todayAppointments
      : safeTodayAppointments,
    upcomingAppointments: immediateData.hasImmediate
      ? immediateData.upcomingAppointments
      : safeUpcomingAppointments,
    notifications: immediateData.hasImmediate
      ? immediateData.notifications
      : safeNotifications,

    // Additional data types
    patients: immediateData.hasImmediate
      ? immediateData.patients
      : patients || [],
    therapists: immediateData.hasImmediate
      ? immediateData.therapists
      : therapists || [],
    drivers: immediateData.hasImmediate ? immediateData.drivers : drivers || [],
    routes: immediateData.hasImmediate ? immediateData.routes : routes || [],
    schedules: immediateData.hasImmediate
      ? immediateData.schedules
      : schedules || [],
    analytics: immediateData.hasImmediate
      ? immediateData.analytics
      : analytics || {},
    settings: immediateData.hasImmediate
      ? immediateData.settings
      : settings || {},
    emergencyAlerts: immediateData.hasImmediate
      ? immediateData.emergencyAlerts
      : emergencyAlerts || [],
    vehicleStatus: immediateData.hasImmediate
      ? immediateData.vehicleStatus
      : vehicleStatus || [],
    weatherData: immediateData.hasImmediate
      ? immediateData.weatherData
      : weatherData || {},
    inventory: immediateData.hasImmediate
      ? immediateData.inventory
      : inventory || [],
    reports: immediateData.hasImmediate ? immediateData.reports : reports || [],

    // Smart loading states - only show loading if no cached data available
    loading: loading && !immediateData.hasImmediate,
    isRefreshing: loading && immediateData.hasImmediate, // Background refresh indicator
    isStaleData: immediateData.isStale, // Indicates data might be outdated
    error,

    // Data state indicators for conditional rendering
    hasImmediateData: immediateData.hasImmediate,
    hasAnyData:
      immediateData.hasImmediate ||
      safeAppointments.length > 0 ||
      safeTodayAppointments.length > 0 ||
      (patients && patients.length > 0) ||
      (emergencyAlerts && emergencyAlerts.length > 0),
    cacheAge: immediateData.cacheAge,
    dataSource: immediateData.hasImmediate ? "cache-enhanced" : "fresh",

    // Performance feedback
    ...performanceFeedback.getLoadingProps(),
    performanceStatus: performanceFeedback.getOperationStatus(),
    isLongRunning:
      performanceFeedback.showWarning || performanceFeedback.showError,

    // Utility functions
    forceRefresh,
    refreshIfStale: () => {
      if (immediateData.isStale) {
        console.log(`🔄 ${componentName}: Auto-refreshing stale data`);
        return forceRefresh();
      }
      return Promise.resolve();
    },

    // Debug info and metrics
    isSubscribed: !!unsubscribeRef.current,
    subscriberInfo: dataManager.getSubscriberInfo(),
    metrics: {
      ...subscriptionMetrics,
      hasBeenLoading: performanceFeedback.hasBeenLoading,
      isWarningState: performanceFeedback.isWarningState,
      isErrorState: performanceFeedback.isErrorState,
      cacheAge: immediateData.cacheAge,
      isStale: immediateData.isStale,
    },

    // Enhanced health and analytics data
    healthStatus: subscriptionMetrics.healthStatus,
    cacheHitRate: subscriptionMetrics.cacheHitRate,
    averageResponseTime: subscriptionMetrics.averageResponseTime,
    dataFreshness: dataState.freshness,
    hasErrors: dataState.hasError,
    lastError: dataState.lastError,

    // Advanced utility functions
    checkHealth: checkHealthStatus,
    getAnalytics: () => dataManager.getAdvancedAnalytics(),
    getCacheStatus: () => dataManager.getCacheStatus(),
    getPerformanceReport: () => dataManager.getPerformanceReport(),
  };
};

/**
 * Hook specifically for dashboard components with role-based data
 */
export const useDashboardData = (dashboardName, userRole = null) => {
  const roleBasedDataTypes = {
    operator: [
      "appointments",
      "todayAppointments",
      "upcomingAppointments",
      "notifications",
      "emergencyAlerts",
      "analytics",
    ],
    therapist: ["todayAppointments", "patients", "schedules", "notifications"],
    driver: [
      "routes",
      "vehicleStatus",
      "todayAppointments",
      "weatherData",
      "notifications",
    ],
    admin: [
      "appointments",
      "therapists",
      "drivers",
      "analytics",
      "settings",
      "reports",
    ],
  };

  const dataTypes = roleBasedDataTypes[dashboardName] ||
    roleBasedDataTypes[userRole] || [
      "appointments",
      "todayAppointments",
      "notifications",
    ];

  const options = userRole
    ? { userRole, priority: "high" }
    : { priority: "high" };

  return useDataManager(dashboardName, dataTypes, options);
};

/**
 * Hook for components that need real-time critical data
 */
export const useRealtimeData = (componentName, criticalTypes = []) => {
  const realtimeTypes = [
    "emergencyAlerts",
    "todayAppointments",
    "vehicleStatus",
    "notifications",
    ...criticalTypes,
  ];

  return useDataManager(componentName, realtimeTypes, {
    realtime: true,
    priority: "critical",
    warningThreshold: 5000,
    errorThreshold: 10000,
  });
};

/**
 * Hook for analytics and reporting components
 */
export const useAnalyticsData = (componentName, reportTypes = []) => {
  const analyticsTypes = [
    "analytics",
    "reports",
    "appointments",
    "patients",
    ...reportTypes,
  ];

  return useDataManager(componentName, analyticsTypes, {
    priority: "low",
    warningThreshold: 15000,
    errorThreshold: 30000,
  });
};

/**
 * Hook for scheduling and calendar components
 */
export const useSchedulingData = (componentName) => {
  const schedulingTypes = [
    "appointments",
    "todayAppointments",
    "upcomingAppointments",
    "schedules",
    "therapists",
    "patients",
  ];

  return useDataManager(componentName, schedulingTypes, {
    priority: "high",
    prefetch: true,
  });
};

/**
 * Hook for components that only need specific appointment data
 */
export const useAppointmentData = (
  componentName,
  specificTypes = ["appointments"]
) => {
  return useDataManager(componentName, specificTypes);
};

export default useDataManager;
