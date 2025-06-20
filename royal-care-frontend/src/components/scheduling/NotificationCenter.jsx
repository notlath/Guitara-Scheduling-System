import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import { markNotificationAsRead } from "../../features/scheduling/schedulingSlice";
import styles from "../../styles/NotificationCenter.module.css";
import { debounce } from "../../utils/authUtils";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

// Optimized notification item component to prevent unnecessary re-renders
const NotificationItem = memo(
  ({
    notification,
    openMenuId,
    setOpenMenuId,
    handleMenuAction,
    formatTime,
    getNotificationIcon,
    notificationItemsRef,
  }) => {
    const isMenuOpen = openMenuId === notification.id;

    return (
      <div
        key={notification.id}
        className={`${styles.notificationItem} ${
          notification.is_read ? styles.read : styles.unread
        }`}
        data-notification-id={notification.id}
        ref={(el) => {
          if (el) {
            notificationItemsRef.current.set(notification.id, el);
          } else {
            notificationItemsRef.current.delete(notification.id);
          }
        }}
      >
        <div className={styles.notificationContent}>
          <div className={styles.notificationIcon}>
            {getNotificationIcon(notification.notification_type)}
          </div>
          <div className={styles.notificationText}>
            <p className={styles.notificationMessage}>{notification.message}</p>
            <span className={styles.notificationTime}>
              {formatTime(notification.created_at)}
            </span>
          </div>
          <div className={styles.notificationActions}>
            <button
              className={styles.menuButton}
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : notification.id);
              }}
              aria-label="Notification options"
            >
              <MdMoreVert size={16} />
            </button>
            {isMenuOpen && (
              <div
                className={styles.menuDropdown}
                style={{
                  position: "absolute",
                  right: "0",
                  top: "100%",
                  background: "white",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                  minWidth: "140px",
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
      </div>
    );
  }
);

NotificationItem.displayName = "NotificationItem";

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
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  // Cache management functions for immediate notification display
  const getCachedNotifications = useCallback(() => {
    try {
      const cached = localStorage.getItem(
        `notifications_cache_${user?.id || "default"}`
      );
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Extended cache duration to 10 minutes for better performance
        if (Date.now() - parsedCache.timestamp < 600000) {
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.warn("Error reading notification cache:", error);
    }
    return null;
  }, [user?.id]);

  const cacheNotifications = useCallback(
    (notificationData) => {
      try {
        const cacheData = {
          data: notificationData,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `notifications_cache_${user?.id || "default"}`,
          JSON.stringify(cacheData)
        );
      } catch (error) {
        console.warn("Error caching notifications:", error);
      }
    },
    [user?.id]
  );

  // Fetch notifications directly from API with optimized caching
  const fetchNotifications = useCallback(async () => {
    // Show cached notifications immediately while fetching fresh data
    const cachedNotifications = getCachedNotifications();
    if (cachedNotifications && cachedNotifications.length > 0) {
      setNotifications(cachedNotifications);
      // Only show loading for refresh, not initial load with cached data
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const token = localStorage.getItem("knoxToken");

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Optimized fetch with reduced processing overhead
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

      // Streamlined response processing for better performance
      let notificationsList = [];

      if (Array.isArray(data)) {
        notificationsList = data;
      } else if (data && Array.isArray(data.notifications)) {
        notificationsList = data.notifications;
      } else {
        notificationsList = [];
      }

      setNotifications(notificationsList);

      // Cache the fresh notifications
      cacheNotifications(notificationsList);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);

      // If we have cached data and there's an error, keep showing cached data
      if (cachedNotifications && cachedNotifications.length > 0) {
        setNotifications(cachedNotifications);
      } else {
        // Set empty notifications array as fallback
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedNotifications, cacheNotifications]);

  // Debounced version of fetchNotifications to reduce API calls
  const debouncedFetchNotifications = useMemo(
    () => debounce(() => fetchNotifications(), 1000),
    [fetchNotifications]
  );

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
    debouncedFetchNotifications();
  }, [debouncedFetchNotifications]);

  // Filter notifications with memoization for performance
  const filteredNotifications = useMemo(() => {
    return showAll
      ? notifications
      : notifications.filter((notif) => !notif.is_read);
  }, [notifications, showAll]);

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
          hasData={notifications.length > 0}
          isRefreshing={loading && notifications.length > 0}
          position="top-right"
          size="micro"
          variant="ghost"
          tooltip="Loading notifications..."
          renderThreshold={100}
          timeoutWarning={5000}
          errorTimeout={10000}
          operation="Loading notifications"
        />
        <div className={styles.notificationControls}>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className={styles.refreshButton}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              color: "#666",
              cursor: loading ? "not-allowed" : "pointer",
              marginRight: "12px",
              opacity: loading ? 0.5 : 1,
            }}
            title="Refresh notifications"
          >
            ↻ Refresh
          </button>
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

        {/* Show subtle refresh indicator when updating cached data */}
        {loading && filteredNotifications.length > 0 && (
          <div
            className={styles.refreshingMessage}
            style={{
              fontSize: "12px",
              color: "#666",
              textAlign: "center",
              padding: "8px",
              background: "#f5f5f5",
              borderRadius: "4px",
              margin: "8px 0",
            }}
          >
            Updating notifications...
          </div>
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

        {/* Show notifications immediately - whether from cache or fresh data */}
        {filteredNotifications.length > 0 &&
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              handleMenuAction={handleMenuAction}
              formatTime={formatTime}
              getNotificationIcon={getNotificationIcon}
              notificationItemsRef={notificationItemsRef}
            />
          ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
