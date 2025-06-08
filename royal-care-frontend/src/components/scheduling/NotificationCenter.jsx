import { useEffect, useRef, useState } from "react";
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
import styles from "../../styles/NotificationCenter.module.css";

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const notificationRef = useRef(null);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

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
        return <MdEventBusy size={20} />;
      case "appointment_reminder":
        return <MdSchedule size={20} />;
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
              data-type={notification.type}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
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
