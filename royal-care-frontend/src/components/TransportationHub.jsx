import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import "../styles/TransportationHub.css";
import { LoadingButton } from "./common/LoadingComponents";

// Dynamic import with error handling for react-window
const ReactWindowModule = {
  FixedSizeList: null,
};

// Try to load react-window dynamically
try {
  import("react-window")
    .then((module) => {
      ReactWindowModule.FixedSizeList = module.FixedSizeList;
    })
    .catch((err) => {
      console.warn(
        "Failed to load react-window, using fallback implementation",
        err
      );
    });
} catch (err) {
  console.warn(
    "Failed to load react-window statically, will try dynamic import",
    err
  );
}

// Lazy-loaded components
const DriverDetailsPanel = lazy(() =>
  import("./transportation/DriverDetailsPanel")
);

const TransportationHub = ({
  pickupRequests = [],
  driverAssignment = { availableDrivers: [], busyDrivers: [] },
  handleAssignDriverPickup = () => {},
  handleAutoAssignPickupRequest = () => {},
  transportationDataManager = null,
  isActive = false,
}) => {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assignmentQueue, setAssignmentQueue] = useState([]);
  const [viewMode, setViewMode] = useState("all"); // all, requests, drivers

  // Conditional data subscriptions based on active view
  useEffect(() => {
    if (!isActive) {
      return () => {
        // Unsubscribe or pause subscriptions when hub not active
        transportationDataManager?.pauseSubscriptions?.();
      };
    }

    // Subscribe only when active
    const unsubscribe = transportationDataManager?.subscribe?.([
      "pickup_requests",
      "driver_status",
      "assignment_queue",
    ]);

    return unsubscribe;
  }, [isActive, transportationDataManager]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const urgentRequests = pickupRequests.filter(
      (req) => req.urgency === "urgent"
    ).length;
    const normalRequests = pickupRequests.length - urgentRequests;
    const availableDrivers = driverAssignment.availableDrivers.length;
    const busyDrivers = driverAssignment.busyDrivers.length;
    const fleetUtilization =
      busyDrivers > 0
        ? Math.round((busyDrivers / (availableDrivers + busyDrivers)) * 100)
        : 0;

    return {
      urgentRequests,
      normalRequests,
      availableDrivers,
      busyDrivers,
      totalRequests: pickupRequests.length,
      totalDrivers: availableDrivers + busyDrivers,
      fleetUtilization,
    };
  }, [pickupRequests, driverAssignment]);

  // Sorted pickup requests for priority display
  const sortedPickupRequests = useMemo(() => {
    return [...pickupRequests].sort((a, b) => {
      // Sort by urgency first
      if (a.urgency === "urgent" && b.urgency !== "urgent") return -1;
      if (b.urgency === "urgent" && a.urgency !== "urgent") return 1;

      // Then by requested time
      return new Date(a.requested_at) - new Date(b.requested_at);
    });
  }, [pickupRequests]);

  // Driver list rendering with virtualization for performance
  const renderDriverList = (drivers, status) => {
    if (drivers.length === 0) {
      return (
        <div className="empty-state">
          <p>No {status} drivers</p>
        </div>
      );
    }

    // Check if we can use virtualization (if react-window loaded successfully)
    const useVirtualization =
      drivers.length > 10 && ReactWindowModule.FixedSizeList;

    if (useVirtualization) {
      const FixedSizeList = ReactWindowModule.FixedSizeList;
      return (
        <FixedSizeList
          height={400}
          itemCount={drivers.length}
          itemSize={90}
          width="100%"
          itemData={{ drivers, status, selectedDriver, setSelectedDriver }}
        >
          {DriverRowVirtualized}
        </FixedSizeList>
      );
    }

    // Fallback to standard list rendering
    return (
      <div className="driver-list">
        {drivers.map((driver) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            status={status}
            isSelected={selectedDriver?.id === driver.id}
            onSelect={() => setSelectedDriver(driver)}
          />
        ))}
      </div>
    );
  };

  // Handle bulk assignment
  const handleBulkAssignment = () => {
    sortedPickupRequests.forEach((request) => {
      handleAutoAssignPickupRequest(request);
    });
  };

  // Optimistic UI update for assignments
  const handleAssignDriver = (requestId, driverId) => {
    // Optimistically update UI
    setAssignmentQueue((prev) => [
      ...prev,
      {
        requestId,
        driverId,
        status: "assigning",
        timestamp: new Date().toISOString(),
      },
    ]);

    // Call the actual assignment function
    handleAssignDriverPickup(requestId, driverId);
  };

  // Render empty state when no data
  if (metrics.totalRequests === 0 && metrics.totalDrivers === 0) {
    return (
      <div className="transportation-hub transportation-hub-empty">
        <div className="empty-state-message">
          <div className="icon">🚗</div>
          <h3>Transportation Hub</h3>
          <p>No active pickup requests or drivers found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transportation-hub">
      {/* Stats Dashboard Row - Full Width */}
      <div className="transportation-stats">
        <div className="stat-card urgent-requests">
          <span className="stat-number">{metrics.urgentRequests}</span>
          <span className="stat-label">Urgent Pickups</span>
          <span className="stat-trend">
            {metrics.urgentRequests > 0 ? "🚨" : "✓"}
          </span>
        </div>
        <div className="stat-card normal-requests">
          <span className="stat-number">{metrics.normalRequests}</span>
          <span className="stat-label">Normal Pickups</span>
          <span className="stat-trend">⏱️</span>
        </div>
        <div className="stat-card available-drivers">
          <span className="stat-number">{metrics.availableDrivers}</span>
          <span className="stat-label">Available Drivers</span>
          <span className="stat-trend">
            {metrics.availableDrivers > 0 ? "🟢" : "🔴"}
          </span>
        </div>
        <div className="stat-card busy-drivers">
          <span className="stat-number">{metrics.busyDrivers}</span>
          <span className="stat-label">Busy Drivers</span>
          <span className="stat-trend">🚕</span>
        </div>
        <div className="stat-card fleet-utilization">
          <span className="stat-number">{metrics.fleetUtilization}%</span>
          <span className="stat-label">Fleet Utilization</span>
          <span className="stat-trend">
            {metrics.fleetUtilization > 75 ? "⚠️" : "✓"}
          </span>
        </div>
      </div>

      {/* Mobile View Selector - Only visible on smaller screens */}
      <div className="transport-view-selector">
        <button
          className={`view-button ${viewMode === "all" ? "active" : ""}`}
          onClick={() => setViewMode("all")}
        >
          All
        </button>
        <button
          className={`view-button ${viewMode === "requests" ? "active" : ""}`}
          onClick={() => setViewMode("requests")}
        >
          Pickup Requests
        </button>
        <button
          className={`view-button ${viewMode === "drivers" ? "active" : ""}`}
          onClick={() => setViewMode("drivers")}
        >
          Drivers
        </button>
      </div>

      {/* Main Grid Area - Responsive layout controlled by CSS */}
      <div className="transport-main-grid">
        {/* Left Side - Pickup Requests (60% on desktop) */}
        <div
          className={`pickup-requests-panel ${
            viewMode === "requests" || viewMode === "all" ? "visible" : "hidden"
          }`}
        >
          <div className="panel-header">
            <h3>Pickup Requests ({metrics.totalRequests})</h3>
            {metrics.totalRequests > 0 && metrics.availableDrivers > 0 && (
              <LoadingButton
                className="bulk-action-btn"
                onClick={handleBulkAssignment}
              >
                Auto-Assign All
              </LoadingButton>
            )}
          </div>

          <div className="pickup-requests-list">
            {metrics.totalRequests === 0 ? (
              <div className="empty-state">
                <p>No pending pickup requests</p>
              </div>
            ) : (
              sortedPickupRequests.map((request) => (
                <div key={request.id} className="pickup-request-card">
                  <div className="request-header">
                    <h4>Therapist: {request.therapist_name}</h4>
                    <span
                      className={`urgency-badge ${request.urgency || "normal"}`}
                    >
                      {request.urgency === "urgent" ? "🚨 URGENT" : "⏰ Normal"}
                    </span>
                  </div>

                  <div className="request-details">
                    <div className="detail-item">
                      <span className="detail-icon">📍</span>
                      <span className="detail-text">{request.location}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">🕒</span>
                      <span className="detail-text">
                        Requested:{" "}
                        {new Date(request.requested_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">⌛</span>
                      <span className="detail-text">
                        Waiting:{" "}
                        {formatTimeDifference(
                          new Date(),
                          new Date(request.requested_at)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="request-actions">
                    {metrics.availableDrivers > 0 ? (
                      <div className="driver-assignment">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignDriver(
                                request.therapist_id,
                                parseInt(e.target.value)
                              );
                            }
                          }}
                          className="driver-select"
                        >
                          <option value="">Select Driver</option>
                          {driverAssignment.availableDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name} -{" "}
                              {driver.vehicle_type}
                            </option>
                          ))}
                        </select>
                        <LoadingButton
                          onClick={() =>
                            handleAssignDriver(request.therapist_id)
                          }
                          className="auto-assign-button"
                        >
                          Auto-Assign
                        </LoadingButton>
                      </div>
                    ) : (
                      <p className="no-drivers-warning">
                        <span className="warning-icon">⚠️</span> No drivers
                        available
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Fleet Status (40% on desktop) */}
        <div
          className={`fleet-status-panel ${
            viewMode === "drivers" || viewMode === "all" ? "visible" : "hidden"
          }`}
        >
          <div className="panel-header">
            <h3>Fleet Status ({metrics.totalDrivers})</h3>
          </div>

          <div className="fleet-content">
            <div className="fleet-tabs">
              <button className="fleet-tab active">All Drivers</button>
              <button className="fleet-tab">
                Available ({metrics.availableDrivers})
              </button>
              <button className="fleet-tab">
                On Duty ({metrics.busyDrivers})
              </button>
            </div>

            <div className="driver-columns">
              <div className="driver-column available-column">
                <h4>Available ({metrics.availableDrivers})</h4>
                {renderDriverList(
                  driverAssignment.availableDrivers,
                  "available"
                )}
              </div>

              <div className="driver-column busy-column">
                <h4>On Duty ({metrics.busyDrivers})</h4>
                {renderDriverList(driverAssignment.busyDrivers, "busy")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Assignment Queue & Driver Details */}
      <div className="transport-bottom-grid">
        {/* Left Side - Assignment Queue (40% width) */}
        <div className="assignment-queue-panel">
          <div className="panel-header">
            <h3>Assignment Queue</h3>
          </div>

          <div className="assignment-queue-list">
            {assignmentQueue.length === 0 ? (
              <div className="empty-state">
                <p>No pending assignments</p>
              </div>
            ) : (
              assignmentQueue.map((assignment, index) => (
                <div
                  key={`${assignment.requestId}-${index}`}
                  className="assignment-item"
                >
                  <span className="assignment-status">
                    {assignment.status === "assigning" ? "⏳" : "✅"}
                  </span>
                  <span className="assignment-details">
                    Driver #{assignment.driverId} assigned to Request #
                    {assignment.requestId}
                  </span>
                  <span className="assignment-time">
                    {formatTimeDifference(
                      new Date(),
                      new Date(assignment.timestamp)
                    )}{" "}
                    ago
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Selected Driver Details (60% width) */}
        <div className="driver-details-panel">
          <div className="panel-header">
            <h3>Driver Details</h3>
          </div>

          <div className="driver-details-content">
            {selectedDriver ? (
              <Suspense
                fallback={
                  <div className="loading">Loading driver details...</div>
                }
              >
                <DriverDetailsPanel driver={selectedDriver} />
              </Suspense>
            ) : (
              <div className="empty-state">
                <p>Select a driver to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format time difference
const formatTimeDifference = (date1, date2) => {
  const diffMs = Math.abs(date1 - date2);
  const diffMins = Math.round(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);

  if (diffHrs > 0) {
    const remainingMins = diffMins % 60;
    return `${diffHrs}h ${remainingMins}m`;
  }
  return `${diffMins}m`;
};

// Virtualized driver row renderer (for performance with many drivers)
const DriverRowVirtualized = ({ index, style, data }) => {
  try {
    const { drivers, status, selectedDriver, setSelectedDriver } = data;
    const driver = drivers[index];

    return (
      <div style={style}>
        <DriverCard
          driver={driver}
          status={status}
          isSelected={selectedDriver?.id === driver.id}
          onSelect={() => setSelectedDriver(driver)}
        />
      </div>
    );
  } catch (err) {
    console.error("Error in virtualized row:", err);
    // Return empty div as fallback if there's an error
    return <div>Error rendering driver</div>;
  }
};

// Driver card component
const DriverCard = ({ driver, status, isSelected, onSelect }) => {
  return (
    <div
      className={`driver-card ${status} ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="driver-status">
        <span className={`status-indicator ${status}`}></span>
      </div>
      <div className="driver-info">
        <h4>
          {driver.first_name} {driver.last_name}
        </h4>
        <div className="driver-details">
          <div className="detail-item">
            <span className="detail-icon">🚗</span>
            <span className="detail-text">{driver.vehicle_type}</span>
          </div>
          {driver.current_location && (
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span className="detail-text">{driver.current_location}</span>
            </div>
          )}
          {status === "busy" && driver.eta && (
            <div className="detail-item">
              <span className="detail-icon">⏱️</span>
              <span className="detail-text">ETA: {driver.eta}</span>
            </div>
          )}
        </div>
      </div>
      {status === "available" && (
        <div className="driver-actions">
          <button className="select-driver-btn">Select</button>
        </div>
      )}
    </div>
  );
};

export default TransportationHub;
