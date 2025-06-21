const DriverDetailsPanel = ({ driver }) => {
  if (!driver) {
    return <div>No driver selected</div>;
  }

  return (
    <div className="driver-details">
      <div className="driver-profile">
        <div className="driver-avatar">
          {driver.photo_url ? (
            <img
              src={driver.photo_url}
              alt={`${driver.first_name} ${driver.last_name}`}
            />
          ) : (
            <div className="avatar-placeholder">
              {driver.first_name[0]}
              {driver.last_name[0]}
            </div>
          )}
        </div>

        <h3 className="driver-name">
          {driver.first_name} {driver.last_name}
        </h3>

        <div className={`driver-status-badge ${driver.status}`}>
          {driver.status === "available" ? "Available" : "On Duty"}
        </div>
      </div>

      <div className="driver-info-sections">
        <div className="info-section">
          <h4>Driver Information</h4>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Driver ID</span>
              <span className="info-value">{driver.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">
                {driver.phone || "Not available"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Vehicle</span>
              <span className="info-value">
                {driver.vehicle_type || "Not specified"}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">License</span>
              <span className="info-value">
                {driver.license_number || "Not available"}
              </span>
            </div>
          </div>
        </div>

        {driver.current_location && (
          <div className="info-section">
            <h4>Current Location</h4>
            <div className="location-info">
              <div className="location-pin">📍</div>
              <div className="location-text">{driver.current_location}</div>
            </div>
            {driver.last_updated && (
              <div className="last-updated">
                Last updated:{" "}
                {new Date(driver.last_updated).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {driver.status === "busy" && (
          <div className="info-section current-assignment">
            <h4>Current Assignment</h4>
            <div className="assignment-details">
              <div className="detail-row">
                <span className="detail-label">Passenger:</span>
                <span className="detail-value">
                  {driver.current_assignment?.passenger_name || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Pickup:</span>
                <span className="detail-value">
                  {driver.current_assignment?.pickup_location || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Destination:</span>
                <span className="detail-value">
                  {driver.current_assignment?.destination || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">ETA:</span>
                <span className="detail-value">
                  {driver.current_assignment?.eta || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="info-section">
          <h4>Performance Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-value">
                {driver.metrics?.trips_today || 0}
              </div>
              <div className="metric-label">Today's Trips</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                {driver.metrics?.avg_response_time || "N/A"}
              </div>
              <div className="metric-label">Avg Response</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                {driver.metrics?.rating ? `${driver.metrics.rating}★` : "N/A"}
              </div>
              <div className="metric-label">Rating</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">
                {driver.metrics?.total_trips || 0}
              </div>
              <div className="metric-label">Total Trips</div>
            </div>
          </div>
        </div>
      </div>

      <div className="driver-actions">
        <button className="action-btn contact-btn">📱 Contact Driver</button>
        {driver.status === "available" && (
          <button className="action-btn assign-btn">🚗 Assign Pickup</button>
        )}
      </div>
    </div>
  );
};

export default DriverDetailsPanel;
