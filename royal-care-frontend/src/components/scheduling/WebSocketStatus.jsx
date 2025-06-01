import { useEffect, useState } from "react";
import "../../styles/WebSocketStatus.css";

/**
 * Component that displays the WebSocket connection status
 */
const WebSocketStatus = () => {
  const [status, setStatus] = useState("disconnected");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if WebSockets were previously disabled in this session
    const checkInitialStatus = () => {
      try {
        const wsDisabled = sessionStorage.getItem("wsConnectionDisabled");
        if (wsDisabled === "true") {
          setStatus("disabled");
          // Show the disabled notification briefly
          setVisible(true);
          setTimeout(() => setVisible(false), 7000);
        }
      } catch {
        // Ignore storage access errors
      }
    };

    // Check initial status on mount
    checkInitialStatus();

    // Create a custom event listener for WebSocket status updates
    const handleStatusUpdate = (event) => {
      setStatus(event.detail.status);
      setVisible(true);

      // Automatically hide notifications after a delay
      if (event.detail.status === "connected") {
        setTimeout(() => {
          setVisible(false);
        }, 5000);
      } else if (event.detail.status === "disabled") {
        // Show disabled notification a bit longer
        setTimeout(() => {
          setVisible(false);
        }, 7000);
      }
    };

    window.addEventListener("websocket-status", handleStatusUpdate);

    return () => {
      window.removeEventListener("websocket-status", handleStatusUpdate);
    };
  }, []);

  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <div className={`websocket-status ${status}`}>
      <span className="status-icon"></span>
      {status === "connected" && "Real-time updates connected"}
      {status === "disconnected" && "Real-time updates disconnected"}
      {status === "connecting" && "Connecting to real-time updates..."}
      {status === "error" && "Error connecting to real-time updates"}
      {status === "disabled" &&
        "Real-time updates unavailable - using polling mode"}

      {status !== "connected" && (
        <button className="close-button" onClick={() => setVisible(false)}>
          ×
        </button>
      )}
    </div>
  );
};

export default WebSocketStatus;
