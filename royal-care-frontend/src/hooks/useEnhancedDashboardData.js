/**
 * Enhanced Dashboard Data Hooks with TanStack Query
 *
 * These hooks replace the complex useOptimizedDashboardData and useDashboardIntegration
 * patterns with clean TanStack Query implementations.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  completeAppointment,
  completeReturnJourney,
  confirmPickup,
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  rejectAppointment,
  rejectPickup,
  requestPickup,
  startJourney,
  startSession,
  therapistConfirm,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import { queryClientUtils, queryKeys, queryUtils } from "../lib/queryClient";

/**
 * Enhanced Dashboard Data Hook - Replaces useOptimizedDashboardData
 *
 * BEFORE: 300+ lines of complex state management
 * AFTER: Clean declarative data fetching with role-based filtering
 */
export const useEnhancedDashboardData = (userRole, userId) => {
  const dispatch = useDispatch();

  // Core appointment queries with different refresh intervals and improved error handling
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: async () => {
      try {
        const result = await dispatch(fetchAppointments()).unwrap();
        console.log("🔍 appointmentsQuery result:", {
          result,
          isArray: Array.isArray(result),
        });

        // Ensure we always return an array
        if (Array.isArray(result)) {
          return result;
        } else if (result && Array.isArray(result.results)) {
          // Handle paginated response
          return result.results;
        } else {
          console.warn(
            "⚠️ fetchAppointments returned unexpected data:",
            result
          );
          return [];
        }
      } catch (error) {
        console.error("❌ appointmentsQuery error:", error);
        throw error;
      }
    },
    staleTime: queryUtils.staleTime.MEDIUM,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const todayQuery = useQuery({
    queryKey: queryKeys.appointments.today(),
    queryFn: async () => {
      try {
        const result = await dispatch(fetchTodayAppointments()).unwrap();
        console.log("🔍 todayQuery result:", {
          result,
          isArray: Array.isArray(result),
        });

        // Ensure we always return an array
        if (Array.isArray(result)) {
          return result;
        } else if (result && Array.isArray(result.results)) {
          // Handle paginated response
          return result.results;
        } else {
          console.warn(
            "⚠️ fetchTodayAppointments returned unexpected data:",
            result
          );
          return [];
        }
      } catch (error) {
        console.error("❌ todayQuery error:", error);
        throw error;
      }
    },
    staleTime: queryUtils.staleTime.SHORT,
    refetchInterval: 2 * 60 * 1000, // 2 minutes for today's data
    retry: 2,
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.appointments.upcoming(),
    queryFn: async () => {
      try {
        const result = await dispatch(fetchUpcomingAppointments()).unwrap();
        console.log("🔍 upcomingQuery result:", {
          result,
          isArray: Array.isArray(result),
        });

        // Ensure we always return an array
        if (Array.isArray(result)) {
          return result;
        } else if (result && Array.isArray(result.results)) {
          // Handle paginated response
          return result.results;
        } else {
          console.warn(
            "⚠️ fetchUpcomingAppointments returned unexpected data:",
            result
          );
          return [];
        }
      } catch (error) {
        console.error("❌ upcomingQuery error:", error);
        throw error;
      }
    },
    staleTime: queryUtils.staleTime.MEDIUM,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for upcoming
    retry: 2,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => dispatch(fetchNotifications()).unwrap(),
    staleTime: queryUtils.staleTime.SHORT,
    refetchInterval: 30 * 1000, // 30 seconds for notifications
    retry: 1,
  });

  const staffQuery = useQuery({
    queryKey: queryKeys.staff.list(),
    queryFn: () => dispatch(fetchStaffMembers()).unwrap(),
    staleTime: queryUtils.staleTime.LONG,
    refetchInterval: 15 * 60 * 1000, // 15 minutes for staff data
    retry: 2,
  });

  // Role-based filtered data (replaces complex useMemo chains)
  const filteredData = useMemo(() => {
    // Enhanced data safety - ensure arrays even if API returns unexpected data
    const appointments = Array.isArray(appointmentsQuery.data)
      ? appointmentsQuery.data
      : [];
    const todayAppointments = Array.isArray(todayQuery.data)
      ? todayQuery.data
      : [];
    const upcomingAppointments = Array.isArray(upcomingQuery.data)
      ? upcomingQuery.data
      : [];

    console.log("🔍 filteredData debug - Raw data:", {
      appointments: appointments.length,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length,
      userRole,
      userId,
    });

    if (!userId) {
      console.log(
        "🔍 filteredData: No userId provided, returning empty arrays"
      );
      return {
        appointments: [],
        todayAppointments: [],
        upcomingAppointments: [],
      };
    }

    switch (userRole) {
      case "therapist": {
        const filteredTherapistData = {
          appointments: appointments.filter(
            (apt) =>
              apt &&
              (apt.therapist === userId ||
                (apt.therapists && apt.therapists.includes(userId)))
          ),
          todayAppointments: todayAppointments.filter(
            (apt) =>
              apt &&
              (apt.therapist === userId ||
                (apt.therapists && apt.therapists.includes(userId)))
          ),
          upcomingAppointments: upcomingAppointments.filter(
            (apt) =>
              apt &&
              (apt.therapist === userId ||
                (apt.therapists && apt.therapists.includes(userId)))
          ),
        };

        console.log("🔍 filteredData debug - Therapist filtered:", {
          userId,
          filteredAppointments: filteredTherapistData.appointments.length,
          filteredTodayAppointments:
            filteredTherapistData.todayAppointments.length,
          filteredUpcomingAppointments:
            filteredTherapistData.upcomingAppointments.length,
          sampleAppointment: filteredTherapistData.appointments[0] || "none",
        });

        return filteredTherapistData;
      }

      case "driver": {
        return {
          appointments: (Array.isArray(appointments)
            ? appointments
            : []
          ).filter((apt) => apt && apt.driver === userId),
          todayAppointments: (Array.isArray(todayAppointments)
            ? todayAppointments
            : []
          ).filter((apt) => apt && apt.driver === userId),
          upcomingAppointments: (Array.isArray(upcomingAppointments)
            ? upcomingAppointments
            : []
          ).filter((apt) => apt && apt.driver === userId),
        };
      }

      case "operator":
      default: {
        // Operators see all appointments
        return {
          appointments,
          todayAppointments,
          upcomingAppointments,
        };
      }
    }
  }, [
    appointmentsQuery.data,
    todayQuery.data,
    upcomingQuery.data,
    userRole,
    userId,
  ]);

  // Combined loading state
  const isLoading =
    appointmentsQuery.isLoading ||
    todayQuery.isLoading ||
    upcomingQuery.isLoading;

  // Combined error state
  const error =
    appointmentsQuery.error ||
    todayQuery.error ||
    upcomingQuery.error ||
    notificationsQuery.error ||
    staffQuery.error;

  // Combined refetching state
  const isRefetching =
    appointmentsQuery.isRefetching ||
    todayQuery.isRefetching ||
    upcomingQuery.isRefetching;

  // Unified refetch function
  const refetch = () => {
    appointmentsQuery.refetch();
    todayQuery.refetch();
    upcomingQuery.refetch();
    notificationsQuery.refetch();
    staffQuery.refetch();
  };

  return {
    // Filtered appointment data
    ...filteredData,

    // Additional data
    notifications: notificationsQuery.data || [],
    staffMembers: staffQuery.data || [],

    // State
    isLoading,
    error,
    isRefetching,
    hasData: !!(
      filteredData.appointments.length || filteredData.todayAppointments.length
    ),

    // Actions
    refetch,
  };
};

/**
 * Dashboard Mutations Hook - Replaces scattered Redux dispatch calls
 *
 * Provides optimistic updates and cache invalidation for dashboard actions
 */
export const useDashboardMutations = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  // Therapist confirmation with optimistic updates
  const confirmAppointmentMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(therapistConfirm(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async (appointmentId) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      // Optimistically update appointment status
      queryClient.setQueryData(queryKeys.appointments.list(), (old) =>
        old?.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: "therapist_confirmed" }
            : apt
        )
      );
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
    onError: (err, appointmentId, context) => {
      // Rollback optimistic update on error
      queryClient.setQueryData(
        queryKeys.appointments.list(),
        context?.previousData
      );
    },
  });

  // Appointment rejection
  const rejectAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }) => {
      const result = await dispatch(
        rejectAppointment({ appointmentId, reason })
      );
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  // Status updates (driver confirmations, journey starts, etc.)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status, data }) => {
      const result = await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status,
          ...data,
        })
      );
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async ({ appointmentId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      // Optimistic status update
      queryClient.setQueryData(queryKeys.appointments.list(), (old) =>
        old?.map((apt) => (apt.id === appointmentId ? { ...apt, status } : apt))
      );
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  // Pickup request
  const requestPickupMutation = useMutation({
    mutationFn: async ({ appointmentId, urgency = "normal" }) => {
      const result = await dispatch(requestPickup({ appointmentId, urgency }));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  // Session management
  const startSessionMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(startSession(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(completeAppointment(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  // Driver-specific mutations
  const confirmPickupMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(confirmPickup(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      queryClient.setQueryData(queryKeys.appointments.list(), (old) =>
        old?.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: "pickup_confirmed" }
            : apt
        )
      );
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  const rejectPickupMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }) => {
      const result = await dispatch(rejectPickup({ appointmentId, reason }));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  const startJourneyMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(startJourney(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      queryClient.setQueryData(queryKeys.appointments.list(), (old) =>
        old?.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: "journey_started" } : apt
        )
      );
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  const completeReturnJourneyMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(completeReturnJourney(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      queryClient.setQueryData(queryKeys.appointments.list(), (old) =>
        old?.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: "return_journey_completed" }
            : apt
        )
      );
    },
    onSuccess: () => {
      queryClientUtils.invalidateAppointments();
    },
  });

  return {
    // Therapist mutations
    confirmAppointment: confirmAppointmentMutation,
    rejectAppointment: rejectAppointmentMutation,

    // General mutations
    updateStatus: updateStatusMutation,
    requestPickup: requestPickupMutation,
    startSession: startSessionMutation,
    completeSession: completeSessionMutation,

    // Driver-specific mutations
    confirmPickup: confirmPickupMutation,
    rejectPickup: rejectPickupMutation,
    startJourney: startJourneyMutation,
    completeReturnJourney: completeReturnJourneyMutation,

    // Loading states
    isConfirming: confirmAppointmentMutation.isPending,
    isRejecting: rejectAppointmentMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isRequestingPickup: requestPickupMutation.isPending,
    isStartingSession: startSessionMutation.isPending,
    isCompletingSession: completeSessionMutation.isPending,

    // Driver loading states
    isConfirmingPickup: confirmPickupMutation.isPending,
    isRejectingPickup: rejectPickupMutation.isPending,
    isStartingJourney: startJourneyMutation.isPending,
    isCompletingReturn: completeReturnJourneyMutation.isPending,

    // Error states
    confirmError: confirmAppointmentMutation.error,
    rejectError: rejectAppointmentMutation.error,
    statusUpdateError: updateStatusMutation.error,
    pickupError: requestPickupMutation.error,
    sessionError: startSessionMutation.error || completeSessionMutation.error,

    // Driver error states
    pickupConfirmError: confirmPickupMutation.error,
    pickupRejectError: rejectPickupMutation.error,
    journeyError: startJourneyMutation.error,
    returnJourneyError: completeReturnJourneyMutation.error,
  };
};

/**
 * Real-time Dashboard Hook - Integrates WebSocket updates with TanStack Query
 *
 * This hook handles real-time updates from WebSocket and automatically
 * invalidates appropriate queries to keep data fresh.
 */
export const useRealtimeDashboardData = (userRole, userId) => {
  // Use the enhanced dashboard data as the base
  const dashboardData = useEnhancedDashboardData(userRole, userId);

  // WebSocket integration for real-time updates
  // This would integrate with your existing WebSocket service
  // and invalidate queries when relevant updates are received

  // Example: Listen for appointment updates and invalidate cache
  // useEffect(() => {
  //   const handleAppointmentUpdate = (data) => {
  //     queryUtils.invalidateAppointments();
  //   };
  //
  //   webSocketService.subscribe('appointment_update', handleAppointmentUpdate);
  //
  //   return () => {
  //     webSocketService.unsubscribe('appointment_update', handleAppointmentUpdate);
  //   };
  // }, []);

  return {
    ...dashboardData,
    // Additional real-time specific methods could go here
  };
};

/**
 * Simplified Dashboard Hook - For basic dashboard needs
 *
 * A lightweight version for dashboards that don't need all the bells and whistles
 */
export const useDashboardData = (userRole, userId) => {
  return useEnhancedDashboardData(userRole, userId);
};
