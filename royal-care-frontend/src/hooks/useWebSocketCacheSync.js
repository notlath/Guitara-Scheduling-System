import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { handleWebSocketUpdate } from "../utils/cacheInvalidation";

export const useWebSocketCacheSync = (webSocketService) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only set up event listeners if webSocketService is provided
    if (!webSocketService) {
      console.warn(
        "useWebSocketCacheSync: No webSocketService provided. WebSocket cache sync disabled."
      );
      return;
    }

    // ✅ ENHANCED: Use proper cache invalidation with therapist-specific query keys
    console.log(
      "🔌 Setting up WebSocket cache sync with enhanced invalidation"
    );

    const handleAppointmentUpdate = (data) => {
      console.log("📨 WebSocket cache sync received event:", data);
      // Use the enhanced handleWebSocketUpdate function that properly handles therapist caches
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
    webSocketService.addEventListener(
      "session_started",
      handleAppointmentUpdate
    );
    webSocketService.addEventListener(
      "awaiting_payment",
      handleAppointmentUpdate
    );
    webSocketService.addEventListener(
      "appointment_started",
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
      webSocketService.removeEventListener(
        "session_started",
        handleAppointmentUpdate
      );
      webSocketService.removeEventListener(
        "awaiting_payment",
        handleAppointmentUpdate
      );
      webSocketService.removeEventListener(
        "appointment_started",
        handleAppointmentUpdate
      );
    };
  }, [webSocketService, queryClient]);
};

/**
 * Convenience hook that automatically uses the WebSocket service from context
 * Use this in components instead of calling useWebSocketCacheSync() without parameters
 */
export const useAutoWebSocketCacheSync = () => {
  const queryClient = useQueryClient();
  const [webSocketService, setWebSocketService] = useState(null);

  useEffect(() => {
    // Try to import WebSocket service directly for better reliability
    import("../services/webSocketTanStackService")
      .then((module) => {
        const directWebSocketService = module.default;
        setWebSocketService(directWebSocketService);
      })
      .catch((err) => {
        console.error("❌ Failed to import WebSocket service:", err);
      });
  }, []);

  useEffect(() => {
    if (webSocketService) {
      return setupWebSocketSync(webSocketService, queryClient);
    }
  }, [webSocketService, queryClient]);
};

// Helper function to set up WebSocket sync
const setupWebSocketSync = (webSocketService, queryClient) => {
  console.log(
    "🔌 Setting up enhanced WebSocket cache sync for TherapistDashboard"
  );

  const handleAppointmentUpdate = (data) => {
    console.log("📨 WebSocket cache sync received event:", data);

    // ✅ ENHANCED: Force immediate cache invalidation for therapist queries
    const { appointment } = data;

    if (appointment) {
      // Get current user to invalidate their specific cache
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // Check if this appointment affects the current therapist
      const affectsCurrentUser =
        appointment.therapist_id === user.id ||
        appointment.therapist === user.id ||
        (Array.isArray(appointment.therapists) &&
          appointment.therapists.includes(user.id));

      if (affectsCurrentUser) {
        console.log(
          "🩺 Appointment affects current therapist, forcing cache refresh..."
        );

        // Force immediate invalidation and refetch
        queryClient.invalidateQueries({
          queryKey: ["appointments", "therapist", user.id],
          refetchType: "all",
        });

        // Also force refetch immediately
        queryClient.refetchQueries({
          queryKey: ["appointments", "therapist", user.id],
          type: "all",
        });
      }
    }

    // Use the enhanced handleWebSocketUpdate function
    handleWebSocketUpdate(queryClient, data);
  };

  // Set up all event listeners
  const eventTypes = [
    "appointment_created",
    "appointment_updated",
    "appointment_deleted",
    "appointment_status_changed",
    "therapist_response",
    "driver_response",
    "session_started",
    "awaiting_payment",
    "appointment_started",
  ];

  eventTypes.forEach((eventType) => {
    webSocketService.addEventListener(eventType, handleAppointmentUpdate);
  });

  // Return cleanup function
  return () => {
    eventTypes.forEach((eventType) => {
      webSocketService.removeEventListener(eventType, handleAppointmentUpdate);
    });
  };
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
      // Import here to avoid dependency issues
      import("../utils/cacheInvalidation").then(({ handleWebSocketUpdate }) => {
        handleWebSocketUpdate(queryClient, data);
      });
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
  useAutoWebSocketCacheSync,
  useDirectWebSocketSync,
  useCacheInvalidation,
};
