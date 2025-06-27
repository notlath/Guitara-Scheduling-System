import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import webSocketService from "../services/webSocketService";
import { handleWebSocketUpdate } from "../utils/cacheInvalidation";

export const useWebSocketCacheSync = (externalWebSocketService = null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Use the external service if provided, otherwise use the singleton
    const wsService = externalWebSocketService || webSocketService;

    // Always use the WebSocket service (no fallback mode)
    if (wsService) {
      const token = localStorage.getItem("knoxToken");
      if (!token) {
        console.log(
          "No authentication token found - cannot connect WebSocket service"
        );
        return;
      }

      // Clear any disabled flags from session storage
      sessionStorage.removeItem("wsConnectionDisabled");

      // Connect the service if not already connected
      if (!wsService.isConnected()) {
        console.log("🔌 Connecting WebSocket service...");
        wsService.connect(token);
      }

      // Handle WebSocket messages for cache updates
      const handleWebSocketMessage = (event) => {
        const data = event.detail || event;
        console.log(
          "📨 WebSocket service event received:",
          data.type || event.type
        );

        // Update TanStack Query cache with the received data
        try {
          handleWebSocketUpdate(queryClient, data);
        } catch (error) {
          console.error("Error handling WebSocket cache update:", error);
        }
      };

      // Listen for all relevant WebSocket events
      const events = [
        "appointment_created",
        "appointment_updated",
        "appointment_deleted",
        "appointment_status_changed",
        "therapist_response",
        "driver_response",
        "message",
        "connected",
        "disconnected",
        "error",
      ];

      // Add event listeners to the service
      events.forEach((event) => {
        wsService.addEventListener(event, handleWebSocketMessage);
      });

      return () => {
        // Remove event listeners on cleanup
        events.forEach((event) => {
          wsService.removeEventListener(event, handleWebSocketMessage);
        });
      };
    } else {
      console.warn(
        "No WebSocket service provided - skipping WebSocket cache sync"
      );
      return;
    }
  }, [externalWebSocketService, queryClient]);
};

/**
 * Alternative hook for direct WebSocket message handling
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
