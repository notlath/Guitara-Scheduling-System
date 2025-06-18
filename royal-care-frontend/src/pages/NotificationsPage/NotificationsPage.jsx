import { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { MdDelete, MdMarkAsUnread, MdMoreVert } from "react-icons/md";
import { markNotificationAsRead } from "../../features/scheduling/schedulingSlice";
import pageTitles from "../../constants/pageTitles";
import styles from "./NotificationsPage.module.css";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = pageTitles.notifications;
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("knoxToken");
      if (!token) throw new Error("No authentication token found");
      const response = await fetch(
        "http://localhost:8000/api/scheduling/notifications/",
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok)
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      const data = await response.json();
      setNotifications(
        Array.isArray(data)
          ? data
          : Array.isArray(data.notifications)
          ? data.notifications
          : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const token = localStorage.getItem("knoxToken");
        await fetch(
          `http://localhost:8000/api/scheduling/notifications/${notificationId}/mark_as_read/`,
          {
            method: "POST",
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
        dispatch(markNotificationAsRead(notificationId));
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [dispatch]
  );

  const markAsUnread = async (notificationId) => {
    try {
      const token = localStorage.getItem("knoxToken");
      await fetch(
        `http://localhost:8000/api/scheduling/notifications/${notificationId}/mark-unread/`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: false } : notif
        )
      );
    } catch {
      // Intentionally ignored
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem("knoxToken");
      await fetch(
        `http://localhost:8000/api/scheduling/notifications/${notificationId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch {
      // Intentionally ignored
    }
  };

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
      default:
        break;
    }
  };

  const filteredNotifications =
    notifications && Array.isArray(notifications) ? notifications : [];
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <PageLayout>
      <LayoutRow title="Notifications" />
      <div className={styles.notificationsList}>
        {loading && (
          <div className={styles.loadingMessage}>Loading notifications...</div>
        )}
        {error && <div className={styles.errorMessage}>Error: {error}</div>}
        {!loading && !error && filteredNotifications.length === 0 && (
          <div className={styles.emptyMessage}>No notifications</div>
        )}
        {!loading &&
          !error &&
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={
                styles.notificationItem +
                (!notification.is_read ? ` ${styles.unread}` : "")
              }
              data-notification-id={notification.id}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationIcon}>
                  {notification.type === "appointment_created" && "📅"}
                  {notification.type === "appointment_updated" && "🔄"}
                  {notification.type === "appointment_cancelled" && "❌"}
                  {notification.type === "appointment_reminder" && "⏰"}
                  {/* Default icon for unknown types */}
                  {![
                    "appointment_created",
                    "appointment_updated",
                    "appointment_cancelled",
                    "appointment_reminder",
                  ].includes(notification.type) && "🔔"}
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
              <div className={styles.notificationActions}>
                <button
                  className={styles.menuButton}
                  aria-label="Open notification actions menu"
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
    </PageLayout>
  );
};

export default NotificationsPage;
