/**
 * PERFORMANCE FIX: Enhanced useOptimizedData with new optimized backend endpoints
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchActionableAppointments } from "../features/scheduling/schedulingSlice";
import optimizedDataManager from "../services/optimizedDataManager";

// Global stable empty arrays to prevent re-renders
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

/**
 * Ultra-optimized Redux selector with structural sharing
 */
const createOptimizedSelector = () => {
  let lastResult = null;
  let lastState = null;

  return (state) => {
    // Quick reference check first
    if (state === lastState && lastResult) {
      return lastResult;
    }

    const newResult = {
      appointments: state.scheduling?.appointments || EMPTY_ARRAY,
      todayAppointments: state.scheduling?.todayAppointments || EMPTY_ARRAY,
      upcomingAppointments:
        state.scheduling?.upcomingAppointments || EMPTY_ARRAY,
      notifications: state.scheduling?.notifications || EMPTY_ARRAY,
      attendanceRecords: state.attendance?.attendanceRecords || EMPTY_ARRAY,
      loading: state.scheduling?.loading || state.attendance?.loading || false,
      error: state.scheduling?.error || state.attendance?.error || null,
    };

    // Structural comparison for arrays
    if (
      lastResult &&
      lastResult.appointments.length === newResult.appointments.length &&
      lastResult.todayAppointments.length ===
        newResult.todayAppointments.length &&
      lastResult.upcomingAppointments.length ===
        newResult.upcomingAppointments.length &&
      lastResult.notifications.length === newResult.notifications.length &&
      lastResult.attendanceRecords.length ===
        newResult.attendanceRecords.length &&
      lastResult.loading === newResult.loading &&
      lastResult.error === newResult.error
    ) {
      return lastResult; // Return cached result to prevent re-renders
    }

    lastResult = newResult;
    lastState = state;
    return newResult;
  };
};

export const useOptimizedData = (
  componentName,
  dataTypes = [],
  options = {}
) => {
  const unsubscribeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Create optimized selector instance
  const optimizedSelector = useMemo(createOptimizedSelector, []);

  // Get data from Redux state with ultra-optimized selector
  const reduxData = useSelector(optimizedSelector);

  const refreshNotifications = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await optimizedDataManager.refreshNotifications();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // PERFORMANCE: Stabilize data types array aggressively
  const stableDataTypes = useMemo(() => {
    if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
      return EMPTY_ARRAY;
    }
    return [...new Set(dataTypes)].sort();
  }, [dataTypes]); // Include dataTypes dependency

  // PERFORMANCE: Stabilize options object
  const stableOptions = useMemo(
    () => ({
      priority: options?.priority || "normal",
      userRole: options?.userRole,
    }),
    [options?.priority, options?.userRole]
  );

  // PERFORMANCE: Optimized subscription management
  useEffect(() => {
    if (stableDataTypes.length === 0) return;

    const subscriptionKey = `${componentName}_${stableDataTypes.join("_")}_${
      stableOptions.priority
    }`;

    // Prevent duplicate subscriptions
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = optimizedDataManager.subscribe(
      subscriptionKey,
      stableDataTypes,
      stableOptions
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [componentName, stableDataTypes, stableOptions]);

  // PERFORMANCE: Cached data retrieval with memoization
  const getCachedData = useCallback((dataType) => {
    const cached = optimizedDataManager.getCachedData(dataType);
    return Array.isArray(cached) ? cached : EMPTY_ARRAY;
  }, []);

  // PERFORMANCE: Ultra-optimized final data building
  const finalData = useMemo(() => {
    const result = {};

    stableDataTypes.forEach((dataType) => {
      const reduxValue = reduxData[dataType];
      // Always ensure we return arrays to prevent downstream errors
      if (Array.isArray(reduxValue) && reduxValue.length > 0) {
        result[dataType] = reduxValue;
      } else {
        const cached = getCachedData(dataType);
        result[dataType] = cached.length > 0 ? cached : EMPTY_ARRAY;
      }
    });

    return result;
  }, [stableDataTypes, reduxData, getCachedData]);

  // PERFORMANCE: Memoized refresh methods with batch optimization
  const forceRefresh = useCallback(async () => {
    if (isLoading) return; // Prevent concurrent refreshes

    setIsLoading(true);
    try {
      await optimizedDataManager.forceRefresh(stableDataTypes);
    } finally {
      setIsLoading(false);
    }
  }, [stableDataTypes, isLoading]);

  const refreshAppointments = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await optimizedDataManager.refreshAppointments();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // PERFORMANCE: Stable return object with memoization
  return useMemo(
    () => ({
      // Always return arrays to prevent charAt errors
      appointments: Array.isArray(finalData.appointments)
        ? finalData.appointments
        : Array.isArray(reduxData.appointments)
        ? reduxData.appointments
        : EMPTY_ARRAY,
      todayAppointments: Array.isArray(finalData.todayAppointments)
        ? finalData.todayAppointments
        : Array.isArray(reduxData.todayAppointments)
        ? reduxData.todayAppointments
        : EMPTY_ARRAY,
      upcomingAppointments: Array.isArray(finalData.upcomingAppointments)
        ? finalData.upcomingAppointments
        : Array.isArray(reduxData.upcomingAppointments)
        ? reduxData.upcomingAppointments
        : EMPTY_ARRAY,
      notifications: Array.isArray(finalData.notifications)
        ? finalData.notifications
        : Array.isArray(reduxData.notifications)
        ? reduxData.notifications
        : EMPTY_ARRAY,
      attendanceRecords: Array.isArray(finalData.attendanceRecords)
        ? finalData.attendanceRecords
        : Array.isArray(reduxData.attendanceRecords)
        ? reduxData.attendanceRecords
        : EMPTY_ARRAY,

      loading: reduxData.loading || isLoading,
      error: reduxData.error,

      // Stable function references
      forceRefresh,
      refreshAppointments,
      refreshNotifications,

      hasData: Object.values(finalData).some(
        (data) => Array.isArray(data) && data.length > 0
      ),
      dataSource:
        Array.isArray(reduxData.appointments) &&
        reduxData.appointments.length > 0
          ? "redux"
          : "cache",
    }),
    [
      finalData,
      reduxData,
      isLoading,
      forceRefresh,
      refreshAppointments,
      refreshNotifications,
    ]
  );
};

/**
 * PERFORMANCE: Ultra-optimized dashboard data hook
 */
export const useOptimizedDashboardData = (dashboardName, userRole = null) => {
  // PERFORMANCE: Stable data types computation
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

    return (
      roleDataMap[dashboardName] ||
      roleDataMap[userRole] || ["todayAppointments"]
    ).sort();
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

export default useOptimizedData;

/**
 * PERFORMANCE: Ultra-optimized attendance data hook
 * This hook specifically optimizes attendance data retrieval and caching
 * @param {string} selectedDate - ISO format date string for attendance records
 * @returns {Object} Optimized attendance data and utility functions
 */
export const useOptimizedAttendance = (selectedDate) => {
  // PERFORMANCE: Stable data types computation
  const dataTypes = useMemo(() => ["attendanceRecords"], []);

  const options = useMemo(
    () => ({
      priority: "high",
      dateFilter: selectedDate,
    }),
    [selectedDate]
  );

  const baseData = useOptimizedData("attendanceProvider", dataTypes, options);

  // Fetch attendance for a specific date with optimized caching
  const fetchAttendanceForDate = useCallback(async (date) => {
    if (!date) return;

    const formattedDate =
      typeof date === "object" ? date.toISOString().split("T")[0] : date;

    return await optimizedDataManager.fetchAttendanceForDate(formattedDate);
  }, []);

  // Get cached attendance for a date without triggering refresh
  const getCachedAttendanceForDate = useCallback((date) => {
    if (!date) return EMPTY_ARRAY;

    const formattedDate =
      typeof date === "object" ? date.toISOString().split("T")[0] : date;

    return (
      optimizedDataManager.getCachedAttendanceForDate(formattedDate) ||
      EMPTY_ARRAY
    );
  }, []);

  // Return enhanced attendance data
  return useMemo(
    () => ({
      ...baseData,
      attendanceRecords: baseData.attendanceRecords || EMPTY_ARRAY,
      fetchAttendanceForDate,
      getCachedAttendanceForDate,
      forceRefreshAttendance: baseData.forceRefresh,
      hasDataForDate:
        Array.isArray(baseData.attendanceRecords) &&
        baseData.attendanceRecords.length > 0,
    }),
    [baseData, fetchAttendanceForDate, getCachedAttendanceForDate]
  );
};

/**
 * ULTRA-OPTIMIZED OPERATOR DASHBOARD HOOK
 * Uses the new backend endpoints for maximum performance
 */
export const useOperatorDashboardOptimized = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(EMPTY_ARRAY);
  const [dashboardStats, setDashboardStats] = useState(EMPTY_OBJECT);

  // Get data from Redux store (fallback)
  const {
    actionableAppointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
  } = useSelector((state) => ({
    actionableAppointments:
      state.scheduling?.actionableAppointments || EMPTY_ARRAY,
    todayAppointments: state.scheduling?.todayAppointments || EMPTY_ARRAY,
    upcomingAppointments: state.scheduling?.upcomingAppointments || EMPTY_ARRAY,
    notifications: state.scheduling?.notifications || EMPTY_ARRAY,
  }));

  // NEW: Optimized dashboard data fetching using new backend endpoints
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the new optimized operator_dashboard endpoint
      const response = await fetch(
        "/api/scheduling/appointments/operator_dashboard/",
        {
          headers: {
            Authorization: `Token ${localStorage.getItem("knoxToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        console.log(
          "✅ Dashboard data fetched from optimized endpoint:",
          data.length,
          "appointments"
        );
      } else {
        throw new Error(`Dashboard API error: ${response.status}`);
      }
    } catch (err) {
      console.error(
        "❌ useOperatorDashboardOptimized: Failed to fetch dashboard data",
        err
      );
      setError(err);
      // Fallback to Redux data if API fails
      await dispatch(fetchActionableAppointments()).unwrap();
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const fetchDashboardStatistics = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/scheduling/appointments/dashboard_stats/",
        {
          headers: {
            Authorization: `Token ${localStorage.getItem("knoxToken")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const stats = await response.json();
        setDashboardStats(stats);
        console.log("✅ Dashboard stats fetched:", stats);
      }
    } catch (err) {
      console.error("❌ Failed to fetch dashboard stats", err);
      // Fallback to calculated stats
      const actionableCount = actionableAppointments.length;
      const urgentCount = todayAppointments.filter(
        (apt) => apt.priority === "high" || apt.status === "urgent"
      ).length;
      const unreadNotifications = notifications.filter(
        (n) => !n.is_read
      ).length;

      setDashboardStats({
        totalActionable: actionableCount,
        urgent: urgentCount,
        unreadNotifications,
        total_today: todayAppointments.length,
        pending_today: todayAppointments.filter(
          (apt) => apt.status === "pending"
        ).length,
        in_progress_today: todayAppointments.filter((apt) =>
          ["in_progress", "journey", "arrived", "session_in_progress"].includes(
            apt.status
          )
        ).length,
        completed_today: todayAppointments.filter(
          (apt) => apt.status === "completed"
        ).length,
        awaiting_payment: actionableAppointments.filter(
          (apt) => apt.status === "awaiting_payment"
        ).length,
        urgent_deadlines: 0,
      });
    }
  }, [actionableAppointments, todayAppointments, notifications]);

  // Auto-fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
    fetchDashboardStatistics();
  }, [fetchDashboardData, fetchDashboardStatistics]);

  // Return both new optimized data and fallback data
  const finalDashboardData =
    dashboardData.length > 0 ? dashboardData : actionableAppointments;
  const finalStats =
    Object.keys(dashboardStats).length > 0
      ? dashboardStats
      : {
          totalActionable: actionableAppointments.length,
          urgent: todayAppointments.filter(
            (apt) => apt.priority === "high" || apt.status === "urgent"
          ).length,
          unreadNotifications: notifications.filter((n) => !n.is_read).length,
        };

  return {
    // Optimized data from new endpoints
    dashboardData: finalDashboardData,
    dashboardStats: finalStats,

    // Legacy data for backward compatibility
    actionableAppointments: finalDashboardData,
    todayAppointments,
    upcomingAppointments,
    notifications,

    // State
    isLoading,
    error,
    hasData: finalDashboardData.length > 0,

    // Actions
    fetchDashboardData,
    fetchDashboardStatistics,

    // Quick refresh all critical data
    refreshDashboard: useCallback(async () => {
      await Promise.all([fetchDashboardData(), fetchDashboardStatistics()]);
    }, [fetchDashboardData, fetchDashboardStatistics]),
  };
};
