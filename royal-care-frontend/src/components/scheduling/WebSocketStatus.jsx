import { useEffect, useState } from "react";
import "../../styles/WebSocketStatus.css";

/**
 * Component that displays the WebSocket connection status
 */
const WebSocketStatus = () => {
  const [status, setStatus] = useState("disconnected");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Create a custom event listener for WebSocket status updates
    const handleStatusUpdate = (event) => {
      setStatus(event.detail.status);
      setVisible(true);

      // Automatically hide the connected notification after 5 seconds
      if (event.detail.status === "connected") {
        setTimeout(() => {
          setVisible(false);
        }, 5000);
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
