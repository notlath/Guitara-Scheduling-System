/**
 * Critical Alerts Panel Component
 * Displays high-priority alerts that require immediate operator attention
 */
import "./CriticalAlertsPanel.module.css";

export const AlertCard = ({
  type,
  count,
  title,
  description,
  onClick,
  urgent = false,
  className = "",
}) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case "overdue":
        return "fas fa-exclamation-triangle";
      case "payment":
        return "fas fa-credit-card";
      case "drivers":
        return "fas fa-car";
      case "rejected":
        return "fas fa-times-circle";
      case "emergency":
        return "fas fa-exclamation-circle";
      default:
        return "fas fa-bell";
    }
  };

  const getAlertColor = (type, urgent) => {
    if (urgent) return "critical";

    switch (type) {
      case "overdue":
      case "emergency":
        return "critical";
      case "payment":
      case "drivers":
        return "warning";
      case "rejected":
        return "danger";
      default:
        return "info";
    }
  };

  const alertClass = `alert-card alert-${getAlertColor(
    type,
    urgent
  )} ${className}`;
  const shouldShowBadge = count > 0;

  return (
    <div
      className={alertClass}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="alert-icon">
        <i className={getAlertIcon(type)} />
        {shouldShowBadge && <span className="alert-badge">{count}</span>}
      </div>
      <div className="alert-content">
        <h4 className="alert-title">{title}</h4>
        {description && <p className="alert-description">{description}</p>}
        {count > 0 && (
          <span className="alert-count">
            {count} {count === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      {urgent && <div className="urgent-indicator" />}
    </div>
  );
};

export const QuickActionButton = ({
  label,
  icon,
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  className = "",
}) => {
  const buttonClass = `quick-action-btn quick-action-${variant} ${className}`;

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin" />
      ) : (
        <i className={icon} />
      )}
      <span>{label}</span>
    </button>
  );
};

const CriticalAlertsPanel = ({
  alerts = [],
  quickActions = [],
  onAlertClick,
  onQuickAction,
  className = "",
}) => {
  // Sort alerts by priority (urgent first, then by count)
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return (b.count || 0) - (a.count || 0);
  });

  const hasUrgentAlerts = alerts.some((alert) => alert.urgent);
  const totalAlertCount = alerts.reduce(
    (sum, alert) => sum + (alert.count || 0),
    0
  );

  if (totalAlertCount === 0 && quickActions.length === 0) {
    return null; // Don't render if no alerts or actions
  }

  return (
    <div
      className={`critical-alerts-panel ${
        hasUrgentAlerts ? "has-urgent" : ""
      } ${className}`}
    >
      {/* Alert Summary */}
      {totalAlertCount > 0 && (
        <div className="alerts-summary">
          <h3 className="panel-title">
            <i className="fas fa-exclamation-triangle" />
            Critical Alerts ({totalAlertCount})
          </h3>
        </div>
      )}

      {/* Alert Cards */}
      {sortedAlerts.length > 0 && (
        <div className="alerts-grid">
          {sortedAlerts.map((alert, index) => (
            <AlertCard
              key={alert.type || index}
              {...alert}
              onClick={() => onAlertClick?.(alert)}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="quick-actions-bar">
          <h4 className="quick-actions-title">Quick Actions</h4>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={action.action || index}
                {...action}
                onClick={() => onQuickAction?.(action)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalAlertsPanel;
