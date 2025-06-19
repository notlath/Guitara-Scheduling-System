import styles from "./DriverList.module.css";

/**
 * DriverList Component
 * Displays a list of drivers with their current status and actions
 */
const DriverList = ({
  drivers = [],
  status = "available",
  onDriverSelect,
  selectedDriver,
  allowDrop = false,
  onAssignmentDrop,
  showETA = false,
  className = "",
}) => {
  const handleDriverClick = (driver) => {
    onDriverSelect?.(driver);
  };

  const handleDrop = (e, driverId) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData("text/plain");
    if (appointmentId && onAssignmentDrop) {
      onAssignmentDrop(appointmentId, driverId);
    }
  };

  const handleDragOver = (e) => {
    if (allowDrop) {
      e.preventDefault();
    }
  };

  if (drivers.length === 0) {
    return (
      <div className={`${styles.driverList} ${styles.empty} ${className}`}>
        <div className={styles.emptyState}>
          <i className="fas fa-user-slash"></i>
          <p>No {status} drivers</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.driverList} ${styles[status]} ${className}`}>
      {drivers.map((driver) => (
        <div
          key={driver.id}
          className={`${styles.driverCard} ${
            selectedDriver?.id === driver.id ? styles.selected : ""
          } ${allowDrop ? styles.droppable : ""}`}
          onClick={() => handleDriverClick(driver)}
          onDrop={allowDrop ? (e) => handleDrop(e, driver.id) : undefined}
          onDragOver={allowDrop ? handleDragOver : undefined}
        >
          <div className={styles.driverInfo}>
            <div className={styles.driverAvatar}>
              <img
                src={driver.profile_photo || "/default-avatar.png"}
                alt={driver.name}
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
              />
              <div
                className={`${styles.statusIndicator} ${styles[driver.status]}`}
              ></div>
            </div>

            <div className={styles.driverDetails}>
              <h4 className={styles.driverName}>{driver.name}</h4>
              <p className={styles.driverPhone}>{driver.phone}</p>
              <div className={styles.driverStatus}>
                <span
                  className={`${styles.statusBadge} ${styles[driver.status]}`}
                >
                  {driver.status}
                </span>
              </div>
            </div>
          </div>

          {/* Current assignment info */}
          {driver.current_appointment && (
            <div className={styles.currentAssignment}>
              <div className={styles.assignmentInfo}>
                <span className={styles.assignmentLabel}>Current:</span>
                <span className={styles.appointmentId}>
                  #{driver.current_appointment.id}
                </span>
              </div>
              {showETA && driver.eta && (
                <div className={styles.etaInfo}>
                  <i className="fas fa-clock"></i>
                  <span>ETA: {driver.eta}</span>
                </div>
              )}
            </div>
          )}

          {/* Driver metrics */}
          <div className={styles.driverMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                {driver.completed_today || 0}
              </span>
              <span className={styles.metricLabel}>Today</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                {driver.rating || "N/A"}
              </span>
              <span className={styles.metricLabel}>Rating</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.driverActions}>
            {status === "available" && (
              <button
                className={styles.contactBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${driver.phone}`);
                }}
                title="Call driver"
              >
                <i className="fas fa-phone"></i>
              </button>
            )}
            {status === "busy" && driver.current_appointment && (
              <button
                className={styles.trackBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open tracking modal
                }}
                title="Track driver"
              >
                <i className="fas fa-map-marker-alt"></i>
              </button>
            )}
          </div>

          {/* Drop zone indicator */}
          {allowDrop && (
            <div className={styles.dropZoneIndicator}>
              <i className="fas fa-plus"></i>
              <span>Drop appointment here</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DriverList;
