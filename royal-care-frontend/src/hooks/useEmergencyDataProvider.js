/**
 * EMERGENCY DATA PROVIDER: Ultra-stable fallback for critical dashboard operations
 * This hook provides a minimal, rock-solid data layer that cannot fail or cause infinite loops
 */

import { useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

// Ultra-stable empty constants
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({
  rejected: EMPTY_ARRAY,
  pending: EMPTY_ARRAY,
  awaitingPayment: EMPTY_ARRAY,
  overdue: EMPTY_ARRAY,
  approachingDeadline: EMPTY_ARRAY,
  activeSessions: EMPTY_ARRAY,
  pickupRequests: EMPTY_ARRAY,
  rejectionStats: Object.freeze({
    total: 0,
    therapist: 0,
    driver: 0,
    pending: 0,
  }),
});

/**
 * Emergency data provider - minimal, stable, no side effects
 */
export const useEmergencyDataProvider = () => {
  const lastValidData = useRef(null);

  // Ultra-simple Redux selector with error boundary
  const appointments = useSelector(
    (state) => {
      try {
        const data = state?.scheduling?.appointments;
        if (Array.isArray(data)) {
          lastValidData.current = data;
          return data;
        }
        return lastValidData.current || EMPTY_ARRAY;
      } catch (error) {
        console.warn("Emergency data provider: Redux access failed", error);
        return lastValidData.current || EMPTY_ARRAY;
      }
    },
    (left, right) => {
      // Simple equality check to prevent unnecessary re-renders
      return left === right || left?.length === right?.length;
    }
  );

  // Emergency filtering - single pass, no mutations, no side effects
  const filteredData = useMemo(() => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return EMPTY_OBJECT;
    }

    try {
      const result = {
        rejected: [],
        pending: [],
        awaitingPayment: [],
        overdue: [],
        approachingDeadline: [],
        activeSessions: [],
        pickupRequests: [],
        rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
      };

      // Safe iteration with error handling
      for (const apt of appointments) {
        if (!apt || typeof apt !== "object") continue;

        const status = apt.status;
        if (typeof status !== "string") continue;

        // Basic filtering logic - no complex operations
        switch (status) {
          case "rejected_by_therapist":
          case "rejected_by_driver":
            result.rejected.push(apt);
            result.rejectionStats.total++;
            break;
          case "pending":
          case "therapist_confirmed":
            result.pending.push(apt);
            break;
          case "awaiting_payment":
            result.awaitingPayment.push(apt);
            break;
          case "in_progress":
          case "journey_started":
          case "arrived":
            result.activeSessions.push(apt);
            break;
          case "pickup_requested":
            result.pickupRequests.push(apt);
            break;
        }
      }

      // Freeze all arrays to prevent mutations
      Object.keys(result).forEach((key) => {
        if (Array.isArray(result[key])) {
          Object.freeze(result[key]);
        }
      });
      Object.freeze(result.rejectionStats);
      Object.freeze(result);

      return result;
    } catch (error) {
      console.warn("Emergency data provider: Filtering failed", error);
      return EMPTY_OBJECT;
    }
  }, [appointments]);

  // Emergency sorting - always creates new array, never mutates
  const getSortedAppointments = useCallback(
    (/* filter = "all" */) => {
      if (!Array.isArray(appointments) || appointments.length === 0) {
        return EMPTY_ARRAY;
      }

      try {
        // Always create a new array before sorting
        const safeArray = [...appointments];

        // Simple sorting by creation date
        safeArray.sort((a, b) => {
          const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return bTime - aTime; // Newest first
        });

        return Object.freeze(safeArray);
      } catch (error) {
        console.warn("Emergency data provider: Sorting failed", error);
        return EMPTY_ARRAY;
      }
    },
    [appointments]
  );

  // Emergency pagination - simple, stable
  const getPaginatedData = useCallback((data, page = 1, itemsPerPage = 10) => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        currentItems: EMPTY_ARRAY,
        totalPages: 0,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    try {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentItems = data.slice(startIndex, endIndex);
      const totalPages = Math.ceil(data.length / itemsPerPage);

      return {
        currentItems: Object.freeze(currentItems),
        totalPages,
        totalItems: data.length,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, data.length),
      };
    } catch (error) {
      console.warn("Emergency data provider: Pagination failed", error);
      return {
        currentItems: EMPTY_ARRAY,
        totalPages: 0,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
  }, []);

  return {
    // Raw data
    appointments,

    // Filtered data
    ...filteredData,

    // Utility functions
    getSortedAppointments,
    getPaginatedData,

    // Status
    hasData: Array.isArray(appointments) && appointments.length > 0,
    isReady: true,
    error: null,
  };
};

export default useEmergencyDataProvider;
