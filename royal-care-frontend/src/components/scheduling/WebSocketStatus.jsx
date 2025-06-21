import { useEffect, useState } from "react";
import { useWebSocketContext } from "../../hooks/useWebSocket";
import "../../styles/WebSocketStatus.css";

/**
 * Component that provides non-intrusive WebSocket status indication
 * Uses subtle status indicators without disrupting user experience
 *
 * Key UX Improvements:
 * - Status dot only appears when there are connection issues
 * - Reduced size (5px) and opacity (0.3) for minimal visual impact
 * - Notifications only for critical issues (disabled, error states)
 * - Smart tooltip provides detailed info on hover
 * - Completely silent when connection is working properly
 */
const WebSocketStatus = () => {
  const { connectionStatus } = useWebSocketContext();
  const [showTemporaryNotification, setShowTemporaryNotification] =
    useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  useEffect(() => {
    // Show temporary notifications for critical status changes
    if (connectionStatus === "error") {
      setNotificationMessage("Connection error - using fallback data");
      setShowTemporaryNotification(true);

      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        setShowTemporaryNotification(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else if (connectionStatus === "connecting") {
      setNotificationMessage("Connecting to real-time updates...");
      setShowTemporaryNotification(true);

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowTemporaryNotification(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShowTemporaryNotification(false);
    }
  }, [connectionStatus]);

  // Get tooltip message based on status
  const getTooltipMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "✅ Real-time updates active";
      case "connecting":
        return "🔄 Connecting to real-time updates...";
      case "disconnected":
        return "⚠️ Reconnecting to real-time updates...";
      case "error":
        return "❌ Connection error - using fallback data";
      case "disabled":
        return "ℹ️ Real-time updates disabled";
      default:
        return "Unknown connection status";
    }
  };

  return (
    <>
      {/* Status indicator - only visible when there are issues */}
      <div
        className={`websocket-status-indicator ${connectionStatus}`}
        title={getTooltipMessage()}
      >
        <span className="status-dot"></span>
      </div>

      {/* Temporary notification for critical status changes */}
      {showTemporaryNotification && (
        <div className={`websocket-notification ${connectionStatus}`}>
          <span className="notification-icon">
            {connectionStatus === "error" && "❌"}
            {connectionStatus === "connecting" && "🔄"}
            {connectionStatus === "disabled" && "ℹ️"}
          </span>
          <span className="notification-text">{notificationMessage}</span>
          <button
            className="notification-close"
            onClick={() => setShowTemporaryNotification(false)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default WebSocketStatus;
