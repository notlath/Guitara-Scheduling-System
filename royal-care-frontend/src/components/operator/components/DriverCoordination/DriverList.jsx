import "./DriverList.module.css";

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
      <div className={`driver-list empty ${className}`}>
        <div className="empty-state">
          <i className="fas fa-user-slash"></i>
          <p>No {status} drivers</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`driver-list ${status} ${className}`}>
      {drivers.map((driver) => (
        <div
          key={driver.id}
          className={`driver-card ${
            selectedDriver?.id === driver.id ? "selected" : ""
          } ${allowDrop ? "droppable" : ""}`}
          onClick={() => handleDriverClick(driver)}
          onDrop={allowDrop ? (e) => handleDrop(e, driver.id) : undefined}
          onDragOver={allowDrop ? handleDragOver : undefined}
        >
          <div className="driver-info">
            <div className="driver-avatar">
              <img
                src={driver.profile_photo || "/default-avatar.png"}
                alt={driver.name}
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
              />
              <div className={`status-indicator ${driver.status}`}></div>
            </div>

            <div className="driver-details">
              <h4 className="driver-name">{driver.name}</h4>
              <p className="driver-phone">{driver.phone}</p>
              <div className="driver-status">
                <span className={`status-badge ${driver.status}`}>
                  {driver.status}
                </span>
              </div>
            </div>
          </div>

          {/* Current assignment info */}
          {driver.current_appointment && (
            <div className="current-assignment">
              <div className="assignment-info">
                <span className="assignment-label">Current:</span>
                <span className="appointment-id">
                  #{driver.current_appointment.id}
                </span>
              </div>
              {showETA && driver.eta && (
                <div className="eta-info">
                  <i className="fas fa-clock"></i>
                  <span>ETA: {driver.eta}</span>
                </div>
              )}
            </div>
          )}

          {/* Driver metrics */}
          <div className="driver-metrics">
            <div className="metric">
              <span className="metric-value">
                {driver.completed_today || 0}
              </span>
              <span className="metric-label">Today</span>
            </div>
            <div className="metric">
              <span className="metric-value">{driver.rating || "N/A"}</span>
              <span className="metric-label">Rating</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="driver-actions">
            {status === "available" && (
              <button
                className="contact-btn"
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
                className="track-btn"
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
            <div className="drop-zone-indicator">
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
