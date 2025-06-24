/**
 * Dashboard TanStack Query Hooks - Complete Migration
 *
 * This file replaces useOptimizedDashboardData and optimizedDataManager
 * with modern TanStack Query patterns for all dashboard components.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { fetchAttendanceRecords } from "../features/attendance/attendanceSlice";
import { updateAppointmentStatus } from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";
import {
  createAdBlockerFriendlyConfig,
  getUserFriendlyErrorMessage,
  isBlockedByClient,
  isNetworkError,
} from "../utils/apiRequestUtils";

// API URL based on environment - ensure consistent URL handling
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

const API_URL = `${getBaseURL()}/scheduling/`;

// Direct API calls (bypassing Redux for TanStack Query)
const fetchAppointmentsAPI = async () => {
  console.log("🚀 TanStack Query: fetchAppointmentsAPI called!");

  const token = localStorage.getItem("knoxToken");
  if (!token) {
    console.log("⚠️ No authentication token found - user not authenticated");
    throw new Error("Authentication required");
  }

  console.log("🔄 Direct API: Fetching appointments...", {
    url: `${API_URL}appointments/`,
    token: token.substring(0, 10) + "...",
  });

  try {
    const config = createAdBlockerFriendlyConfig({
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    const response = await axios.get(`${API_URL}appointments/`, config);

    console.log("✅ Direct API: Appointments fetched successfully", {
      status: response.status,
      count: Array.isArray(response.data) ? response.data.length : response.data?.count || 0,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      sampleData: Array.isArray(response.data) 
        ? response.data.slice(0, 2) 
        : response.data?.results?.slice(0, 2) || [],
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

    // Enhance error with classification
    error.isBlockedByClient = isBlockedByClient(error);
    error.isNetworkError = isNetworkError(error);
    error.userFriendlyMessage = getUserFriendlyErrorMessage(error);

    console.error("❌ Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: error.isNetworkError,
      isBlockedByClient: error.isBlockedByClient,
      userFriendlyMessage: error.userFriendlyMessage,
    });

    // Special handling for ad blocker issues
    if (error.isBlockedByClient) {
      console.warn(
        "🚫 Request blocked by browser/extension - this is likely an ad blocker issue"
      );
      console.warn(
        "💡 Suggestion: Check Brave Shields or other ad blocker settings"
      );
    }

    // Use the user-friendly error message
    throw new Error(error.userFriendlyMessage);
  }
};

const fetchTodayAppointmentsAPI = async () => {
  const token = localStorage.getItem("knoxToken");
  if (!token) {
    throw new Error("Authentication required");
  }

  try {
    console.log("🔄 Direct API: Fetching today appointments...");
    const config = createAdBlockerFriendlyConfig({
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    const response = await axios.get(`${API_URL}appointments/today/`, config);

    console.log("✅ Direct API: Today appointments fetched", {
      count: response.data?.length || 0,
    });

    return response.data || [];
  } catch (error) {
    console.error("❌ fetchTodayAppointmentsAPI error:", error);

    // Enhance error with classification
    error.isBlockedByClient = isBlockedByClient(error);
    error.isNetworkError = isNetworkError(error);
    error.userFriendlyMessage = getUserFriendlyErrorMessage(error);

    throw new Error(error.userFriendlyMessage);
  }
};

const fetchNotificationsAPI = async () => {
  console.log("🚀 TanStack Query: fetchNotificationsAPI called!");

  const token = localStorage.getItem("knoxToken");
  if (!token) {
    console.log(
      "⚠️ No authentication token found for notifications - user not authenticated"
    );
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

    // Process the response data to ensure we always return an array
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.notifications)) {
      return response.data.notifications;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    } else {
      console.warn(
        "⚠️ Notifications response is not an array, converting to empty array",
        response.data
      );
      return [];
    }
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
    queryKey: queryKeys.appointments.list(),
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
    queryKey: queryKeys.appointments.today(),
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
    queryKey: queryKeys.appointments.upcoming(),
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
    queryKey: queryKeys.notifications.list(),
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
    queryKey: queryKeys.attendance.list(),
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
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.list() }),
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.today() }),
      queryClient.refetchQueries({ queryKey: queryKeys.notifications.list() }),
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
      queryClient.refetchQueries({ queryKey: queryKeys.appointments.today() }),
      queryClient.refetchQueries({ queryKey: queryKeys.notifications.list() }),
    ]);
    console.log("✅ Today's data refresh completed");
  }, [queryClient]);

  // Memoize the complete data object to prevent new references on every render
  const returnData = useMemo(
    () => ({
      // ✅ PRIMARY DATA - All required fields from OperatorDashboard.jsx
      appointments: appointmentsQuery.data || [],
      todayAppointments: todayAppointmentsQuery.data || [],
      upcomingAppointments: upcomingAppointmentsQuery.data || [],
      notifications: Array.isArray(notificationsQuery.data)
        ? notificationsQuery.data
        : notificationsQuery.data?.notifications ||
          notificationsQuery.data?.results ||
          [],
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
    }),
    [
      // Essential data
      appointmentsQuery.data,
      todayAppointmentsQuery.data,
      upcomingAppointmentsQuery.data,
      notificationsQuery.data,
      attendanceQuery.data,
      // Loading states
      appointmentsQuery.isLoading,
      todayAppointmentsQuery.isLoading,
      upcomingAppointmentsQuery.isLoading,
      notificationsQuery.isLoading,
      attendanceQuery.isLoading,
      // Error states
      appointmentsQuery.error,
      todayAppointmentsQuery.error,
      upcomingAppointmentsQuery.error,
      notificationsQuery.error,
      attendanceQuery.error,
      // Additional states required by the component
      appointmentsQuery.isError,
      appointmentsQuery.isFetching,
      appointmentsQuery.isRefetching,
      appointmentsQuery.dataUpdatedAt,
      todayAppointmentsQuery.isError,
      todayAppointmentsQuery.isFetching,
      todayAppointmentsQuery.isRefetching,
      todayAppointmentsQuery.dataUpdatedAt,
      notificationsQuery.isError,
      notificationsQuery.isFetching,
      notificationsQuery.isRefetching,
      notificationsQuery.dataUpdatedAt,
      upcomingAppointmentsQuery.isRefetching,
      attendanceQuery.isRefetching,
      // Functions
      forceRefresh,
      refreshAppointments,
      refreshNotifications,
      refreshTodayData,
    ]
  );

  // Reduced debug logging - only when data actually changes
  const dataFingerprint = useMemo(
    () =>
      `${returnData.appointments?.length || 0}-${
        returnData.todayAppointments?.length || 0
      }-${returnData.notifications?.length || 0}`,
    [
      returnData.appointments?.length,
      returnData.todayAppointments?.length,
      returnData.notifications?.length,
    ]
  );

  const lastFingerprintRef = useRef(null);

  if (lastFingerprintRef.current !== dataFingerprint) {
    console.log("🔍 useOperatorDashboardData data changed:", {
      fingerprint: dataFingerprint,
      appointmentsCount: returnData.appointments?.length || 0,
      todayAppointmentsCount: returnData.todayAppointments?.length || 0,
      notificationsCount: returnData.notifications?.length || 0,
      loading: returnData.loading,
      hasData: returnData.hasData,
      error: !!returnData.error,
    });
    lastFingerprintRef.current = dataFingerprint;
  }

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
 * Scheduling Dashboard Data Hook for TanStack Query Migration
 * Replaces legacy useOptimizedDashboardData for scheduling dashboard
 */
export const useSchedulingDashboardData = () => {
  // ✅ APPOINTMENTS QUERIES - All appointment data with real-time updates
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: fetchAppointmentsAPI,
    staleTime: staleTime.SHORT, // Frequent updates for scheduling
    cacheTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000, // Faster refresh for scheduling dashboard
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [],
  });

  // ✅ TODAY'S APPOINTMENTS - Critical scheduling data
  const todayAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.today(),
    queryFn: fetchTodayAppointmentsAPI,
    staleTime: staleTime.SHORT,
    cacheTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000, // Real-time updates for today's schedule
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [],
  });

  // ✅ UPCOMING APPOINTMENTS - Next appointments for scheduling
  const upcomingAppointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.upcoming(),
    queryFn: fetchUpcomingAppointmentsAPI,
    staleTime: staleTime.MEDIUM,
    cacheTime: 3 * 60 * 1000,
    refetchInterval: 60 * 1000, // Regular updates for upcoming appointments
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [],
  });

  // ✅ FORCE REFRESH FUNCTIONS - Enhanced for scheduling needs
  const forceRefresh = useCallback(async () => {
    console.log(
      "🔥 TanStack Query: Force refreshing scheduling dashboard data"
    );
    await Promise.all([
      appointmentsQuery.refetch(),
      todayAppointmentsQuery.refetch(),
      upcomingAppointmentsQuery.refetch(),
    ]);
  }, [appointmentsQuery, todayAppointmentsQuery, upcomingAppointmentsQuery]);

  const refreshAppointments = useCallback(async () => {
    console.log("🔥 TanStack Query: Refreshing appointments");
    await appointmentsQuery.refetch();
  }, [appointmentsQuery]);

  // ✅ RETURN SCHEDULING DASHBOARD DATA - Complete compatibility
  return useMemo(
    () => ({
      // ✅ DATA ARRAYS - Ready for immediate use
      appointments: appointmentsQuery.data || [],
      todayAppointments: todayAppointmentsQuery.data || [],
      upcomingAppointments: upcomingAppointmentsQuery.data || [],

      // ✅ LOADING STATES - Unified loading detection
      loading:
        appointmentsQuery.isLoading ||
        todayAppointmentsQuery.isLoading ||
        upcomingAppointmentsQuery.isLoading,

      isLoading:
        appointmentsQuery.isLoading ||
        todayAppointmentsQuery.isLoading ||
        upcomingAppointmentsQuery.isLoading,

      // ✅ ERROR HANDLING - Comprehensive error reporting
      error:
        appointmentsQuery.error?.message ||
        todayAppointmentsQuery.error?.message ||
        upcomingAppointmentsQuery.error?.message ||
        null,

      hasError: !!(
        appointmentsQuery.error ||
        todayAppointmentsQuery.error ||
        upcomingAppointmentsQuery.error
      ),

      // ✅ DATA AVAILABILITY - Smart hasData detection
      hasData:
        appointmentsQuery.data?.length > 0 ||
        todayAppointmentsQuery.data?.length > 0 ||
        upcomingAppointmentsQuery.data?.length > 0,

      // ✅ REFRESH FUNCTIONS - Complete compatibility with legacy
      forceRefresh,
      refreshAppointments,

      // ✅ TANSTACK QUERY ENHANCED FEATURES
      isRefetching:
        appointmentsQuery.isRefetching ||
        todayAppointmentsQuery.isRefetching ||
        upcomingAppointmentsQuery.isRefetching,

      // Individual query states for advanced usage
      queryStates: {
        appointments: {
          isLoading: appointmentsQuery.isLoading,
          isError: appointmentsQuery.isError,
          error: appointmentsQuery.error,
          data: appointmentsQuery.data,
        },
        todayAppointments: {
          isLoading: todayAppointmentsQuery.isLoading,
          isError: todayAppointmentsQuery.isError,
          error: todayAppointmentsQuery.error,
          data: todayAppointmentsQuery.data,
        },
        upcomingAppointments: {
          isLoading: upcomingAppointmentsQuery.isLoading,
          isError: upcomingAppointmentsQuery.isError,
          error: upcomingAppointmentsQuery.error,
          data: upcomingAppointmentsQuery.data,
        },
      },

      // Data freshness information
      lastUpdated: Math.max(
        appointmentsQuery.dataUpdatedAt || 0,
        todayAppointmentsQuery.dataUpdatedAt || 0,
        upcomingAppointmentsQuery.dataUpdatedAt || 0
      ),
    }),
    [
      appointmentsQuery,
      todayAppointmentsQuery,
      upcomingAppointmentsQuery,
      forceRefresh,
      refreshAppointments,
    ]
  );
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
        queryKeys.appointments.list()
      );
      const previousTodayAppointments = queryClient.getQueryData(
        queryKeys.appointments.today()
      );

      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.appointments.list(), (old) => {
        if (!old) return old;
        return old.map((apt) =>
          apt.id === appointmentId ? { ...apt, status } : apt
        );
      });

      queryClient.setQueryData(queryKeys.appointments.today(), (old) => {
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
          queryKeys.appointments.list(),
          context.previousAppointments
        );
      }
      if (context?.previousTodayAppointments) {
        queryClient.setQueryData(
          queryKeys.appointments.today(),
          context.previousTodayAppointments
        );
      }
    },
  });
};

// Direct API call for attendance records
const fetchAttendanceRecordsAPI = async (selectedDate) => {
  console.log("🚀 TanStack Query: fetchAttendanceRecordsAPI called!", {
    selectedDate,
  });

  const token = localStorage.getItem("knoxToken");
  const storedUser = localStorage.getItem("user");

  let user = null;
  if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      localStorage.removeItem("user");
    }
  }

  if (!token || !user || !user.id) {
    // Silent handling for unauthenticated users (likely on login page)
    console.log(
      "ℹ️ No authentication found - user not logged in, skipping attendance fetch"
    );
    return []; // Return empty array instead of throwing error
  }

  const getAttendanceBaseURL = () => {
    if (import.meta.env.PROD) {
      return "https://charismatic-appreciation-production.up.railway.app/api";
    }
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  };

  const ATTENDANCE_API_URL = `${getAttendanceBaseURL()}/attendance/`;

  let url = `${ATTENDANCE_API_URL}records/`;
  if (selectedDate) {
    url += `?date=${selectedDate}`;
  }

  console.log("🔄 Direct API: Fetching attendance records...", {
    url,
    token: token.substring(0, 10) + "...",
    userId: user.id,
  });

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    console.log("✅ Direct API: Attendance records fetched successfully", {
      status: response.status,
      count: response.data?.length || 0,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      sampleData: response.data?.slice(0, 2),
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    // Check if it's an authentication error
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log("🔒 Authentication expired, clearing stored data");
      localStorage.removeItem("knoxToken");
      localStorage.removeItem("user");
      return []; // Return empty array instead of throwing
    }

    console.error("❌ Direct API: Failed to fetch attendance records", {
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw error;
  }
};

// ==========================================
// ATTENDANCE DATA HOOKS
// ==========================================

/**
 * Attendance Data Hook for TanStack Query Migration
 * Replaces legacy useOptimizedAttendance from optimizedDataManager
 */
export const useAttendanceData = (selectedDate) => {
  const dispatch = useDispatch();

  // Multi-layer authentication check to prevent unnecessary API calls
  const isAuthenticated = useMemo(() => {
    const token = localStorage.getItem("knoxToken");
    const storedUser = localStorage.getItem("user");

    let user = null;
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        user = JSON.parse(storedUser);
      } catch (error) {
        console.error("Failed to parse user data in useAttendanceData:", error);
        localStorage.removeItem("user");
      }
    }

    // Check if we have both token and valid user data
    const hasToken = !!token && token.length > 10; // Basic token validation
    const hasValidUser = !!(user && user.id && user.role);

    return hasToken && hasValidUser;
  }, []);

  // Attendance records query with robust authentication checks
  const attendanceQuery = useQuery({
    queryKey: ["attendance", "records", selectedDate],
    queryFn: async () => {
      // Double-check authentication before making the API call
      const token = localStorage.getItem("knoxToken");
      const storedUser = localStorage.getItem("user");

      let user = null;
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
          user = JSON.parse(storedUser);
        } catch (error) {
          console.error(
            "Failed to parse user data in attendance query:",
            error
          );
          localStorage.removeItem("user");
        }
      }

      if (!token || !user || !user.id) {
        console.log(
          "🚫 useAttendanceData: Authentication check failed, skipping API call"
        );
        throw new Error("Authentication required - user not logged in");
      }

      try {
        // Use both direct API and Redux dispatch for complete compatibility
        const result = await dispatch(
          fetchAttendanceRecords({
            date: selectedDate,
          })
        ).unwrap();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn("Redux fetch failed, trying direct API:", error);
        // Fallback to direct API call only if still authenticated
        if (localStorage.getItem("knoxToken")) {
          return await fetchAttendanceRecordsAPI(selectedDate);
        }
        throw error;
      }
    },
    staleTime: 0,
    cacheTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    initialData: [], // Provide initial data as empty array
    enabled: !!(selectedDate && isAuthenticated), // Only fetch when authenticated AND selectedDate is provided
  });

  // Force refresh function for compatibility
  const forceRefreshAttendance = useCallback(async () => {
    console.log("🔥 TanStack Query: Force refreshing attendance data");
    await attendanceQuery.refetch();
  }, [attendanceQuery]);

  // Get cached attendance for date (compatibility function)
  const getCachedAttendanceForDate = useCallback(
    (date) => {
      const queryClient = attendanceQuery.queryClient;
      const cachedData = queryClient?.getQueryData([
        "attendance",
        "records",
        date,
      ]);
      return Array.isArray(cachedData) ? cachedData : [];
    },
    [attendanceQuery.queryClient]
  );

  // Fetch attendance for specific date (compatibility function)
  const fetchAttendanceForDate = useCallback(
    async (date) => {
      if (!date) return [];

      try {
        const result = await dispatch(
          fetchAttendanceRecords({ date })
        ).unwrap();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.warn("Failed to fetch attendance for date:", error);
        return [];
      }
    },
    [dispatch]
  );

  return {
    // Main data array
    attendanceRecords: attendanceQuery.data || [],

    // Loading states
    loading: attendanceQuery.isLoading,
    isLoading: attendanceQuery.isLoading,
    isFetching: attendanceQuery.isFetching,
    isRefetching: attendanceQuery.isRefetching,

    // Error states
    error: attendanceQuery.error?.message || null,
    hasError: !!attendanceQuery.error,

    // Success states
    isSuccess: attendanceQuery.isSuccess,
    hasData:
      Array.isArray(attendanceQuery.data) && attendanceQuery.data.length > 0,

    // Data freshness
    isStale: attendanceQuery.isStale,
    lastUpdated: attendanceQuery.dataUpdatedAt,

    // Actions (compatibility with legacy hooks)
    forceRefresh: forceRefreshAttendance,
    forceRefreshAttendance,
    fetchAttendanceForDate,
    getCachedAttendanceForDate,
    refetch: attendanceQuery.refetch,

    // Query status for debugging
    status: attendanceQuery.status,
    fetchStatus: attendanceQuery.fetchStatus,
  };
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
  useAttendanceData,
  useSchedulingDashboardData,
};
