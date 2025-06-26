/**
 * WebSocket Integration Hook for TanStack Query Cache Synchronization
 *
 * This hook integrates with your existing WebSocket service to automatically
 * invalidate TanStack Query cache when real-time updates are received.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { handleWebSocketUpdate } from "../utils/cacheInvalidation";

/**
 * Hook to sync WebSocket updates with TanStack Query cache
 * Use this in your main App component or dashboard components
 */
export const useWebSocketCacheSync = (webSocketService) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!webSocketService) return;

    // Handle appointment updates from WebSocket
    const handleAppointmentUpdate = (data) => {
      console.log("📡 WebSocket update received:", data);
      handleWebSocketUpdate(queryClient, data);
    };

    // Handle therapist/driver responses
    const handleUserResponse = (data) => {
      console.log("📡 User response received:", data);
      handleWebSocketUpdate(queryClient, {
        type: "therapist_response",
        appointment: data.appointment,
        user_id: data.user_id,
        role: data.role,
      });
    };

    // Subscribe to WebSocket events
    webSocketService.addEventListener(
      "appointment_created",
      handleAppointmentUpdate
    );
    webSocketService.addEventListener(
      "appointment_updated",
      handleAppointmentUpdate
    );
    webSocketService.addEventListener(
      "appointment_deleted",
      handleAppointmentUpdate
    );
    webSocketService.addEventListener("therapist_response", handleUserResponse);
    webSocketService.addEventListener("driver_response", handleUserResponse);

    // Cleanup
    return () => {
      webSocketService.removeEventListener(
        "appointment_created",
        handleAppointmentUpdate
      );
      webSocketService.removeEventListener(
        "appointment_updated",
        handleAppointmentUpdate
      );
      webSocketService.removeEventListener(
        "appointment_deleted",
        handleAppointmentUpdate
      );
      webSocketService.removeEventListener(
        "therapist_response",
        handleUserResponse
      );
      webSocketService.removeEventListener(
        "driver_response",
        handleUserResponse
      );
    };
  }, [webSocketService, queryClient]);
};

/**
 * Alternative hook for direct WebSocket message handling
 * Use this if you're handling WebSocket messages directly
 */
export const useDirectWebSocketSync = () => {
  const queryClient = useQueryClient();

  const handleWebSocketMessage = (message) => {
    try {
      const data = typeof message === "string" ? JSON.parse(message) : message;
      handleWebSocketUpdate(queryClient, data);
    } catch (error) {
      console.error("Failed to handle WebSocket message:", error);
    }
  };

  return { handleWebSocketMessage };
};

/**
 * Hook for manual cache invalidation triggered by external events
 * Use this for custom integration points
 */
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateAppointments = async (options = {}) => {
    const { invalidateAppointmentCaches } = await import(
      "../utils/cacheInvalidation"
    );
    return invalidateAppointmentCaches(queryClient, options);
  };

  const invalidateByStatus = async (status, options = {}) => {
    const { invalidateByStatus } = await import("../utils/cacheInvalidation");
    return invalidateByStatus(queryClient, status, options);
  };

  const applyOptimisticUpdate = async (appointmentId, updateData) => {
    const { optimisticUpdate } = await import("../utils/cacheInvalidation");
    return optimisticUpdate(queryClient, appointmentId, updateData);
  };

  return {
    invalidateAppointments,
    invalidateByStatus,
    applyOptimisticUpdate,
    queryClient,
  };
};

export default {
  useWebSocketCacheSync,
  useDirectWebSocketSync,
  useCacheInvalidation,
};
