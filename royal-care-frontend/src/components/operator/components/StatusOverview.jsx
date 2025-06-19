/**
 * Status Overview Component
 * Displays key metrics and system status indicators
 */
import "./StatusOverview.module.css";

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

  const cardClass = `status-card status-${status} ${className}`;
  const statusColor = getStatusColor(status);

  return (
    <div
      className={cardClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
    >
      <div className="status-card-header">
        <div className="status-card-icon" style={{ color: statusColor }}>
          {loading ? (
            <i className="fas fa-spinner fa-spin" />
          ) : (
            <i className={icon || getStatusIcon(status)} />
          )}
        </div>
        <div
          className="status-indicator"
          style={{ backgroundColor: statusColor }}
        />
      </div>

      <div className="status-card-content">
        <h3 className="status-title">{title}</h3>
        <div className="status-value">
          {loading ? (
            <div className="loading-placeholder" />
          ) : (
            <>
              <span className="value-number">{value}</span>
              {trend && (
                <span
                  className={`trend-indicator ${
                    trend.startsWith("+") ? "positive" : "negative"
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
        {description && <p className="status-description">{description}</p>}
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
      title: "Overdue Items",
      value: overdueCount,
      status: overdueCount > 0 ? "critical" : "healthy",
      icon: "fas fa-exclamation-triangle",
      description: "Require immediate attention",
    },
    {
      id: "payments",
      title: "Payment Verification",
      value: paymentPendingCount,
      status: paymentPendingCount > 5 ? "warning" : "normal",
      icon: "fas fa-credit-card",
      description: "Pending payment verification",
    },
    {
      id: "drivers",
      title: "Available Drivers",
      value: activeDrivers,
      status:
        activeDrivers === 0
          ? "critical"
          : activeDrivers < 3
          ? "warning"
          : "healthy",
      icon: "fas fa-car",
      description: `${busyDrivers} currently busy`,
    },
    {
      id: "sessions",
      title: "Active Sessions",
      value: activeSessions,
      status: "normal",
      icon: "fas fa-user-check",
      description: "Currently in progress",
    },
  ];

  const criticalCount = statusCards.filter(
    (card) => card.status === "critical"
  ).length;
  const warningCount = statusCards.filter(
    (card) => card.status === "warning"
  ).length;

  return (
    <div className={`status-overview ${className}`}>
      <div className="status-overview-header">
        <h2 className="overview-title">System Status</h2>
        <div className="system-health">
          {criticalCount > 0 ? (
            <span className="health-indicator critical">
              <i className="fas fa-exclamation-circle" />
              {criticalCount} Critical
            </span>
          ) : warningCount > 0 ? (
            <span className="health-indicator warning">
              <i className="fas fa-exclamation-triangle" />
              {warningCount} Warning
            </span>
          ) : (
            <span className="health-indicator healthy">
              <i className="fas fa-check-circle" />
              All Systems Good
            </span>
          )}
        </div>
      </div>

      <div className="status-grid">
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
        <div className="status-summary">
          <div className="summary-content">
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
