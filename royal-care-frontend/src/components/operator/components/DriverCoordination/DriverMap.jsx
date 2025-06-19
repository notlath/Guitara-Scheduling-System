import styles from "./DriverMap.module.css";

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
    <div className={`${styles.driverMap} ${className}`}>
      <div className={styles.mapContainer}>
        {/* Placeholder map */}
        <div className={styles.mapPlaceholder}>
          <div className={styles.mapControls}>
            <button className={styles.mapControl} title="Zoom in">
              <i className="fas fa-plus"></i>
            </button>
            <button className={styles.mapControl} title="Zoom out">
              <i className="fas fa-minus"></i>
            </button>
            <button className={styles.mapControl} title="Center map">
              <i className="fas fa-crosshairs"></i>
            </button>
            <button className={styles.mapControl} title="Toggle view">
              <i className="fas fa-layer-group"></i>
            </button>
          </div>

          <div className={styles.mapContent}>
            <div className={styles.mapMessage}>
              <i className="fas fa-map"></i>
              <h3>Map View</h3>
              <p>
                Interactive map showing driver locations and pickup requests
              </p>
              <p className={styles.implementationNote}>
                <i className="fas fa-info-circle"></i>
                Map integration (Google Maps/Mapbox) will be implemented here
              </p>
            </div>

            {/* Driver markers simulation */}
            <div className={styles.driverMarkers}>
              {availableDrivers.map((driver, index) => (
                <div
                  key={driver.id}
                  className={`${styles.driverMarker} ${styles.available}`}
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${30 + index * 10}%`,
                  }}
                  onClick={() => onDriverSelect?.(driver)}
                  title={`${driver.name} - Available`}
                >
                  <i className="fas fa-car"></i>
                  <span className={styles.driverLabel}>{driver.name}</span>
                </div>
              ))}

              {busyDrivers.map((driver, index) => (
                <div
                  key={driver.id}
                  className={`${styles.driverMarker} ${styles.busy}`}
                  style={{
                    left: `${60 + index * 12}%`,
                    top: `${40 + index * 8}%`,
                  }}
                  onClick={() => onDriverSelect?.(driver)}
                  title={`${driver.name} - Busy`}
                >
                  <i className="fas fa-car"></i>
                  <span className={styles.driverLabel}>{driver.name}</span>
                </div>
              ))}
            </div>

            {/* Appointment markers simulation */}
            <div className={styles.appointmentMarkers}>
              {appointments
                .filter((apt) => apt.location)
                .slice(0, 5)
                .map((appointment, index) => (
                  <div
                    key={appointment.id}
                    className={styles.appointmentMarker}
                    style={{
                      left: `${25 + index * 20}%`,
                      top: `${20 + index * 15}%`,
                    }}
                    title={`Appointment #${appointment.id} - ${appointment.location}`}
                  >
                    <i className="fas fa-map-pin"></i>
                    <span className={styles.appointmentLabel}>
                      #{appointment.id}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map legend */}
      <div className={styles.mapLegend}>
        <h4>Legend</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendMarker} ${styles.available}`}>
              <i className="fas fa-car"></i>
            </div>
            <span>Available Drivers ({availableDrivers.length})</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendMarker} ${styles.busy}`}>
              <i className="fas fa-car"></i>
            </div>
            <span>Busy Drivers ({busyDrivers.length})</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendMarker} ${styles.appointment}`}>
              <i className="fas fa-map-pin"></i>
            </div>
            <span>Pickup Locations</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.mapStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{drivers.length}</span>
          <span className={styles.statLabel}>Total Drivers</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{availableDrivers.length}</span>
          <span className={styles.statLabel}>Available</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{appointments.length}</span>
          <span className={styles.statLabel}>Appointments</span>
        </div>
      </div>
    </div>
  );
};

export default DriverMap;
