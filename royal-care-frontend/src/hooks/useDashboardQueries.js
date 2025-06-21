/**
 * Dashboard TanStack Query Hooks - Complete Migration
 *
 * This file replaces useOptimizedDashboardData and optimizedDataManager
 * with modern TanStack Query patterns for all dashboard components.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { fetchAttendanceRecords } from "../features/attendance/attendanceSlice";
import { updateAppointmentStatus } from "../features/scheduling/schedulingSlice";
import store from "../store";

// API URL based on environment
const API_URL =
  import.meta.env.MODE === "production"
    ? "/api/scheduling/"
    : "http://localhost:8000/api/scheduling/";

// Direct API calls (bypassing Redux for TanStack Query)
const fetchAppointmentsAPI = async () => {
  console.log("🚀 TanStack Query: fetchAppointmentsAPI called!");

  const token = localStorage.getItem("knoxToken");
  if (!token) {
    console.error("❌ No authentication token found");
    throw new Error("Authentication required");
  }

  console.log("🔄 Direct API: Fetching appointments...", {
    url: `${API_URL}appointments/`,
    token: token.substring(0, 10) + "...",
  });

  try {
    const response = await axios.get(`${API_URL}appointments/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    console.log("✅ Direct API: Appointments fetched successfully", {
      status: response.status,
      count: response.data?.length || 0,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      sampleData: response.data?.slice(0, 2),
    });

    console.log("📦 API appointments response (full):", response.data);

    if (Array.isArray(response.data)) {
      console.log("✅ Returning appointments array:", response.data.length);
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      console.log(
        "✅ Returning appointments.results array:",
        response.data.results.length
      );
      return response.data.results;
    } else {
      console.warn("⚠️ API response is not an array, returning empty array");
      return [];
    }
  } catch (error) {
    console.error("❌ fetchAppointmentsAPI error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

const fetchTodayAppointmentsAPI = async () => {
  const token = localStorage.getItem("knoxToken");
  if (!token) {
    throw new Error("Authentication required");
  }

  console.log("🔄 Direct API: Fetching today appointments...");
  const response = await axios.get(`${API_URL}appointments/today/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  console.log("✅ Direct API: Today appointments fetched", {
    count: response.data?.length || 0,
  });

  return response.data || [];
};

const fetchNotificationsAPI = async () => {
  console.log("🚀 TanStack Query: fetchNotificationsAPI called!");

  const token = localStorage.getItem("knoxToken");
  if (!token) {
    console.error("❌ No authentication token found for notifications");
    throw new Error("Authentication required");
  }

  console.log("🔄 Direct API: Fetching notifications...", {
    url: `${API_URL}notifications/`,
    token: token.substring(0, 10) + "...",
  });

  try {
    const response = await axios.get(`${API_URL}notifications/`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    console.log("✅ Direct API: Notifications fetched successfully", {
      status: response.status,
      count: response.data?.length || 0,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
    });

    return response.data || [];
  } catch (error) {
    console.error("❌ fetchNotificationsAPI error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

const fetchUpcomingAppointmentsAPI = async () => {
  const token = localStorage.getItem("knoxToken");
  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axios.get(`${API_URL}appointments/upcoming/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  return response.data || [];
};

// Simple query keys (no method calls)
const queryKeys = {
  appointments: {
    all: ["appointments"],
    list: ["appointments", "list"],
    today: ["appointments", "today"],
    upcoming: ["appointments", "upcoming"],
    byTherapist: (therapistId, type) => [
      "appointments",
      "therapist",
      therapistId,
      type,
    ],
    byDriver: (driverId, type) => ["appointments", "driver", driverId, type],
  },
  notifications: {
    all: ["notifications"],
    list: ["notifications", "list"],
  },
  attendance: {
    all: ["attendance"],
    list: ["attendance", "list"],
  },
  dashboard: {
    all: ["dashboard"],
    operator: ["dashboard", "operator"],
    therapist: (therapistId) => ["dashboard", "therapist", therapistId],
    driver: (driverId) => ["dashboard", "driver", driverId],
  },
};

// Stale time constants
const staleTime = {
  SHORT: 3 * 60 * 1000, // 3 minutes
  MEDIUM: 10 * 60 * 1000, // 10 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
};

// ==========================================
// OPERATOR DASHBOARD HOOKS
// ==========================================

/**
 * Complete operator dashboard data with all required features
 * Replaces: useOptimizedDashboardData("operatorDashboard", "operator")
 */
export const useOperatorDashboardData = () => {
  console.log("🚀 useOperatorDashboardData hook called!");

  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  // Main appointments data with direct API calls
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list,
    queryFn: fetchAppointmentsAPI,
    staleTime: 0, // Force fresh data for debugging
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: true, // Force enable
    retry: 2,
    initialData: [], // Provide initial data as empty array
    onSuccess: (data) => {
      console.log("✅ appointmentsQuery onSuccess:", data?.length);
    },
    onError: (error) => {
      console.error("❌ appointmentsQuery onError:", error);
    },
  });

  // Force trigger the query if it's not running
  console.log("🔍 appointmentsQuery state:", {
    data: appointmentsQuery.data,
    dataLength: appointmentsQuery.data?.length,
    isLoading: appointmentsQuery.isLoading,
    isFetching: appointmentsQuery.isFetching,
    isError: appointmentsQuery.isError,
    error: appointmentsQuery.error,
    status: appointmentsQuery.status,
    fetchStatus: appointmentsQuery.fetchStatus,
    isStale: appointmentsQuery.isStale,
    isSuccess: appointmentsQuery.isSuccess,
  });

  // If query is not running, force it
  if (
    !appointmentsQuery.isFetching &&
    !appointmentsQuery.isLoading &&
    appointmentsQuery.data?.length === 0
  ) {
    console.log("🚨 Query not running, manually triggering...");
    appointmentsQuery.refetch();
  }

  // Today's appointments with direct API calls
  const todayAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: fetchTodayAppointmentsAPI,
    staleTime: 0, // Force fresh data for debugging
    cacheTime: 2 * 60 * 1000, // 2 minutes cache
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [], // Provide initial data as empty array
  });

  // Upcoming appointments with direct API calls
  const upcomingAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.upcoming,
    queryFn: fetchUpcomingAppointmentsAPI,
    staleTime: 0, // Force fresh data for debugging
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [], // Provide initial data as empty array
  });

  // Notifications with direct API calls
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: fetchNotificationsAPI,
    staleTime: 0, // Force fresh data for debugging
    cacheTime: 3 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Background refresh every 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [], // Provide initial data as empty array
  });

  // Attendance records with proper Redux dispatch
  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.list,
    queryFn: async () => {
      try {
        const result = await dispatch(
          fetchAttendanceRecords({
            date: new Date().toISOString().split("T")[0],
          })
        ).unwrap();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn("Failed to fetch attendance records:", error);
        return [];
      }
    },
    staleTime: staleTime.MEDIUM,
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [], // Provide initial data as empty array
  });

  // Force refresh function with enhanced invalidation (replaces optimizedDataManager.forceRefresh)
  const forceRefresh = useCallback(async () => {
    console.log("🔄 Force refreshing all dashboard data...");

    // Test manual API call first
    try {
      console.log("🧪 Testing direct API call...");
      const testData = await fetchAppointmentsAPI();
      console.log("🧪 Direct API call result:", testData?.length, testData);
    } catch (error) {
      console.error("🧪 Direct API call failed:", error);
    }

    // Invalidate all related queries in parallel for better performance
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    ]);

    // Force immediate refetch of critical data
    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.list }),
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.today }),
      queryClient.refetchQueries({ queryKey: queryKeys.notifications.list }),
    ]);

    console.log("✅ Force refresh completed");
  }, [queryClient]);

  // Individual refresh functions with smart invalidation
  const refreshAppointments = useCallback(async () => {
    console.log("🔄 Refreshing appointments data...");
    await queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all,
    });
    console.log("✅ Appointments refresh completed");
  }, [queryClient]);

  const refreshNotifications = useCallback(async () => {
    console.log("🔄 Refreshing notifications data...");
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
    console.log("✅ Notifications refresh completed");
  }, [queryClient]);

  // Enhanced refresh function for real-time updates
  const refreshTodayData = useCallback(async () => {
    console.log("🔄 Refreshing today's critical data...");
    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.today }),
      queryClient.refetchQueries({ queryKey: queryKeys.notifications.list }),
    ]);
    console.log("✅ Today's data refresh completed");
  }, [queryClient]);

  // Complete data object matching original useOptimizedDashboardData interface
  const returnData = {
    // ✅ PRIMARY DATA - All required fields from OperatorDashboard.jsx
    appointments: appointmentsQuery.data || [],
    todayAppointments: todayAppointmentsQuery.data || [],
    upcomingAppointments: upcomingAppointmentsQuery.data || [],
    notifications: notificationsQuery.data || [],
    attendanceRecords: attendanceQuery.data || [],

    // ✅ LOADING STATES - Complete compatibility
    loading:
      appointmentsQuery.isLoading ||
      todayAppointmentsQuery.isLoading ||
      upcomingAppointmentsQuery.isLoading ||
      notificationsQuery.isLoading ||
      attendanceQuery.isLoading,
    isLoading:
      appointmentsQuery.isLoading ||
      todayAppointmentsQuery.isLoading ||
      upcomingAppointmentsQuery.isLoading ||
      notificationsQuery.isLoading ||
      attendanceQuery.isLoading,

    // ✅ ERROR STATES - Comprehensive error handling
    error:
      appointmentsQuery.error ||
      todayAppointmentsQuery.error ||
      upcomingAppointmentsQuery.error ||
      notificationsQuery.error ||
      attendanceQuery.error,

    // ✅ DATA AVAILABILITY - Smart hasData detection
    hasData:
      appointmentsQuery.data?.length > 0 ||
      todayAppointmentsQuery.data?.length > 0 ||
      upcomingAppointmentsQuery.data?.length > 0 ||
      notificationsQuery.data?.length > 0 ||
      attendanceQuery.data?.length > 0,

    // ✅ REFRESH FUNCTIONS - Complete compatibility with legacy
    forceRefresh,
    refreshAppointments,
    refreshNotifications,
    refreshTodayData, // Enhanced real-time refresh for critical data

    // ✅ TANSTACK QUERY ENHANCED FEATURES
    isRefetching:
      appointmentsQuery.isRefetching ||
      todayAppointmentsQuery.isRefetching ||
      upcomingAppointmentsQuery.isRefetching ||
      notificationsQuery.isRefetching ||
      attendanceQuery.isRefetching,

    // Individual query states for advanced usage
    queryStates: {
      appointments: {
        isLoading: appointmentsQuery.isLoading,
        isError: appointmentsQuery.isError,
        error: appointmentsQuery.error,
        isFetching: appointmentsQuery.isFetching,
        isRefetching: appointmentsQuery.isRefetching,
        dataUpdatedAt: appointmentsQuery.dataUpdatedAt,
      },
      todayAppointments: {
        isLoading: todayAppointmentsQuery.isLoading,
        isError: todayAppointmentsQuery.isError,
        error: todayAppointmentsQuery.error,
        isFetching: todayAppointmentsQuery.isFetching,
        isRefetching: todayAppointmentsQuery.isRefetching,
        dataUpdatedAt: todayAppointmentsQuery.dataUpdatedAt,
      },
      notifications: {
        isLoading: notificationsQuery.isLoading,
        isError: notificationsQuery.isError,
        error: notificationsQuery.error,
        isFetching: notificationsQuery.isFetching,
        isRefetching: notificationsQuery.isRefetching,
        dataUpdatedAt: notificationsQuery.dataUpdatedAt,
      },
    },

    // Data source identifier
    dataSource: "tanstack-query",
    lastUpdated: new Date().toISOString(),
  };

  // Enhanced debug logging with performance metrics
  console.log("🔍 useOperatorDashboardData return:", {
    // Data counts
    appointmentsCount: returnData.appointments?.length || 0,
    todayAppointmentsCount: returnData.todayAppointments?.length || 0,
    upcomingAppointmentsCount: returnData.upcomingAppointments?.length || 0,
    notificationsCount: returnData.notifications?.length || 0,
    attendanceCount: returnData.attendanceRecords?.length || 0,

    // States
    loading: returnData.loading,
    hasData: returnData.hasData,
    error: !!returnData.error,
    isRefetching: returnData.isRefetching,

    // Performance metrics
    appointmentsQueryState: {
      data: appointmentsQuery.data?.length || 0,
      isLoading: appointmentsQuery.isLoading,
      isFetching: appointmentsQuery.isFetching,
      isRefetching: appointmentsQuery.isRefetching,
      error: !!appointmentsQuery.error,
      status: appointmentsQuery.status,
      lastUpdated: new Date(
        appointmentsQuery.dataUpdatedAt
      ).toLocaleTimeString(),
    },
    todayAppointmentsQueryState: {
      data: todayAppointmentsQuery.data?.length || 0,
      isLoading: todayAppointmentsQuery.isLoading,
      isFetching: todayAppointmentsQuery.isFetching,
      isRefetching: todayAppointmentsQuery.isRefetching,
      error: !!todayAppointmentsQuery.error,
      status: todayAppointmentsQuery.status,
      lastUpdated: new Date(
        todayAppointmentsQuery.dataUpdatedAt
      ).toLocaleTimeString(),
    },
    notificationsQueryState: {
      data: notificationsQuery.data?.length || 0,
      isLoading: notificationsQuery.isLoading,
      isFetching: notificationsQuery.isFetching,
      isRefetching: notificationsQuery.isRefetching,
      error: !!notificationsQuery.error,
      status: notificationsQuery.status,
      lastUpdated: new Date(
        notificationsQuery.dataUpdatedAt
      ).toLocaleTimeString(),
    },

    timestamp: new Date().toISOString(),
  });

  return returnData;
};

// ==========================================
// THERAPIST DASHBOARD HOOKS
// ==========================================

/**
 * Therapist dashboard data optimized for therapist workflow
 * Replaces: useOptimizedDashboardData("therapistDashboard", "therapist")
 */
export const useTherapistDashboardData = (therapistId) => {
  const queryClient = useQueryClient();

  // Today's appointments for therapist
  const todayAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.byTherapist(therapistId, "today"),
    queryFn: async () => {
      const data = await fetchTodayAppointmentsAPI();
      return data?.filter((apt) => apt.therapist === therapistId) || [];
    },
    staleTime: staleTime.SHORT,
    refetchInterval: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const forceRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.byTherapist(therapistId),
    });
  }, [queryClient, therapistId]);

  return {
    todayAppointments: todayAppointmentsQuery.data || [],
    loading: todayAppointmentsQuery.isLoading,
    error: todayAppointmentsQuery.error,
    forceRefresh,
    hasData: todayAppointmentsQuery.data?.length > 0,
  };
};

// ==========================================
// DRIVER DASHBOARD HOOKS
// ==========================================

/**
 * Driver dashboard data optimized for driver coordination
 * Replaces: useOptimizedDashboardData("driverDashboard", "driver")
 */
export const useDriverDashboardData = (driverId) => {
  const queryClient = useQueryClient();

  // All appointments for driver
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.byDriver(driverId, "all"),
    queryFn: async () => {
      const data = await fetchAppointmentsAPI();
      return data?.filter((apt) => apt.driver === driverId) || [];
    },
    staleTime: staleTime.MEDIUM,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Today's appointments for driver (more frequent updates)
  const todayAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.byDriver(driverId, "today"),
    queryFn: async () => {
      const data = await fetchTodayAppointmentsAPI();
      return data?.filter((apt) => apt.driver === driverId) || [];
    },
    staleTime: staleTime.SHORT,
    refetchInterval: 2 * 60 * 1000, // 2 minutes (drivers need more frequent updates)
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Upcoming appointments for driver
  const upcomingAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.byDriver(driverId, "upcoming"),
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const data = await fetchAppointmentsAPI();
      return (
        data?.filter((apt) => apt.driver === driverId && apt.date > today) || []
      );
    },
    staleTime: staleTime.LONG,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  const forceRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byDriver(driverId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all,
      }),
    ]);
  }, [queryClient, driverId]);

  // Computed states
  const isLoading =
    appointmentsQuery.isLoading || todayAppointmentsQuery.isLoading;
  const isRefetching =
    appointmentsQuery.isRefetching || todayAppointmentsQuery.isRefetching;
  const error = appointmentsQuery.error || todayAppointmentsQuery.error;
  const hasData =
    appointmentsQuery.data?.length > 0 ||
    todayAppointmentsQuery.data?.length > 0;

  console.log("🚗 useDriverDashboardData return:", {
    driverId,
    appointments: appointmentsQuery.data?.length || 0,
    todayAppointments: todayAppointmentsQuery.data?.length || 0,
    upcomingAppointments: upcomingAppointmentsQuery.data?.length || 0,
    isLoading,
    hasData,
    dataSource: "tanstack-query",
  });

  return {
    // Primary data (exact same interface as legacy hook)
    appointments: appointmentsQuery.data || [],
    todayAppointments: todayAppointmentsQuery.data || [],
    upcomingAppointments: upcomingAppointmentsQuery.data || [],

    // Loading and error states
    isLoading,
    loading: isLoading, // Legacy alias
    isRefetching,
    error,
    hasData,

    // Actions
    refetch: useCallback(async () => {
      await Promise.all([
        appointmentsQuery.refetch(),
        todayAppointmentsQuery.refetch(),
        upcomingAppointmentsQuery.refetch(),
      ]);
    }, [appointmentsQuery, todayAppointmentsQuery, upcomingAppointmentsQuery]),
    forceRefresh,

    // Debug info
    dataSource: "tanstack-query",
  };
};

// ==========================================
// SCHEDULING DASHBOARD HOOKS
// ==========================================

/**
 * Scheduling dashboard data optimized for scheduling coordination
 * Replaces: useOptimizedDashboardData("schedulingDashboard", "admin")
 */
export const useSchedulingDashboardData = () => {
  const queryClient = useQueryClient();

  // All appointments for scheduling overview
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list,
    queryFn: fetchAppointmentsAPI,
    staleTime: staleTime.SHORT,
    refetchInterval: 3 * 60 * 1000, // 3 minutes for scheduling
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [],
  });

  // Today's appointments for immediate attention
  const todayAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: fetchTodayAppointmentsAPI,
    staleTime: staleTime.SHORT,
    refetchInterval: 2 * 60 * 1000, // 2 minutes for today's data
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [],
  });

  // Upcoming appointments for planning
  const upcomingAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.upcoming,
    queryFn: fetchUpcomingAppointmentsAPI,
    staleTime: staleTime.MEDIUM,
    refetchInterval: 5 * 60 * 1000, // 5 minutes for upcoming
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [],
  });

  // Notifications for scheduling alerts
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: fetchNotificationsAPI,
    staleTime: staleTime.SHORT,
    refetchInterval: 1 * 60 * 1000, // 1 minute for notifications
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [],
  });

  const forceRefresh = useCallback(async () => {
    console.log("🔄 Force refreshing scheduling dashboard data...");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    ]);

    // Force immediate refetch
    await Promise.all([
      appointmentsQuery.refetch(),
      todayAppointmentsQuery.refetch(),
      upcomingAppointmentsQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
  }, [
    queryClient,
    appointmentsQuery,
    todayAppointmentsQuery,
    upcomingAppointmentsQuery,
    notificationsQuery,
  ]);

  const isLoading =
    appointmentsQuery.isLoading ||
    todayAppointmentsQuery.isLoading ||
    upcomingAppointmentsQuery.isLoading ||
    notificationsQuery.isLoading;

  const error =
    appointmentsQuery.error ||
    todayAppointmentsQuery.error ||
    upcomingAppointmentsQuery.error ||
    notificationsQuery.error;

  const hasData = !!(
    appointmentsQuery.data?.length ||
    todayAppointmentsQuery.data?.length ||
    upcomingAppointmentsQuery.data?.length
  );

  console.log("📅 useSchedulingDashboardData return:", {
    appointments: appointmentsQuery.data?.length || 0,
    todayAppointments: todayAppointmentsQuery.data?.length || 0,
    upcomingAppointments: upcomingAppointmentsQuery.data?.length || 0,
    notifications: notificationsQuery.data?.length || 0,
    isLoading,
    hasData,
    dataSource: "tanstack-query",
  });

  return {
    // Primary data (exact same interface as legacy hook)
    appointments: appointmentsQuery.data || [],
    todayAppointments: todayAppointmentsQuery.data || [],
    upcomingAppointments: upcomingAppointmentsQuery.data || [],
    notifications: notificationsQuery.data || [],

    // Loading and error states
    isLoading,
    loading: isLoading, // Legacy alias
    error,
    hasData,

    // Actions
    forceRefresh,
    refetch: forceRefresh, // Legacy alias

    // Data source identifier
    dataSource: "tanstack-query",
  };
};

// ==========================================
// ATTENDANCE DASHBOARD HOOKS
// ==========================================

/**
 * Attendance data hook using TanStack Query
 * Replaces: useOptimizedAttendance(selectedDate)
 */
export const useAttendanceData = (selectedDate) => {
  // Attendance records for specific date
  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance.byDate
      ? queryKeys.attendance.byDate(selectedDate)
      : ["attendance", selectedDate],
    queryFn: async () => {
      const data = await fetchAttendanceAPI(selectedDate);
      return Array.isArray(data) ? data : [];
    },
    staleTime: staleTime.MEDIUM,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    initialData: [],
    enabled: !!selectedDate,
  });

  const forceRefresh = useCallback(async () => {
    await attendanceQuery.refetch();
  }, [attendanceQuery]);

  return {
    attendanceRecords: attendanceQuery.data || [],
    isLoading: attendanceQuery.isLoading,
    loading: attendanceQuery.isLoading, // Legacy alias
    error: attendanceQuery.error,
    hasData: !!attendanceQuery.data?.length,
    forceRefresh,
    refetch: forceRefresh, // Legacy alias

    // Legacy method aliases for backward compatibility
    fetchAttendanceForDate: async () => {
      // Could implement cache-first lookup here if needed
      return attendanceQuery.data || [];
    },
    getCachedAttendanceForDate: () => {
      return attendanceQuery.data || [];
    },
    forceRefreshAttendance: forceRefresh,
    hasDataForDate: !!attendanceQuery.data?.length,
  };
};

// API function for attendance
const fetchAttendanceAPI = async (date) => {
  try {
    const result = await store
      .dispatch(fetchAttendanceRecords({ date }))
      .unwrap();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.warn("Failed to fetch attendance records:", error);
    return [];
  }
};

// ==========================================
// APPOINTMENT STATUS MUTATIONS
// ==========================================

/**
 * Mutation hooks for appointment status updates with optimistic updates
 * Replaces manual Redux dispatch + optimizedDataManager.forceRefresh
 */
export const useAppointmentStatusMutation = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: async ({ appointmentId, status, additionalData = {} }) => {
      const result = await dispatch(
        updateAppointmentStatus({
          appointmentId,
          status,
          ...additionalData,
        })
      );
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async ({ appointmentId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.list
      );
      const previousTodayAppointments = queryClient.getQueryData(
        queryKeys.appointments.today
      );

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.appointments.list, (old) => {
        if (!old) return old;
        return old.map((apt) =>
          apt.id === appointmentId ? { ...apt, status } : apt
        );
      });

      queryClient.setQueryData(queryKeys.appointments.today, (old) => {
        if (!old) return old;
        return old.map((apt) =>
          apt.id === appointmentId ? { ...apt, status } : apt
        );
      });

      return { previousAppointments, previousTodayAppointments };
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousAppointments) {
        queryClient.setQueryData(
          queryKeys.appointments.list,
          context.previousAppointments
        );
      }
      if (context?.previousTodayAppointments) {
        queryClient.setQueryData(
          queryKeys.appointments.today,
          context.previousTodayAppointments
        );
      }
    },
  });
};

// ==========================================
// CACHE INVALIDATION UTILITIES
// ==========================================

/**
 * Centralized cache invalidation for operator dashboard
 * Replaces: optimizedDataManager.forceRefresh([...])
 */
export const useInvalidateOperatorData = () => {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
    ]);
  }, [queryClient]);

  const invalidateAppointments = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.all,
    });
  }, [queryClient]);

  const invalidateNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateAppointments,
    invalidateNotifications,
  };
};

// ==========================================
// LEGACY COMPATIBILITY LAYER
// ==========================================

/**
 * Note: For backwards compatibility, use the specific hooks directly:
 * - useOperatorDashboardData() for operator dashboards
 * - useTherapistDashboardData(therapistId) for therapist dashboards
 * - useDriverDashboardData(driverId) for driver dashboards
 *
 * This provides better type safety and follows React hooks best practices.
 */

export default {
  useOperatorDashboardData,
  useTherapistDashboardData,
  useDriverDashboardData,
  useAppointmentStatusMutation,
  useInvalidateOperatorData,
  useSchedulingDashboardData,
  useAttendanceData,
};
