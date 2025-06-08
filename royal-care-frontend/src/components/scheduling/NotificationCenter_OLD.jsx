import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdMoreVert, MdMarkAsUnread, MdDelete, MdRefresh } from "react-icons/md";
import NotificationDebugTool from './NotificationDebugTool';
import { checkAndFixToken, simulateLogin, clearAuth } from '../../utils/tokenFixer';
import {
  deleteNotification,
  deleteReadNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from "../../features/scheduling/schedulingSlice";
import { login } from "../../features/auth/authSlice";
import "../../globals/theme.css";
import styles from "../../styles/NotificationCenter.module.css";

const NotificationCenter = ({ onClose }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const dispatch = useDispatch();
  const { notifications, unreadNotificationCount, loading, error } =
    useSelector((state) => state.scheduling);
  
  // Get current user info for debugging
  const { user } = useSelector((state) => state.auth);

  // Create alias for consistency with component logic
  const unreadCount = unreadNotificationCount;

  // Debug current user and notifications state
  useEffect(() => {
    if (user) {
      console.log("👤 NotificationCenter: Current user info", {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      });
    }
    
    console.log("📊 NotificationCenter: Current notification state", {
      notificationCount: notifications?.length || 0,
      unreadCount,
      loading,
      error,
      hasNotifications: Array.isArray(notifications),
      notifications: notifications?.slice(0, 3) // Log first 3 for debugging
    });

    // Check if there's an authentication issue
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      console.warn("⚠️ NotificationCenter: No authentication token found");
    }
  }, [user, notifications, unreadCount, loading, error]);

  useEffect(() => {
    console.log("🔍 NotificationCenter: Component mounted, fetching notifications...");
    
    // Fetch notifications when component mounts
    dispatch(fetchNotifications()).then((result) => {
      if (result.type === 'scheduling/fetchNotifications/fulfilled') {
        console.log("✅ NotificationCenter: Notifications fetched successfully", {
          count: result.payload.notifications?.length || 0,
          unreadCount: result.payload.unreadCount,
          notifications: result.payload.notifications
        });
      } else if (result.type === 'scheduling/fetchNotifications/rejected') {
        console.error("❌ NotificationCenter: Failed to fetch notifications", result.payload);
      }
    });

    // Set up polling to check for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      console.log("🔄 NotificationCenter: Polling for new notifications...");
      dispatch(fetchNotifications());
    }, 30000);

    // Add escape key listener to close notifications
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        if (openMenuId) {
          setOpenMenuId(null);
        } else if (onClose) {
          onClose();
        }
      }
    };

    // Add click outside handler to close menu
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.notificationMenu')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    document.addEventListener("click", handleClickOutside);

    // Cleanup interval and event listener on component unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("keydown", handleEscapeKey);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dispatch, onClose, openMenuId]);

  const handleMarkAsRead = async (notificationId) => {
    console.log("📝 NotificationCenter: Marking notification as read", notificationId);
    try {
      const result = await dispatch(markNotificationAsRead(notificationId));
      if (result.type === 'scheduling/markNotificationAsRead/fulfilled') {
        console.log("✅ NotificationCenter: Successfully marked as read");
        // Refresh notifications to update count
        dispatch(fetchNotifications());
      } else {
        console.error("❌ NotificationCenter: Failed to mark as read", result.payload);
      }
    } catch (error) {
      console.error("❌ NotificationCenter: Error marking as read", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    console.log("📝 NotificationCenter: Marking all notifications as read");
    try {
      const result = await dispatch(markAllNotificationsAsRead());
      if (result.type === 'scheduling/markAllNotificationsAsRead/fulfilled') {
        console.log("✅ NotificationCenter: Successfully marked all as read");
        // Refresh notifications to update count
        dispatch(fetchNotifications());
      } else {
        console.error("❌ NotificationCenter: Failed to mark all as read", result.payload);
      }
    } catch (error) {
      console.error("❌ NotificationCenter: Error marking all as read", error);
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    console.log("📝 NotificationCenter: Marking notification as unread", notificationId);
    try {
      const result = await dispatch(markNotificationAsUnread(notificationId));
      if (result.type === 'scheduling/markNotificationAsUnread/fulfilled') {
        console.log("✅ NotificationCenter: Successfully marked as unread");
        setSelectedNotification(null);
        // Refresh notifications to update count
        dispatch(fetchNotifications());
      } else {
        console.error("❌ NotificationCenter: Failed to mark as unread", result.payload);
      }
    } catch (error) {
      console.error("❌ NotificationCenter: Error marking as unread", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    console.log("🗑️ NotificationCenter: Deleting notification", notificationId);
    if (window.confirm("Are you sure you want to delete this notification?")) {
      try {
        const result = await dispatch(deleteNotification(notificationId));
        if (result.type === 'scheduling/deleteNotification/fulfilled') {
          console.log("✅ NotificationCenter: Successfully deleted notification");
          setSelectedNotification(null);
          setOpenMenuId(null);
          // Refresh notifications to update count
          dispatch(fetchNotifications());
        } else {
          console.error("❌ NotificationCenter: Failed to delete notification", result.payload);
        }
      } catch (error) {
        console.error("❌ NotificationCenter: Error deleting notification", error);
      }
    }
  };

  const handleDeleteReadNotifications = async () => {
    console.log("🗑️ NotificationCenter: Deleting all read notifications");
    if (
      window.confirm(
        "Are you sure you want to delete all read notifications? This action cannot be undone."
      )
    ) {
      try {
        const result = await dispatch(deleteReadNotifications());
        if (result.type === 'scheduling/deleteReadNotifications/fulfilled') {
          console.log("✅ NotificationCenter: Successfully deleted read notifications");
          // Refresh notifications to update count
          dispatch(fetchNotifications());
        } else {
          console.error("❌ NotificationCenter: Failed to delete read notifications", result.payload);
        }
      } catch (error) {
        console.error("❌ NotificationCenter: Error deleting read notifications", error);
      }
    }
  };

  const handleRefresh = async () => {
    console.log("🔄 NotificationCenter: Manual refresh triggered");
    try {
      const result = await dispatch(fetchNotifications());
      if (result.type === 'scheduling/fetchNotifications/fulfilled') {
        console.log("✅ NotificationCenter: Manual refresh successful");
      } else {
        console.error("❌ NotificationCenter: Manual refresh failed", result.payload);
      }
    } catch (error) {
      console.error("❌ NotificationCenter: Manual refresh error", error);
    }
  };

  // Function to restore auth state from localStorage
  const handleRestoreAuth = () => {
    console.log("🔄 NotificationCenter: Attempting to restore auth from localStorage");
    
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("knoxToken");
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id && parsedUser.role) {
          console.log("✅ Restoring auth for user:", parsedUser);
          dispatch(login(parsedUser));
          
          // Fetch notifications after restoring auth
          setTimeout(() => {
            dispatch(fetchNotifications());
          }, 500);
        } else {
          console.error("❌ Invalid user data in localStorage");
        }
      } catch (error) {
        console.error("❌ Error parsing user data:", error);
      }
    } else {
      console.error("❌ No auth data found in localStorage");
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

  const handleMenuToggle = (notificationId, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === notificationId ? null : notificationId);
  };

  const handleMenuAction = async (action, notificationId, event) => {
    event.stopPropagation();
    setOpenMenuId(null);
    
    console.log(`🎯 NotificationCenter: Menu action ${action} for notification ${notificationId}`);
    
    try {
      switch (action) {
        case 'markRead':
          await handleMarkAsRead(notificationId);
          break;
        case 'markUnread':
          await handleMarkAsUnread(notificationId);
          break;
        case 'delete':
          await handleDeleteNotification(notificationId);
          break;
        default:
          console.warn(`⚠️ NotificationCenter: Unknown action ${action}`);
          break;
      }
    } catch (error) {
      console.error(`❌ NotificationCenter: Error executing action ${action}:`, error);
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
    <div className={styles.notificationCenter}>
      <div className={styles.notificationHeader}>
        <h2>Notifications {unreadCount > 0 && `(${unreadCount})`}</h2>
        <div className={styles.notificationControls}>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            title="Refresh notifications"
            disabled={loading}
          >
            <MdRefresh size={16} />
          </button>
          <button
            className={styles.toggleButton}
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
              className={styles.markAllButton}
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              ✓ All
            </button>
          )}
          
          {/* Debugging buttons for token issues */}
          <div className={styles.debugControls}>
            <button
              className={styles.debugButton}
              onClick={handleRestoreAuth}
              title="Restore auth from localStorage"
            >
              🔄 Restore
            </button>
            <button
              className={styles.debugButton}
              onClick={checkAndFixToken}
              title="Check token status"
            >
              🔍 Token
            </button>
            <button
              className={styles.debugButton}
              onClick={() => simulateLogin(dispatch)}
              title="Simulate login (for testing)"
            >
              🔐 Login
            </button>
            <button
              className={styles.debugButton}
              onClick={clearAuth}
              title="Clear auth data"
            >
              🗑️ Clear
            </button>
          </div>
          {notifications && notifications.length > 0 && (
            <button
              className={styles.deleteReadButton}
              onClick={handleDeleteReadNotifications}
              title="Delete all read notifications"
            >
              🗑 Read
            </button>
          )}
          <button
            className={styles.closeButton}
            onClick={handleToggleVisibility}
            title="Close notifications panel"
          >
            ×
          </button>
          
          {/* EMERGENCY FIX BUTTON - VERY VISIBLE */}
          <button
            onClick={handleRestoreAuth}
            style={{
              background: '#ff6b35',
              color: 'white',
              border: '2px solid #ff6b35',
              padding: '8px 12px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: '8px',
              fontSize: '12px'
            }}
            title="CLICK ME TO FIX AUTH ISSUE"
          >
            🔄 FIX AUTH
          </button>
        </div>
      </div>

      <div className={styles.notificationsList}>
        {loading ? (
          <div className={styles.loading}>Loading notifications...</div>
        ) : error ? (
          <div className={styles.errorState}>Error loading notifications: {error}</div>
        ) : displayedNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            {showAll
              ? "No notifications available."
              : "No unread notifications."}
          </div>
        ) : (
          displayedNotifications.map((notification) => (
            <div key={notification.id} className={styles.notificationWrapper}>
              <div
                className={`${styles.notificationItem} ${
                  !notification.is_read ? styles.unread : ""
                } ${
                  selectedNotification?.id === notification.id ? styles.selected : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.notification_type)}
                </div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div className={styles.notificationTime}>
                    {formatRelativeTime(notification.created_at)}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className={styles.unreadIndicator}></div>
                )}
                <div className={styles.notificationMenu}>
                  <button
                    className={styles.menuTrigger}
                    onClick={(e) => handleMenuToggle(notification.id, e)}
                    title="Options"
                  >
                    <MdMoreVert size={16} />
                  </button>
                  {openMenuId === notification.id && (
                    <div className={styles.menuDropdown}>
                      {notification.is_read ? (
                        <button
                          className={styles.menuItem}
                          onClick={(e) => handleMenuAction('markUnread', notification.id, e)}
                        >
                          <MdMarkAsUnread size={14} />
                          Mark as unread
                        </button>
                      ) : (
                        <button
                          className={styles.menuItem}
                          onClick={(e) => handleMenuAction('markRead', notification.id, e)}
                        >
                          ✓ Mark as read
                        </button>
                      )}
                      <button
                        className={`${styles.menuItem} ${styles.delete}`}
                        onClick={(e) => handleMenuAction('delete', notification.id, e)}
                      >
                        <MdDelete size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Debug Tool - Remove in production */}
      <NotificationDebugTool />
    </div>
  );
};

export default NotificationCenter;
