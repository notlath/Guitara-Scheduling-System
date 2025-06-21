/**
 * ROBUST APPOINTMENT FILTERING SYSTEM
 * Implements comprehensive error handling, validation, and fallback mechanisms
 */

import { useCallback, useMemo, useRef } from "react";

// Comprehensive filter validation schema
const VALID_FILTER_VALUES = Object.freeze([
  "all",
  "today",
  "upcoming",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "awaiting_payment",
  "overdue",
]);

// Comprehensive status validation
const VALID_STATUSES = Object.freeze([
  "pending",
  "confirmed",
  "driver_confirmed",
  "therapist_confirmed",
  "rejected_by_therapist",
  "rejected_by_driver",
  "cancelled",
  "completed",
  "in_progress",
  "awaiting_payment",
  "pickup_requested",
  "driver_assigned_pickup",
  "journey_started",
  "arrived",
  "dropped_off",
  "session_started",
  "payment_requested",
  "payment_completed",
  "overdue",
  "timeout",
]);

// Stable empty results to prevent re-renders
const EMPTY_FILTER_RESULTS = Object.freeze({
  rejected: Object.freeze([]),
  pending: Object.freeze([]),
  awaitingPayment: Object.freeze([]),
  overdue: Object.freeze([]),
  approachingDeadline: Object.freeze([]),
  activeSessions: Object.freeze([]),
  pickupRequests: Object.freeze([]),
  rejectionStats: Object.freeze({
    total: 0,
    therapist: 0,
    driver: 0,
    pending: 0,
  }),
  error: null,
  validationErrors: Object.freeze([]),
});

// Pre-compiled validation functions
const VALIDATORS = Object.freeze({
  isValidAppointment: (appointment) => {
    if (!appointment || typeof appointment !== "object") return false;
    if (!appointment.id) return false;
    if (!appointment.status || !VALID_STATUSES.includes(appointment.status))
      return false;
    return true;
  },

  isValidDate: (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  isValidFilter: (filter) => {
    return VALID_FILTER_VALUES.includes(filter);
  },
});

// Status categorization with error handling
const STATUS_CHECKS = Object.freeze({
  isRejected: (status) => {
    try {
      return (
        status === "rejected_by_therapist" || status === "rejected_by_driver"
      );
    } catch (error) {
      console.warn("Status check error for isRejected:", error);
      return false;
    }
  },

  isPending: (status) => {
    try {
      return status === "pending" || status === "therapist_confirmed";
    } catch (error) {
      console.warn("Status check error for isPending:", error);
      return false;
    }
  },

  isAwaitingPayment: (status, paymentStatus) => {
    try {
      return (
        status === "awaiting_payment" ||
        (status === "completed" &&
          (!paymentStatus ||
            paymentStatus === "pending" ||
            paymentStatus === "unpaid"))
      );
    } catch (error) {
      console.warn("Status check error for isAwaitingPayment:", error);
      return false;
    }
  },

  isActiveSession: (status) => {
    try {
      return (
        status === "in_progress" ||
        status === "journey_started" ||
        status === "arrived" ||
        status === "session_started"
      );
    } catch (error) {
      console.warn("Status check error for isActiveSession:", error);
      return false;
    }
  },

  isPickupRequest: (status) => {
    try {
      return (
        status === "pickup_requested" || status === "driver_assigned_pickup"
      );
    } catch (error) {
      console.warn("Status check error for isPickupRequest:", error);
      return false;
    }
  },
});

// Timeout thresholds
const TIMEOUT_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const URGENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Robust appointment filtering with comprehensive error handling
 */
export const useRobustAppointmentFilters = (appointments) => {
  const lastResultRef = useRef(EMPTY_FILTER_RESULTS);

  const validateAndFilterAppointments = useCallback((rawAppointments) => {
    const validationErrors = [];

    // Input validation
    if (!rawAppointments) {
      validationErrors.push("Appointments data is null or undefined");
      return { validAppointments: [], validationErrors };
    }

    if (!Array.isArray(rawAppointments)) {
      validationErrors.push(`Expected array, got ${typeof rawAppointments}`);
      return { validAppointments: [], validationErrors };
    }

    // Filter and validate each appointment
    const validAppointments = [];

    for (let i = 0; i < rawAppointments.length; i++) {
      const appointment = rawAppointments[i];

      try {
        if (!VALIDATORS.isValidAppointment(appointment)) {
          validationErrors.push(
            `Invalid appointment at index ${i}: ${JSON.stringify(appointment)}`
          );
          continue;
        }

        // Additional date validation
        if (appointment.date && !VALIDATORS.isValidDate(appointment.date)) {
          validationErrors.push(
            `Invalid date format at index ${i}: ${appointment.date}`
          );
          // Continue processing but flag the error
        }

        if (
          appointment.created_at &&
          !VALIDATORS.isValidDate(appointment.created_at)
        ) {
          validationErrors.push(
            `Invalid created_at format at index ${i}: ${appointment.created_at}`
          );
        }

        validAppointments.push(appointment);
      } catch (error) {
        validationErrors.push(
          `Error processing appointment at index ${i}: ${error.message}`
        );
      }
    }

    return { validAppointments, validationErrors };
  }, []);

  return useMemo(() => {
    try {
      // Early validation
      const { validAppointments, validationErrors } =
        validateAndFilterAppointments(appointments);

      if (validAppointments.length === 0) {
        return {
          ...EMPTY_FILTER_RESULTS,
          validationErrors: Object.freeze(validationErrors),
          error:
            validationErrors.length > 0 ? "Validation errors occurred" : null,
        };
      }

      // Performance optimization - check if we can return cached result
      // const inputHash = `${validAppointments.length}_${validAppointments[0]?.id || ""}_${
      //   validAppointments[validAppointments.length - 1]?.id || ""
      // }`;

      // Initialize result object with error tracking
      const result = {
        rejected: [],
        pending: [],
        awaitingPayment: [],
        overdue: [],
        approachingDeadline: [],
        activeSessions: [],
        pickupRequests: [],
        rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
        validationErrors: Object.freeze(validationErrors),
        error: null,
        processedCount: 0,
        skippedCount: 0,
      };

      const now = Date.now();

      // Process each valid appointment with error boundaries
      for (let i = 0; i < validAppointments.length; i++) {
        try {
          const apt = validAppointments[i];
          result.processedCount++;

          const status = apt.status;
          const paymentStatus = apt.payment_status;
          const createdAt = apt.created_at;

          // Rejection handling with comprehensive stats
          if (STATUS_CHECKS.isRejected(status)) {
            result.rejected.push(apt);
            result.rejectionStats.total++;

            if (status === "rejected_by_therapist") {
              result.rejectionStats.therapist++;
            } else if (status === "rejected_by_driver") {
              result.rejectionStats.driver++;
            }

            if (apt.operator_review_status === "pending") {
              result.rejectionStats.pending++;
            }
            continue;
          }

          // Pending appointments with timeout calculations
          if (STATUS_CHECKS.isPending(status)) {
            result.pending.push(apt);

            if (createdAt && VALIDATORS.isValidDate(createdAt)) {
              try {
                const appointmentAge = now - new Date(createdAt).getTime();
                if (appointmentAge > TIMEOUT_THRESHOLD) {
                  result.overdue.push(apt);
                } else if (appointmentAge > URGENT_THRESHOLD) {
                  result.approachingDeadline.push(apt);
                }
              } catch (dateError) {
                console.warn(
                  `Date processing error for appointment ${apt.id}:`,
                  dateError
                );
              }
            }
            continue;
          }

          // Other statuses with error handling
          if (STATUS_CHECKS.isAwaitingPayment(status, paymentStatus)) {
            result.awaitingPayment.push(apt);
          } else if (STATUS_CHECKS.isActiveSession(status)) {
            result.activeSessions.push(apt);
          } else if (STATUS_CHECKS.isPickupRequest(status)) {
            result.pickupRequests.push(apt);
          }
        } catch (processingError) {
          result.skippedCount++;
          console.warn(`Error processing appointment ${i}:`, processingError);
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

      lastResultRef.current = result;
      return result;
    } catch (error) {
      console.error("Critical error in appointment filtering:", error);

      // Return safe fallback with error information
      return {
        ...EMPTY_FILTER_RESULTS,
        error: error.message || "Unknown filtering error",
        validationErrors: Object.freeze([`Critical error: ${error.message}`]),
      };
    }
  }, [appointments, validateAndFilterAppointments]);
};

/**
 * Robust appointment sorting with comprehensive error handling and validation
 */
export const useRobustAppointmentSorting = (appointments, currentFilter) => {
  const sortCacheRef = useRef(new Map());
  const lastErrorRef = useRef(null);

  return useMemo(() => {
    try {
      // Input validation
      if (!Array.isArray(appointments)) {
        const error = `Invalid appointments input: expected array, got ${typeof appointments}`;
        lastErrorRef.current = error;
        console.warn(error);
        return Object.freeze({
          items: [],
          error,
          appliedFilter: currentFilter,
          originalCount: 0,
          filteredCount: 0,
        });
      }

      if (appointments.length === 0) {
        return Object.freeze({
          items: [],
          error: null,
          appliedFilter: currentFilter,
          originalCount: 0,
          filteredCount: 0,
        });
      }

      // Filter validation
      let actualFilter = currentFilter;
      if (!VALIDATORS.isValidFilter(currentFilter)) {
        const error = `Invalid filter value: ${currentFilter}. Must be one of: ${VALID_FILTER_VALUES.join(
          ", "
        )}`;
        lastErrorRef.current = error;
        console.warn(error);
        // Use 'all' as fallback
        actualFilter = "all";
      }

      // Create cache key
      const cacheKey = `${actualFilter}_${appointments.length}_${
        appointments[0]?.id || ""
      }_${appointments[appointments.length - 1]?.id || ""}`;

      // Return cached result if available
      if (sortCacheRef.current.has(cacheKey)) {
        return sortCacheRef.current.get(cacheKey);
      }

      let filtered = appointments;
      let filterErrors = [];

      // Apply filtering with error handling
      if (actualFilter !== "all") {
        filtered = appointments.filter((apt, index) => {
          try {
            if (!apt) {
              filterErrors.push(`Null appointment at index ${index}`);
              return false;
            }

            switch (actualFilter) {
              case "pending":
                return apt.status === "pending";
              case "confirmed":
                return (
                  apt.status === "confirmed" ||
                  apt.status === "driver_confirmed" ||
                  apt.status === "therapist_confirmed"
                );
              case "completed":
                return apt.status === "completed";
              case "cancelled":
                return apt.status === "cancelled";
              case "rejected":
                return (
                  apt.status === "rejected_by_therapist" ||
                  apt.status === "rejected_by_driver"
                );
              case "awaiting_payment":
                return (
                  apt.status === "awaiting_payment" ||
                  (apt.status === "completed" &&
                    (!apt.payment_status ||
                      apt.payment_status === "pending" ||
                      apt.payment_status === "unpaid"))
                );
              case "in_progress":
                return (
                  apt.status === "in_progress" ||
                  apt.status === "journey_started" ||
                  apt.status === "arrived" ||
                  apt.status === "session_started"
                );
              case "overdue": {
                if (
                  !apt.created_at ||
                  !VALIDATORS.isValidDate(apt.created_at)
                ) {
                  return false;
                }
                const appointmentAge =
                  Date.now() - new Date(apt.created_at).getTime();
                return (
                  appointmentAge > TIMEOUT_THRESHOLD &&
                  (apt.status === "pending" ||
                    apt.status === "therapist_confirmed")
                );
              }
              case "today": {
                if (!apt.date || !VALIDATORS.isValidDate(apt.date)) {
                  filterErrors.push(
                    `Invalid date for today filter at index ${index}: ${apt.date}`
                  );
                  return false;
                }
                const today = new Date().toDateString();
                return new Date(apt.date).toDateString() === today;
              }
              case "upcoming": {
                if (!apt.date || !VALIDATORS.isValidDate(apt.date)) {
                  filterErrors.push(
                    `Invalid date for upcoming filter at index ${index}: ${apt.date}`
                  );
                  return false;
                }
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return new Date(apt.date) >= tomorrow;
              }
              default:
                return true;
            }
          } catch (filterError) {
            filterErrors.push(
              `Filter error at index ${index}: ${filterError.message}`
            );
            return false;
          }
        });
      }

      // Create a copy before sorting to prevent frozen array mutation
      const sortableArray = [...filtered];

      // Apply sorting with error handling
      const sorted = sortableArray.sort((a, b) => {
        try {
          // Null checks
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;

          // Status priority (most urgent first)
          const statusPriority = {
            rejected_by_therapist: 5,
            rejected_by_driver: 5,
            overdue: 4,
            pending: 3,
            therapist_confirmed: 3,
            awaiting_payment: 2,
            in_progress: 1,
            confirmed: 0,
          };

          const aPriority = statusPriority[a.status] || 0;
          const bPriority = statusPriority[b.status] || 0;

          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }

          // Time-based sorting for same priority
          const aTime =
            a.created_at && VALIDATORS.isValidDate(a.created_at)
              ? new Date(a.created_at).getTime()
              : 0;
          const bTime =
            b.created_at && VALIDATORS.isValidDate(b.created_at)
              ? new Date(b.created_at).getTime()
              : 0;

          return bTime - aTime; // Newer first
        } catch (sortError) {
          console.warn("Sort comparison error:", sortError);
          return 0;
        }
      });

      // Create result object
      const result = Object.freeze({
        items: Object.freeze(sorted),
        error:
          filterErrors.length > 0
            ? `Filter errors: ${filterErrors.slice(0, 3).join("; ")}`
            : null,
        appliedFilter: actualFilter,
        originalCount: appointments.length,
        filteredCount: sorted.length,
        filterErrors: Object.freeze(filterErrors),
      });

      // Cache the result
      sortCacheRef.current.set(cacheKey, result);

      // Limit cache size
      if (sortCacheRef.current.size > 20) {
        const firstKey = sortCacheRef.current.keys().next().value;
        sortCacheRef.current.delete(firstKey);
      }

      lastErrorRef.current = null;
      return result;
    } catch (error) {
      const errorMessage = `Critical sorting error: ${error.message}`;
      lastErrorRef.current = errorMessage;
      console.error(errorMessage, error);

      return Object.freeze({
        items: Object.freeze([]),
        error: errorMessage,
        appliedFilter: currentFilter,
        originalCount: Array.isArray(appointments) ? appointments.length : 0,
        filteredCount: 0,
        filterErrors: Object.freeze([errorMessage]),
      });
    }
  }, [appointments, currentFilter]);
};

export default useRobustAppointmentFilters;
