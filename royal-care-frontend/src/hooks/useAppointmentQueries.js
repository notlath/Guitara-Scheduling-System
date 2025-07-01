/**
 * TanStack Query hooks for appointments
 * Replaces complex manual caching with optimized queries
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  updateAppointment,
} from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";
import { isValidToken } from "../utils/authUtils";
import { invalidateAppointmentCaches } from "../utils/cacheInvalidation";
import { useWebSocketConnection } from "./useWebSocket";

/**
 * Hook for fetching all appointments with WebSocket integration
 * Replaces: optimizedDataManager.fetchDataType('appointments')
 */
export const useAppointments = (options = {}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();

  const query = useQuery({
    queryKey: queryKeys.appointments.all,
    queryFn: async () => {
      const result = await dispatch(fetchAppointments()).unwrap();
      return result;
    },
    enabled: isValidToken(),
    staleTime: 10 * 60 * 1000, // 10 minutes (your current appointments TTL)
    // More aggressive refetching when WebSocket is not connected
    refetchInterval: isConnected ? false : 60000, // 1 minute when offline
    ...options,
  });

  // Background refetch when WebSocket reconnects
  useEffect(() => {
    if (isConnected) {
      // Refetch data when WebSocket connects to sync any missed updates
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    }
  }, [isConnected, queryClient]);

  return query;
};

/**
 * Hook for fetching today's appointments with WebSocket integration
 * Replaces: optimizedDataManager.fetchDataType('todayAppointments')
 */
export const useTodayAppointments = (options = {}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();

  const query = useQuery({
    queryKey: queryKeys.appointments.today(),
    queryFn: async () => {
      const result = await dispatch(fetchTodayAppointments()).unwrap();
      return result;
    },
    enabled: isValidToken(),
    staleTime: 5 * 60 * 1000, // 5 minutes (your current todayAppointments TTL)
    refetchInterval: isConnected ? false : 300000, // 5 minutes when offline
    ...options,
  });

  // Background refetch when WebSocket reconnects
  useEffect(() => {
    if (isConnected) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.today(),
      });
    }
  }, [isConnected, queryClient]);

  return query;
};

/**
 * Hook for fetching upcoming appointments with WebSocket integration
 * Replaces: optimizedDataManager.fetchDataType('upcomingAppointments')
 */
export const useUpcomingAppointments = (options = {}) => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocketConnection();

  const query = useQuery({
    queryKey: queryKeys.appointments.upcoming(),
    queryFn: async () => {
      const result = await dispatch(fetchUpcomingAppointments()).unwrap();
      return result;
    },
    enabled: isValidToken(),
    staleTime: 10 * 60 * 1000, // 10 minutes (your current upcomingAppointments TTL)
    refetchInterval: isConnected ? false : 60000, // 1 minute when offline
    ...options,
  });

  // Background refetch when WebSocket reconnects
  useEffect(() => {
    if (isConnected) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.upcoming(),
      });
    }
  }, [isConnected, queryClient]);

  return query;
};

/**
 * Hook for creating appointments with optimistic updates
 *
 * 🔥 BEFORE: Complex manual form submission with 100+ lines of error handling
 * 🎉 AFTER: Automatic optimistic updates, error handling, and cache management
 */
export const useCreateAppointment = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { send, isConnected } = useWebSocketConnection();

  return useMutation({
    mutationFn: async (appointmentData) => {
      const result = await dispatch(
        createAppointment(appointmentData)
      ).unwrap();
      return result;
    },

    // Optimistic updates - UI updates immediately
    onMutate: async (newAppointment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });
      await queryClient.cancelQueries({
        queryKey: queryKeys.appointments.today(),
      });

      // Snapshot previous values
      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.all
      );
      const previousTodayAppointments = queryClient.getQueryData(
        queryKeys.appointments.today()
      );

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.appointments.all, (old) =>
        old
          ? [...old, { ...newAppointment, id: "temp-" + Date.now() }]
          : [newAppointment]
      );

      // If it's today's appointment, update today's cache too
      const today = new Date().toISOString().split("T")[0];
      if (newAppointment.date === today) {
        queryClient.setQueryData(queryKeys.appointments.today(), (old) =>
          old ? [...old, newAppointment] : [newAppointment]
        );
      }

      return { previousAppointments, previousTodayAppointments };
    },

    // Rollback on error
    onError: (err, newAppointment, context) => {
      queryClient.setQueryData(
        queryKeys.appointments.all,
        context.previousAppointments
      );
      queryClient.setQueryData(
        queryKeys.appointments.today(),
        context.previousTodayAppointments
      );
    },

    // Refetch on success to ensure consistency and notify via WebSocket
    onSuccess: async (result) => {
      // Use comprehensive cache invalidation that includes operator-specific queries
      await invalidateAppointmentCaches(queryClient, {
        userRole: "operator", // Invalidate operator-specific caches
        invalidateAll: true, // Comprehensive invalidation for new appointments
      });

      // Also invalidate availability queries (they might have changed)
      queryClient.invalidateQueries({
        queryKey: ["availableTherapists"],
        refetchType: "active", // Only refetch active queries
      });
      queryClient.invalidateQueries({
        queryKey: ["availableDrivers"],
        refetchType: "active",
      });

      // 🔥 IMPORTANT: Invalidate inventory cache when appointment is created
      // This ensures inventory UI shows updated stock levels after material deduction
      queryClient.invalidateQueries({
        queryKey: ["inventory-items"],
        refetchType: "active",
      });

      // Notify other clients via WebSocket
      if (isConnected && result?.id) {
        send({
          type: "appointment_created",
          appointment_id: result.id,
          timestamp: Date.now(),
        });
      }
    },
  });
};

/**
 * Hook for updating appointments with optimistic updates
 * Replaces: Manual dispatch and cache management
 */
export const useUpdateAppointment = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await dispatch(updateAppointment({ id, data })).unwrap();
      return result;
    },

    // Optimistic updates for editing
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.all
      );

      // Optimistically update the appointment
      queryClient.setQueryData(queryKeys.appointments.all, (old) =>
        old ? old.map((apt) => (apt.id === id ? { ...apt, ...data } : apt)) : []
      );

      return { previousAppointments };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.appointments.all,
        context.previousAppointments
      );
    },

    onSuccess: async () => {
      // Use comprehensive cache invalidation that includes operator-specific queries
      await invalidateAppointmentCaches(queryClient, {
        userRole: "operator", // Invalidate operator-specific caches
        invalidateAll: true, // Comprehensive invalidation for updated appointments
      });
      
      // Also invalidate inventory cache in case materials were updated
      queryClient.invalidateQueries({
        queryKey: ["inventory-items"],
        refetchType: "active",
      });
    },
  });
};

/**
 * Hook for deleting appointments
 */
export const useDeleteAppointment = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId) => {
      const result = await dispatch(deleteAppointment(appointmentId)).unwrap();
      return result;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.all
      );

      // Optimistically remove
      queryClient.setQueryData(queryKeys.appointments.all, (old) =>
        old ? old.filter((apt) => apt.id !== appointmentId) : []
      );

      return { previousAppointments };
    },
    onError: (err, appointmentId, context) => {
      queryClient.setQueryData(
        queryKeys.appointments.all,
        context.previousAppointments
      );
    },
    onSuccess: async () => {
      // Use comprehensive cache invalidation that includes operator-specific queries
      await invalidateAppointmentCaches(queryClient, {
        userRole: "operator", // Invalidate operator-specific caches
        invalidateAll: true, // Comprehensive invalidation for deleted appointments
      });
    },
  });
};

/**
 * Combined hook for dashboard data - MOVED TO useEnhancedDashboardData.js
 *
 * This original implementation has been replaced with a more comprehensive version
 * that includes mutations, better error handling, and real-time updates.
 *
 * See exports at the end of this file for the new enhanced version.
 */
// Original useDashboardData moved to useEnhancedDashboardData.js

// Import the enhanced dashboard data hooks to replace the simple version
export {
  useDashboardMutations,
  useRealtimeDashboardData,
} from "./useEnhancedDashboardData";

// Re-export enhanced version as useDashboardData
export { useEnhancedDashboardData as useDashboardData } from "./useEnhancedDashboardData";
