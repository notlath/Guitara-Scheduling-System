/**
 * WebSocket service for real-time appointment updates
 * With graceful fallback when WebSocket connection is unavailable
 */
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 2; // Further reduced to minimize failed attempts
let wsConnectionEnabled = true; // Flag to control whether we should try connecting

// Check for WebSocket support in the browser
const isWebSocketSupported = typeof WebSocket !== "undefined";

// Check if we previously disabled WebSocket connections in this session
const storedWsDisabled = sessionStorage.getItem("wsConnectionDisabled");
if (storedWsDisabled === "true") {
  console.log("WebSocket connections were previously disabled in this session");
  wsConnectionEnabled = false;
}

// Helper function to notify status changes
const notifyStatusChange = (status) => {
  window.dispatchEvent(
    new CustomEvent("websocket-status", {
      detail: { status },
    })
  );
};

// Helper function to disable WebSocket connections and remember it for this session
const disableWebSocketConnections = () => {
  wsConnectionEnabled = false;
  try {
    sessionStorage.setItem("wsConnectionDisabled", "true");
  } catch (err) {
    console.log("Could not store WebSocket disabled state in sessionStorage");
  }
  notifyStatusChange("disabled");
};

// Helper function to validate URL for WebSocket connection
const isValidWebSocketUrl = (url) => {
  try {
    // Check if URL is properly formatted
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "ws:" || parsedUrl.protocol === "wss:";
  } catch (error) {
    console.error("Invalid WebSocket URL:", error);
    return false;
  }
};

export const setupWebSocket = ({ onAppointmentUpdate }) => {
  // Don't attempt to connect if WebSockets aren't supported or have been disabled
  if (!wsConnectionEnabled) {
    console.log("WebSocket connections are disabled due to previous failures");
    notifyStatusChange("disabled");
    return () => {}; // Return empty cleanup function
  }

  // Check browser WebSocket support
  if (typeof WebSocket === "undefined") {
    console.log("WebSockets are not supported in this browser");
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
      const NODE_ENV = import.meta?.env?.NODE_ENV || "development";
      const REACT_APP_BACKEND_WS_URL =
        import.meta?.env?.REACT_APP_BACKEND_WS_URL || "";

      // For development mode, add special handling for common local dev servers
      let wsHost;
      if (NODE_ENV === "development") {
        // Default localhost port for development
        wsHost = "localhost:8000";

        // Check if we're running on alternate local dev ports (Vite uses 5173 by default)
        if (
          window.location.port === "5173" ||
          window.location.port === "5174"
        ) {
          console.log(
            `Dev server detected on port ${window.location.port}, using default WebSocket backend`
          );
        }
      } else {
        // Production mode - use the actual host or configured backend URL
        wsHost = REACT_APP_BACKEND_WS_URL || window.location.host;
      }

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

      // Validate the WebSocket URL before attempting connection
      if (!isValidWebSocketUrl(wsUrl)) {
        console.error("Invalid WebSocket URL format:", wsUrl);
        notifyStatusChange("error");
        disableWebSocketConnections();
        return null;
      }

      console.log("Attempting WebSocket connection to:", wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timed out");
          ws.close();
          notifyStatusChange("error");
        }
      }, 5000);

      // Create socket with error handling
      ws = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      ws.onopen = () => {
        console.log("WebSocket connection established");
        clearTimeout(connectionTimeout);
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

        // Do not attempt to reconnect if closed normally or if maximum attempts reached
        if (
          event.code === 1000 || // Normal closure
          reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
        ) {
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(
              "Maximum reconnection attempts reached. WebSocket connections disabled."
            );
            // Disable further connection attempts and store this in sessionStorage
            wsConnectionEnabled = false;
            try {
              sessionStorage.setItem("wsConnectionDisabled", "true");
            } catch {
              console.log("Could not store WebSocket state in sessionStorage");
            }
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
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              wsConnectionEnabled = false;
              try {
                sessionStorage.setItem("wsConnectionDisabled", "true");
              } catch {
                console.log(
                  "Could not store WebSocket state in sessionStorage"
                );
              }
              notifyStatusChange("disabled");
            }
          }
        }, delay);
      };

      ws.onerror = () => {
        console.error("WebSocket error occurred");
        // The WebSocket API doesn't expose error details due to security concerns
        // We'll just log that an error occurred and let onclose handle reconnection logic
        notifyStatusChange("error");

        // Don't close here - the onclose handler will be called automatically
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      notifyStatusChange("error");

      // If we can't even create a WebSocket, disable for this session
      wsConnectionEnabled = false;
      try {
        sessionStorage.setItem("wsConnectionDisabled", "true");
      } catch {
        console.log("Could not store WebSocket state in sessionStorage");
      }
      notifyStatusChange("disabled");
      return null;
    }

    return ws; // Return the WebSocket instance
  };

  // Initial connection attempt with failure handling
  try {
    connectWebSocket();
  } catch (error) {
    console.error("Failed to initialize WebSocket:", error);
    notifyStatusChange("disabled");
    wsConnectionEnabled = false;
    try {
      sessionStorage.setItem("wsConnectionDisabled", "true");
    } catch {
      // Ignore storage errors
    }
  }

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
