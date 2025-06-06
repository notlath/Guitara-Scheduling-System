import { useEffect, useState } from "react";
import { enableWebSocketConnections } from "../../services/webSocketService";
import "../../styles/WebSocketStatus.css";

/**
 * Component that provides non-intrusive WebSocket status indication
 * Uses subtle status indicators without disrupting user experience
 */
const WebSocketStatus = () => {
  const [status, setStatus] = useState("disconnected");
  const [showTemporaryNotification, setShowTemporaryNotification] =
    useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    // Check if WebSockets were previously disabled in this session
    const checkInitialStatus = () => {
      try {
        const wsDisabled = sessionStorage.getItem("wsConnectionDisabled");
        if (wsDisabled === "true") {
          setStatus("disabled");
          // Only show notification if this is the first time in the session
          const notificationShown = sessionStorage.getItem(
            "wsDisabledNotificationShown"
          );
          if (!notificationShown) {
            showNotification("Real-time updates unavailable", 3000);
            sessionStorage.setItem("wsDisabledNotificationShown", "true");
          }
        }
      } catch {
        // Ignore storage access errors
      }
    };

    // Check initial status on mount
    checkInitialStatus();

    // Create a custom event listener for WebSocket status updates
    const handleStatusUpdate = (event) => {
      const newStatus = event.detail.status;
      setStatus(newStatus);

      // Only show notifications for critical status changes
      // Reduced notification frequency for minimal UI disruption
      if (newStatus === "disabled") {
        showNotification("Real-time updates unavailable", 3000);
      }
      // Don't show notifications for other states to minimize disruption
      // Users can hover over the status indicator to see current state
    };

    window.addEventListener("websocket-status", handleStatusUpdate);

    return () => {
      window.removeEventListener("websocket-status", handleStatusUpdate);
    };
  }, []);

  const showNotification = (message, duration) => {
    setNotificationMessage(message);
    setShowTemporaryNotification(true);
    setTimeout(() => {
      setShowTemporaryNotification(false);
    }, duration);
  };

  const handleRetryConnection = () => {
    enableWebSocketConnections();
    setShowTemporaryNotification(false);
    // Reload the page to restart WebSocket connections
    window.location.reload();
  };

  return (
    <>
      {/* Subtle status indicator - always present but minimal */}
      <div
        className={`websocket-status-indicator ${status}`}
        title={getStatusTooltip(status)}
      >
        <span className="status-dot"></span>
      </div>

      {/* Temporary notification for important status changes */}
      {showTemporaryNotification && (
        <div className={`websocket-notification ${status}`}>
          <span className="notification-icon"></span>
          {notificationMessage}

          <div className="notification-actions">
            {status === "disabled" && (
              <button className="retry-button" onClick={handleRetryConnection}>
                Retry
              </button>
            )}
            <button
              className="close-button"
              onClick={() => setShowTemporaryNotification(false)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Helper function for status tooltips
const getStatusTooltip = (status) => {
  switch (status) {
    case "connected":
      return "Real-time updates active";
    case "disconnected":
      return "Reconnecting...";
    case "connecting":
      return "Connecting...";
    case "error":
      return "Connection error - retrying";
    case "disabled":
      return "Real-time updates disabled - using polling";
    default:
      return "Connection status unknown";
  }
};

export default WebSocketStatus;
