/**
 * WebSocket Context Provider for TanStack Query Integration
 * Manages WebSocket connection across the entire application
 */

import { createContext, useEffect, useState } from "react";
import webSocketService from "../services/webSocketTanStackService";

const WebSocketContext = createContext({
  isConnected: false,
  connectionStatus: "disconnected",
  connect: () => {},
  disconnect: () => {},
  send: () => {},
});

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  useEffect(() => {
    // Listen for status changes
    const handleStatusChange = (event) => {
      const status = event.detail.status;
      setConnectionStatus(status);
      setIsConnected(status === "connected");
    };

    // Add event listener for status changes
    window.addEventListener("websocket-status", handleStatusChange);

    // Initialize connection on app start
    const initializeConnection = async () => {
      try {
        // Get auth token from localStorage
        const authToken = localStorage.getItem("knoxToken");

        if (authToken) {
          console.log("🔌 Initializing WebSocket connection...");
          await webSocketService.connect(authToken);
        } else {
          console.log("ℹ️ No auth token found, WebSocket connection skipped");
        }
      } catch (error) {
        console.error("Failed to initialize WebSocket connection:", error);
      }
    };

    // Initialize connection
    initializeConnection();

    // Cleanup function
    return () => {
      window.removeEventListener("websocket-status", handleStatusChange);
      // Don't disconnect here - let the service manage the connection lifecycle
    };
  }, []);

  // Handle authentication changes
  useEffect(() => {
    const handleStorageChange = async (event) => {
      if (event.key === "knoxToken") {
        if (event.newValue) {
          // User logged in - connect WebSocket
          console.log("🔑 Auth token detected, connecting WebSocket...");
          await webSocketService.connect(event.newValue);
        } else {
          // User logged out - disconnect WebSocket
          console.log("🔒 Auth token removed, disconnecting WebSocket...");
          webSocketService.disconnect();
        }
      }
    };

    // Listen for auth token changes
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Reconnect when window becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !webSocketService.isConnected()) {
        const authToken = localStorage.getItem("knoxToken");
        if (authToken) {
          console.log("👁️ Tab became visible, reconnecting WebSocket...");
          webSocketService.connect(authToken);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const connect = async (token) => {
    return webSocketService.connect(token);
  };

  const disconnect = () => {
    webSocketService.disconnect();
  };

  const send = (message) => {
    webSocketService.send(message);
  };

  const contextValue = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    send,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
