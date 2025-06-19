/**
 * Driver assignment and coordination hooks for Operator Dashboard
 * Handles driver assignment, pickup requests, and driver status management
 */
import { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import optimizedDataManager from "../../../services/optimizedDataManager";

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
              status: "assigned",
            },
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Driver assignment failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Unassign driver from appointment
  const unassignDriver = useCallback(
    async (appointmentId) => {
      const loadingKey = `unassign_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.unassignDriver(appointmentId);

        // Update appointment optimistically
        dispatch({
          type: "scheduling/updateAppointment",
          payload: {
            appointmentId,
            updates: {
              driver_id: null,
              status: "confirmed",
            },
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Driver unassignment failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Request pickup for appointment
  const requestPickup = useCallback(
    async (appointmentId, pickupDetails) => {
      const loadingKey = `pickup_${appointmentId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.requestPickup(
          appointmentId,
          pickupDetails
        );

        // Update appointment with pickup request
        dispatch({
          type: "scheduling/updateAppointment",
          payload: {
            appointmentId,
            updates: {
              pickup_requested: true,
              pickup_time: pickupDetails.pickupTime,
              pickup_address: pickupDetails.address,
            },
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Pickup request failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Update driver status
  const updateDriverStatus = useCallback(
    async (driverId, status) => {
      const loadingKey = `driver_status_${driverId}`;
      setLoading((prev) => ({ ...prev, [loadingKey]: true }));

      try {
        const result = await optimizedDataManager.updateDriverStatus(
          driverId,
          status
        );

        // Update driver status in store
        dispatch({
          type: "scheduling/updateDriverStatus",
          payload: {
            driverId,
            status,
          },
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        console.error("Driver status update failed:", error);
        return {
          success: false,
          error: error.message,
        };
      } finally {
        setLoading((prev) => ({ ...prev, [loadingKey]: false }));
      }
    },
    [dispatch]
  );

  // Get available drivers for appointment
  const getAvailableDrivers = useMemo(() => {
    return drivers.filter(
      (driver) =>
        driver.status === "available" &&
        driver.is_active &&
        !driver.current_appointment_id
    );
  }, [drivers]);

  // Get assigned drivers
  const getAssignedDrivers = useMemo(() => {
    return drivers.filter(
      (driver) => driver.status === "assigned" || driver.current_appointment_id
    );
  }, [drivers]);

  // Get driver workload
  const getDriverWorkload = useMemo(() => {
    const workload = {};

    drivers.forEach((driver) => {
      const assignedAppointments = appointments.filter(
        (apt) => apt.driver_id === driver.id
      );

      workload[driver.id] = {
        total: assignedAppointments.length,
        today: assignedAppointments.filter((apt) => {
          const today = new Date().toDateString();
          return new Date(apt.date).toDateString() === today;
        }).length,
        upcoming: assignedAppointments.filter((apt) => {
          return new Date(apt.date + " " + apt.start_time) > new Date();
        }).length,
      };
    });

    return workload;
  }, [drivers, appointments]);

  // Get optimal driver for appointment
  const getOptimalDriver = useCallback(
    (appointment) => {
      const availableDrivers = getAvailableDrivers;

      if (availableDrivers.length === 0) {
        return null;
      }

      // Sort by workload (ascending) and distance (if available)
      const rankedDrivers = availableDrivers
        .map((driver) => ({
          ...driver,
          workload: getDriverWorkload[driver.id]?.today || 0,
        }))
        .sort((a, b) => {
          // Primary: workload (fewer appointments first)
          if (a.workload !== b.workload) {
            return a.workload - b.workload;
          }

          // Secondary: availability score (higher is better)
          const aScore = a.availability_score || 0;
          const bScore = b.availability_score || 0;
          return bScore - aScore;
        });

      return rankedDrivers[0];
    },
    [getAvailableDrivers, getDriverWorkload]
  );

  return {
    // Actions
    assignDriver,
    unassignDriver,
    requestPickup,
    updateDriverStatus,

    // Data
    availableDrivers: getAvailableDrivers,
    assignedDrivers: getAssignedDrivers,
    driverWorkload: getDriverWorkload,
    getOptimalDriver,

    // State
    loading,
  };
};

export default useDriverAssignment;
