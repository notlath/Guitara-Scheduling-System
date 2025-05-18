/**
 * WebSocket service for real-time appointment updates
 */
let ws = null;

export const setupWebSocket = ({ onAppointmentUpdate }) => {
  // Close any existing connection
  if (ws) {
    ws.close();
  }

  // Create a new WebSocket connection
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  // Safely access environment variables; if `process` is not defined, assume defaults for development
  const NODE_ENV =
    typeof process !== "undefined" && process.env && process.env.NODE_ENV
      ? process.env.NODE_ENV
      : "development";
  const REACT_APP_BACKEND_WS_URL =
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BACKEND_WS_URL
      ? process.env.REACT_APP_BACKEND_WS_URL
      : "";
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
    return () => {}; // Return empty cleanup function
  }
  // Strip prefix if stored as 'Token <token>'
  if (token.startsWith("Token ")) {
    token = token.split(" ")[1];
  }
  if (!token) {
    console.error(
      "No authentication token found. Cannot establish WebSocket connection."
    );
    return () => {}; // Return empty cleanup function
  }

  // Include token in WebSocket URL for authentication
  ws = new WebSocket(
    `${wsScheme}://${wsHost}/ws/scheduling/appointments/?token=${token}`
  );

  // Set up WebSocket event handlers
  ws.onopen = () => {
    console.log("WebSocket connection established");
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

    // Attempt to reconnect after a delay if the connection was closed unexpectedly
    if (event.code !== 1000) {
      // Check if we have an authentication token
      const token = localStorage.getItem("knoxToken");
      if (!token) {
        console.error(
          "Authentication failed: No token available. Please log in."
        );
        return; // Don't attempt to reconnect if no token is available
      }

      console.log("Attempting to reconnect in 5 seconds...");
      setTimeout(() => {
        setupWebSocket({ onAppointmentUpdate });
      }, 5000);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  const closeWs = () => {
    if (ws) {
      ws.close(1000, "Component unmounted");
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
