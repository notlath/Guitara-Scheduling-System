/**
 * Smart Notifications Hook
 * Intelligent notification system with priority-based alerts
 */
import { useCallback, useEffect, useRef, useState } from "react";

// Notification types and their configurations
const NOTIFICATION_TYPES = {
  CRITICAL: {
    priority: 1,
    persistent: true,
    sound: true,
    color: "#dc3545",
    icon: "fas fa-exclamation-triangle",
    duration: 0, // Never auto-dismiss
  },
  URGENT: {
    priority: 2,
    persistent: true,
    sound: true,
    color: "#fd7e14",
    icon: "fas fa-bell",
    duration: 10000,
  },
  WARNING: {
    priority: 3,
    persistent: false,
    sound: false,
    color: "#ffc107",
    icon: "fas fa-exclamation",
    duration: 8000,
  },
  INFO: {
    priority: 4,
    persistent: false,
    sound: false,
    color: "#17a2b8",
    icon: "fas fa-info-circle",
    duration: 5000,
  },
  SUCCESS: {
    priority: 5,
    persistent: false,
    sound: false,
    color: "#28a745",
    icon: "fas fa-check-circle",
    duration: 4000,
  },
};

export const useSmartNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
    soundEnabled: true,
    desktopEnabled: true,
    maxNotifications: 5,
  });
  const audioRef = useRef(null);
  const timeoutRefs = useRef(new Map());

  // Initialize audio for notification sounds
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.volume = 0.3;
  }, []);

  // Dismiss notification - Define this FIRST
  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // Show notification - Now can safely use dismissNotification
  const showNotification = useCallback(
    ({ type = "INFO", title, message, actions = [], data = {}, id = null }) => {
      const notificationId =
        id || `notification_${Date.now()}_${Math.random()}`;
      const config = NOTIFICATION_TYPES[type];

      const notification = {
        id: notificationId,
        type,
        title,
        message,
        actions,
        data,
        timestamp: new Date(),
        config,
        dismissed: false,
      };

      setNotifications((prev) => {
        // Remove existing notification with same ID if provided
        const filtered = id ? prev.filter((n) => n.id !== id) : prev;

        // Sort by priority and add new notification
        const updated = [...filtered, notification]
          .sort((a, b) => a.config.priority - b.config.priority)
          .slice(0, notificationSettings.maxNotifications);

        return updated;
      });

      // Play sound if enabled
      if (
        config.sound &&
        notificationSettings.soundEnabled &&
        audioRef.current
      ) {
        audioRef.current.play().catch(() => {
          // Ignore audio play errors (user interaction required)
        });
      }

      // Show desktop notification if enabled
      if (notificationSettings.desktopEnabled && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, {
            body: message,
            icon: "/favicon.ico",
            tag: notificationId,
          });
        }
      }

      // Auto-dismiss if not persistent
      if (config.duration > 0) {
        const timeoutId = setTimeout(() => {
          dismissNotification(notificationId);
        }, config.duration);

        timeoutRefs.current.set(notificationId, timeoutId);
      }

      return notificationId;
    },
    [notificationSettings, dismissNotification]
  );

  // Dismiss all notifications
  const dismissAll = useCallback(() => {
    setNotifications([]);

    // Clear all timeouts
    timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
  }, []);

  // Handle notification action
  const handleNotificationAction = useCallback(
    (notificationId, actionId) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification) return;

      const action = notification.actions.find((a) => a.id === actionId);
      if (action && action.handler) {
        action.handler(notification.data);
      }

      // Dismiss notification after action (unless it's persistent)
      if (!notification.config.persistent) {
        dismissNotification(notificationId);
      }
    },
    [notifications, dismissNotification]
  );

  // Request desktop notification permission
  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      return Notification.requestPermission();
    }
    return Promise.resolve(Notification.permission);
  }, []);

  // Update notification settings
  const updateSettings = useCallback((newSettings) => {
    setNotificationSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Predefined notification helpers
  const notifyError = useCallback(
    (title, message, data = {}) => {
      return showNotification({
        type: "CRITICAL",
        title,
        message,
        data,
        actions: [
          {
            id: "dismiss",
            label: "Dismiss",
            handler: () => {},
          },
        ],
      });
    },
    [showNotification]
  );

  const notifyWarning = useCallback(
    (title, message, data = {}) => {
      return showNotification({
        type: "WARNING",
        title,
        message,
        data,
      });
    },
    [showNotification]
  );

  const notifySuccess = useCallback(
    (title, message, data = {}) => {
      return showNotification({
        type: "SUCCESS",
        title,
        message,
        data,
      });
    },
    [showNotification]
  );

  const notifyInfo = useCallback(
    (title, message, data = {}) => {
      return showNotification({
        type: "INFO",
        title,
        message,
        data,
      });
    },
    [showNotification]
  );

  // Emergency notification with immediate action required
  const notifyEmergency = useCallback(
    (title, message, actions = [], data = {}) => {
      return showNotification({
        type: "CRITICAL",
        title,
        message,
        actions: [
          ...actions,
          {
            id: "acknowledge",
            label: "Acknowledge",
            handler: (notificationData) => {
              console.log("Emergency acknowledged:", notificationData);
            },
          },
        ],
        data,
      });
    },
    [showNotification]
  );

  // Appointment-specific notifications
  const notifyAppointmentOverdue = useCallback(
    (appointment) => {
      return showNotification({
        type: "URGENT",
        title: "Appointment Overdue",
        message: `${appointment.client_name}'s appointment is overdue`,
        data: { appointment },
        actions: [
          {
            id: "contact_client",
            label: "Contact Client",
            handler: (data) => {
              console.log(
                "Contacting client for appointment:",
                data.appointment
              );
            },
          },
          {
            id: "reschedule",
            label: "Reschedule",
            handler: (data) => {
              console.log("Rescheduling appointment:", data.appointment);
            },
          },
        ],
      });
    },
    [showNotification]
  );

  const notifyPaymentPending = useCallback(
    (appointment) => {
      return showNotification({
        type: "WARNING",
        title: "Payment Pending",
        message: `Payment verification needed for ${appointment.client_name}`,
        data: { appointment },
        actions: [
          {
            id: "verify_payment",
            label: "Verify Payment",
            handler: (data) => {
              console.log("Verifying payment for:", data.appointment);
            },
          },
        ],
      });
    },
    [showNotification]
  );

  const notifyDriverAssigned = useCallback(
    (appointment, driver) => {
      return showNotification({
        type: "SUCCESS",
        title: "Driver Assigned",
        message: `${driver.name} assigned to ${appointment.client_name}'s appointment`,
        data: { appointment, driver },
      });
    },
    [showNotification]
  );

  // System status notifications
  const notifySystemStatus = useCallback(
    (status, message) => {
      const type =
        status === "error"
          ? "CRITICAL"
          : status === "warning"
          ? "WARNING"
          : "INFO";

      return showNotification({
        type,
        title: `System ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message,
        data: { status },
      });
    },
    [showNotification]
  );

  // Get notifications by type
  const getNotificationsByType = useCallback(
    (type) => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications]
  );

  // Get critical notifications count
  const criticalCount = notifications.filter(
    (n) => n.type === "CRITICAL"
  ).length;

  // Get unread notifications count
  const unreadCount = notifications.length;

  return {
    // State
    notifications,
    criticalCount,
    unreadCount,
    notificationSettings,

    // Core actions
    showNotification,
    dismissNotification,
    dismissAll,
    handleNotificationAction,
    updateSettings,
    requestNotificationPermission,

    // Predefined helpers
    notifyError,
    notifyWarning,
    notifySuccess,
    notifyInfo,
    notifyEmergency,

    // Domain-specific helpers
    notifyAppointmentOverdue,
    notifyPaymentPending,
    notifyDriverAssigned,
    notifySystemStatus,

    // Utility
    getNotificationsByType,
  };
};

export default useSmartNotifications;
