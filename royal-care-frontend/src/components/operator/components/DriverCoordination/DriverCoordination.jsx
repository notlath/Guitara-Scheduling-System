import { useCallback, useState } from "react";
import { useDriverAssignment } from "../../hooks/useDriverAssignment";
import { useOperatorData } from "../../hooks/useOperatorData";
import "./DriverCoordination.module.css";
import DriverList from "./DriverList";
import DriverMap from "./DriverMap";
import PickupManager from "./PickupManager";

/**
 * Driver Coordination Component
 * Manages driver assignments, pickup requests, and driver status
 */
const DriverCoordination = ({ className = "" }) => {
  const { drivers, appointments } = useOperatorData();
  const {
    assignDriver,
    autoAssignDriver,
    bulkAssignDrivers,
    loading,
    driverStats,
    pickupRequests,
    getAvailableDrivers,
    getBusyDrivers,
  } = useDriverAssignment(drivers, appointments);

  // Local state
  const [selectedView, setSelectedView] = useState("overview"); // 'overview', 'map', 'requests'
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Available and busy drivers
  const availableDrivers = getAvailableDrivers();
  const busyDrivers = getBusyDrivers();

  // Handle driver assignment via drag and drop
  const handleDriverAssignment = useCallback(
    async (appointmentId, driverId) => {
      try {
        await assignDriver(appointmentId, driverId);
        // Success feedback will be handled by the hook
      } catch (error) {
        console.error("Failed to assign driver:", error);
      }
    },
    [assignDriver]
  );

  // Handle bulk auto-assignment
  const handleBulkAutoAssign = useCallback(async () => {
    if (pickupRequests.length === 0 || availableDrivers.length === 0) {
      return;
    }

    try {
      const assignments = pickupRequests
        .slice(0, availableDrivers.length)
        .map((appointment, index) => ({
          appointmentId: appointment.id,
          driverId: availableDrivers[index]?.id,
        }));

      await bulkAssignDrivers(assignments);
    } catch (error) {
      console.error("Bulk assignment failed:", error);
    }
  }, [pickupRequests, availableDrivers, bulkAssignDrivers]);

  // Render main content based on selected view
  const renderMainContent = () => {
    switch (selectedView) {
      case "map":
        return (
          <DriverMap
            drivers={drivers}
            appointments={appointments}
            onDriverSelect={setSelectedDriver}
            onAssignmentDrop={handleDriverAssignment}
          />
        );
      case "requests":
        return (
          <PickupManager
            pickupRequests={pickupRequests}
            availableDrivers={availableDrivers}
            onAssignDriver={handleDriverAssignment}
            onAutoAssign={autoAssignDriver}
            loading={loading}
          />
        );
      default:
        return (
          <div className="driver-overview">
            <div className="driver-panels">
              <div className="driver-panel available-panel">
                <div className="panel-header">
                  <h3>Available Drivers ({availableDrivers.length})</h3>
                  <div className="panel-actions">
                    <button
                      className="auto-assign-btn"
                      onClick={handleBulkAutoAssign}
                      disabled={
                        pickupRequests.length === 0 ||
                        availableDrivers.length === 0 ||
                        loading.bulk_assign
                      }
                    >
                      {loading.bulk_assign ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-magic"></i>
                      )}
                      Auto-Assign All
                    </button>
                  </div>
                </div>
                <DriverList
                  drivers={availableDrivers}
                  status="available"
                  onDriverSelect={setSelectedDriver}
                  selectedDriver={selectedDriver}
                  allowDrop={true}
                  onAssignmentDrop={handleDriverAssignment}
                />
              </div>

              <div className="driver-panel busy-panel">
                <div className="panel-header">
                  <h3>Busy Drivers ({busyDrivers.length})</h3>
                </div>
                <DriverList
                  drivers={busyDrivers}
                  status="busy"
                  onDriverSelect={setSelectedDriver}
                  selectedDriver={selectedDriver}
                  showETA={true}
                />
              </div>
            </div>

            <div className="pickup-requests-panel">
              <div className="panel-header">
                <h3>Pickup Requests ({pickupRequests.length})</h3>
                {pickupRequests.length > 0 && (
                  <span className="urgent-badge">
                    {
                      pickupRequests.filter((r) => r.urgency_level === "urgent")
                        .length
                    }{" "}
                    urgent
                  </span>
                )}
              </div>
              <PickupManager
                pickupRequests={pickupRequests}
                availableDrivers={availableDrivers}
                onAssignDriver={handleDriverAssignment}
                onAutoAssign={autoAssignDriver}
                loading={loading}
                compact={true}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`driver-coordination ${className}`}>
      {/* Header with stats and view switcher */}
      <div className="coordination-header">
        <div className="driver-stats">
          <div className="stat-card">
            <span className="stat-value">{driverStats.available}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{driverStats.busy}</span>
            <span className="stat-label">Busy</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{pickupRequests.length}</span>
            <span className="stat-label">Requests</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{driverStats.offline}</span>
            <span className="stat-label">Offline</span>
          </div>
        </div>

        <div className="view-switcher">
          <button
            className={`view-btn ${
              selectedView === "overview" ? "active" : ""
            }`}
            onClick={() => setSelectedView("overview")}
          >
            <i className="fas fa-th-large"></i>
            Overview
          </button>
          <button
            className={`view-btn ${selectedView === "map" ? "active" : ""}`}
            onClick={() => setSelectedView("map")}
          >
            <i className="fas fa-map"></i>
            Map
          </button>
          <button
            className={`view-btn ${
              selectedView === "requests" ? "active" : ""
            }`}
            onClick={() => setSelectedView("requests")}
          >
            <i className="fas fa-list"></i>
            Requests
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="coordination-content">{renderMainContent()}</div>

      {/* Selected driver details */}
      {selectedDriver && (
        <div className="driver-details-panel">
          <div className="panel-header">
            <h3>Driver Details</h3>
            <button
              className="close-btn"
              onClick={() => setSelectedDriver(null)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="driver-info">
            <div className="driver-avatar">
              <img
                src={selectedDriver.profile_photo || "/default-avatar.png"}
                alt={selectedDriver.name}
              />
              <div
                className={`status-indicator ${selectedDriver.status}`}
              ></div>
            </div>
            <div className="driver-details">
              <h4>{selectedDriver.name}</h4>
              <p>{selectedDriver.phone}</p>
              <p className="driver-status">
                Status:{" "}
                <span className={`status ${selectedDriver.status}`}>
                  {selectedDriver.status}
                </span>
              </p>
              {selectedDriver.current_appointment && (
                <p className="current-appointment">
                  Current: Appointment #{selectedDriver.current_appointment.id}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverCoordination;
