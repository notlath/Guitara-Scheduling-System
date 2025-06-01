import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/NotificationCenter.css";

const NotificationCenter = () => {
  const [showAll, setShowAll] = useState(false);
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading, error } = useSelector(
    (state) => state.scheduling
  );

  useEffect(() => {
    // Fetch notifications when component mounts
    dispatch(fetchNotifications());

    // Set up polling to check for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [dispatch]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markNotificationAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsAsRead());
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
          >
            {showAll ? "Show Unread" : "Show All"}
          </button>
          {unreadCount > 0 && (
            <button className="mark-all-button" onClick={handleMarkAllAsRead}>
              Mark All as Read
            </button>
          )}
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
            <div
              key={notification.id}
              className={`notification-item ${
                !notification.is_read ? "unread" : ""
              }`}
              onClick={() =>
                !notification.is_read && handleMarkAsRead(notification.id)
              }
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
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
