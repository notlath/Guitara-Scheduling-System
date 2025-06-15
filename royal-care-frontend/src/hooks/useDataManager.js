/**
 * React hook for using the centralized DataManager with performance feedback
 * Automatically subscribes/unsubscribes components to prevent redundant API calls
 * Now includes performance monitoring and timeout warnings
 */

import { useEffect, useMemo, useRef, useState } from "react";
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

  // Ensure arrays are always defined to prevent loading issues
  const safeAppointments = appointments || [];
  const safeTodayAppointments = todayAppointments || [];
  const safeUpcomingAppointments = upcomingAppointments || [];
  const safeNotifications = notifications || [];

  // Track loading state changes for performance feedback
  useEffect(() => {
    if (loading && !performanceFeedback.isLoading) {
      performanceFeedback.startOperation(`Loading data for ${componentName}`);
    } else if (!loading && performanceFeedback.isLoading) {
      performanceFeedback.endOperation();
      setSubscriptionMetrics((prev) => ({
        ...prev,
        lastDataFetch: Date.now(),
        fetchCount: prev.fetchCount + 1,
      }));
    }
  }, [loading, componentName, performanceFeedback]);

  // Memoize serialized values to prevent unnecessary re-renders
  const dataTypesKey = useMemo(() => JSON.stringify(dataTypes), [dataTypes]);
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
    // Data from Redux store - using safe arrays to prevent undefined issues
    appointments: safeAppointments,
    todayAppointments: safeTodayAppointments,
    upcomingAppointments: safeUpcomingAppointments,
    notifications: safeNotifications,
    loading,
    error,

    // Performance feedback
    ...performanceFeedback.getLoadingProps(),
    performanceStatus: performanceFeedback.getOperationStatus(),
    isLongRunning:
      performanceFeedback.showWarning || performanceFeedback.showError,

    // Utility functions
    forceRefresh,

    // Debug info and metrics
    isSubscribed: !!unsubscribeRef.current,
    subscriberInfo: dataManager.getSubscriberInfo(),
    metrics: {
      ...subscriptionMetrics,
      hasBeenLoading: performanceFeedback.hasBeenLoading,
      isWarningState: performanceFeedback.isWarningState,
      isErrorState: performanceFeedback.isErrorState,
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
