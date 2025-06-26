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
import { useDispatch, useSelector } from "react-redux";
import { markNotificationAsRead } from "../../features/scheduling/schedulingSlice";
import styles from "../../styles/NotificationCenter.module.css";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

// Debug component for troubleshooting
const NotificationDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const { user } = useSelector((state) => state.auth);

  const testNotificationAPI = useCallback(async () => {
    try {
      const token = localStorage.getItem("knoxToken");
      const response = await fetch(
        "http://localhost:8000/api/scheduling/notifications/",
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      setDebugData({
        user: {
          id: user?.id,
          username: user?.username,
          role: user?.role,
        },
        response: {
          status: response.status,
          ok: response.ok,
          data: data,
        },
        timestamp: new Date().toISOString(),
      });

      console.log("🔍 Notification Debug Data:", {
        user: user?.role,
        response: data,
        notificationCount: Array.isArray(data)
          ? data.length
          : Array.isArray(data?.notifications)
          ? data.notifications.length
          : Array.isArray(data?.results)
          ? data.results.length
          : 0,
      });
    } catch (error) {
      setDebugData({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      testNotificationAPI();
    }
  }, [user, testNotificationAPI]);

  if (!debugData) return <div>Loading debug data...</div>;

  return (
    <div
      style={{
        padding: "20px",
        background: "#f0f0f0",
        margin: "20px",
        borderRadius: "8px",
      }}
    >
      <h3>🔧 Notification Debug Info</h3>
      <pre
        style={{
          background: "#fff",
          padding: "10px",
          borderRadius: "4px",
          fontSize: "12px",
        }}
      >
        {JSON.stringify(debugData, null, 2)}
      </pre>
      <button
        onClick={testNotificationAPI}
        style={{ marginTop: "10px", padding: "8px 16px" }}
      >
        Refresh Debug Data
      </button>
    </div>
  );
};

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

      // Try both regular and debug endpoints
      const endpoints = [
        "http://localhost:8000/api/scheduling/notifications/",
        "http://localhost:8000/api/scheduling/notifications/debug_all/",
      ];

      let data = null;
      let usedEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);

          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          });

          console.log(
            `📊 Response status for ${endpoint}: ${response.status} ${response.statusText}`
          );

          if (response.ok) {
            data = await response.json();
            usedEndpoint = endpoint;
            console.log(`✅ Successfully fetched from ${endpoint}:`, data);
            break;
          } else {
            console.warn(
              `⚠️ Failed to fetch from ${endpoint}: ${response.status}`
            );

            // Try to get error details
            try {
              const errorData = await response.json();
              console.log("❌ Error response data:", errorData);
            } catch (parseError) {
              console.warn("Could not parse error response:", parseError);
            }
          }
        } catch (endpointError) {
          console.warn(`❌ Error with endpoint ${endpoint}:`, endpointError);
        }
      }

      if (!data) {
        throw new Error("All notification endpoints failed");
      }

      console.log(`🎯 Used endpoint: ${usedEndpoint}`);
      console.log("📦 Received data:", data);

      // Handle the backend response format
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
            data.unread_count || data.unreadCount || 0
          } unread) for ${user?.role || "unknown"} user`
        );

        // Log debug info if available
        if (data.debug) {
          console.log("🔧 DEBUG MODE ACTIVE");
          console.log(`🔧 Total count: ${data.total_count}`);
          console.log(
            `🔧 Notification types: ${data.notification_types?.join(", ")}`
          );
          console.log(`🔧 Message: ${data.message}`);
        }

        // Log any warnings from backend
        if (data.warning) {
          console.warn("⚠️ Backend warning:", data.warning);
        }
        if (data.errors && data.errors > 0) {
          console.warn(
            `⚠️ Backend encountered ${data.errors} errors while loading notifications`
          );
        }
      } else if (data && Array.isArray(data.results)) {
        // Paginated format - notifications in 'results' array
        notificationsList = data.results;
        console.log(
          `✅ Loaded ${
            notificationsList.length
          } notifications from paginated results (page ${
            data.current_page || 1
          }/${data.total_pages || 1}, total: ${data.count || 0}) for ${
            user?.role || "unknown"
          } user`
        );
      } else if (
        data &&
        data.results &&
        Array.isArray(data.results.notifications)
      ) {
        // Nested paginated format - notifications nested within results object
        notificationsList = data.results.notifications;
        console.log(
          `✅ Loaded ${
            notificationsList.length
          } notifications from nested paginated results (page ${
            data.current_page || 1
          }/${data.total_pages || 1}, total: ${data.count || 0}) for ${
            user?.role || "unknown"
          } user`
        );
      } else {
        // Fallback - treat as empty array
        console.warn("⚠️ Unexpected response format:", data);
        console.log("📋 Available keys in response:", Object.keys(data || {}));
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

        // Log first few notifications for debugging
        console.log("📋 Sample notifications:");
        notificationsList.slice(0, 3).forEach((notif, index) => {
          console.log(
            `  ${index + 1}. ${
              notif.notification_type
            }: ${notif.message?.substring(0, 50)}...`
          );
        });
      } else {
        console.warn(
          "🚨 NO NOTIFICATIONS RECEIVED - This explains the empty state!"
        );
        console.log("🔍 Debugging info:");
        console.log(`  - User: ${user?.username} (${user?.role})`);
        console.log(`  - Token present: ${!!token}`);
        console.log(`  - Response format: ${typeof data}`);
        console.log(`  - Used endpoint: ${usedEndpoint}`);
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

      {/* Debugger - always show for now to help debug the issue */}
      <NotificationDebugger />
    </div>
  );
};

export default NotificationCenter;
