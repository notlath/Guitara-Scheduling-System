import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdClose,
  MdDelete,
  MdMarkAsUnread,
  MdMoreVert,
  MdRefresh,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../features/scheduling/schedulingSlice";
import styles from "../../styles/NotificationCenter_NEW.module.css";

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewedNotifications, setViewedNotifications] = useState(new Set());
  const notificationItemsRef = useRef(new Map());

  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Fetch notifications directly from API
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        "http://localhost:8000/api/scheduling/notifications/",
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed - please log in again");
        }
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const token = localStorage.getItem("knoxToken");

        const response = await fetch(
          `http://localhost:8000/api/scheduling/notifications/${notificationId}/mark_as_read/`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          // Update local state
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === notificationId ? { ...notif, is_read: true } : notif
            )
          );

          // Update Redux state to decrease unread count
          dispatch(markNotificationAsRead(notificationId));
        }
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    },
    [dispatch]
  );

  // Intersection Observer to detect when notifications are fully viewed
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
            const notificationId = parseInt(
              entry.target.dataset.notificationId
            );
            if (notificationId && !viewedNotifications.has(notificationId)) {
              const notification = notifications.find(
                (n) => n.id === notificationId
              );
              if (notification && !notification.is_read) {
                // Give user 2 seconds to read the notification before marking as read
                setTimeout(() => {
                  setViewedNotifications((prev) => {
                    const newSet = new Set(prev);
                    if (!newSet.has(notificationId)) {
                      newSet.add(notificationId);
                      markAsRead(notificationId);
                    }
                    return newSet;
                  });
                }, 2000);
              }
            }
          }
        });
      },
      {
        threshold: 0.8, // Trigger when 80% of notification is visible
        rootMargin: "0px 0px -20px 0px", // Small margin to ensure notification is truly in view
      }
    );

    // Observe all notification items
    notificationItemsRef.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [notifications, viewedNotifications, markAsRead]);

  // Mark notification as unread
  const markAsUnread = async (notificationId) => {
    try {
      const token = localStorage.getItem("knoxToken");

      const response = await fetch(
        `http://localhost:8000/api/scheduling/notifications/${notificationId}/mark-unread/`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: false } : notif
          )
        );
      }
    } catch (err) {
      console.error("Error marking as unread:", err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem("knoxToken");

      const response = await fetch(
        `http://localhost:8000/api/scheduling/notifications/${notificationId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Remove from local state
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      // Use Redux action instead of direct API call
      await dispatch(markAllNotificationsAsRead()).unwrap();

      // Update all notifications to read in local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Fallback to direct API call if Redux action fails
      try {
        const token = localStorage.getItem("knoxToken");

        const response = await fetch(
          "http://localhost:8000/api/scheduling/notifications/mark_all_as_read/",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          // Update all notifications to read
          setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, is_read: true }))
          );
        }
      } catch (fallbackErr) {
        console.error("Error with fallback mark all as read:", fallbackErr);
      }
    }
  };

  // Handle menu actions
  const handleMenuAction = (action, notificationId) => {
    setOpenMenuId(null);

    switch (action) {
      case "markRead":
        markAsRead(notificationId);
        break;
      case "markUnread":
        markAsUnread(notificationId);
        break;
      case "delete":
        deleteNotification(notificationId);
        break;
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filter notifications
  const filteredNotifications = showAll
    ? notifications
    : notifications.filter((notif) => !notif.is_read);

  const unreadCount = notifications.filter((notif) => !notif.is_read).length;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <div className={styles.notificationCenter}>
      {/* Header */}
      <div className={styles.notificationHeader}>
        <h2>Notifications {unreadCount > 0 && `(${unreadCount})`}</h2>
        <div className={styles.notificationControls}>
          <button
            className={styles.refreshButton}
            onClick={fetchNotifications}
            disabled={loading}
            title="Refresh notifications"
          >
            <MdRefresh size={16} />
          </button>
          <button
            className={styles.toggleButton}
            onClick={() => setShowAll(!showAll)}
            title={showAll ? "Show only unread" : "Show all notifications"}
          >
            {showAll ? "Unread" : "All"}
          </button>
          {unreadCount > 0 && (
            <button
              className={styles.markAllButton}
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              ✓ All
            </button>
          )}
          <button
            className={styles.closeButton}
            onClick={onClose}
            title="Close notifications"
          >
            <MdClose size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.notificationsList}>
        {loading && (
          <div className={styles.loadingMessage}>Loading notifications...</div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <p>Error: {error}</p>
            <button onClick={fetchNotifications} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredNotifications.length === 0 && (
          <div className={styles.emptyMessage}>
            {showAll ? "No notifications" : "No unread notifications"}
          </div>
        )}

        {!loading &&
          !error &&
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              ref={(el) => {
                if (el) {
                  notificationItemsRef.current.set(notification.id, el);
                } else {
                  notificationItemsRef.current.delete(notification.id);
                }
              }}
              className={`${styles.notificationItem} ${
                !notification.is_read ? styles.unread : ""
              }`}
              data-notification-id={notification.id}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationIcon}>
                  {notification.type === "appointment_created" && "📅"}
                  {notification.type === "appointment_updated" && "🔄"}
                  {notification.type === "appointment_cancelled" && "❌"}
                  {notification.type === "appointment_reminder" && "⏰"}
                </div>
                <div className={styles.notificationText}>
                  <div className={styles.notificationTitle}>
                    {notification.title}
                  </div>
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div className={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </div>
                </div>
              </div>

              {/* Three-dot menu */}
              <div className={styles.notificationActions}>
                <button
                  className={styles.menuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(
                      openMenuId === notification.id ? null : notification.id
                    );
                  }}
                >
                  <MdMoreVert size={16} />
                </button>

                {openMenuId === notification.id && (
                  <div className={styles.menuDropdown}>
                    <button
                      onClick={() =>
                        handleMenuAction(
                          notification.is_read ? "markUnread" : "markRead",
                          notification.id
                        )
                      }
                    >
                      <MdMarkAsUnread size={14} />
                      {notification.is_read ? "Mark as unread" : "Mark as read"}
                    </button>
                    <button
                      onClick={() =>
                        handleMenuAction("delete", notification.id)
                      }
                    >
                      <MdDelete size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* User info for debugging */}
      {user && (
        <div className={styles.debugInfo}>
          Logged in as: {user.username} ({user.role})
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
