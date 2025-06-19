import { useCallback, useEffect, useState } from "react";
import { MdDelete, MdMarkAsUnread, MdMoreVert } from "react-icons/md";
import { useDispatch } from "react-redux";
import Pagination from "../../components/Pagination";
import pageTitles from "../../constants/pageTitles";
import { markNotificationAsRead } from "../../features/scheduling/schedulingSlice";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import { usePagination } from "../../hooks/usePagination";
import styles from "./NotificationsPage.module.css";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const dispatch = useDispatch();

  // Pagination configuration
  const ITEMS_PER_PAGE = 10;

  // Use pagination hook
  const pagination = usePagination(notifications, ITEMS_PER_PAGE);

  useEffect(() => {
    document.title = pageTitles.notifications;
  }, []);

  const fetchNotifications = useCallback(async () => {
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

      const notificationsList = Array.isArray(data)
        ? data
        : Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(notificationsList);
      setTotalCount(data.total_count || notificationsList.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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

  const markAsUnread = useCallback(async (notificationId) => {
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
    } catch (error) {
      console.error("Failed to mark notification as unread:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
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
      setTotalCount((prev) => prev - 1);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, []);

  const handleMenuAction = useCallback(
    (action, notificationId) => {
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
    },
    [markAsRead, markAsUnread, deleteNotification]
  );

  const formatTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  }, []);

  const getNotificationIcon = useCallback((type) => {
    switch (type) {
      case "appointment_created":
        return "📅";
      case "appointment_updated":
        return "🔄";
      case "appointment_cancelled":
        return "❌";
      case "appointment_reminder":
        return "⏰";
      default:
        return "🔔";
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  return (
    <PageLayout>
      <LayoutRow
        title={`Notifications${totalCount > 0 ? ` (${totalCount})` : ""}`}
      />
      <div className={styles.notificationsContainer}>
        {/* Notifications List */}
        <div className={styles.notificationsList}>
          {loading && (
            <div className={styles.loadingMessage}>
              Loading notifications...
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <p>Error: {error}</p>
              <button
                onClick={fetchNotifications}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className={styles.emptyMessage}>
              <div className={styles.emptyIcon}>🔔</div>
              <h3>No notifications yet</h3>
              <p>You'll see your notifications here when they arrive.</p>
            </div>
          )}

          {!loading &&
            !error &&
            pagination.currentItems.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationItem} ${
                  !notification.is_read ? styles.unread : ""
                }`}
                data-notification-id={notification.id}
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
                        {notification.is_read
                          ? "Mark as unread"
                          : "Mark as read"}
                      </button>
                      <button
                        onClick={() =>
                          handleMenuAction("delete", notification.id)
                        }
                        className={styles.deleteButton}
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

        {/* Pagination */}
        {!loading && !error && notifications.length > 0 && (
          <div className={styles.paginationContainer}>
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              startIndex={pagination.startIndex + 1}
              endIndex={Math.min(pagination.endIndex, pagination.totalItems)}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              pageRange={pagination.pageRange}
              goToPage={pagination.goToPage}
              goToNextPage={pagination.goToNextPage}
              goToPrevPage={pagination.goToPrevPage}
              goToFirstPage={pagination.goToFirstPage}
              goToLastPage={pagination.goToLastPage}
              showInfo={true}
              itemName="notifications"
              className={styles.notificationsPagination}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default NotificationsPage;
