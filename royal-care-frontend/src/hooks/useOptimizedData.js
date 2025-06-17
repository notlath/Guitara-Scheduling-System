/**
 * Optimized React Hook for Data Management
 *
 * Much simpler than the original useDataManager:
 * - Uses longer cache TTL to reduce API calls
 * - Leverages Redux state as primary source
 * - Falls back to cache only when Redux state is empty
 * - Minimal re-renders and subscriptions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import optimizedDataManager from "../services/optimizedDataManager";

/**
 * Simple hook that combines Redux state with intelligent caching
 */
export const useOptimizedData = (
  componentName,
  dataTypes = [],
  options = {}
) => {
  const componentId = useRef(`${componentName}_${Date.now()}`);
  const unsubscribeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get data from Redux state first
  const reduxData = useSelector(
    (state) => ({
      appointments: state.scheduling?.appointments || [],
      todayAppointments: state.scheduling?.todayAppointments || [],
      upcomingAppointments: state.scheduling?.upcomingAppointments || [],
      notifications: state.scheduling?.notifications || [],
      loading: state.scheduling?.loading || false,
      error: state.scheduling?.error || null,
    }),
    (left, right) => {
      // Custom equality check to prevent unnecessary re-renders
      return (
        left.appointments.length === right.appointments.length &&
        left.todayAppointments.length === right.todayAppointments.length &&
        left.upcomingAppointments.length ===
          right.upcomingAppointments.length &&
        left.notifications.length === right.notifications.length &&
        left.loading === right.loading &&
        left.error === right.error
      );
    }
  );

  // Memoize data types to prevent subscription churn
  const stableDataTypes = useMemo(() => dataTypes, [dataTypes]);

  // Subscribe to data manager
  useEffect(() => {
    if (stableDataTypes.length === 0) return;

    console.log(`🔌 ${componentName}: Subscribing to optimized data manager`);

    unsubscribeRef.current = optimizedDataManager.subscribe(
      componentId.current,
      stableDataTypes,
      options
    );

    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `🔌 ${componentName}: Unsubscribing from optimized data manager`
        );
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [componentName, stableDataTypes, options]);

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.forceRefresh(stableDataTypes);
    } finally {
      setIsLoading(false);
    }
  }, [stableDataTypes]);

  // Get cached data when Redux state is empty
  const getCachedData = useCallback((dataType) => {
    return optimizedDataManager.getCachedData(dataType);
  }, []);

  // Build final data object with fallbacks
  const finalData = useMemo(() => {
    const result = {};

    stableDataTypes.forEach((dataType) => {
      // Use Redux data first, fallback to cache
      const reduxValue = reduxData[dataType];
      if (reduxValue && reduxValue.length > 0) {
        result[dataType] = reduxValue;
      } else {
        result[dataType] = getCachedData(dataType);
      }
    });

    return result;
  }, [stableDataTypes, reduxData, getCachedData]);

  return {
    // Individual data properties
    appointments: finalData.appointments || reduxData.appointments,
    todayAppointments:
      finalData.todayAppointments || reduxData.todayAppointments,
    upcomingAppointments:
      finalData.upcomingAppointments || reduxData.upcomingAppointments,
    notifications: finalData.notifications || reduxData.notifications,

    // Loading and error states
    loading: reduxData.loading || isLoading,
    error: reduxData.error,

    // Utility functions
    forceRefresh,

    // Status indicators
    hasData: Object.values(finalData).some(
      (data) => Array.isArray(data) && data.length > 0
    ),
    dataSource: reduxData.appointments?.length > 0 ? "redux" : "cache",
  };
};

/**
 * Hook for dashboard components with role-based data
 */
export const useOptimizedDashboardData = (dashboardName, userRole = null) => {
  const dataTypes = useMemo(() => {
    const roleDataMap = {
      operator: ["appointments", "todayAppointments", "notifications"],
      therapist: ["todayAppointments"],
      driver: ["todayAppointments"],
      admin: ["appointments", "notifications"],
    };

    return (
      roleDataMap[dashboardName] ||
      roleDataMap[userRole] || ["todayAppointments"]
    );
  }, [dashboardName, userRole]);

  return useOptimizedData(dashboardName, dataTypes, {
    priority: "high",
    userRole,
  });
};

/**
 * Hook for scheduling components
 */
export const useOptimizedSchedulingData = (componentName) => {
  return useOptimizedData(
    componentName,
    ["appointments", "todayAppointments", "upcomingAppointments"],
    { priority: "high" }
  );
};

/**
 * Hook for notification components
 */
export const useOptimizedNotifications = (componentName) => {
  return useOptimizedData(componentName, ["notifications"], {
    priority: "normal",
  });
};

export default useOptimizedData;
