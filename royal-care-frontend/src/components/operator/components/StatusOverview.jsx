/**
 * Status Overview Component
 * Displays key metrics and system status indicators
 */
import styles from "../styles/components/StatusOverview.module.css";

export const StatusCard = ({
  title,
  value,
  status = "normal",
  trend,
  icon,
  description,
  onClick,
  loading = false,
  className = "",
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "#28a745";
      case "warning":
        return "#ffc107";
      case "critical":
        return "#dc3545";
      case "normal":
      default:
        return "#17a2b8";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
        return "fas fa-check-circle";
      case "warning":
        return "fas fa-exclamation-triangle";
      case "critical":
        return "fas fa-exclamation-circle";
      case "normal":
      default:
        return "fas fa-info-circle";
    }
  };

  const cardClass = `${styles.statusCard} ${
    styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]
  } ${className}`;
  const statusColor = getStatusColor(status);

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
    >
      <div className={styles.statusCardHeader}>
        <div className={styles.statusCardIcon} style={{ color: statusColor }}>
          {loading ? (
            <i className="fas fa-spinner fa-spin" />
          ) : (
            <i className={icon || getStatusIcon(status)} />
          )}
        </div>
        <div
          className={styles.statusIndicator}
          style={{ backgroundColor: statusColor }}
        />
      </div>

      <div className={styles.statusCardContent}>
        <h3 className={styles.statusTitle}>{title}</h3>
        <div className={styles.statusValue}>
          {loading ? (
            <div className={styles.loadingPlaceholder} />
          ) : (
            <>
              <span className={styles.valueNumber}>{value}</span>
              {trend && (
                <span
                  className={`${styles.trendIndicator} ${
                    trend.startsWith("+") ? styles.positive : styles.negative
                  }`}
                >
                  <i
                    className={`fas fa-arrow-${
                      trend.startsWith("+") ? "up" : "down"
                    }`}
                  />
                  {trend}
                </span>
              )}
            </>
          )}
        </div>
        {description && (
          <p className={styles.statusDescription}>{description}</p>
        )}
      </div>
    </div>
  );
};

const StatusOverview = ({
  stats = {},
  loading = false,
  onCardClick,
  className = "",
}) => {
  const {
    totalAppointments = 0,
    rejectedCount = 0,
    pendingCount = 0,
    overdueCount = 0,
    paymentPendingCount = 0,
    activeDrivers = 0,
    busyDrivers = 0,
    activeSessions = 0,
  } = stats;

  const statusCards = [
    {
      id: "appointments",
      title: "Today's Appointments",
      value: totalAppointments,
      status: totalAppointments > 0 ? "healthy" : "normal",
      icon: "fas fa-calendar-check",
      description: "Total scheduled appointments",
    },
    {
      id: "rejected",
      title: "Rejected Appointments",
      value: rejectedCount,
      status:
        rejectedCount > 5
          ? "critical"
          : rejectedCount > 0
          ? "warning"
          : "healthy",
      icon: "fas fa-times-circle",
      description: "Require review and action",
    },
    {
      id: "pending",
      title: "Pending Acceptance",
      value: pendingCount,
      status: pendingCount > 10 ? "warning" : "normal",
      icon: "fas fa-clock",
      description: "Awaiting therapist confirmation",
    },
    {
      id: "overdue",
      title: "Overdue Appointments",
      value: overdueCount,
      status: overdueCount > 0 ? "critical" : "healthy",
      icon: "fas fa-exclamation-triangle",
      description: "Past scheduled time",
    },
    {
      id: "payment",
      title: "Payment Pending",
      value: paymentPendingCount,
      status: paymentPendingCount > 5 ? "warning" : "normal",
      icon: "fas fa-credit-card",
      description: "Awaiting payment verification",
    },
    {
      id: "drivers",
      title: "Active Drivers",
      value: `${activeDrivers}/${activeDrivers + busyDrivers}`,
      status: activeDrivers > 0 ? "healthy" : "warning",
      icon: "fas fa-car",
      description: "Available for assignments",
    },
    {
      id: "sessions",
      title: "Active Sessions",
      value: activeSessions,
      status: "normal",
      icon: "fas fa-users",
      description: "Currently in progress",
    },
  ];

  // Calculate system health
  const criticalCount = statusCards.filter(
    (card) => card.status === "critical"
  ).length;
  const warningCount = statusCards.filter(
    (card) => card.status === "warning"
  ).length;

  return (
    <div className={`${styles.statusOverview} ${className}`}>
      <div className={styles.statusOverviewHeader}>
        <h2 className={styles.overviewTitle}>System Status</h2>
        <div className={styles.systemHealth}>
          {criticalCount > 0 ? (
            <span className={`${styles.healthIndicator} ${styles.critical}`}>
              <i className="fas fa-exclamation-circle" />
              {criticalCount} Critical
            </span>
          ) : warningCount > 0 ? (
            <span className={`${styles.healthIndicator} ${styles.warning}`}>
              <i className="fas fa-exclamation-triangle" />
              {warningCount} Warning
            </span>
          ) : (
            <span className={`${styles.healthIndicator} ${styles.healthy}`}>
              <i className="fas fa-check-circle" />
              All Systems Good
            </span>
          )}
        </div>
      </div>

      <div className={styles.statusGrid}>
        {statusCards.map((card) => (
          <StatusCard
            key={card.id}
            {...card}
            loading={loading}
            onClick={() => onCardClick?.(card)}
          />
        ))}
      </div>

      {(criticalCount > 0 || warningCount > 0) && (
        <div className={styles.statusSummary}>
          <div className={styles.summaryContent}>
            <i className="fas fa-info-circle" />
            <span>
              {criticalCount > 0
                ? `${criticalCount} critical issue${
                    criticalCount > 1 ? "s" : ""
                  } require immediate attention`
                : `${warningCount} warning${
                    warningCount > 1 ? "s" : ""
                  } detected`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusOverview;
