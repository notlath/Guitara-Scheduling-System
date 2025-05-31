/**
 * WebSocket service for real-time appointment updates
 */
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Helper function to notify status changes
const notifyStatusChange = (status) => {
  window.dispatchEvent(
    new CustomEvent("websocket-status", {
      detail: { status },
    })
  );
};

export const setupWebSocket = ({ onAppointmentUpdate }) => {
  // Close any existing connection
  if (ws) {
    ws.close();
  }

  // Reset reconnect attempts when explicitly setting up a new connection
  reconnectAttempts = 0;

  const connectWebSocket = () => {
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
        "No authentication token found. Cannot establish WebSocket connection."
      );
      notifyStatusChange("error");
      return null; // Return early if no token
    }

    // Include token in WebSocket URL for authentication
    const wsUrl = `${wsScheme}://${wsHost}/ws/scheduling/appointments/?token=${token}`;
    console.log("Attempting WebSocket connection to:", wsUrl);

    try {
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
        if (
          event.code === 1000 ||
          reconnectAttempts >= MAX_RECONNECT_ATTEMPTS
        ) {
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.log(
              "Maximum reconnection attempts reached. WebSocket connection abandoned."
            );
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
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectAttempts++;

        console.log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${
            delay / 1000
          } seconds...`
        );

        setTimeout(() => {
          connectWebSocket();
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

  const closeWs = () => {
    if (ws) {
      // Prevent reconnection attempts when deliberately closing
      ws.onclose = null;
      ws.close(1000, "Component unmounted");
      ws = null;
    }
  };

  // Return a cleanup function
  return closeWs;
};

// Function to send appointment update via WebSocket
export const sendAppointmentUpdate = (appointmentId) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "appointment_update",
        appointment_id: appointmentId,
      })
    );
  } else {
    console.error("WebSocket is not connected");
  }
};

// Function to send new appointment notification via WebSocket
export const sendAppointmentCreate = (appointmentId) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "appointment_create",
        appointment_id: appointmentId,
      })
    );
  } else {
    console.error("WebSocket is not connected");
  }
};

// Function to send appointment deletion notification via WebSocket
export const sendAppointmentDelete = (appointmentId) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "appointment_delete",
        appointment_id: appointmentId,
      })
    );
  } else {
    console.error("WebSocket is not connected");
  }
};

// Function to check WebSocket connection status
export const isWebSocketConnected = () => {
  return ws && ws.readyState === WebSocket.OPEN;
};
