/**
 * React hook for using the centralized DataManager with performance feedback
 * Automatically subscribes/unsubscribes components to prevent redundant API calls
 * Now includes performance monitoring and timeout warnings
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import dataManager from "../services/dataManager";
import usePerformanceFeedback from "./usePerformanceFeedback";

/**
 * Hook to subscribe to centralized data management with performance monitoring
 * @param {string} componentName - Unique name for the component
 * @param {Array} dataTypes - Array of data types needed ['appointments', 'todayAppointments', etc.]
 * @param {Object} options - Additional options like user role, filters, performance settings
 */
export const useDataManager = (componentName, dataTypes = [], options = {}) => {
  const unsubscribeRef = useRef(null);
  const componentIdRef = useRef(`${componentName}_${Date.now()}`);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState({
    subscribeTime: null,
    lastDataFetch: null,
    fetchCount: 0,
  });

  // Performance feedback for long operations (adjusted for very slow backend)
  const performanceFeedback = usePerformanceFeedback({
    warningThreshold: options.warningThreshold || 10000, // Increased from 6000 to 10000
    errorThreshold: options.errorThreshold || 20000, // Increased from 12000 to 20000
    onLongRunningOperation: (detail) => {
      console.warn(
        `🐌 ${componentName}: Long-running data operation detected:`,
        detail
      );
    },
  });

  // Get data from Redux store (data manager updates Redux, components read from Redux)
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    error,
  } = useSelector((state) => state.scheduling);

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
    hasImmediate: false,
    cacheAge: null,
    isStale: false,
  });

  // Memoize dataTypes for stable reference
  const dataTypesKey = useMemo(() => JSON.stringify(dataTypes), [dataTypes]);

  // Check for cached data immediately on mount and component updates
  useEffect(() => {
    const checkCachedData = () => {
      const cachedData = {};
      let hasAnyCache = false;
      let oldestCacheAge = 0;
      let hasStaleData = false;

      dataTypes.forEach((dataType) => {
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
        setImmediateData((prev) => ({
          ...prev,
          ...cachedData,
          hasImmediate: true,
          cacheAge: oldestCacheAge,
          isStale: hasStaleData,
        }));
        console.log(
          `⚡ ${componentName}: Using cached data for immediate display (age: ${Math.round(
            oldestCacheAge / 1000
          )}s, stale: ${hasStaleData})`
        );
      }
    };

    checkCachedData();
  }, [componentName, dataTypes]); // Only depend on stable values

  // Update immediate data when Redux data changes
  useEffect(() => {
    if (
      safeAppointments.length > 0 ||
      safeTodayAppointments.length > 0 ||
      safeUpcomingAppointments.length > 0 ||
      safeNotifications.length > 0
    ) {
      setImmediateData({
        appointments: safeAppointments,
        todayAppointments: safeTodayAppointments,
        upcomingAppointments: safeUpcomingAppointments,
        notifications: safeNotifications,
        hasImmediate: true,
      });
    }
  }, [
    safeAppointments,
    safeTodayAppointments,
    safeUpcomingAppointments,
    safeNotifications,
  ]);

  // Memoize performance feedback values to prevent infinite loops
  const isPerformanceLoading = useMemo(() => performanceFeedback.isLoading, [performanceFeedback.isLoading]);
  
  // Use direct function calls to avoid circular dependencies
  const performanceStartOperation = useCallback((name) => {
    if (performanceFeedback && typeof performanceFeedback.startOperation === 'function') {
      performanceFeedback.startOperation(name);
    }
  }, [performanceFeedback]);
  
  const performanceEndOperation = useCallback(() => {
    if (performanceFeedback && typeof performanceFeedback.endOperation === 'function') {
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
  }, [loading, isPerformanceLoading, componentName, performanceStartOperation, performanceEndOperation]);

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

    // Cleanup on unmount or re-render
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `🔌 useDataManager: ${componentName} unsubscribing from centralized data management`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentName, dataTypesKey, optionsKey]); // Only depend on serialized keys to prevent re-subscriptions

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
      safeTodayAppointments.length > 0,
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
  };
};

/**
 * Hook specifically for dashboard components
 * Provides common data needed by most dashboards
 */
export const useDashboardData = (dashboardName, userRole = null) => {
  const baseDataTypes = [
    "appointments",
    "todayAppointments",
    "upcomingAppointments",
  ];

  // Add notifications for operator dashboard
  const dataTypes =
    dashboardName === "operator" || dashboardName === "operatorDashboard"
      ? [...baseDataTypes, "notifications"]
      : baseDataTypes;

  const options = userRole ? { userRole } : {};

  return useDataManager(dashboardName, dataTypes, options);
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
