import { useCallback, useMemo, useState } from "react";
import { useDriverAssignment } from "../../hooks/useDriverAssignment";
import { useOperatorData } from "../../hooks/useOperatorData";
import styles from "./DriverCoordination.module.css";
import DriverList from "./DriverList";
import DriverMap from "./DriverMap";
import PickupManager from "./PickupManager";

/**
 * Driver Coordination Component
 * Manages driver assignments, pickup requests, and driver status
 */
const DriverCoordination = ({ className = "" }) => {
  const { drivers = [], appointments = [] } = useOperatorData();
  const {
    assignDriver,
    unassignDriver,
    requestPickup,
    updateDriverStatus,
    availableDrivers,
    assignedDrivers,
    driverWorkload,
    getOptimalDriver,
    loading,
  } = useDriverAssignment(drivers, appointments);

  // Local state
  const [selectedView, setSelectedView] = useState("overview"); // 'overview', 'map', 'requests'
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Calculate driver stats
  const driverStats = useMemo(() => {
    return {
      total: drivers.length,
      available: availableDrivers.length,
      busy: assignedDrivers.length,
      offline: drivers.filter((d) => !d.is_active).length,
    };
  }, [drivers.length, availableDrivers.length, assignedDrivers.length]);

  // Get pickup requests (appointments that need driver assignment)
  const pickupRequests = useMemo(() => {
    return appointments.filter(
      (apt) =>
        apt.status === "confirmed" && !apt.driver_id && apt.requires_transport
    );
  }, [appointments]);

  // Handle driver assignment via drag and drop
  const handleDriverAssignment = useCallback(
    async (appointmentId, driverId) => {
      try {
        const result = await assignDriver(appointmentId, driverId);
        if (result.success) {
          console.log("Driver assigned successfully");
        } else {
          console.error("Failed to assign driver:", result.error);
        }
      } catch (error) {
        console.error("Failed to assign driver:", error);
      }
    },
    [assignDriver]
  );

  // Handle auto-assignment for a single appointment
  const handleAutoAssignDriver = useCallback(
    async (appointmentId) => {
      try {
        const appointment = appointments.find(
          (apt) => apt.id === appointmentId
        );
        if (!appointment) return;

        const optimalDriver = getOptimalDriver(appointment);
        if (!optimalDriver) {
          console.warn("No available drivers for auto-assignment");
          return;
        }

        const result = await assignDriver(appointmentId, optimalDriver.id);
        if (result.success) {
          console.log("Auto-assignment successful");
        } else {
          console.error("Auto-assignment failed:", result.error);
        }
      } catch (error) {
        console.error("Auto-assignment failed:", error);
      }
    },
    [appointments, getOptimalDriver, assignDriver]
  );

  // Handle bulk auto-assignment
  const handleBulkAutoAssign = useCallback(async () => {
    if (pickupRequests.length === 0 || availableDrivers.length === 0) {
      console.warn(
        "No pickup requests or available drivers for bulk assignment"
      );
      return;
    }

    try {
      const assignments = [];
      for (
        let i = 0;
        i < Math.min(pickupRequests.length, availableDrivers.length);
        i++
      ) {
        const appointment = pickupRequests[i];
        const optimalDriver = getOptimalDriver(appointment);

        if (optimalDriver) {
          assignments.push({
            appointmentId: appointment.id,
            driverId: optimalDriver.id,
          });
        }
      }

      // Execute assignments sequentially to avoid conflicts
      for (const assignment of assignments) {
        await assignDriver(assignment.appointmentId, assignment.driverId);
      }

      console.log(
        `Bulk assignment completed: ${assignments.length} assignments`
      );
    } catch (error) {
      console.error("Bulk assignment failed:", error);
    }
  }, [pickupRequests, availableDrivers, getOptimalDriver, assignDriver]);

  // Handle driver status update
  const handleDriverStatusUpdate = useCallback(
    async (driverId, newStatus) => {
      try {
        const result = await updateDriverStatus(driverId, newStatus);
        if (result.success) {
          console.log("Driver status updated successfully");
        } else {
          console.error("Failed to update driver status:", result.error);
        }
      } catch (error) {
        console.error("Failed to update driver status:", error);
      }
    },
    [updateDriverStatus]
  );

  // Handle pickup request
  const handlePickupRequest = useCallback(
    async (appointmentId, pickupDetails) => {
      try {
        const result = await requestPickup(appointmentId, pickupDetails);
        if (result.success) {
          console.log("Pickup request submitted successfully");
        } else {
          console.error("Failed to submit pickup request:", result.error);
        }
      } catch (error) {
        console.error("Failed to submit pickup request:", error);
      }
    },
    [requestPickup]
  );

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
            onAutoAssign={handleAutoAssignDriver}
            onRequestPickup={handlePickupRequest}
            loading={loading}
          />
        );
      default: // 'overview'
        return (
          <div className={styles.overviewGrid}>
            {/* Driver Stats */}
            <div className={styles.statsCard}>
              <h3>Driver Status</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{driverStats.total}</span>
                  <span className={styles.statLabel}>Total</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {driverStats.available}
                  </span>
                  <span className={styles.statLabel}>Available</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{driverStats.busy}</span>
                  <span className={styles.statLabel}>Busy</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {driverStats.offline}
                  </span>
                  <span className={styles.statLabel}>Offline</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.actionsCard}>
              <h3>Quick Actions</h3>
              <div className={styles.actionButtons}>
                <button
                  className={styles.actionBtn}
                  onClick={handleBulkAutoAssign}
                  disabled={
                    pickupRequests.length === 0 || availableDrivers.length === 0
                  }
                >
                  <i className="fas fa-magic" />
                  Auto-Assign All ({pickupRequests.length})
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => setSelectedView("map")}
                >
                  <i className="fas fa-map" />
                  View Map
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => setSelectedView("requests")}
                >
                  <i className="fas fa-tasks" />
                  Manage Requests ({pickupRequests.length})
                </button>
              </div>
            </div>

            {/* Driver List */}
            <div className={styles.driverListCard}>
              <DriverList
                drivers={drivers}
                availableDrivers={availableDrivers}
                assignedDrivers={assignedDrivers}
                driverWorkload={driverWorkload}
                onDriverSelect={setSelectedDriver}
                onStatusUpdate={handleDriverStatusUpdate}
                onAssignDriver={handleDriverAssignment}
                loading={loading}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`${styles.driverCoordination} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Driver Coordination</h2>
          <div className={styles.statusSummary}>
            <span className={styles.statusItem}>
              {driverStats.available} available
            </span>
            <span className={styles.statusItem}>
              {pickupRequests.length} pending requests
            </span>
          </div>
        </div>

        {/* View Selector */}
        <div className={styles.viewSelector}>
          <button
            className={`${styles.viewBtn} ${
              selectedView === "overview" ? styles.active : ""
            }`}
            onClick={() => setSelectedView("overview")}
          >
            <i className="fas fa-th-large" />
            Overview
          </button>
          <button
            className={`${styles.viewBtn} ${
              selectedView === "map" ? styles.active : ""
            }`}
            onClick={() => setSelectedView("map")}
          >
            <i className="fas fa-map" />
            Map
          </button>
          <button
            className={`${styles.viewBtn} ${
              selectedView === "requests" ? styles.active : ""
            }`}
            onClick={() => setSelectedView("requests")}
          >
            <i className="fas fa-tasks" />
            Requests
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>{renderMainContent()}</div>

      {/* Selected Driver Details */}
      {selectedDriver && (
        <div className={styles.driverDetails}>
          <div className={styles.detailsHeader}>
            <h3>{selectedDriver.name}</h3>
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedDriver(null)}
            >
              <i className="fas fa-times" />
            </button>
          </div>
          <div className={styles.detailsContent}>
            <p>
              <strong>Status:</strong> {selectedDriver.status}
            </p>
            <p>
              <strong>Phone:</strong> {selectedDriver.phone}
            </p>
            <p>
              <strong>Vehicle:</strong> {selectedDriver.vehicle_type}
            </p>
            <p>
              <strong>Current Load:</strong>{" "}
              {driverWorkload[selectedDriver.id]?.today || 0} appointments today
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverCoordination;
