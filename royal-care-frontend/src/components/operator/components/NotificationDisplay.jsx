/**
 * NotificationDisplay Component
 * Displays floating notifications with actions and animations
 */
import "./NotificationDisplay.module.css";

const NotificationDisplay = ({
  notifications = [],
  onDismiss,
  onAction,
  position = "top-right",
  className = "",
}) => {
  if (notifications.length === 0) return null;

  const getPositionClass = (position) => {
    const positions = {
      "top-right": "notifications-top-right",
      "top-left": "notifications-top-left",
      "bottom-right": "notifications-bottom-right",
      "bottom-left": "notifications-bottom-left",
      "top-center": "notifications-top-center",
      "bottom-center": "notifications-bottom-center",
    };
    return positions[position] || positions["top-right"];
  };

  const handleDismiss = (notificationId, event) => {
    event.stopPropagation();
    onDismiss?.(notificationId);
  };

  const handleAction = (notificationId, actionId, event) => {
    event.stopPropagation();
    onAction?.(notificationId, actionId);
  };

  return (
    <div
      className={`notifications-container ${getPositionClass(
        position
      )} ${className}`}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type.toLowerCase()}`}
          style={{
            borderLeftColor: notification.config.color,
            animationDelay: `${notifications.indexOf(notification) * 100}ms`,
          }}
        >
          {/* Notification Header */}
          <div className="notification-header">
            <div className="notification-icon">
              <i
                className={notification.config.icon}
                style={{ color: notification.config.color }}
              />
            </div>
            <div className="notification-content">
              <h4 className="notification-title">{notification.title}</h4>
              <p className="notification-message">{notification.message}</p>
            </div>
            <button
              className="notification-close"
              onClick={(e) => handleDismiss(notification.id, e)}
              aria-label="Dismiss notification"
            >
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Notification Actions */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="notification-actions">
              {notification.actions.map((action) => (
                <button
                  key={action.id}
                  className={`notification-action-btn ${
                    action.variant || "primary"
                  }`}
                  onClick={(e) => handleAction(notification.id, action.id, e)}
                >
                  {action.icon && <i className={action.icon} />}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Progress bar for timed notifications */}
          {notification.config.duration > 0 && (
            <div className="notification-progress">
              <div
                className="notification-progress-bar"
                style={{
                  animation: `shrinkProgress ${notification.config.duration}ms linear forwards`,
                  backgroundColor: notification.config.color,
                }}
              />
            </div>
          )}

          {/* Timestamp */}
          <div className="notification-timestamp">
            {notification.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationDisplay;
