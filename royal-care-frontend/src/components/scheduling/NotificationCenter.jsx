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
import { useDispatch } from "react-redux";
import { markNotificationAsRead } from "../../features/scheduling/schedulingSlice";
import styles from "../../styles/NotificationCenter.module.css";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewedNotifications, setViewedNotifications] = useState(new Set());
  const notificationRef = useRef(null);
  const notificationItemsRef = useRef(new Map());

  // Get user information for role-aware filtering
  const dispatch = useDispatch();
  // Fetch notifications directly from API
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const baseURL = import.meta.env.PROD
        ? "https://charismatic-appreciation-production.up.railway.app/api"
        : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

      // Try primary endpoint first, then fallback to debug endpoint if needed
      const endpoints = [
        `${baseURL}/scheduling/notifications/`,
        `${baseURL}/scheduling/notifications/debug_all/`,
      ];

      let data = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${endpoint}:`, endpointError);
        }
      }

      if (!data) {
        throw new Error("Unable to fetch notifications from any endpoint");
      }

      // Handle different response formats from the backend
      let notificationsList = [];

      if (Array.isArray(data)) {
        // Direct array format
        notificationsList = data;
      } else if (data && Array.isArray(data.notifications)) {
        // Object with notifications array
        notificationsList = data.notifications;
      } else if (data && Array.isArray(data.results)) {
        // Paginated format - notifications in 'results' array
        notificationsList = data.results;
      } else if (
        data &&
        data.results &&
        Array.isArray(data.results.notifications)
      ) {
        // Nested paginated format
        notificationsList = data.results.notifications;
      } else {
        // Unexpected format - log for debugging but don't break
        console.warn("Unexpected response format:", data);
        notificationsList = [];
      }

      setNotifications(notificationsList);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const token = localStorage.getItem("knoxToken");
        const baseURL = import.meta.env.PROD
          ? "https://charismatic-appreciation-production.up.railway.app/api"
          : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

        const response = await fetch(
          `${baseURL}/scheduling/notifications/${notificationId}/mark_as_read/`,
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

          // Update Redux state to decrease unread count
          dispatch(markNotificationAsRead(notificationId));
        } else {
          const errorData = await response.text();
          console.error("Failed to mark as read:", response.status, errorData);
        }
      } catch (error) {
        console.error("Error in markAsRead:", error);
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
      const baseURL = import.meta.env.PROD
        ? "https://charismatic-appreciation-production.up.railway.app/api"
        : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

      const response = await fetch(
        `${baseURL}/scheduling/notifications/${notificationId}/mark_as_unread/`,
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
      const baseURL = import.meta.env.PROD
        ? "https://charismatic-appreciation-production.up.railway.app/api"
        : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

      const response = await fetch(
        `${baseURL}/scheduling/notifications/${notificationId}/`,
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
        <MinimalLoadingIndicator
          show={loading}
          position="top-right"
          size="micro"
          variant="ghost"
          tooltip="Loading notifications..."
        />
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
        {loading && filteredNotifications.length === 0 && (
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
