import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { handleWebSocketUpdate } from "../utils/cacheInvalidation";

export const useWebSocketCacheSync = (webSocketService) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!webSocketService) {
      // Fallback: create a default WebSocket connection if not provided
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsBase =
        import.meta.env.VITE_WS_BASE_URL ||
        wsProtocol + "://" + window.location.host + "/ws/appointments/";
      const ws = new window.WebSocket(wsBase);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketUpdate(queryClient, data);
        } catch (err) {
          // Optionally log or handle error
        }
      };

      return () => {
        ws.close();
      };
    } else {
      // Use provided webSocketService (must support addEventListener)
      const handleAppointmentUpdate = (data) => {
        handleWebSocketUpdate(queryClient, data);
      };
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
      webSocketService.addEventListener(
        "appointment_status_changed",
        handleAppointmentUpdate
      );
      webSocketService.addEventListener(
        "therapist_response",
        handleAppointmentUpdate
      );
      webSocketService.addEventListener(
        "driver_response",
        handleAppointmentUpdate
      );

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
          "appointment_status_changed",
          handleAppointmentUpdate
        );
        webSocketService.removeEventListener(
          "therapist_response",
          handleAppointmentUpdate
        );
        webSocketService.removeEventListener(
          "driver_response",
          handleAppointmentUpdate
        );
      };
    }
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
