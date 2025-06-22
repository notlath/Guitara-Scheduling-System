/**
 * WebSocket Service with TanStack Query Integration
 * Provides real-time updates for scheduling data with automatic cache synchronization
 */

import { useEffect, useState } from "react";
import { queryClient } from "../lib/queryClient";
import { getToken } from "../utils/tokenManager";

class WebSocketTanStackService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.connectionStatus = "disconnected";
    this.eventListeners = new Set();
    this.messageQueue = [];
    this.isConnecting = false;

    // Track connection across page navigation
    this.persistentConnection = true;

    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token = null) {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;
    this.notifyStatusChange("connecting");

    try {
      // Get auth token from localStorage if not provided
      const authToken = token || getToken();

      // Build WebSocket URL with authentication
      const wsUrl =
        import.meta.env.VITE_WS_URL ||
        "ws://localhost:8000/ws/scheduling/appointments/";
      const wsUrlWithAuth = authToken
        ? `${wsUrl}?token=${encodeURIComponent(authToken)}`
        : wsUrl;

      this.ws = new WebSocket(wsUrlWithAuth);

      // Set up event listeners
      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = this.handleError;
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.isConnecting = false;
      this.notifyStatusChange("error");
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection opened
   */
  handleOpen() {
    console.log("✅ WebSocket connected successfully");
    this.connectionStatus = "connected";
    this.reconnectAttempts = 0;
    this.isConnecting = false;

    this.notifyStatusChange("connected");
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();
  }

  /**
   * Handle incoming WebSocket messages and update TanStack Query cache
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 WebSocket message received:", data);

      // Handle different message types
      switch (data.type) {
        case "appointment_create":
          this.handleAppointmentCreate(data.message);
          break;
        case "appointment_update":
          this.handleAppointmentUpdate(data.message);
          break;
        case "appointment_delete":
          this.handleAppointmentDelete(data.message);
          break;
        case "availability_update":
          this.handleAvailabilityUpdate(data.message);
          break;
        case "heartbeat":
          this.handleHeartbeat(data.message);
          break;
        case "driver_assigned":
          this.handleDriverAssigned(data.message);
          break;
        case "therapist_acceptance":
          this.handleTherapistAcceptance(data.message);
          break;
        default:
          console.log("Unknown WebSocket message type:", data.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  /**
   * Handle appointment creation - update TanStack Query cache
   */
  handleAppointmentCreate(appointment) {
    // Update global appointments list
    queryClient.setQueryData(["appointments"], (old = []) => {
      // Prevent duplicates
      if (old.find((a) => a.id === appointment.id)) return old;
      return [appointment, ...old];
    });

    // Update today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (appointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], (old = []) => {
        if (old.find((a) => a.id === appointment.id)) return old;
        return [appointment, ...old];
      });
    }

    // Update per-date queries
    queryClient.setQueryData(
      ["appointments", "date", appointment.date],
      (old = []) => {
        if (old.find((a) => a.id === appointment.id)) return old;
        return [appointment, ...old];
      }
    );

    // Update therapist dashboard queries
    if (appointment.therapist_id) {
      queryClient.setQueryData(
        ["appointments", "therapist", appointment.therapist_id],
        (old = []) => {
          if (old.find((a) => a.id === appointment.id)) return old;
          return [appointment, ...old];
        }
      );
    }

    // Update driver dashboard queries
    if (appointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", appointment.driver_id],
        (old = []) => {
          if (old.find((a) => a.id === appointment.id)) return old;
          return [appointment, ...old];
        }
      );
    }

    // Invalidate related queries to trigger refetch (for filtered lists, etc.)
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "today"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "date"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "therapist"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "driver"] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  }

  /**
   * Handle appointment update - update TanStack Query cache
   */
  handleAppointmentUpdate(updatedAppointment) {
    // Update global appointments list
    queryClient.setQueryData(["appointments"], (old = []) =>
      old.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a))
    );

    // Update today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (updatedAppointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], (old = []) =>
        old.map((a) =>
          a.id === updatedAppointment.id ? updatedAppointment : a
        )
      );
    }

    // Update per-date queries
    queryClient.setQueryData(
      ["appointments", "date", updatedAppointment.date],
      (old = []) =>
        old.map((a) =>
          a.id === updatedAppointment.id ? updatedAppointment : a
        )
    );

    // Update therapist dashboard queries
    if (updatedAppointment.therapist_id) {
      queryClient.setQueryData(
        ["appointments", "therapist", updatedAppointment.therapist_id],
        (old = []) =>
          old.map((a) =>
            a.id === updatedAppointment.id ? updatedAppointment : a
          )
      );
    }

    // Update driver dashboard queries
    if (updatedAppointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", updatedAppointment.driver_id],
        (old = []) =>
          old.map((a) =>
            a.id === updatedAppointment.id ? updatedAppointment : a
          )
      );
    }

    // Invalidate related queries to trigger refetch (for filtered lists, etc.)
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "today"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "date"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "therapist"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "driver"] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  }

  /**
   * Handle appointment deletion - update TanStack Query cache
   */
  handleAppointmentDelete(deletedAppointment) {
    // Remove from global appointments list
    queryClient.setQueryData(["appointments"], (old = []) =>
      old.filter((a) => a.id !== deletedAppointment.id)
    );

    // Remove from today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (deletedAppointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], (old = []) =>
        old.filter((a) => a.id !== deletedAppointment.id)
      );
    }

    // Remove from per-date queries
    queryClient.setQueryData(
      ["appointments", "date", deletedAppointment.date],
      (old = []) => old.filter((a) => a.id !== deletedAppointment.id)
    );

    // Remove from therapist dashboard queries
    if (deletedAppointment.therapist_id) {
      queryClient.setQueryData(
        ["appointments", "therapist", deletedAppointment.therapist_id],
        (old = []) => old.filter((a) => a.id !== deletedAppointment.id)
      );
    }

    // Remove from driver dashboard queries
    if (deletedAppointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", deletedAppointment.driver_id],
        (old = []) => old.filter((a) => a.id !== deletedAppointment.id)
      );
    }

    // Invalidate related queries to trigger refetch (for filtered lists, etc.)
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "today"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "date"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "therapist"] });
    queryClient.invalidateQueries({ queryKey: ["appointments", "driver"] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  }

  /**
   * Handle availability updates
   */
  handleAvailabilityUpdate() {
    // Invalidate all availability queries to trigger fresh data
    queryClient.invalidateQueries({ queryKey: ["availability"] });
    queryClient.invalidateQueries({ queryKey: ["therapists", "available"] });
    queryClient.invalidateQueries({ queryKey: ["drivers", "available"] });

    console.log("✅ Availability updated - cache invalidated");
  }

  /**
   * Handle driver assignment
   */
  handleDriverAssigned(data) {
    // Update the specific appointment with driver assignment
    const updateWithDriver = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              driver_id: data.driver_id,
              driver_name: data.driver_name,
              status: data.status,
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithDriver);
    queryClient.setQueryData(["appointments", "today"], updateWithDriver);
    queryClient.setQueryData(["appointments", "upcoming"], updateWithDriver);

    console.log("✅ Driver assigned - cache updated");
  }

  /**
   * Handle therapist acceptance
   */
  handleTherapistAcceptance(data) {
    // Update appointment with acceptance status
    const updateWithAcceptance = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              therapist_accepted: data.therapist_accepted,
              driver_accepted: data.driver_accepted,
              both_accepted: data.both_accepted,
              status: data.status || appointment.status,
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithAcceptance);
    queryClient.setQueryData(["appointments", "today"], updateWithAcceptance);
    queryClient.setQueryData(
      ["appointments", "upcoming"],
      updateWithAcceptance
    );

    console.log("✅ Therapist acceptance updated - cache updated");
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat() {
    // Respond to heartbeat to keep connection alive
    this.send({ type: "heartbeat_response", timestamp: Date.now() });
  }

  /**
   * Handle WebSocket connection closed
   */
  handleClose(event) {
    console.log("🔌 WebSocket disconnected:", event.code, event.reason);
    this.connectionStatus = "disconnected";
    this.isConnecting = false;

    this.stopHeartbeat();
    this.notifyStatusChange("disconnected");

    // Attempt reconnection if not intentionally closed
    if (event.code !== 1000 && this.persistentConnection) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    console.error("❌ WebSocket error:", error);
    this.connectionStatus = "error";
    this.notifyStatusChange("error");
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      this.notifyStatusChange("error");
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    console.log(
      `🔄 Scheduling reconnection attempt ${
        this.reconnectAttempts + 1
      } in ${delay}ms`
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Send message to WebSocket server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      console.log("📤 Message queued (WebSocket not connected):", message);
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat", timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.persistentConnection = false;

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }

    this.stopHeartbeat();
    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");

    console.log("🔌 WebSocket disconnected by client");
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Notify status changes to components
   */
  notifyStatusChange(status) {
    this.connectionStatus = status;
    window.dispatchEvent(
      new CustomEvent("websocket-status", {
        detail: { status },
      })
    );
  }

  /**
   * Enable persistent connection across pages
   */
  enablePersistentConnection() {
    this.persistentConnection = true;
  }

  /**
   * Disable persistent connection
   */
  disablePersistentConnection() {
    this.persistentConnection = false;
  }
}

// Create singleton instance
const webSocketService = new WebSocketTanStackService();

// Export service and utility functions
export default webSocketService;

/**
 * Hook to get WebSocket connection status
 */
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState(webSocketService.getConnectionStatus());

  useEffect(() => {
    const handleStatusChange = (event) => {
      setStatus(event.detail.status);
    };

    window.addEventListener("websocket-status", handleStatusChange);
    return () =>
      window.removeEventListener("websocket-status", handleStatusChange);
  }, []);

  return status;
};

/**
 * Hook to initialize WebSocket connection in components
 */
export const useWebSocket = (autoConnect = true) => {
  useEffect(() => {
    if (autoConnect && !webSocketService.isConnected()) {
      webSocketService.connect();
    }

    // Cleanup on unmount (but keep connection alive for other components)
    return () => {
      // Don't disconnect - let other components use the connection
    };
  }, [autoConnect]);

  return {
    connect: webSocketService.connect,
    disconnect: webSocketService.disconnect,
    send: webSocketService.send,
    isConnected: webSocketService.isConnected(),
    status: webSocketService.getConnectionStatus(),
  };
};
