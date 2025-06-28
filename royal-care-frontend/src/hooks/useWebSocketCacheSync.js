import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { handleWebSocketUpdate } from "../utils/cacheInvalidation";

export const useWebSocketCacheSync = (webSocketService) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only set up event listeners if webSocketService is provided
    if (!webSocketService) {
      // Clear any disabled flags from session storage
      sessionStorage.removeItem("wsConnectionDisabled");

      // Get authentication token
      const token = localStorage.getItem("knoxToken");
      if (!token) {
        console.log(
          "No authentication token found - skipping WebSocket connection"
        );
        return;
      }

      // Create authenticated WebSocket connection
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsBase =
        import.meta.env.VITE_WS_BASE_URL ||
        wsProtocol +
          "://" +
          window.location.host +
          "/ws/scheduling/appointments/";

      // Add token to WebSocket URL as query parameter (Django Channels auth method)
      const wsUrl = `${wsBase}?token=${encodeURIComponent(token)}`;

      console.log(
        "🔌 Creating fallback WebSocket connection with authentication"
      );
      const ws = new window.WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("✅ Fallback WebSocket connected successfully");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", data.type);
          handleWebSocketUpdate(queryClient, data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason);
        if (event.code === 1006) {
          console.log(
            "WebSocket closed abnormally - likely authentication issue"
          );
        }
      };

      return () => {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      };
    } else {
      // Use provided webSocketService with proper event handling
      const handleAppointmentUpdate = (event) => {
        const data = event.detail || event;
        console.log(
          "📨 WebSocket service event received:",
          data.type || event.type
        );
        handleWebSocketUpdate(queryClient, data);
      };

      const events = [
        "appointment_created",
        "appointment_updated",
        "appointment_deleted",
        "appointment_status_changed",
        "therapist_response",
        "driver_response",
        "message", // Generic message event
      ];

      // Add event listeners
      events.forEach((event) => {
        webSocketService.addEventListener(event, handleAppointmentUpdate);
      });

      return () => {
        // Remove event listeners
        events.forEach((event) => {
          webSocketService.removeEventListener(event, handleAppointmentUpdate);
        });
      };
    }
  }, [webSocketService, queryClient]);
};

/**
 * Convenience hook that automatically uses the WebSocket service from context
 * Use this in components instead of calling useWebSocketCacheSync() without parameters
 */
export const useAutoWebSocketCacheSync = () => {
  const { webSocketService } = useWebSocket();
  return useWebSocketCacheSync(webSocketService);
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
  useAutoWebSocketCacheSync,
  useDirectWebSocketSync,
  useCacheInvalidation,
};
