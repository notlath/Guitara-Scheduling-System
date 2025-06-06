/**
 * WebSocket service for real-time appointment updates
 * TEMPORARILY DISABLED - Using polling fallback only
 */

// Helper function to notify status changes
const notifyStatusChange = (status) => {
  window.dispatchEvent(
    new CustomEvent("websocket-status", {
      detail: { status },
    })
  );
};

// Function to re-enable WebSocket connections (for future use)
export const enableWebSocketConnections = () => {
  try {
    sessionStorage.removeItem("wsConnectionDisabled");
    console.log("WebSocket connections re-enabled");
  } catch {
    console.log("Could not clear WebSocket disabled state from sessionStorage");
  }
};

// Main WebSocket setup function - currently disabled
export const setupWebSocket = () => {
  // WebSocket connections are disabled until backend WebSocket server is configured
  console.log(
    "WebSocket connections are disabled - using polling fallback only"
  );

  // Immediately notify that WebSocket is disabled
  notifyStatusChange("disabled");

  // Return empty cleanup function
  return () => {};
};

// Function to send appointment update via WebSocket - disabled
export const sendAppointmentUpdate = (appointmentId) => {
  console.log(
    "WebSocket disabled - appointment update skipped:",
    appointmentId
  );
};

// Function to send new appointment notification via WebSocket - disabled
export const sendAppointmentCreate = (appointmentId) => {
  console.log(
    "WebSocket disabled - appointment create notification skipped:",
    appointmentId
  );
};

// Function to send appointment deletion notification via WebSocket - disabled
export const sendAppointmentDelete = (appointmentId) => {
  console.log(
    "WebSocket disabled - appointment delete notification skipped:",
    appointmentId
  );
};

// Function to check WebSocket connection status - always false when disabled
export const isWebSocketConnected = () => {
  return false;
};
