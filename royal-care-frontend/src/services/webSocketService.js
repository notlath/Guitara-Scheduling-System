/**
 * WebSocket service for real-time appointment updates
 * ✅ ENABLED - Now properly configured for production and development
 */

class WebSocketService extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.heartbeatInterval = null;
    this.connectionStatus = "disconnected";

    // Clear any disabled flags
    this.clearDisabledState();
  }

  clearDisabledState() {
    try {
      sessionStorage.removeItem("wsConnectionDisabled");
    } catch {
      console.log("Could not clear session storage");
    }
  }

  connect(token) {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      console.log("WebSocket already connecting or connected");
      return;
    }

    if (!token) {
      console.log("No authentication token provided for WebSocket connection");
      return;
    }

    this.isConnecting = true;
    this.notifyStatusChange("connecting");
    console.log("🔌 Connecting to WebSocket with authentication...");

    try {
      let wsUrl;

      if (import.meta.env.PROD) {
        // Production WebSocket URL
        wsUrl = `wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/?token=${encodeURIComponent(
          token
        )}`;
      } else {
        // Development WebSocket URL
        wsUrl = `ws://localhost:8000/ws/scheduling/appointments/?token=${encodeURIComponent(
          token
        )}`;
      }

      console.log(
        "🔗 WebSocket URL:",
        wsUrl.replace(encodeURIComponent(token), "***TOKEN***")
      );
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionStatus = "connected";
        this.notifyStatusChange("connected");
        this.startHeartbeat();
        this.dispatchEvent(new CustomEvent("connected"));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", data.type, data);

          // Dispatch specific events based on message type
          this.dispatchEvent(new CustomEvent(data.type, { detail: data }));

          // Also dispatch a generic message event
          this.dispatchEvent(new CustomEvent("message", { detail: data }));
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.isConnecting = false;
        this.connectionStatus = "error";
        this.notifyStatusChange("error");
        this.dispatchEvent(new CustomEvent("error", { detail: error }));
      };

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason);
        this.isConnecting = false;
        this.connectionStatus = "disconnected";
        this.stopHeartbeat();
        this.notifyStatusChange("disconnected");
        this.dispatchEvent(new CustomEvent("disconnected", { detail: event }));

        // Schedule reconnection for unexpected closures
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect(token);
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.isConnecting = false;
      this.connectionStatus = "error";
      this.notifyStatusChange("error");
    }
  }

  scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect(token);
      }
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat", timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    if (this.ws) {
      console.log("🔌 Disconnecting WebSocket...");
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
    this.stopHeartbeat();
    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else {
      console.warn("WebSocket is not connected - cannot send message");
      return false;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  notifyStatusChange(status) {
    this.connectionStatus = status;
    window.dispatchEvent(
      new CustomEvent("websocket-status", { detail: { status } })
    );
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Function to re-enable WebSocket connections (for future use)
export const enableWebSocketConnections = () => {
  try {
    sessionStorage.removeItem("wsConnectionDisabled");
    console.log("WebSocket connections re-enabled");
  } catch {
    console.log("Could not clear WebSocket disabled state from sessionStorage");
  }
};

// Main WebSocket setup function - now enabled
export const setupWebSocket = (token) => {
  console.log("✅ Setting up WebSocket connection...");

  if (token) {
    webSocketService.connect(token);
  } else {
    console.log("No token provided for WebSocket setup");
  }

  // Return cleanup function
  return () => {
    webSocketService.disconnect();
  };
};

// Function to send appointment update via WebSocket
export const sendAppointmentUpdate = (appointmentData) => {
  return webSocketService.send({
    type: "appointment_update",
    data: appointmentData,
  });
};

// Function to send new appointment notification via WebSocket
export const sendAppointmentCreate = (appointmentData) => {
  return webSocketService.send({
    type: "appointment_create",
    data: appointmentData,
  });
};

// Function to send appointment deletion notification via WebSocket
export const sendAppointmentDelete = (appointmentId) => {
  return webSocketService.send({
    type: "appointment_delete",
    appointment_id: appointmentId,
  });
};

// Function to check WebSocket connection status
export const isWebSocketConnected = () => {
  return webSocketService.isConnected();
};

// Export the singleton service as default
export default webSocketService;
