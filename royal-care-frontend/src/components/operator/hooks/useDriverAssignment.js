/**
 * Driver assignment and coordination hooks for Operator Dashboard
 * Handles driver assignment, pickup requests, and driver status management
 */
import { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { optimizedDataManager } from "../../../services/optimizedDataManager";

export const useDriverAssignment = (drivers = [], appointments = []) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState({});

  // Assign driver to appointment
  const assignDriver = useCallback(
    async (appointmentId, driverId) => {
      const loadingKey = `assign_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.assignDriver(
          appointmentId,
          driverId
        );

        // Update appointment with driver assignment optimistically
        dispatch({
          type: "scheduling/updateAppointment",
          payload: {
            appointmentId,
            updates: {
              driver_id: driverId,
              driver_status: "assigned",
              updatedAt: new Date().toISOString(),
            },
          },
        });

        // Update driver status
        dispatch({
          type: "scheduling/updateDriverStatus",
          payload: {
            driverId,
            status: "assigned",
            currentAppointment: appointmentId,
          },
        });

        return { success: true, data: result };
      } catch (error) {
        console.error("Driver assignment failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Auto-assign available driver
  const autoAssignDriver = useCallback(
    async (appointmentId) => {
      const availableDrivers = drivers.filter(
        (d) => d.status === "available" && d.is_active
      );

      if (availableDrivers.length === 0) {
        return { success: false, error: "No available drivers" };
      }

      // Simple assignment strategy: first available driver
      // TODO: Implement proximity-based assignment
      const selectedDriver = availableDrivers[0];

      return await assignDriver(appointmentId, selectedDriver.id);
    },
    [drivers, assignDriver]
  );

  // Bulk driver assignment
  const bulkAssignDrivers = useCallback(
    async (assignments) => {
      setLoading((prev) => ({ ...prev, bulk_assign: true }));

      try {
        const results = await Promise.allSettled(
          assignments.map(({ appointmentId, driverId }) =>
            assignDriver(appointmentId, driverId)
          )
        );

        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value.success
        );
        const failed = results.filter(
          (r) => r.status === "rejected" || !r.value.success
        );

        return {
          success: true,
          data: {
            assigned: successful.length,
            failed: failed.length,
            total: assignments.length,
          },
        };
      } catch (error) {
        console.error("Bulk driver assignment failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, bulk_assign: false }));
      }
    },
    [assignDriver]
  );

  // Handle pickup request
  const handlePickupRequest = useCallback(
    async (appointmentId, action = "approve") => {
      const loadingKey = `pickup_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.handlePickupRequest(
          appointmentId,
          action
        );

        // Update appointment status based on action
        const statusMap = {
          approve: "pickup_approved",
          reject: "pickup_rejected",
          assign: "driver_assigned",
        };

        dispatch({
          type: "scheduling/updateAppointmentStatus",
          payload: {
            appointmentId,
            status: statusMap[action] || "pickup_processed",
            updatedAt: new Date().toISOString(),
          },
        });

        return { success: true, data: result };
      } catch (error) {
        console.error("Pickup request handling failed:", error);
        return { success: false, error: error.message };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Computed driver statistics
  const driverStats = useMemo(() => {
    const stats = {
      total: drivers.length,
      available: 0,
      busy: 0,
      offline: 0,
      onBreak: 0,
    };

    drivers.forEach((driver) => {
      switch (driver.status) {
        case "available":
          stats.available++;
          break;
        case "busy":
        case "driving":
        case "transporting":
          stats.busy++;
          break;
        case "on_break":
          stats.onBreak++;
          break;
        default:
          stats.offline++;
      }
    });

    return stats;
  }, [drivers]);

  // Get pickup requests (appointments needing driver assignment)
  const pickupRequests = useMemo(() => {
    return appointments.filter(
      (apt) =>
        apt.status === "pickup_requested" ||
        (apt.status === "confirmed" && !apt.driver_id)
    );
  }, [appointments]);

  return {
    // Actions
    assignDriver,
    autoAssignDriver,
    bulkAssignDrivers,
    handlePickupRequest,

    // States
    loading,

    // Computed data
    driverStats,
    pickupRequests,

    // Utilities
    isLoading: (key) => loading[key] || false,
    getAvailableDrivers: () =>
      drivers.filter((d) => d.status === "available" && d.is_active),
    getBusyDrivers: () =>
      drivers.filter((d) => d.status === "busy" || d.status === "driving"),
  };
};

export default useDriverAssignment;
