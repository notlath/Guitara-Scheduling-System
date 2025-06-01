/**
 * WebSocket service for real-time appointment updates
 * With graceful fallback when WebSocket connection is unavailable
 */
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5 to avoid excessive retries
let wsConnectionEnabled = true; // Flag to control whether we should try connecting

// Helper function to notify status changes
const notifyStatusChange = (status) => {
  window.dispatchEvent(
    new CustomEvent("websocket-status", {
      detail: { status },
    })
  );
};

export const setupWebSocket = ({ onAppointmentUpdate }) => {
  // Don't attempt to connect if we've already determined WebSockets are unavailable
  if (!wsConnectionEnabled) {
    console.log("WebSocket connections are disabled due to previous failures");
    notifyStatusChange("disabled");
    return () => {}; // Return empty cleanup function
  }

  // Close any existing connection
  if (ws) {
    try {
      ws.onclose = null; // Prevent reconnect attempts
      ws.close();
    } catch (err) {
      console.log("Error closing existing WebSocket:", err);
    }
  }

  // Reset reconnect attempts when explicitly setting up a new connection
  reconnectAttempts = 0;

  const connectWebSocket = () => {
    if (!wsConnectionEnabled) return null;

    try {
      // Notify that we're trying to connect
      notifyStatusChange("connecting");

      // Create a new WebSocket connection
      const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
      // Safely access environment variables; in Vite, import.meta.env is used instead of process.env
      // Default to development environment if not defined
      const NODE_ENV = import.meta?.env?.NODE_ENV || "development";
      const REACT_APP_BACKEND_WS_URL =
        import.meta?.env?.REACT_APP_BACKEND_WS_URL || "";

      const wsHost =
        REACT_APP_BACKEND_WS_URL ||
        (NODE_ENV === "production"
          ? window.location.host // Use the deployed host in production
          : "localhost:8000"); // Use localhost in development

      // Get authentication token from localStorage and strip any prefix
      let token = localStorage.getItem("knoxToken");
      if (!token) {
        console.error(
          "No authentication token found. Cannot establish WebSocket connection."
        );
        notifyStatusChange("error");
        return null; // Return early if no token
      }

      // Strip prefix if stored as 'Token <token>'
      if (token.startsWith("Token ")) {
        token = token.split(" ")[1];
      }

      if (!token) {
        console.error(
          "Invalid authentication token format. Cannot establish WebSocket connection."
        );
        notifyStatusChange("error");
        return null; // Return early if no token after stripping prefix
      }

      // Include token in WebSocket URL for authentication
      const wsUrl = `${wsScheme}://${wsHost}/ws/scheduling/appointments/?token=${token}`;
      console.log("Attempting WebSocket connection to:", wsUrl);

      // Create socket with error handling
      ws = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      ws.onopen = () => {
        console.log("WebSocket connection established");
        notifyStatusChange("connected");
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          switch (data.type) {
            case "appointment_update":
              console.log("Appointment updated:", data);
              onAppointmentUpdate && onAppointmentUpdate(data);
              break;

            case "appointment_create":
              console.log("New appointment created:", data);
              onAppointmentUpdate && onAppointmentUpdate(data);
              break;

            case "appointment_delete":
              console.log("Appointment deleted:", data);
              onAppointmentUpdate && onAppointmentUpdate(data);
              break;

            default:
              console.log("Unknown message type:", data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        notifyStatusChange("disconnected");

        // Do not attempt to reconnect if closed normally or if explicitly told not to
        // or if maximum attempts reached
        if (
          event.code === 1000 || // Normal closure
          reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
        ) {
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(
              "Maximum reconnection attempts reached. WebSocket connections disabled."
            );
            wsConnectionEnabled = false; // Disable further connection attempts
            notifyStatusChange("disabled");
          }
          return;
        }

        // Check if we have an authentication token
        const token = localStorage.getItem("knoxToken");
        if (!token) {
          console.error(
            "Authentication failed: No token available. Please log in."
          );
          return; // Don't attempt to reconnect if no token is available
        }

        // Use exponential backoff for reconnect attempts
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10s
        reconnectAttempts++;

        console.log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${
            delay / 1000
          } seconds...`
        );

        setTimeout(() => {
          try {
            connectWebSocket();
          } catch (error) {
            console.error("Error during reconnection attempt:", error);
          }
        }, delay);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        notifyStatusChange("error");
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      notifyStatusChange("error");
    }
  };

  // Initial connection attempt
  connectWebSocket();

  // Return a cleanup function
  return () => {
    if (ws) {
      try {
        // Prevent reconnection attempts when deliberately closing
        ws.onclose = null;
        ws.close(1000, "Component unmounted");
        ws = null;
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }
    }
  };
};

// Function to send appointment update via WebSocket
export const sendAppointmentUpdate = (appointmentId) => {
  if (!wsConnectionEnabled) return; // Skip if disabled
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(
        JSON.stringify({
          type: "appointment_update",
          appointment_id: appointmentId,
        })
      );
    } catch (error) {
      console.error("Error sending appointment update:", error);
    }
  } else {
    console.log("WebSocket not connected - skipping real-time update");
  }
};

// Function to send new appointment notification via WebSocket
export const sendAppointmentCreate = (appointmentId) => {
  if (!wsConnectionEnabled) return; // Skip if disabled
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(
        JSON.stringify({
          type: "appointment_create",
          appointment_id: appointmentId,
        })
      );
    } catch (error) {
      console.error("Error sending appointment create event:", error);
    }
  } else {
    console.log(
      "WebSocket not connected - skipping real-time create notification"
    );
  }
};

// Function to send appointment deletion notification via WebSocket
export const sendAppointmentDelete = (appointmentId) => {
  if (!wsConnectionEnabled) return; // Skip if disabled
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(
        JSON.stringify({
          type: "appointment_delete",
          appointment_id: appointmentId,
        })
      );
    } catch (error) {
      console.error("Error sending appointment delete event:", error);
    }
  } else {
    console.log(
      "WebSocket not connected - skipping real-time delete notification"
    );
  }
};

// Function to check WebSocket connection status
export const isWebSocketConnected = () => {
  return ws && ws.readyState === WebSocket.OPEN;
};
