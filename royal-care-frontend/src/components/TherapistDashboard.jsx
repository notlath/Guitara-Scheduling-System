import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdClose } from "react-icons/md";
import { useNavigate, useSearchParams } from "react-router-dom";
// TanStack Query hooks for data management (removing Redux dependencies)
import { usePhilippineTime } from "../hooks/usePhilippineTime";
import { useAutoWebSocketCacheSync } from "../hooks/useWebSocketCacheSync";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
// TanStack Query cache utilities for direct cache management
import { queryKeys } from "../lib/queryClient";
import { syncMutationSuccess } from "../services/realTimeSyncService";

import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css";
import AttendanceComponent from "./AttendanceComponent";
import RejectionModal from "./RejectionModal";
import Calendar from "./scheduling/Calendar";
import WebSocketStatus from "./scheduling/WebSocketStatus";

// API base URL configuration
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

const API_URL = `${getBaseURL()}/scheduling/`;

// Helper function for TanStack Query-only cache invalidation (OPTIMIZED FOR REAL-TIME)
const invalidateAppointmentQueries = async (queryClient, delay = 0) => {
  console.log(
    "🔄 Invalidating appointment queries (TanStack Query only) - AGGRESSIVE MODE"
  );

  // Add optional delay for backend propagation
  if (delay > 0) {
    console.log(`⏳ Waiting ${delay}ms for backend propagation...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Get current data before invalidation for debugging
  const user = getUser(); // Get user first for proper query key
  if (!user?.id) {
    console.error("❌ No user ID available for cache invalidation");
    return;
  }

  const beforeInvalidation = queryClient.getQueryData(
    queryKeys.appointments.byTherapist(user.id, "all")
  );
  console.log(
    "📊 Data before invalidation:",
    beforeInvalidation?.length || 0,
    "appointments for therapist:",
    user.id
  );

  // ✅ CONSISTENT QUERY KEY INVALIDATION: Use queryKeys structure

  try {
    // Invalidate all appointment-related queries using consistent queryKeys
    await Promise.all([
      // Core appointment queries
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.list(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.today(),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.upcoming(),
      }),

      // ✅ CRITICAL FIX: Therapist-specific queries with consistent key structure
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byTherapist(user.id, "all"),
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byTherapist(user.id, "today"),
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byTherapist(user.id, "upcoming"),
        refetchType: "all",
      }),

      // ✅ ENHANCED: Invalidate any partial matches for therapist queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return (
            Array.isArray(queryKey) &&
            queryKey.includes("appointments") &&
            queryKey.includes("therapist") &&
            queryKey.includes(user.id)
          );
        },
      }),

      // Dashboard-specific queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.therapist(user.id),
      }),
    ]);

    console.log(
      "✅ Appointment queries invalidated successfully (using consistent queryKeys)"
    );

    // ✅ CRITICAL FIX: Force immediate refetch of therapist data
    console.log("🔄 Force refetching therapist data immediately...");
    await queryClient.refetchQueries({
      queryKey: queryKeys.appointments.byTherapist(user.id, "all"),
      type: "all",
    });

    // Wait a bit and check the data after invalidation
    setTimeout(() => {
      const afterInvalidation = queryClient.getQueryData(
        queryKeys.appointments.byTherapist(user.id, "all")
      );
      console.log(
        "📊 Data after invalidation:",
        afterInvalidation?.length || 0,
        "appointments for therapist:",
        user.id
      );
    }, 100);
  } catch (error) {
    console.error("❌ Failed to invalidate appointment queries:", error);
    throw error;
  }
};

// Helper to get auth token
const getToken = () => localStorage.getItem("knoxToken");

// Helper to get user from localStorage
const getUser = () => {
  const storedUser = localStorage.getItem("user");
  if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      localStorage.removeItem("user");
      return null;
    }
  }
  return null;
};

// TanStack Query functions for fetching appointments data
// ✅ CRITICAL FIX: Use main appointments endpoint with authentication
// Backend will automatically filter for therapist based on user auth
const fetchTherapistAppointments = async (therapistId) => {
  const token = getToken();
  if (!token) throw new Error("Authentication required");
  if (!therapistId) throw new Error("Therapist ID required");

  console.log("🩺 Fetching therapist appointments via authenticated endpoint");

  // Use main appointments endpoint - backend filters automatically
  const response = await axios.get(`${API_URL}appointments/`, {
    headers: { Authorization: `Token ${token}` },
  });

  const appointments = response.data.results || response.data;
  console.log(
    `✅ Backend-filtered appointments for therapist:`,
    appointments.length
  );
  return appointments;
};

// TanStack Query hook for therapist dashboard data
const useTherapistDashboardData = (userId) => {
  // ✅ CRITICAL DEBUG: Log the exact query key being used
  const queryKey = queryKeys.appointments.byTherapist(userId, "all");

  // ✅ FIX: Only log query key when it changes, not on every render
  useEffect(() => {
    console.log("🔍 TherapistDashboard using query key:", queryKey);
  }, [queryKey]);

  const {
    data: myAppointments = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey, // ✅ Use consistent queryKeys structure
    queryFn: () => fetchTherapistAppointments(userId), // ✅ Use therapist-specific fetch
    enabled: !!userId, // ✅ Only fetch when userId is available

    // ✅ INSTANT UPDATE CONFIGURATION: Optimized for immediate UI responsiveness
    staleTime: 0, // ✅ Always consider data fresh - instant updates
    gcTime: 5 * 60 * 1000, // ✅ 5 minutes cache time
    refetchInterval: false, // ✅ DISABLED: Rely on optimistic updates and WebSocket
    refetchOnWindowFocus: false, // ✅ DISABLED: Prevent disrupting instant updates
    refetchOnReconnect: true, // ✅ Keep connection refetch for reliability
    refetchOnMount: true, // ✅ Always get fresh data on component mount
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // ✅ Exponential backoff

    // ✅ PERFORMANCE: Optimized update notifications for instant UI feedback
    notifyOnChangeProps: ["data", "error", "isLoading"], // Only notify on essential changes
    structuralSharing: true, // ✅ Enable structural sharing for better performance

    // ✅ INSTANT UPDATES: Ensure immediate UI reflection
    placeholderData: undefined, // Don't use placeholder data that might cause stale UI

    onSuccess: (data) => {
      console.log(
        `🩺 TherapistDashboard data updated at ${new Date().toLocaleTimeString()}:`,
        data?.length,
        "appointments"
      );
      console.log(
        "✅ CRITICAL DEBUG: TherapistDashboard query refetched successfully:",
        {
          userId,
          queryKey,
          dataLength: data?.length,
          timestamp: new Date().toLocaleTimeString(),
          appointmentIds: data?.map((apt) => apt.id),
          appointmentStatuses: data?.map((apt) => ({
            id: apt.id,
            status: apt.status,
          })),
        }
      );
    },
    onError: (error) => {
      console.error("❌ TherapistDashboard data fetch error:", error);
    },
    // ✅ ENHANCED: Additional debugging
    onSettled: (data, error) => {
      console.log("🔍 TherapistDashboard query settled:", {
        queryKey,
        dataLength: data?.length,
        error: error?.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
  });

  // ✅ SIMPLIFIED: Data is already filtered by the fetch function
  // Filter today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // ✅ ENHANCED DEBUG: Log date filtering details
    console.log("🔍 DATE FILTERING DEBUG:", {
      todayStr,
      today: today.toISOString(),
      appointmentsCount: myAppointments.length,
      appointments: myAppointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        matchesToday: apt.date === todayStr,
      })),
    });

    const filtered = myAppointments.filter((apt) => {
      const matches = apt.date === todayStr;
      console.log(
        `🔍 Date filter for appointment ${apt.id}: ${apt.date} === ${todayStr} = ${matches}`
      );
      return matches;
    });

    console.log("🔍 Today appointments after date filtering:", {
      todayStr,
      filteredCount: filtered.length,
      filtered: filtered,
    });

    return filtered;
  }, [myAppointments]);

  // Filter upcoming appointments (future dates)
  const upcomingAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return myAppointments.filter((apt) => apt.date > todayStr);
  }, [myAppointments]);

  return {
    appointments: myAppointments,
    todayAppointments,
    upcomingAppointments,
    isLoading,
    error,
    refetch,
    hasData: myAppointments.length > 0,
    dataUpdatedAt,
    isFetching,
  };
};

// API calls for therapist actions
const therapistAPI = {
  acceptAppointment: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  rejectAppointment: async ({ appointmentId, rejectionReason }) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) throw new Error("Rejection reason cannot be empty");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/reject/`,
      { rejection_reason: cleanReason },
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  confirmReadiness: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  startSession: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/start_session/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  completeSession: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/complete/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  requestPayment: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/mark_awaiting_payment/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  requestPickup: async ({ appointmentId, urgency = "normal" }) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/request_pickup/`,
      {
        pickup_urgency: urgency,
        pickup_notes:
          urgency === "urgent"
            ? "Urgent pickup requested by therapist"
            : "Pickup requested by therapist",
      },
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },
};

const TherapistDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ✅ CRITICAL FIX: Add standardized WebSocket cache sync like DriverDashboard
  useAutoWebSocketCacheSync();

  // ✅ CRITICAL FIX: Memoize user to prevent infinite re-renders
  const user = useMemo(() => getUser(), []);

  // ✅ DEBUG: Log user information ONCE during component mount
  useEffect(() => {
    console.log("� DEBUG: TherapistDashboard user state:", {
      user,
      userId: user?.id,
      userName: user?.first_name || user?.username,
      userType: user?.user_type || user?.role,
    });
  }, [user]);

  // TanStack Query data fetching with optimized configuration
  const {
    appointments: myAppointments,
    todayAppointments: myTodayAppointments,
    upcomingAppointments: myUpcomingAppointments,
    isLoading: loading,
    error,
    refetch,
    hasData,
  } = useTherapistDashboardData(user?.id);

  // ✅ DEBUG: Log the data received ONLY when data changes
  useEffect(() => {
    console.log("🔍 TherapistDashboard data changed:", {
      dataLength: myAppointments?.length,
      timestamp: new Date().toLocaleTimeString(),
      isLoading: loading,
      appointmentIds: myAppointments?.map((apt) => apt.id),
      appointmentStatuses: myAppointments?.map((apt) => ({
        id: apt.id,
        status: apt.status,
      })),
    });
  }, [myAppointments, loading]);

  // Add manual refresh function for debugging
  const manualRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered by user");
    try {
      await refetch();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    }
  }, [refetch]);

  // ✅ DEBUGGING: Add window function for manual testing
  useEffect(() => {
    window.refreshTherapistDashboard = manualRefresh;
    return () => {
      delete window.refreshTherapistDashboard;
    };
  }, [manualRefresh]);
  useEffect(() => {
    console.log("🔍 DEBUG: TherapistDashboard data state:", {
      myAppointmentsLength: myAppointments?.length || 0,
      myAppointmentsIsArray: Array.isArray(myAppointments),
      myTodayAppointments: myTodayAppointments,
      myTodayAppointmentsLength: myTodayAppointments?.length || 0,
      myUpcomingAppointments: myUpcomingAppointments,
      myUpcomingAppointmentsLength: myUpcomingAppointments?.length || 0,
      loading,
      error,
      hasData,
      userId: user?.id,
    });
  }, [
    myAppointments,
    myTodayAppointments,
    myUpcomingAppointments,
    loading,
    error,
    hasData,
    user?.id,
  ]);

  // TanStack Query mutations for therapist actions
  const acceptAppointmentMutation = useMutation({
    mutationFn: therapistAPI.acceptAppointment,
    onMutate: async (appointmentId) => {
      console.log(
        "🔄 acceptAppointmentMutation.onMutate - INSTANT UPDATE for:",
        appointmentId
      );

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "therapist_confirmed",
                therapist_accepted: true,
                therapist_accepted_at: new Date().toISOString(),
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT optimistic update applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, appointmentId) => {
      console.log(
        "✅ Accept appointment mutation successful - backend data:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...backendData } : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend data applied to TherapistDashboard cache"
        );
      }

      // ✅ REAL-TIME SYNC: Use the new real-time sync service
      syncMutationSuccess(
        "accept_appointment",
        appointmentId,
        backendData,
        "therapist"
      );

      // ✅ DELAYED INVALIDATION: Invalidate other caches without affecting instant UI updates
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ Accept appointment mutation failed:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log("🔄 Rolled back optimistic update due to error");
      }
    },
  });

  const rejectAppointmentMutation = useMutation({
    mutationFn: therapistAPI.rejectAppointment,
    onMutate: async ({ appointmentId, rejectionReason }) => {
      console.log(
        "🔄 rejectAppointmentMutation.onMutate - INSTANT UPDATE for:",
        appointmentId
      );

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "rejected",
                rejection_reason: rejectionReason,
                rejected_at: new Date().toISOString(),
                rejected_by: user?.id,
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT rejection update applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, { appointmentId }) => {
      console.log(
        "✅ Reject appointment mutation successful - backend data:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...backendData } : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend rejection data applied to TherapistDashboard cache"
        );
      }

      // ✅ REAL-TIME SYNC: Use the new real-time sync service
      syncMutationSuccess(
        "reject_appointment",
        appointmentId,
        backendData,
        "therapist"
      );

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ Reject appointment mutation failed:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log("🔄 Rolled back optimistic rejection update due to error");
      }
    },
  });

  const confirmReadinessMutation = useMutation({
    mutationFn: therapistAPI.confirmReadiness,
    onMutate: async (appointmentId) => {
      console.log(
        "🔄 confirmReadinessMutation.onMutate - INSTANT UPDATE for:",
        appointmentId
      );

      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "therapist_confirmed",
                therapist_accepted: true,
                therapist_accepted_at: new Date().toISOString(),
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT readiness confirmation applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, appointmentId) => {
      console.log(
        "✅ Confirm readiness mutation successful - backend data:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...backendData } : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend readiness data applied to TherapistDashboard cache"
        );
      }

      // ✅ REAL-TIME SYNC: Use the new real-time sync service
      syncMutationSuccess(
        "confirm_readiness",
        appointmentId,
        backendData,
        "therapist"
      );

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ Confirm readiness mutation failed:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log("🔄 Rolled back readiness confirmation due to error");
      }
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: therapistAPI.startSession,
    onMutate: async (appointmentId) => {
      console.log(
        "🚀 startSessionMutation.onMutate - INSTANT UPDATE for ID:",
        appointmentId
      );

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "session_in_progress",
                session_started_at: new Date().toISOString(),
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT start session update applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, appointmentId) => {
      console.log(
        "🎉 startSessionMutation.onSuccess - Backend response:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...backendData } : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend session data applied to TherapistDashboard cache"
        );
      }

      // ✅ REAL-TIME SYNC: Use the new real-time sync service
      const updateData = {
        status: "session_in_progress",
        session_started_at: new Date().toISOString(),
        started_by: user?.id,
        ...(backendData?.appointment || {}),
      };

      syncMutationSuccess(
        "start_session",
        appointmentId,
        updateData,
        "therapist"
      );

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ startSessionMutation.onError:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log(
          "🔄 Rolled back start session optimistic update due to error"
        );
      }
    },
  });

  const requestPaymentMutation = useMutation({
    mutationFn: therapistAPI.requestPayment,
    onMutate: async (appointmentId) => {
      console.log(
        "🚀 requestPaymentMutation.onMutate - INSTANT UPDATE for ID:",
        appointmentId
      );

      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "awaiting_payment",
                payment_initiated_at: new Date().toISOString(),
                payment_requested_by: user?.id,
                // Preserve other appointment data
                session_started_at: apt.session_started_at,
                therapist_id: apt.therapist_id,
                client_id: apt.client_id,
                driver_id: apt.driver_id,
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT payment request update applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, appointmentId) => {
      console.log(
        "🎉 requestPaymentMutation.onSuccess - Backend response:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData?.appointment) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId
              ? { ...apt, ...backendData.appointment }
              : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend payment data applied to TherapistDashboard cache"
        );
      }

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ requestPaymentMutation.onError:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log("🔄 Rolled back payment optimistic updates due to error");
      }
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: therapistAPI.completeSession,
    onMutate: async (appointmentId) => {
      console.log(
        "🚀 completeSessionMutation.onMutate - INSTANT UPDATE for ID:",
        appointmentId
      );

      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "completed",
                session_end_time: new Date().toISOString(),
                completed_by: user?.id,
                // Preserve other appointment data
                session_started_at: apt.session_started_at,
                payment_initiated_at: apt.payment_initiated_at,
                therapist_id: apt.therapist_id,
                client_id: apt.client_id,
                driver_id: apt.driver_id,
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT complete session update applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, appointmentId) => {
      console.log(
        "🎉 completeSessionMutation.onSuccess - Backend response:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData?.appointment) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId
              ? { ...apt, ...backendData.appointment }
              : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend completion data applied to TherapistDashboard cache"
        );
      }

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ completeSessionMutation.onError:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log(
          "🔄 Rolled back completion optimistic updates due to error"
        );
      }
    },
  });

  const requestPickupMutation = useMutation({
    mutationFn: therapistAPI.requestPickup,
    onMutate: async ({ appointmentId, urgency = "normal" }) => {
      console.log(
        "🚀 requestPickupMutation.onMutate - INSTANT UPDATE for:",
        appointmentId,
        "urgency:",
        urgency
      );

      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
      });

      const previousData = {
        therapistData: queryClient.getQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all")
        ),
      };

      // ✅ INSTANT UPDATE: Apply immediately using setQueryData pattern like DriverDashboard
      const optimisticUpdate = (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId
            ? {
                ...apt,
                status: "pickup_requested",
                pickup_urgency: urgency,
                pickup_request_time: new Date().toISOString(),
                pickup_requested_by: user?.id,
              }
            : apt
        );
      };

      // ✅ INSTANT CACHE UPDATE: Use the same pattern as DriverDashboard
      queryClient.setQueryData(
        queryKeys.appointments.byTherapist(user?.id, "all"),
        optimisticUpdate
      );

      console.log(
        "✅ INSTANT pickup request applied to TherapistDashboard cache"
      );
      return { previousData };
    },
    onSuccess: async (backendData, { appointmentId }) => {
      console.log(
        "✅ Request pickup mutation successful - backend data:",
        backendData
      );

      // ✅ INSTANT BACKEND UPDATE: Apply backend data immediately to cache (like DriverDashboard)
      if (backendData) {
        const updateWithBackendData = (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...backendData } : apt
          );
        };

        // INSTANT: Update TherapistDashboard cache with real backend data
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          updateWithBackendData
        );

        console.log(
          "✅ INSTANT backend pickup data applied to TherapistDashboard cache"
        );
      }

      // ✅ REAL-TIME SYNC: Use the new real-time sync service
      syncMutationSuccess(
        "request_pickup",
        appointmentId,
        backendData,
        "therapist"
      );

      // ✅ DELAYED INVALIDATION: Invalidate for background refresh without affecting instant UI
      setTimeout(async () => {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
          refetchType: "active",
        });
        console.log("✅ Background refresh completed");
      }, 500);
    },
    onError: (error, variables, context) => {
      console.error("❌ Request pickup mutation failed:", error);

      // ✅ ROLLBACK: Restore previous data on error
      if (context?.previousData?.therapistData) {
        queryClient.setQueryData(
          queryKeys.appointments.byTherapist(user?.id, "all"),
          context.previousData.therapistData
        );
        console.log("🔄 Rolled back pickup request due to error");
      }
    },
  });

  // Get user name from user object or fallback
  const userName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || "Therapist";

  // Use shared Philippine time and greeting hook
  const { systemTime, greeting } = usePhilippineTime();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  // Get view from URL params, default to 'today'
  const currentView = searchParams.get("view") || "today";

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });

  // Loading states for individual button actions
  const [buttonLoading, setButtonLoading] = useState({});

  // Helper function to set loading state for specific action
  const setActionLoading = (actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  };

  // Debug logging for troubleshooting the "No appointments found" issue
  const DEBUG_LOGS = false; // Set to true to enable debug logs
  if (DEBUG_LOGS) {
    console.log("🔍 TherapistDashboard Debug:", {
      user: user,
      userRole: "therapist",
      userId: user?.id,
      myAppointments: myAppointments,
      myAppointmentsLength: myAppointments?.length || 0,
      myAppointmentsIsArray: Array.isArray(myAppointments),
      myTodayAppointments: myTodayAppointments,
      myTodayAppointmentsLength: myTodayAppointments?.length || 0,
      myUpcomingAppointments: myUpcomingAppointments,
      myUpcomingAppointmentsLength: myUpcomingAppointments?.length || 0,
      loading,
      error,
      hasData,
      currentView,
    });
  }

  // TANSTACK QUERY: Automatic background refreshes handled by TanStack Query
  // No manual refresh logic needed - TanStack Query handles it automatically

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  // Handle appointment status changes with TanStack Query mutations
  const handleAcceptAppointment = async (appointmentId) => {
    const actionKey = `accept_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await acceptAppointmentMutation.mutateAsync(appointmentId);
    } catch (error) {
      console.error("Accept appointment failed:", error);
      alert("Failed to accept appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleRejectAppointment = (appointmentId) => {
    setRejectionModal({
      isOpen: true,
      appointmentId: appointmentId,
    });
  };

  const handleRejectionSubmit = async (appointmentId, rejectionReason) => {
    // Additional validation on the frontend
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      await rejectAppointmentMutation.mutateAsync({
        appointmentId,
        rejectionReason: cleanReason,
      });
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error("Reject appointment failed:", error);
      alert("Failed to reject appointment. Please try again.");
      setRejectionModal({ isOpen: false, appointmentId: null });
    }
  };

  // Enhanced workflow handlers for new service flow
  const handleTherapistConfirm = async (appointmentId) => {
    const actionKey = `confirm_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await confirmReadinessMutation.mutateAsync(appointmentId);
      console.log("✅ Therapist confirmation successful");
    } catch (error) {
      console.error("Failed to confirm appointment:", error);
      alert("Failed to confirm appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleStartSession = async (appointmentId) => {
    const actionKey = `start_session_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);

      // Debug: Log appointment state before starting session
      const currentData = queryClient.getQueryData(["appointments"]);
      const appointment = currentData?.find((apt) => apt.id === appointmentId);
      console.log(
        "🔍 Before startSession - Appointment status:",
        appointment?.status
      );

      const result = await startSessionMutation.mutateAsync(appointmentId);
      console.log("✅ Session start successful, backend response:", result);

      // Debug: Log appointment state after mutation
      setTimeout(() => {
        const updatedData = queryClient.getQueryData(["appointments"]);
        const updatedAppointment = updatedData?.find(
          (apt) => apt.id === appointmentId
        );
        console.log(
          "🔍 After startSession - Appointment status:",
          updatedAppointment?.status
        );
      }, 100);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleRequestPayment = async (appointmentId) => {
    const actionKey = `request_payment_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await requestPaymentMutation.mutateAsync(appointmentId);
      console.log("✅ Payment request successful");
    } catch (error) {
      console.error("Failed to request payment:", error);
      alert("Failed to request payment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleCompleteSession = async (appointmentId) => {
    if (
      window.confirm("Complete this session? This action cannot be undone.")
    ) {
      const actionKey = `complete_session_${appointmentId}`;
      try {
        setActionLoading(actionKey, true);
        await completeSessionMutation.mutateAsync(appointmentId);
        console.log("✅ Session completion successful");
      } catch (error) {
        console.error("Failed to complete session:", error);
        alert("Failed to complete session. Please try again.");
      } finally {
        setActionLoading(actionKey, false);
      }
    }
  };

  const handleRequestPickupNew = async (appointmentId, urgency = "normal") => {
    const actionKey = `request_pickup_${appointmentId}_${urgency}`;
    try {
      setActionLoading(actionKey, true);
      await requestPickupMutation.mutateAsync({ appointmentId, urgency });
      alert(
        urgency === "urgent"
          ? "Urgent pickup request sent!"
          : "Pickup request sent!"
      );
      console.log("✅ Pickup request successful");
    } catch (error) {
      console.error("Failed to request pickup:", error);
      alert("Failed to request pickup. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  // Legacy handlers (keeping for backward compatibility)
  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, appointmentId: null });
  };
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "therapist_confirmed":
        return "status-therapist-confirmed";
      case "driver_confirmed":
        return "status-driver-confirmed";
      case "journey_started":
        return "status-journey-started";
      case "arrived":
        return "status-arrived";
      case "dropped_off":
        return "status-dropped-off";
      case "session_started":
        return "status-session-started";
      case "payment_requested":
        return "status-payment-requested";
      case "payment_completed":
        return "status-payment-completed";
      case "pickup_requested":
        return "status-pickup-requested";
      case "in_progress":
        return "status-in-progress";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  // Helper function to display user-friendly status text
  const getStatusDisplayText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "therapist_confirmed":
        return "Confirmed by Therapist";
      case "driver_confirmed":
        return "Driver Assigned";
      case "journey_started":
        return "En Route";
      case "arrived":
        return "Driver Arrived";
      case "dropped_off":
        return "Ready to Start";
      case "session_in_progress":
        return "Session in Progress";
      case "awaiting_payment":
        return "Awaiting Payment";
      case "payment_completed":
        return "Payment Completed";
      case "pickup_requested":
        return "Pickup Requested";
      case "transport_completed":
        return "Transport Completed";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return (
          status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
        );
    }
  };
  // Helper function to display therapist team information
  const renderTherapistTeam = (appointment) => {
    if (
      appointment.therapists_details &&
      Array.isArray(appointment.therapists_details) &&
      appointment.therapists_details.length > 1
    ) {
      const otherTherapists = appointment.therapists_details.filter(
        (t) => t && t.id !== user?.id
      );
      if (otherTherapists.length > 0) {
        return (
          <div className="therapist-team">
            <strong>Team members:</strong>
            <div className="therapist-list">
              {otherTherapists.map((therapist, index) => (
                <div key={therapist.id || index} className="therapist-name">
                  {therapist.first_name} {therapist.last_name}
                  {therapist.specialization && (
                    <span className="therapist-specialization">
                      {" "}
                      ({therapist.specialization})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Special render function for completed transport appointments
  const renderCompletedTransportCard = (appointment) => {
    return (
      <div
        key={appointment.id}
        className="appointment-card completed-transport-card"
      >
        <div className="appointment-header">
          <h3>
            {appointment.client_details?.first_name}{" "}
            {appointment.client_details?.last_name}
          </h3>
          <span className="status-badge status-transport-completed">
            ✅ Transport Completed
          </span>
        </div>

        <div className="appointment-details">
          <p>
            <strong>Date:</strong>{" "}
            {new Date(appointment.date).toLocaleDateString()}
          </p>

          {/* Session Start and End Times */}
          {appointment.session_started_at && (
            <p>
              <strong>Session Started:</strong>{" "}
              {new Date(appointment.session_started_at).toLocaleString()}
            </p>
          )}
          {appointment.session_end_time && (
            <p>
              <strong>Session Ended:</strong>{" "}
              {new Date(appointment.session_end_time).toLocaleString()}
            </p>
          )}

          {/* Client Address */}
          <p>
            <strong>Client Address:</strong> {appointment.location}
          </p>

          {/* Services */}
          <p>
            <strong>Services:</strong>{" "}
            {appointment.services_details?.map((s) => s.name).join(", ") ||
              "N/A"}
          </p>

          {/* Payment Amount */}
          <p>
            <strong>Amount Paid:</strong> ₱
            {appointment.payment_amount
              ? parseFloat(appointment.payment_amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : appointment.total_price?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
          </p>

          {/* Return Journey Completion Time */}
          {appointment.return_journey_completed_at && (
            <p>
              <strong>Transport Completed:</strong>{" "}
              {new Date(
                appointment.return_journey_completed_at
              ).toLocaleString()}
            </p>
          )}

          {/* Driver Information */}
          {appointment.driver_details && (
            <p>
              <strong>Driver:</strong>{" "}
              {appointment.driver_details?.first_name || "Unknown"}{" "}
              {appointment.driver_details?.last_name || "Driver"}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderActionButtons = (appointment) => {
    const {
      status,
      id,
      therapist_accepted,
      both_parties_accepted,
      pending_acceptances,
      therapists_accepted,
      therapists,
    } = appointment;

    // Helper function to check if current therapist has accepted
    const hasCurrentTherapistAccepted = () => {
      // For multi-therapist appointments
      if (therapists && therapists.length > 0) {
        const therapistIndex = therapists.indexOf(user?.id);
        return (
          therapistIndex !== -1 &&
          therapists_accepted &&
          therapists_accepted[therapistIndex]
        );
      }
      // For single therapist appointments (legacy)
      return therapist_accepted;
    };
    switch (status) {
      case "pending":
        // Show accept/reject only if current therapist hasn't accepted yet
        if (!hasCurrentTherapistAccepted()) {
          return (
            <div className="appointment-actions">
              <LoadingButton
                className="accept-button"
                onClick={() => handleAcceptAppointment(id)}
                loading={buttonLoading[`accept_${id}`]}
                loadingText="Accepting..."
              >
                Accept
              </LoadingButton>
              <LoadingButton
                className="reject-button"
                onClick={() => handleRejectAppointment(id)}
                variant="secondary"
              >
                Reject
              </LoadingButton>
            </div>
          );
        } else {
          // Therapist has accepted, show waiting status
          return (
            <div className="appointment-actions">
              <div className="waiting-status">
                <span className="accepted-badge">✓ You have accepted</span>
                {!both_parties_accepted && pending_acceptances?.length > 0 && (
                  <small className="waiting-text">
                    Waiting for: {pending_acceptances.join(", ")}
                  </small>
                )}
              </div>
            </div>
          );
        }

      case "confirmed":
        // New workflow: therapist needs to confirm readiness
        if (both_parties_accepted) {
          return (
            <div className="appointment-actions">
              <LoadingButton
                className="confirm-button"
                onClick={() => handleTherapistConfirm(id)}
                loading={buttonLoading[`confirm_${id}`]}
                loadingText="Confirming..."
              >
                Confirm Ready
              </LoadingButton>
              <div className="workflow-info">
                <p>
                  ✅ All parties accepted. Please confirm you're ready to
                  proceed.
                </p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="warning-status">
                ⚠ Waiting for all parties to accept before confirmation
              </div>
            </div>
          );
        }
      case "therapist_confirmed":
        // Always waiting for driver to confirm - driver is needed for all appointments
        return (
          <div className="appointment-actions">
            <div className="waiting-status">
              <span className="confirmed-badge">✅ You confirmed</span>
              <p>Waiting for driver confirmation...</p>
            </div>
          </div>
        );
      case "driver_confirmed":
        // Both confirmed, but operator must start appointment before journey can begin
        return (
          <div className="appointment-actions">
            <div className="ready-status">
              <span className="ready-badge">⏳ Waiting for Operator</span>
              <p>
                Both you and driver confirmed. Waiting for operator to start
                appointment.
              </p>
              <div className="workflow-reminder">
                <small>🔐 Operator must approve before transport begins</small>
              </div>
            </div>
          </div>
        );

      case "in_progress":
        // Appointment is active, driver will handle journey
        return (
          <div className="appointment-actions">
            <div className="ready-status">
              <span className="ready-badge">✅ Appointment active</span>
              <p>Appointment is in progress. Driver will coordinate pickup.</p>
            </div>
          </div>
        );

      case "journey":
        return (
          <div className="appointment-actions">
            <div className="journey-status">
              <span className="journey-badge">🚗 En route</span>
              <p>Driver is on the way to pick you up</p>
            </div>
          </div>
        );

      case "arrived":
        return (
          <div className="appointment-actions">
            <div className="arrived-status">
              <span className="arrived-badge">📍 Driver arrived</span>
              <p>Driver has arrived. Ready to proceed to client.</p>
            </div>
          </div>
        );
      case "dropped_off":
        // Session should auto-start, but allow manual start if needed
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="start-session-button"
              onClick={() => handleStartSession(id)}
              loading={buttonLoading[`start_session_${id}`]}
              loadingText="Starting..."
            >
              Start Session
            </LoadingButton>
            <div className="dropped-off-info">
              <p>📍 Dropped off at client location</p>
            </div>
          </div>
        );
      case "session_in_progress":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="payment-button"
              onClick={() => handleRequestPayment(id)}
              loading={buttonLoading[`request_payment_${id}`]}
              loadingText="Request Payment"
            >
              Request Payment
            </LoadingButton>
            <div className="session-info">
              <p>💆 Session in progress</p>
            </div>
          </div>
        );

      case "awaiting_payment":
        return (
          <div className="appointment-actions">
            <div className="payment-status">
              <span className="payment-badge">💳 Payment requested</span>
              <p>Waiting for operator to verify payment...</p>
            </div>
          </div>
        );
      case "payment_completed":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="complete-session-button"
              onClick={() => handleCompleteSession(id)}
              loading={buttonLoading[`complete_session_${id}`]}
              loadingText="Completing..."
            >
              Complete Session
            </LoadingButton>
            <div className="payment-info">
              <p>✅ Payment verified by operator</p>
            </div>
          </div>
        );

      case "completed":
        // Show pickup options for appointments with drivers
        if (appointment.driver_details) {
          return (
            <div className="appointment-actions">
              {appointment.pickup_requested ? (
                <div className="pickup-status">
                  {appointment.assigned_pickup_driver ? (
                    <div className="driver-assigned">
                      <span className="success-badge">
                        ✅ Pickup Driver Assigned
                      </span>
                      <p>Driver en route for pickup</p>
                      {appointment.estimated_pickup_time && (
                        <p>
                          <strong>ETA:</strong>{" "}
                          {new Date(
                            appointment.estimated_pickup_time
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pickup-pending">
                      <div className="session-completion-info">
                        {appointment.session_end_time && (
                          <p className="completion-timestamp">
                            <strong>Session completed:</strong>{" "}
                            {new Date(
                              appointment.session_end_time
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`pickup-badge ${
                          appointment.pickup_urgency || "normal"
                        }`}
                      >
                        {appointment.pickup_urgency === "urgent"
                          ? "🚨 URGENT Pickup Requested"
                          : "⏰ Pickup Requested"}
                      </span>
                      <p>Waiting for driver assignment...</p>{" "}
                      {appointment.pickup_urgency !== "urgent" && (
                        <LoadingButton
                          className="urgent-pickup-button"
                          onClick={() => handleRequestPickupNew(id, "urgent")}
                          loading={buttonLoading[`request_pickup_${id}_urgent`]}
                          loadingText="Requesting..."
                          variant="warning"
                          size="small"
                        >
                          Request Urgent Pickup
                        </LoadingButton>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pickup-actions">
                  <div className="session-completion-info">
                    <p className="pickup-info">
                      <span className="success-badge">
                        ✅ Session completed
                      </span>
                      {appointment.session_end_time && (
                        <span className="completion-timestamp">
                          Completed at:{" "}
                          {new Date(
                            appointment.session_end_time
                          ).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <p>Need pickup to return?</p>
                  </div>
                  <div className="pickup-buttons">
                    <LoadingButton
                      className="request-pickup-button"
                      onClick={() => handleRequestPickupNew(id, "normal")}
                      loading={buttonLoading[`request_pickup_${id}_normal`]}
                      loadingText="Requesting..."
                    >
                      Request Pickup
                    </LoadingButton>
                    <LoadingButton
                      className="urgent-pickup-button"
                      onClick={() => handleRequestPickupNew(id, "urgent")}
                      loading={buttonLoading[`request_pickup_${id}_urgent`]}
                      loadingText="Requesting..."
                      variant="warning"
                    >
                      Request Urgent Pickup
                    </LoadingButton>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="completed-status">
                <span className="success-badge">✅ Session Completed</span>
                <p>No transport needed</p>
              </div>
            </div>
          );
        }
      case "pickup_requested":
        return (
          <div className="appointment-actions">
            <div className="pickup-requested-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="pickup-badge">🚖 Pickup requested</span>
              <p>Waiting for pickup assignment...</p>
            </div>
          </div>
        );

      case "driver_assigned_pickup":
        return (
          <div className="appointment-actions">
            <div className="pickup-assigned-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="success-badge">
                ✅ Driver Assigned for Pickup
              </span>
              <p>
                Driver{" "}
                <strong>
                  {appointment.driver_details?.first_name}{" "}
                  {appointment.driver_details?.last_name}
                </strong>{" "}
                has been assigned for your pickup.
              </p>
              {appointment.estimated_pickup_time && (
                <p>
                  <strong>Estimated arrival:</strong>{" "}
                  {new Date(appointment.estimated_pickup_time).toLocaleString()}
                </p>
              )}
              <p className="waiting-confirmation">
                Waiting for driver to confirm pickup...
              </p>
            </div>
          </div>
        );

      case "return_journey":
        return (
          <div className="appointment-actions">
            <div className="return-journey-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="journey-badge">
                🔄 Driver En Route for Pickup
              </span>
              <p>
                Driver{" "}
                <strong>
                  {appointment.driver_details?.first_name}{" "}
                  {appointment.driver_details?.last_name}
                </strong>{" "}
                confirmed pickup and is on the way.
              </p>
              {appointment.pickup_confirmed_at && (
                <p>
                  <strong>Pickup confirmed at:</strong>{" "}
                  {new Date(appointment.pickup_confirmed_at).toLocaleString()}
                </p>
              )}
              <p>Please wait at the pickup location.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };
  const renderAppointmentsList = (appointmentsList) => {
    // Enhanced safety checks for undefined/null data
    if (
      !appointmentsList ||
      !Array.isArray(appointmentsList) ||
      appointmentsList.length === 0
    ) {
      console.log("🔍 renderAppointmentsList: No appointments to render:", {
        appointmentsList,
        isArray: Array.isArray(appointmentsList),
        length: appointmentsList?.length,
      });
      return <p className="no-appointments">No appointments found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => {
          // Use special rendering for completed transport appointments
          if (appointment.status === "transport_completed") {
            return renderCompletedTransportCard(appointment);
          }

          // Regular appointment card for all other statuses
          return (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-header">
                <h3>
                  {appointment.client_details?.first_name}{" "}
                  {appointment.client_details?.last_name}
                </h3>{" "}
                <span
                  className={`status-badge ${getStatusBadgeClass(
                    appointment.status
                  )}`}
                >
                  {getStatusDisplayText(appointment.status)}
                </span>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(appointment.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time} -{" "}
                  {appointment.end_time}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details?.map((s) => s.name).join(", ")}
                </p>
                {renderTherapistTeam(appointment)}
                {appointment.driver_details && (
                  <p>
                    <strong>Driver:</strong>{" "}
                    {appointment.driver_details?.first_name || "Unknown"}{" "}
                    {appointment.driver_details?.last_name || "Driver"}
                  </p>
                )}
                {appointment.notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.notes}
                  </p>
                )}

                {/* Show session completion timestamp for pickup-related statuses */}
                {(appointment.status === "pickup_requested" ||
                  appointment.status === "driver_assigned_pickup" ||
                  appointment.status === "return_journey") &&
                  appointment.session_end_time && (
                    <div className="session-completion-info">
                      <h4>📋 Session Completed</h4>
                      <p className="completion-time">
                        <strong>Session completed at:</strong>{" "}
                        {new Date(
                          appointment.session_end_time
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
              </div>

              {renderActionButtons(appointment)}
            </div>
          );
        })}
      </div>
    );
  };
  // Helper to check if appointment is transport completed or completed
  const isTransportCompleted = (appointment) => {
    const completedStatuses = [
      "transport_completed",
      "completed",
      "driver_transport_completed",
    ];
    const isCompleted = completedStatuses.includes(appointment.status);

    // ✅ DEBUG: Log the status check result
    console.log("🔍 isTransportCompleted DEBUG:", {
      appointmentId: appointment.id,
      status: appointment.status,
      completedStatuses,
      isCompleted,
    });

    return isCompleted;
  };

  // State for completed appointments modal
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  // Filter today's appointments into pending and completed
  const todayPendingAppointments = useMemo(() => {
    const filtered = (
      Array.isArray(myTodayAppointments) ? myTodayAppointments : []
    ).filter((apt) => {
      if (!apt) return false;
      const isCompleted = isTransportCompleted(apt);

      // ✅ ENHANCED DEBUG: Log each appointment's filtering decision
      console.log("🔍 FILTERING DEBUG - Appointment:", {
        id: apt.id,
        status: apt.status,
        date: apt.date,
        isTransportCompleted: isCompleted,
        willBeInPending: !isCompleted,
      });

      return !isCompleted;
    });

    console.log("🔍 DEBUG: todayPendingAppointments calculated:", {
      myTodayAppointmentsLength: myTodayAppointments?.length,
      filteredLength: filtered.length,
      myTodayAppointments: myTodayAppointments,
      filtered: filtered,
    });

    return filtered;
  }, [myTodayAppointments]);

  const todayCompletedAppointments = useMemo(() => {
    const filtered = (
      Array.isArray(myTodayAppointments) ? myTodayAppointments : []
    ).filter((apt) => {
      if (!apt) return false;
      const isCompleted = isTransportCompleted(apt);

      // ✅ ENHANCED DEBUG: Log each appointment's filtering decision
      console.log("🔍 COMPLETED FILTERING DEBUG - Appointment:", {
        id: apt.id,
        status: apt.status,
        date: apt.date,
        isTransportCompleted: isCompleted,
        willBeInCompleted: isCompleted,
      });

      return isCompleted;
    });

    console.log("🔍 DEBUG: todayCompletedAppointments calculated:", {
      myTodayAppointmentsLength: myTodayAppointments?.length,
      filteredLength: filtered.length,
    });

    return filtered;
  }, [myTodayAppointments]);

  const handleCloseCompletedModal = () => {
    setShowCompletedModal(false);
  };

  return (
    <PageLayout>
      {/* OPTIMIZED: Simplified loading indicator */}
      <MinimalLoadingIndicator
        show={loading}
        hasData={hasData}
        position="top-right"
        size="small"
        variant="subtle"
        tooltip={
          hasData ? "Refreshing appointments..." : "Loading appointments..."
        }
        pulse={true}
        fadeIn={true}
      />
      <div className="therapist-dashboard">
        <LayoutRow
          title={`${greeting}, ${userName}!`}
          subtitle={<>Today is {systemTime}</>}
        >
          <div className="action-buttons">
            {/* ✅ CRITICAL FIX: Enhanced manual refresh button for cache issues */}
            <button
              onClick={async () => {
                console.log("🔄 Manual refresh triggered by user");

                // 1. Clear the specific cache that TherapistDashboard uses
                console.log("🗑️ Clearing TherapistDashboard cache...");
                queryClient.removeQueries({
                  queryKey: queryKeys.appointments.byTherapist(user?.id, "all"),
                });

                // 2. Force immediate refetch
                console.log("🔄 Force refetching fresh data...");
                await refetch();

                // 3. Also clear and refetch related caches
                setTimeout(async () => {
                  await invalidateAppointmentQueries(queryClient);
                  console.log("✅ Complete cache refresh finished");
                }, 500);
              }}
              className="refresh-button"
              style={{
                marginRight: "10px",
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
              title="Force refresh if appointments are not updating properly"
            >
              🔄 Force Refresh
            </button>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>
        {/* OPTIMIZED: Simplified error handling */}
        {error && !hasData && (
          <div className="error-message">
            <div>
              {typeof error === "object"
                ? error.message || error.error || "An error occurred"
                : error}
            </div>
            <button
              onClick={refetch}
              className="retry-button"
              style={{
                marginTop: "10px",
                padding: "5px 10px",
                backgroundColor: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        <TabSwitcher
          tabs={[
            {
              id: "today",
              label: "Today's Appointments",
              count: todayPendingAppointments.length,
            },
            {
              id: "upcoming",
              label: "Upcoming Appointments",
              count: Array.isArray(myUpcomingAppointments)
                ? myUpcomingAppointments.filter(
                    (apt) => apt && !isTransportCompleted(apt)
                  ).length
                : 0,
            },
            {
              id: "all",
              label: "All My Appointments",
              count: Array.isArray(myAppointments) ? myAppointments.length : 0,
            },
            {
              id: "attendance",
              label: "My Attendance",
              count: undefined,
            },
          ]}
          activeTab={currentView}
          onTabChange={setView}
        />
        <div className="dashboard-content">
          {currentView === "today" && (
            <div className="todays-appointments">
              <div className="section-header">
                <h2>Today's Appointments (Pending)</h2>
                {todayCompletedAppointments.length > 0 && (
                  <button
                    className="view-completed-btn"
                    onClick={() => setShowCompletedModal(true)}
                  >
                    View Completed ({todayCompletedAppointments.length})
                  </button>
                )}
              </div>
              {renderAppointmentsList(todayPendingAppointments)}
            </div>
          )}
          {currentView === "upcoming" && (
            <div className="upcoming-appointments">
              <h2>Upcoming Appointments</h2>
              {renderAppointmentsList(
                (Array.isArray(myUpcomingAppointments)
                  ? myUpcomingAppointments
                  : []
                ).filter((apt) => apt && !isTransportCompleted(apt))
              )}
            </div>
          )}
          {currentView === "all" && (
            <div className="all-appointments">
              <h2>All My Appointments</h2>
              {renderAppointmentsList(
                Array.isArray(myAppointments) ? myAppointments : []
              )}
            </div>
          )}
          {currentView === "attendance" && (
            <div className="attendance-view">
              <AttendanceComponent />
            </div>
          )}
          {currentView === "calendar" && (
            <div className="calendar-view">
              <h2>Calendar View</h2>
              <Calendar
                showClientLabels={true}
                context="therapist"
                onDateSelected={() => {}}
                onTimeSelected={() => {}}
              />
            </div>
          )}
        </div>
        <WebSocketStatus />

        {/* Completed Appointments Modal */}
        {/* Completed Appointments Modal */}
        {showCompletedModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="modal"
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "0",
                maxWidth: "90vw",
                maxHeight: "80vh",
                overflow: "hidden",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}
                >
                  Today's Completed Appointments
                </h2>
                <button
                  className="close-btn"
                  onClick={handleCloseCompletedModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdClose size={20} />
                </button>
              </div>
              <div
                className="modal-content"
                style={{
                  padding: "1.5rem",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {renderAppointmentsList(todayCompletedAppointments)}
              </div>
            </div>
          </div>
        )}

        <RejectionModal
          isOpen={rejectionModal.isOpen}
          onClose={handleRejectionCancel}
          onSubmit={handleRejectionSubmit}
          appointmentId={rejectionModal.appointmentId}
          loading={loading}
        />
      </div>
    </PageLayout>
  );
};

export default TherapistDashboard;
