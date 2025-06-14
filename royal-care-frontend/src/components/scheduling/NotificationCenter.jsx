import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdDelete,
  MdEventAvailable,
  MdEventBusy,
  MdMarkAsUnread,
  MdMoreVert,
  MdNotifications,
  MdSchedule,
  MdUpdate,
} from "react-icons/md";
import { useSelector } from "react-redux";
import styles from "../../styles/NotificationCenter.module.css";

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const notificationRef = useRef(null);

  // Get user information for role-aware filtering
  const { user } = useSelector((state) => state.auth);
  // Fetch notifications directly from API
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    console.log("🔄 Fetching notifications...");
    console.log(
      `👤 User role: ${user?.role || "Unknown"} - ${
        user?.username || "Unknown user"
      }`
    );

    try {
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("No authentication token found");
      }

      console.log("📡 Making request to notifications API...");

      const response = await fetch(
        "http://localhost:8000/api/scheduling/notifications/",
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `📊 Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed - please log in again");
        }

        // Try to get error details from response
        let errorMessage = `Failed to fetch notifications: ${response.status}`;
        try {
          const errorData = await response.json();
          console.log("❌ Error response data:", errorData);
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status
          console.warn("Could not parse error response:", parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("📦 Received data:", data);

      // Handle the new backend response format which may include additional metadata
      let notificationsList = [];

      if (Array.isArray(data)) {
        // Old format - direct array
        notificationsList = data;
        console.log("✅ Using legacy array format");
      } else if (data && Array.isArray(data.notifications)) {
        // New format - object with notifications array
        notificationsList = data.notifications;
        console.log(
          `✅ Loaded ${notificationsList.length} notifications (${
            data.unreadCount || 0
          } unread) for ${user?.role || "unknown"} user`
        );

        // Log any warnings from backend
        if (data.warning) {
          console.warn("⚠️ Backend warning:", data.warning);
        }
        if (data.errors && data.errors > 0) {
          console.warn(
            `⚠️ Backend encountered ${data.errors} errors while loading notifications`
          );
        }
      } else {
        // Fallback - treat as empty array
        console.warn("⚠️ Unexpected response format:", data);
        notificationsList = [];
      }

      // Log notification types for debugging role filtering
      if (notificationsList.length > 0) {
        const notificationTypes = notificationsList
          .map((n) => n.notification_type || n.type)
          .filter(Boolean);
        const uniqueTypes = [...new Set(notificationTypes)];
        console.log(
          `🏷️ Notification types received for ${user?.role}: ${uniqueTypes.join(
            ", "
          )}`
        );
      }

      console.log(`🎯 Setting ${notificationsList.length} notifications`);
      setNotifications(notificationsList);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);

      // Set empty notifications array as fallback
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.username]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
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
        // Update local state to mark as read
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
      } else {
        const errorData = await response.text();
        console.error("Failed to mark as read:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  };

  // Mark notification as unread
  const markAsUnread = async (notificationId) => {
    try {
      const token = localStorage.getItem("knoxToken");

      const response = await fetch(
        `http://localhost:8000/api/scheduling/notifications/${notificationId}/mark_as_unread/`,
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
      } else {
        const errorData = await response.text();
        console.error("Failed to mark as unread:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error in markAsUnread:", error);
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
      } else {
        const errorData = await response.text();
        console.error("Failed to delete:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error in deleteNotification:", error);
    }
  };

  // Handle menu actions
  const handleMenuAction = (action, notificationId) => {
    // Close menu after a small delay to allow click event to be processed
    setTimeout(() => {
      setOpenMenuId(null);
    }, 10);

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
      default:
        console.log("Unknown action:", action);
    }
  };

  // Close menu when clicking outside or close notification center when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        // Clicked outside the notification center - close it
        onClose();
      } else {
        // Clicked inside the notification center
        // Only close menu if not clicking on a menu button or menu dropdown
        const isMenuButton = event.target.closest(`.${styles.menuButton}`);
        const isMenuDropdown = event.target.closest(`.${styles.menuDropdown}`);

        if (!isMenuButton && !isMenuDropdown) {
          setOpenMenuId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications
  const filteredNotifications = showAll
    ? notifications
    : notifications.filter((notif) => !notif.is_read);

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

  const getNotificationIcon = (type) => {
    switch (type) {
      case "appointment_created":
        return <MdEventAvailable size={20} />;
      case "appointment_updated":
        return <MdUpdate size={20} />;
      case "appointment_cancelled":
      case "appointment_auto_cancelled":
        return <MdEventBusy size={20} />;
      case "appointment_reminder":
        return <MdSchedule size={20} />;
      case "appointment_accepted":
      case "appointment_started":
      case "appointment_completed":
        return <MdEventAvailable size={20} />;
      case "appointment_rejected":
        return <MdEventBusy size={20} />;
      case "rejection_reviewed":
        return <MdUpdate size={20} />;
      case "therapist_disabled":
        return <MdEventBusy size={20} />;
      default:
        return <MdNotifications size={20} />;
    }
  };

  return (
    <div className={styles.notificationCenter} ref={notificationRef}>
      {/* Header */}
      <div className={styles.notificationHeader}>
        <h2>Notifications</h2>
        <div className={styles.notificationControls}>
          <label className={styles.toggleSwitch}>
            <span className={styles.toggleLabel}>Show only unread</span>
            <input
              type="checkbox"
              checked={!showAll}
              onChange={() => setShowAll(!showAll)}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider}></span>
          </label>
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
              className={`${styles.notificationItem} ${
                !notification.is_read ? styles.unread : ""
              }`}
              data-type={notification.notification_type || notification.type}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(
                    notification.notification_type || notification.type
                  )}
                </div>
                <div className={styles.notificationText}>
                  <div className={styles.notificationTitle}>
                    {notification.title ||
                      `${(
                        notification.notification_type ||
                        notification.type ||
                        "notification"
                      )
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}`}
                  </div>
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  <div className={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </div>
                  {/* Show error info if present */}
                  {notification.error && (
                    <div
                      className={styles.notificationError}
                      style={{
                        fontSize: "12px",
                        color: "#ff6b6b",
                        marginTop: "4px",
                      }}
                    >
                      Error loading notification details
                    </div>
                  )}
                </div>
              </div>

              {/* Three-dot menu */}
              <div className={styles.notificationActions}>
                <button
                  className={styles.menuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newMenuId =
                      openMenuId === notification.id ? null : notification.id;
                    setOpenMenuId(newMenuId);
                  }}
                >
                  <MdMoreVert size={16} />
                </button>

                {openMenuId === notification.id && (
                  <div
                    className={styles.menuDropdown}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMenuAction(
                          notification.is_read ? "markUnread" : "markRead",
                          notification.id
                        );
                      }}
                    >
                      <MdMarkAsUnread size={14} />
                      {notification.is_read ? "Mark as unread" : "Mark as read"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMenuAction("delete", notification.id);
                      }}
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
    </div>
  );
};

export default NotificationCenter;
