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

  // Show notification
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

  // Dismiss notification
  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
  }, []);

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

  // Analyze critical issues and create notifications
  const analyzeCriticalIssues = useCallback(
    ({ appointments = [], drivers = [], currentTime = new Date() }) => {
      const issues = [];

      // Check for overdue appointments
      const overdueAppointments = appointments.filter((apt) => {
        if (apt.status !== "pending" && apt.status !== "confirmed")
          return false;

        const appointmentTime = new Date(`${apt.date} ${apt.start_time}`);
        const overdueThreshold = new Date(
          appointmentTime.getTime() + 60 * 60 * 1000
        ); // 1 hour

        return currentTime > overdueThreshold;
      });

      if (overdueAppointments.length > 0) {
        issues.push({
          type: "CRITICAL",
          title: "Overdue Appointments",
          message: `${overdueAppointments.length} appointment(s) are overdue and need immediate attention`,
          actions: [
            {
              id: "view_overdue",
              label: "View Overdue",
              handler: () => (window.location.hash = "#overdue"),
            },
            {
              id: "auto_cancel",
              label: "Auto Cancel",
              handler: (data) =>
                console.log("Auto cancel overdue appointments", data),
            },
          ],
          data: { appointments: overdueAppointments },
        });
      }

      // Check for driver shortage
      const availableDrivers = drivers.filter((d) => d.status === "available");
      const pendingPickups = appointments.filter(
        (apt) => apt.status === "confirmed" && !apt.driver_id
      );

      if (pendingPickups.length > 0 && availableDrivers.length === 0) {
        issues.push({
          type: "URGENT",
          title: "Driver Shortage",
          message: `${pendingPickups.length} appointments need drivers but none are available`,
          actions: [
            {
              id: "contact_drivers",
              label: "Contact Drivers",
              handler: () => console.log("Contact offline drivers"),
            },
          ],
          data: { pendingPickups, availableDrivers },
        });
      }

      // Check for payment issues
      const paymentIssues = appointments.filter(
        (apt) =>
          apt.status === "awaiting_payment" &&
          new Date(apt.date) < new Date(currentTime - 24 * 60 * 60 * 1000) // 1 day old
      );

      if (paymentIssues.length > 0) {
        issues.push({
          type: "WARNING",
          title: "Pending Payments",
          message: `${paymentIssues.length} payment(s) have been pending for over 24 hours`,
          actions: [
            {
              id: "review_payments",
              label: "Review Payments",
              handler: () => (window.location.hash = "#payments"),
            },
          ],
          data: { paymentIssues },
        });
      }

      return issues;
    },
    []
  );

  // Monitor for critical issues
  const monitorCriticalIssues = useCallback(
    (data) => {
      const issues = analyzeCriticalIssues(data);

      issues.forEach((issue) => {
        showNotification({
          ...issue,
          id: `critical_${issue.type.toLowerCase()}_${Date.now()}`,
        });
      });
    },
    [analyzeCriticalIssues, showNotification]
  );

  // Update notification settings
  const updateSettings = useCallback((newSettings) => {
    setNotificationSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const currentTimeoutRefs = timeoutRefs.current;
    return () => {
      currentTimeoutRefs.forEach((timeoutId) => clearTimeout(timeoutId));
      currentTimeoutRefs.clear();
    };
  }, []);

  return {
    // Core notification functions
    showNotification,
    dismissNotification,
    dismissAll,
    handleNotificationAction,

    // Critical issue monitoring
    analyzeCriticalIssues,
    monitorCriticalIssues,

    // Settings and permissions
    requestNotificationPermission,
    updateSettings,
    notificationSettings,

    // State
    notifications,
    hasNotifications: notifications.length > 0,
    criticalCount: notifications.filter((n) => n.type === "CRITICAL").length,

    // Utility functions
    getNotificationById: (id) => notifications.find((n) => n.id === id),
    getNotificationsByType: (type) =>
      notifications.filter((n) => n.type === type),
  };
};

export default useSmartNotifications;
