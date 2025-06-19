import "./DriverMap.module.css";

/**
 * DriverMap Component
 * Displays drivers and appointments on a map view
 * This is a placeholder component - will need actual map integration
 */
const DriverMap = ({
  drivers = [],
  appointments = [],
  onDriverSelect,
  className = "",
}) => {
  // Placeholder map implementation
  // In a real implementation, this would integrate with Google Maps, Mapbox, etc.

  const availableDrivers = drivers.filter((d) => d.status === "available");
  const busyDrivers = drivers.filter(
    (d) => d.status === "busy" || d.status === "driving"
  );

  return (
    <div className={`driver-map ${className}`}>
      <div className="map-container">
        {/* Placeholder map */}
        <div className="map-placeholder">
          <div className="map-controls">
            <button className="map-control" title="Zoom in">
              <i className="fas fa-plus"></i>
            </button>
            <button className="map-control" title="Zoom out">
              <i className="fas fa-minus"></i>
            </button>
            <button className="map-control" title="Center map">
              <i className="fas fa-crosshairs"></i>
            </button>
            <button className="map-control" title="Toggle view">
              <i className="fas fa-layer-group"></i>
            </button>
          </div>

          <div className="map-content">
            <div className="map-message">
              <i className="fas fa-map"></i>
              <h3>Map View</h3>
              <p>
                Interactive map showing driver locations and pickup requests
              </p>
              <p className="implementation-note">
                <i className="fas fa-info-circle"></i>
                Map integration (Google Maps/Mapbox) will be implemented here
              </p>
            </div>

            {/* Driver markers simulation */}
            <div className="driver-markers">
              {availableDrivers.map((driver, index) => (
                <div
                  key={driver.id}
                  className="driver-marker available"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${30 + index * 10}%`,
                  }}
                  onClick={() => onDriverSelect?.(driver)}
                  title={`${driver.name} - Available`}
                >
                  <i className="fas fa-car"></i>
                  <span className="driver-label">{driver.name}</span>
                </div>
              ))}

              {busyDrivers.map((driver, index) => (
                <div
                  key={driver.id}
                  className="driver-marker busy"
                  style={{
                    left: `${60 + index * 12}%`,
                    top: `${40 + index * 8}%`,
                  }}
                  onClick={() => onDriverSelect?.(driver)}
                  title={`${driver.name} - Busy`}
                >
                  <i className="fas fa-car"></i>
                  <span className="driver-label">{driver.name}</span>
                </div>
              ))}
            </div>

            {/* Appointment markers simulation */}
            <div className="appointment-markers">
              {appointments
                .filter((apt) => apt.location)
                .slice(0, 5)
                .map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className="appointment-marker"
                    style={{
                      left: `${25 + index * 20}%`,
                      top: `${20 + index * 15}%`,
                    }}
                    title={`Appointment #${appointment.id} - ${appointment.location}`}
                  >
                    <i className="fas fa-map-pin"></i>
                    <span className="appointment-label">#{appointment.id}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map legend */}
      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-marker available">
              <i className="fas fa-car"></i>
            </div>
            <span>Available Drivers ({availableDrivers.length})</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker busy">
              <i className="fas fa-car"></i>
            </div>
            <span>Busy Drivers ({busyDrivers.length})</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker appointment">
              <i className="fas fa-map-pin"></i>
            </div>
            <span>Pickup Locations</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="map-stats">
        <div className="stat-item">
          <span className="stat-value">{drivers.length}</span>
          <span className="stat-label">Total Drivers</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{availableDrivers.length}</span>
          <span className="stat-label">Available</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{appointments.length}</span>
          <span className="stat-label">Appointments</span>
        </div>
      </div>
    </div>
  );
};

export default DriverMap;
