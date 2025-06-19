/**
 * Optimized React Hook for Data Management
 *
 * Much simpler than the original useDataManager:
 * - Uses longer cache TTL to reduce API calls
 * - Leverages Redux state as primary source
 * - Falls back to cache only when Redux state is empty
 * - Minimal re-renders and subscriptions
 * - Stable dependencies to prevent unnecessary hook re-runs
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

  // Get data from Redux state first with optimized selector
  const reduxData = useSelector(
    (state) => ({
      appointments: state.scheduling?.appointments || [],
      todayAppointments: state.scheduling?.todayAppointments || [],
      upcomingAppointments: state.scheduling?.upcomingAppointments || [],
      notifications: state.scheduling?.notifications || [],
      attendanceRecords: state.attendance?.attendanceRecords || [],
      loading: state.scheduling?.loading || state.attendance?.loading || false,
      error: state.scheduling?.error || state.attendance?.error || null,
    }),
    // Optimized equality check to prevent unnecessary re-renders - use simple comparison
    (left, right) => {
      // Quick early return if objects are the same reference
      if (left === right) return true;

      // Compare primitive values first (fastest)
      if (left.loading !== right.loading || left.error !== right.error) {
        return false;
      }

      // Compare array lengths (faster than deep comparison)
      return (
        left.appointments.length === right.appointments.length &&
        left.todayAppointments.length === right.todayAppointments.length &&
        left.upcomingAppointments.length ===
          right.upcomingAppointments.length &&
        left.notifications.length === right.notifications.length &&
        left.attendanceRecords.length === right.attendanceRecords.length
      );
    }
  ); // Stabilize data types array to prevent unnecessary re-subscriptions
  const stableDataTypes = useMemo(() => {
    // Create a sorted, deduplicated array for stable comparison
    if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
      return [];
    }

    // Sort and deduplicate to ensure stable reference
    return [...new Set(dataTypes)].sort();
  }, [dataTypes]); // Use dataTypes directly - memoization will handle stability

  // Stabilize options object to prevent unnecessary re-subscriptions
  const stableOptions = useMemo(() => {
    return {
      priority: options?.priority || "normal",
      userRole: options?.userRole,
    };
  }, [options?.priority, options?.userRole]);

  // Subscribe to data manager with stable dependencies
  useEffect(() => {
    if (stableDataTypes.length === 0) return;

    console.log(`🔌 ${componentName}: Subscribing to optimized data manager`);

    unsubscribeRef.current = optimizedDataManager.subscribe(
      componentId.current,
      stableDataTypes,
      stableOptions
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
  }, [componentName, stableDataTypes, stableOptions]);

  // Force refresh function with stable reference
  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.forceRefresh(stableDataTypes);
    } finally {
      setIsLoading(false);
    }
  }, [stableDataTypes]);

  // Targeted refresh methods - more efficient than forceRefresh
  const refreshAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.refreshAppointments();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.refreshNotifications();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.refreshUserSpecificData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const quickRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await optimizedDataManager.quickRefresh();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get cached data function with stable reference
  const getCachedData = useCallback((dataType) => {
    return optimizedDataManager.getCachedData(dataType);
  }, []);

  // Build final data object with fallbacks - memoized for performance
  const finalData = useMemo(() => {
    const result = {};

    stableDataTypes.forEach((dataType) => {
      // Use Redux data first, fallback to cache
      const reduxValue = reduxData[dataType];
      if (reduxValue && reduxValue.length > 0) {
        result[dataType] = reduxValue;
      } else {
        result[dataType] = getCachedData(dataType) || [];
      }
    });

    return result;
  }, [stableDataTypes, reduxData, getCachedData]);

  // Check if we have any meaningful data
  const hasData = useMemo(() => {
    return Object.values(finalData).some(
      (data) => Array.isArray(data) && data.length > 0
    );
  }, [finalData]);

  return {
    // Individual data properties
    appointments: finalData.appointments || reduxData.appointments,
    todayAppointments:
      finalData.todayAppointments || reduxData.todayAppointments,
    upcomingAppointments:
      finalData.upcomingAppointments || reduxData.upcomingAppointments,
    notifications: finalData.notifications || reduxData.notifications,
    attendanceRecords:
      finalData.attendanceRecords || reduxData.attendanceRecords,

    // Loading and error states
    loading: reduxData.loading || isLoading,
    error: reduxData.error,

    // Utility functions
    forceRefresh,
    refreshAppointments,
    refreshNotifications,
    refreshUserData,
    quickRefresh,

    // Status indicators
    hasData,
    dataSource: reduxData.appointments?.length > 0 ? "redux" : "cache",
  };
};

/**
 * Hook for dashboard components with role-based data
 */
export const useOptimizedDashboardData = (dashboardName, userRole = null) => {
  const dataTypes = useMemo(() => {
    const roleDataMap = {
      operator: [
        "appointments",
        "todayAppointments",
        "notifications",
        "attendanceRecords",
      ],
      operatorDashboard: [
        "appointments",
        "todayAppointments",
        "notifications",
        "attendanceRecords",
      ],
      therapist: ["todayAppointments"],
      therapistDashboard: ["todayAppointments"],
      driver: ["todayAppointments"],
      driverDashboard: ["todayAppointments"],
      admin: ["appointments", "notifications", "attendanceRecords"],
    };

    const result = roleDataMap[dashboardName] ||
      roleDataMap[userRole] || ["todayAppointments"];

    // Sort to ensure stable order
    return result.sort();
  }, [dashboardName, userRole]);

  const options = useMemo(
    () => ({
      priority: "high",
      userRole,
    }),
    [userRole]
  );

  return useOptimizedData(dashboardName, dataTypes, options);
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

/**
 * Hook for attendance management with date-specific caching and optimized re-renders
 */
export const useOptimizedAttendance = (selectedDate) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedDate, setLastFetchedDate] = useState(null);

  // Memoize the selected date to prevent unnecessary effects
  const memoizedSelectedDate = useMemo(() => {
    if (!selectedDate) return new Date().toISOString().split("T")[0];
    return selectedDate;
  }, [selectedDate]);

  // Optimized Redux selector with date-specific memoization
  const attendanceData = useSelector(
    (state) => ({
      attendanceRecords: state.attendance?.attendanceRecords || [],
      loading: state.attendance?.loading || false,
      error: state.attendance?.error || null,
      lastUpdated: state.attendance?.lastUpdated || null,
    }),
    // Enhanced equality check that considers the selected date context
    (left, right) => {
      return (
        left.attendanceRecords.length === right.attendanceRecords.length &&
        left.loading === right.loading &&
        left.error === right.error &&
        left.lastUpdated === right.lastUpdated
      );
    }
  );

  // Memoize filtered attendance records for the selected date
  const dateSpecificAttendance = useMemo(() => {
    const records = attendanceData.attendanceRecords;
    if (!records || records.length === 0) return [];

    // Filter records for the specific date
    return records.filter((record) => {
      const recordDate = new Date(record.date || record.created_at)
        .toISOString()
        .split("T")[0];
      return recordDate === memoizedSelectedDate;
    });
  }, [attendanceData.attendanceRecords, memoizedSelectedDate]);

  // Memoize cached data check to prevent repeated cache lookups
  const cachedDataForDate = useMemo(() => {
    return optimizedDataManager.getCachedAttendanceForDate(
      memoizedSelectedDate
    );
  }, [memoizedSelectedDate]);

  // Stable function references with useCallback and proper dependencies
  const fetchAttendanceForDate = useCallback(
    async (date) => {
      const targetDate = date || memoizedSelectedDate;

      // Prevent duplicate fetches
      if (isLoading || lastFetchedDate === targetDate) {
        return cachedDataForDate;
      }

      setIsLoading(true);
      setLastFetchedDate(targetDate);

      try {
        const data = await optimizedDataManager.fetchAttendanceForDate(
          targetDate
        );
        return data;
      } catch (error) {
        console.error("Failed to fetch attendance for date:", error);
        setLastFetchedDate(null); // Reset on error
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [memoizedSelectedDate, isLoading, lastFetchedDate, cachedDataForDate]
  );

  const forceRefreshAttendance = useCallback(
    async (date) => {
      const targetDate = date || memoizedSelectedDate;
      setIsLoading(true);

      try {
        const data = await optimizedDataManager.forceRefreshAttendance(
          targetDate
        );
        setLastFetchedDate(targetDate);
        return data;
      } catch (error) {
        console.error("Failed to force refresh attendance:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [memoizedSelectedDate]
  );

  // Memoized cache getter with stable reference
  const getCachedAttendanceForDate = useCallback(
    (date) => {
      const targetDate = date || memoizedSelectedDate;
      return optimizedDataManager.getCachedAttendanceForDate(targetDate);
    },
    [memoizedSelectedDate]
  );

  // Optimized effect that only runs when necessary
  useEffect(() => {
    if (!memoizedSelectedDate) return;

    // Check if we already have data for this date
    const hasReduxData = dateSpecificAttendance.length > 0;
    const hasCachedData = cachedDataForDate && cachedDataForDate.length > 0;

    // Only fetch if we don't have any data and haven't recently fetched this date
    if (
      !hasReduxData &&
      !hasCachedData &&
      lastFetchedDate !== memoizedSelectedDate
    ) {
      console.log(`📅 Fetching attendance for ${memoizedSelectedDate}`);
      fetchAttendanceForDate(memoizedSelectedDate);
    } else {
      console.log(`📅 Using existing data for ${memoizedSelectedDate}`);
    }
  }, [
    memoizedSelectedDate,
    dateSpecificAttendance.length,
    cachedDataForDate,
    lastFetchedDate,
    fetchAttendanceForDate,
  ]);

  // Memoize the final return object to prevent unnecessary re-renders of consuming components
  return useMemo(
    () => ({
      // Use date-specific attendance if available, otherwise fall back to cached or Redux data
      attendanceRecords:
        dateSpecificAttendance.length > 0
          ? dateSpecificAttendance
          : cachedDataForDate || attendanceData.attendanceRecords,

      loading: attendanceData.loading || isLoading,
      error: attendanceData.error,

      // Function references (already memoized with useCallback)
      fetchAttendanceForDate,
      forceRefreshAttendance,
      getCachedAttendanceForDate,

      // Additional useful data
      hasDataForDate:
        dateSpecificAttendance.length > 0 ||
        (cachedDataForDate && cachedDataForDate.length > 0),
      selectedDate: memoizedSelectedDate,
      dataSource:
        dateSpecificAttendance.length > 0
          ? "redux"
          : cachedDataForDate
          ? "cache"
          : "none",
    }),
    [
      dateSpecificAttendance,
      cachedDataForDate,
      attendanceData.attendanceRecords,
      attendanceData.loading,
      attendanceData.error,
      isLoading,
      fetchAttendanceForDate,
      forceRefreshAttendance,
      getCachedAttendanceForDate,
      memoizedSelectedDate,
    ]
  );
};

export default useOptimizedData;
