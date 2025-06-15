/**
 * React hook for using the centralized DataManager
 * Automatically subscribes/unsubscribes components to prevent redundant API calls
 */

import { useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import dataManager from "../services/dataManager";

/**
 * Hook to subscribe to centralized data management
 * @param {string} componentName - Unique name for the component
 * @param {Array} dataTypes - Array of data types needed ['appointments', 'todayAppointments', etc.]
 * @param {Object} options - Additional options like user role, filters
 */
export const useDataManager = (componentName, dataTypes = [], options = {}) => {
  const unsubscribeRef = useRef(null);
  const componentIdRef = useRef(`${componentName}_${Date.now()}`);

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

  // Memoize serialized values to prevent unnecessary re-renders
  const dataTypesKey = useMemo(() => JSON.stringify(dataTypes), [dataTypes]);
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);

  useEffect(() => {
    if (dataTypes.length === 0) return;

    console.log(
      `🔌 useDataManager: ${componentName} subscribing to centralized data management`
    );

    // Subscribe to data manager
    unsubscribeRef.current = dataManager.subscribe(
      componentIdRef.current,
      dataTypes,
      options
    );

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        console.log(
          `🔌 useDataManager: ${componentName} unsubscribing from centralized data management`
        );
        unsubscribeRef.current();
      }
    };
  }, [componentName, dataTypes, options, dataTypesKey, optionsKey]); // Keep all dependencies for safety

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

    // Utility functions
    forceRefresh,

    // Debug info
    isSubscribed: !!unsubscribeRef.current,
    subscriberInfo: dataManager.getSubscriberInfo(),
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
