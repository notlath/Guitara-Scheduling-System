/**
 * WebSocket Hooks for TanStack Query Integration
 * Custom hooks for WebSocket functionality
 */

import { useContext } from "react";
import WebSocketContext from "../contexts/WebSocketContext";

// Hook to use WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }

  return context;
};

// Hook for components that need WebSocket functionality
export const useWebSocketConnection = () => {
  const { isConnected, connectionStatus, send } = useWebSocketContext();

  return {
    isConnected,
    connectionStatus,
    send,
    // Helper methods
    sendAppointmentUpdate: (appointmentId) => {
      send({
        type: "appointment_update_request",
        appointment_id: appointmentId,
        timestamp: Date.now(),
      });
    },
    sendAvailabilityCheck: (date, time, serviceId) => {
      send({
        type: "availability_check",
        date,
        time,
        service_id: serviceId,
        timestamp: Date.now(),
      });
    },
  };
};
