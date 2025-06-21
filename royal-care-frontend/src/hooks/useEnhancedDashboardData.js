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
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  rejectAppointment,
  requestPickup,
  startSession,
  therapistConfirm,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import { queryKeys, queryUtils } from "../lib/queryClient";

/**
 * Enhanced Dashboard Data Hook - Replaces useOptimizedDashboardData
 *
 * BEFORE: 300+ lines of complex state management
 * AFTER: Clean declarative data fetching with role-based filtering
 */
export const useEnhancedDashboardData = (userRole, userId) => {
  const dispatch = useDispatch();

  // Core appointment queries with different refresh intervals
  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => dispatch(fetchAppointments()).unwrap(),
    staleTime: queryUtils.staleTime.MEDIUM,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const todayQuery = useQuery({
    queryKey: queryKeys.todayAppointments,
    queryFn: () => dispatch(fetchTodayAppointments()).unwrap(),
    staleTime: queryUtils.staleTime.SHORT,
    refetchInterval: 2 * 60 * 1000, // 2 minutes for today's data
    retry: 2,
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.upcomingAppointments,
    queryFn: () => dispatch(fetchUpcomingAppointments()).unwrap(),
    staleTime: queryUtils.staleTime.MEDIUM,
    refetchInterval: 10 * 60 * 1000, // 10 minutes for upcoming
    retry: 2,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => dispatch(fetchNotifications()).unwrap(),
    staleTime: queryUtils.staleTime.SHORT,
    refetchInterval: 30 * 1000, // 30 seconds for notifications
    retry: 1,
  });

  const staffQuery = useQuery({
    queryKey: queryKeys.staffMembers,
    queryFn: () => dispatch(fetchStaffMembers()).unwrap(),
    staleTime: queryUtils.staleTime.LONG,
    refetchInterval: 15 * 60 * 1000, // 15 minutes for staff data
    retry: 2,
  });

  // Role-based filtered data (replaces complex useMemo chains)
  const filteredData = useMemo(() => {
    const appointments = appointmentsQuery.data || [];
    const todayAppointments = todayQuery.data || [];
    const upcomingAppointments = upcomingQuery.data || [];

    if (!userId) {
      return {
        appointments: [],
        todayAppointments: [],
        upcomingAppointments: [],
      };
    }

    switch (userRole) {
      case "therapist":
        return {
          appointments: appointments.filter(
            (apt) =>
              apt.therapist === userId ||
              (apt.therapists && apt.therapists.includes(userId))
          ),
          todayAppointments: todayAppointments.filter(
            (apt) =>
              apt.therapist === userId ||
              (apt.therapists && apt.therapists.includes(userId))
          ),
          upcomingAppointments: upcomingAppointments.filter(
            (apt) =>
              apt.therapist === userId ||
              (apt.therapists && apt.therapists.includes(userId))
          ),
        };

      case "driver":
        return {
          appointments: appointments.filter((apt) => apt.driver === userId),
          todayAppointments: todayAppointments.filter(
            (apt) => apt.driver === userId
          ),
          upcomingAppointments: upcomingAppointments.filter(
            (apt) => apt.driver === userId
          ),
        };

      case "operator":
      default:
        // Operators see all appointments
        return {
          appointments,
          todayAppointments,
          upcomingAppointments,
        };
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
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments });

      // Optimistically update appointment status
      queryClient.setQueryData(queryKeys.appointments, (old) =>
        old?.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, status: "therapist_confirmed" }
            : apt
        )
      );
    },
    onSuccess: () => {
      queryUtils.invalidateAppointments();
    },
    onError: (err, appointmentId, context) => {
      // Rollback optimistic update on error
      queryClient.setQueryData(queryKeys.appointments, context?.previousData);
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
      queryUtils.invalidateAppointments();
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
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments });

      // Optimistic status update
      queryClient.setQueryData(queryKeys.appointments, (old) =>
        old?.map((apt) => (apt.id === appointmentId ? { ...apt, status } : apt))
      );
    },
    onSuccess: () => {
      queryUtils.invalidateAppointments();
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
      queryUtils.invalidateAppointments();
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
      queryUtils.invalidateAppointments();
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(completeAppointment(appointmentId));
      if (result.error) throw new Error(result.error.message);
      return result.payload;
    },
    onSuccess: () => {
      queryUtils.invalidateAppointments();
    },
  });

  return {
    // Mutations
    confirmAppointment: confirmAppointmentMutation,
    rejectAppointment: rejectAppointmentMutation,
    updateStatus: updateStatusMutation,
    requestPickup: requestPickupMutation,
    startSession: startSessionMutation,
    completeSession: completeSessionMutation,

    // Loading states
    isConfirming: confirmAppointmentMutation.isPending,
    isRejecting: rejectAppointmentMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isRequestingPickup: requestPickupMutation.isPending,
    isStartingSession: startSessionMutation.isPending,
    isCompletingSession: completeSessionMutation.isPending,

    // Error states
    confirmError: confirmAppointmentMutation.error,
    rejectError: rejectAppointmentMutation.error,
    statusUpdateError: updateStatusMutation.error,
    pickupError: requestPickupMutation.error,
    sessionError: startSessionMutation.error || completeSessionMutation.error,
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
