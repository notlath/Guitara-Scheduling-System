import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteNotification,
  deleteReadNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/NotificationCenter.css";

const NotificationCenter = ({ onClose }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const dispatch = useDispatch();
  const { notifications, unreadNotificationCount, loading, error } =
    useSelector((state) => state.scheduling);

  // Create alias for consistency with component logic
  const unreadCount = unreadNotificationCount;

  useEffect(() => {
    // Fetch notifications when component mounts
    dispatch(fetchNotifications());

    // Set up polling to check for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);

    // Add escape key listener to close notifications
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    // Cleanup interval and event listener on component unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [dispatch, onClose]);

  const handleMarkAsRead = async (notificationId) => {
    await dispatch(markNotificationAsRead(notificationId));
    // Refresh notifications to update count
    dispatch(fetchNotifications());
  };

  const handleMarkAllAsRead = async () => {
    await dispatch(markAllNotificationsAsRead());
    // Refresh notifications to update count
    dispatch(fetchNotifications());
  };

  const handleMarkAsUnread = async (notificationId) => {
    await dispatch(markNotificationAsUnread(notificationId));
    setSelectedNotification(null);
    // Refresh notifications to update count
    dispatch(fetchNotifications());
  };

  const handleDeleteNotification = async (notificationId) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      await dispatch(deleteNotification(notificationId));
      setSelectedNotification(null);
      // Refresh notifications to update count
      dispatch(fetchNotifications());
    }
  };

  const handleDeleteReadNotifications = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all read notifications? This action cannot be undone."
      )
    ) {
      await dispatch(deleteReadNotifications());
      // Refresh notifications to update count
      dispatch(fetchNotifications());
    }
  };

  const handleToggleVisibility = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleNotificationClick = (notification) => {
    if (selectedNotification?.id === notification.id) {
      setSelectedNotification(null);
    } else {
      setSelectedNotification(notification);
      if (!notification.is_read) {
        handleMarkAsRead(notification.id);
      }
    }
  };

  // Filter notifications based on showAll state and safely handle undefined notifications
  const displayedNotifications =
    notifications && Array.isArray(notifications)
      ? showAll
        ? notifications
        : notifications.filter(
            (notification) => notification && !notification.is_read
          )
      : [];

  // Format the time to display relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString) => {
    try {
      if (!dateString) return "Unknown time";

      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const now = new Date();
      const diffInMs = now - date;
      const diffInSec = Math.floor(diffInMs / 1000);
      const diffInMin = Math.floor(diffInSec / 60);
      const diffInHour = Math.floor(diffInMin / 60);
      const diffInDay = Math.floor(diffInHour / 24);

      if (diffInDay > 0) {
        return `${diffInDay} day${diffInDay > 1 ? "s" : ""} ago`;
      } else if (diffInHour > 0) {
        return `${diffInHour} hour${diffInHour > 1 ? "s" : ""} ago`;
      } else if (diffInMin > 0) {
        return `${diffInMin} minute${diffInMin > 1 ? "s" : ""} ago`;
      } else {
        return "Just now";
      }
    } catch (err) {
      console.error("Error formatting relative time:", err);
      return "Unknown time";
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "appointment_created":
        return "📅";
      case "appointment_updated":
        return "🔄";
      case "appointment_reminder":
        return "⏰";
      case "appointment_cancelled":
        return "❌";
      default:
        return "📌";
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>Notifications {unreadCount > 0 && `(${unreadCount})`}</h2>
        <div className="notification-controls">
          <button
            className="toggle-button"
            onClick={() => setShowAll(!showAll)}
            title={
              showAll
                ? "Show only unread notifications"
                : "Show all notifications"
            }
          >
            {showAll ? "Unread" : "All"}
          </button>
          {unreadCount > 0 && (
            <button
              className="mark-all-button"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              ✓ All
            </button>
          )}
          {notifications && notifications.length > 0 && (
            <button
              className="delete-read-button"
              onClick={handleDeleteReadNotifications}
              title="Delete all read notifications"
            >
              🗑 Read
            </button>
          )}
          <button
            className="close-button"
            onClick={handleToggleVisibility}
            title="Close notifications panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : error ? (
          <div className="error-state">Error loading notifications.</div>
        ) : displayedNotifications.length === 0 ? (
          <div className="empty-state">
            {showAll
              ? "No notifications available."
              : "No unread notifications."}
          </div>
        ) : (
          displayedNotifications.map((notification) => (
            <div key={notification.id} className="notification-wrapper">
              <div
                className={`notification-item ${
                  !notification.is_read ? "unread" : ""
                } ${
                  selectedNotification?.id === notification.id ? "selected" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className="notification-content">
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatRelativeTime(notification.created_at)}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="unread-indicator"></div>
                )}
              </div>

              {selectedNotification?.id === notification.id && (
                <div className="notification-actions">
                  {notification.is_read ? (
                    <button
                      className="action-button mark-unread-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsUnread(notification.id);
                      }}
                      title="Mark as unread"
                    >
                      ↶
                    </button>
                  ) : (
                    <button
                      className="action-button mark-read-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="action-button delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    title="Delete notification"
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
