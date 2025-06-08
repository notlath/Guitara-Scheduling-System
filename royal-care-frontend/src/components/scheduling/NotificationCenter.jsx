import React, { useState, useEffect } from 'react';
import { MdClose, MdMoreVert, MdMarkAsUnread, MdDelete, MdRefresh } from 'react-icons/md';
import styles from '../../styles/NotificationCenter.module.css';

const NotificationCenter = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Fetch notifications directly from API
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('knoxToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8000/api/scheduling/notifications/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
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
      const token = localStorage.getItem('knoxToken');
      
      const response = await fetch(`http://localhost:8000/api/scheduling/notifications/${notificationId}/mark-read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch {
      // Silently fail - user will see no change in read status
    }
  };

  // Mark notification as unread
  const markAsUnread = async (notificationId) => {
    try {
      const token = localStorage.getItem('knoxToken');
      
      const response = await fetch(`http://localhost:8000/api/scheduling/notifications/${notificationId}/mark-unread/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: false }
              : notif
          )
        );
      }
    } catch {
      // Silently fail - user will see no change in read status
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('knoxToken');
      
      const response = await fetch(`http://localhost:8000/api/scheduling/notifications/${notificationId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      }
    } catch {
      // Silently fail - user will see no change
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('knoxToken');
      
      const response = await fetch('http://localhost:8000/api/scheduling/notifications/mark-all-read/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update all notifications to read
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
      }
    } catch {
      // Silently fail - user will see no change
    }
  };

  // Handle menu actions
  const handleMenuAction = (action, notificationId) => {
    setOpenMenuId(null);
    
    switch (action) {
      case 'markRead':
        markAsRead(notificationId);
        break;
      case 'markUnread':
        markAsUnread(notificationId);
        break;
      case 'delete':
        deleteNotification(notificationId);
        break;
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filter notifications
  const filteredNotifications = showAll 
    ? notifications 
    : notifications.filter(notif => !notif.is_read);

  const unreadCount = notifications.filter(notif => !notif.is_read).length;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
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

        {!loading && !error && filteredNotifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
          >
            <div className={styles.notificationContent}>
              <div className={styles.notificationIcon}>
                {notification.type === 'appointment_created' && '📅'}
                {notification.type === 'appointment_updated' && '🔄'}
                {notification.type === 'appointment_cancelled' && '❌'}
                {notification.type === 'appointment_reminder' && '⏰'}
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
                  setOpenMenuId(openMenuId === notification.id ? null : notification.id);
                }}
              >
                <MdMoreVert size={16} />
              </button>
              
              {openMenuId === notification.id && (
                <div className={styles.menuDropdown}>
                  <button 
                    onClick={() => handleMenuAction(
                      notification.is_read ? 'markUnread' : 'markRead', 
                      notification.id
                    )}
                  >
                    <MdMarkAsUnread size={14} />
                    {notification.is_read ? 'Mark as unread' : 'Mark as read'}
                  </button>
                  <button onClick={() => handleMenuAction('delete', notification.id)}>
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
