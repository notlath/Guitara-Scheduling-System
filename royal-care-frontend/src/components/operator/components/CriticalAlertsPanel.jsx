/**
 * Critical Alerts Panel Component
 * Displays high-priority alerts that require immediate operator attention
 */
import styles from "../styles/components/CriticalAlertsPanel.module.css";

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

  const alertClass = `${styles.alertCard} ${
    styles[
      `alert${
        getAlertColor(type, urgent).charAt(0).toUpperCase() +
        getAlertColor(type, urgent).slice(1)
      }`
    ]
  } ${className}`;
  const shouldShowBadge = count > 0;

  return (
    <div
      className={alertClass}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className={styles.alertIcon}>
        <i className={getAlertIcon(type)} />
        {shouldShowBadge && <span className={styles.alertBadge}>{count}</span>}
      </div>
      <div className={styles.alertContent}>
        <h4 className={styles.alertTitle}>{title}</h4>
        {description && (
          <p className={styles.alertDescription}>{description}</p>
        )}
        {count > 0 && (
          <span className={styles.alertCount}>
            {count} {count === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      {urgent && <div className={styles.urgentIndicator} />}
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
  const buttonClass = `${styles.quickActionBtn} ${
    styles[`quickAction${variant.charAt(0).toUpperCase() + variant.slice(1)}`]
  } ${className}`;

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
      className={`${styles.criticalAlertsPanel} ${
        hasUrgentAlerts ? styles.hasUrgent : ""
      } ${className}`}
    >
      {/* Alert Summary */}
      {totalAlertCount > 0 && (
        <div className={styles.alertsSummary}>
          <h3 className={styles.panelTitle}>
            <i className="fas fa-exclamation-triangle" />
            Critical Alerts ({totalAlertCount})
          </h3>
        </div>
      )}

      {/* Alert Cards */}
      {sortedAlerts.length > 0 && (
        <div className={styles.alertsGrid}>
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
        <div className={styles.quickActionsBar}>
          <h4 className={styles.quickActionsTitle}>Quick Actions</h4>
          <div className={styles.quickActionsGrid}>
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
