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
  "therapist_confirmed",
  "driver_confirmed",
  "in_progress",
  "journey",
  "arrived",
  "dropped_off",
  "driver_transport_completed",
  "session_in_progress",
  "awaiting_payment",
  "completed",
  "pickup_requested",
  "driver_assigned_pickup",
  "return_journey",
  "transport_completed",
  "cancelled",
  "rejected",
  "auto_cancelled",
  "therapist_confirm",
  "driver_confirm",
  "confirmed",
  "driving_to_location",
  "at_location",
  "therapist_dropped_off",
  "picking_up_therapists",
  "transporting_group",
  "driver_assigned",
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
      return status === "rejected";
    } catch (error) {
      console.warn("Status check error for isRejected:", error);
      return false;
    }
  },

  isPending: (status) => {
    try {
      return status === "pending";
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
        status === "journey" ||
        status === "journey_started" ||
        status === "arrived" ||
        status === "session_started" ||
        status === "session_in_progress" ||
        status === "driving_to_location" ||
        status === "at_location" ||
        status === "dropped_off" ||
        status === "driver_transport_completed" ||
        status === "driver_assigned" ||
        status === "therapist_dropped_off" ||
        status === "picking_up_therapists" ||
        status === "transporting_group"
      );
    } catch (error) {
      console.warn("Status check error for isActiveSession:", error);
      return false;
    }
  },

  isPickupRequest: (status) => {
    try {
      return (
        status === "pickup_requested" ||
        status === "driver_assigned_pickup" ||
        status === "return_journey"
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
    let skippedCount = 0;
    for (let i = 0; i < rawAppointments.length; i++) {
      const appointment = rawAppointments[i];
      try {
        if (!VALIDATORS.isValidAppointment(appointment)) {
          validationErrors.push(
            `Invalid appointment at index ${i}: ${JSON.stringify(appointment)}`
          );
          skippedCount++;
          continue;
        }
        // Permissive date validation: log error but include appointment
        if (appointment.date && !VALIDATORS.isValidDate(appointment.date)) {
          validationErrors.push(
            `Invalid date format at index ${i}: ${appointment.date}`
          );
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
        skippedCount++;
      }
    }
    return { validAppointments, validationErrors, skippedCount };
  }, []);

  return useMemo(() => {
    try {
      // Early validation
      const { validAppointments, validationErrors, skippedCount } =
        validateAndFilterAppointments(appointments);
      if (validAppointments.length === 0) {
        return {
          ...EMPTY_FILTER_RESULTS,
          validationErrors: Object.freeze(validationErrors),
          error:
            validationErrors.length > 0 ? "Validation errors occurred" : null,
          processedCount: 0,
          skippedCount: skippedCount,
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
        skippedCount: skippedCount,
      };

      const now = Date.now();

      // Process each valid appointment with error boundaries
      for (let i = 0; i < validAppointments.length; i++) {
        try {
          const apt = validAppointments[i];

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
            result.processedCount++;
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
            result.processedCount++;
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
          result.processedCount++;
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

      // ✅ ADD DEBUG LOGGING HERE
      console.log(`🔍 DEBUG: Filtering with filter "${currentFilter}"`, {
        appointmentsCount: appointments.length,
        sampleAppointments: appointments.slice(0, 3).map((apt) => ({
          id: apt.id,
          status: apt.status,
          date: apt.date,
          created_at: apt.created_at,
          payment_status: apt.payment_status,
        })),
      });

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
        console.log(`🔍 DEBUG: Using cached result for ${actualFilter}`);
        return sortCacheRef.current.get(cacheKey);
      }

      let filtered = appointments;
      let filterErrors = [];

      // Apply filtering with error handling
      if (actualFilter !== "all") {
        console.log(
          `🔍 Applying filter: ${actualFilter} to ${appointments.length} appointments`
        );

        filtered = appointments.filter((apt, index) => {
          try {
            if (!apt) {
              filterErrors.push(`Null appointment at index ${index}`);
              return false;
            }

            let result = false;
            switch (actualFilter) {
              case "pending":
                result = apt.status === "pending";
                // ✅ ADD DEBUG FOR PENDING
                if (index < 5) {
                  console.log(`🔍 DEBUG pending check apt ${apt.id}:`, {
                    status: apt.status,
                    result: result,
                  });
                }
                break;
              case "confirmed":
                result =
                  apt.status === "confirmed" ||
                  apt.status === "driver_confirmed" ||
                  apt.status === "therapist_confirmed" ||
                  apt.status === "therapist_confirm" ||
                  apt.status === "driver_confirm";
                // ✅ ADD DEBUG FOR CONFIRMED
                if (index < 5) {
                  console.log(`🔍 DEBUG confirmed check apt ${apt.id}:`, {
                    status: apt.status,
                    result: result,
                  });
                }
                break;
              case "completed":
                result = apt.status === "completed";
                break;
              case "cancelled":
                result =
                  apt.status === "cancelled" || apt.status === "auto_cancelled";
                break;
              case "rejected":
                result = apt.status === "rejected";
                break;
              case "awaiting_payment":
                result =
                  apt.status === "awaiting_payment" ||
                  (apt.status === "completed" &&
                    (!apt.payment_status ||
                      apt.payment_status === "pending" ||
                      apt.payment_status === "unpaid"));
                // ✅ ADD DEBUG FOR AWAITING PAYMENT
                if (index < 5) {
                  console.log(
                    `🔍 DEBUG awaiting_payment check apt ${apt.id}:`,
                    {
                      status: apt.status,
                      payment_status: apt.payment_status,
                      result: result,
                    }
                  );
                }
                break;
              case "in_progress":
                result =
                  apt.status === "in_progress" ||
                  apt.status === "journey" ||
                  apt.status === "journey_started" ||
                  apt.status === "arrived" ||
                  apt.status === "session_started" ||
                  apt.status === "session_in_progress" ||
                  apt.status === "driving_to_location" ||
                  apt.status === "at_location" ||
                  apt.status === "dropped_off" ||
                  apt.status === "driver_transport_completed" ||
                  apt.status === "pickup_requested" ||
                  apt.status === "driver_assigned_pickup" ||
                  apt.status === "return_journey" ||
                  apt.status === "transport_completed" ||
                  apt.status === "driver_assigned" ||
                  apt.status === "therapist_dropped_off" ||
                  apt.status === "picking_up_therapists" ||
                  apt.status === "transporting_group";
                break;
              case "overdue": {
                if (
                  !apt.created_at ||
                  !VALIDATORS.isValidDate(apt.created_at)
                ) {
                  result = false;
                  break;
                }
                const appointmentAge =
                  Date.now() - new Date(apt.created_at).getTime();
                result =
                  appointmentAge > TIMEOUT_THRESHOLD &&
                  (apt.status === "pending" ||
                    apt.status === "therapist_confirmed");
                break;
              }
              case "today": {
                if (!apt.date || !VALIDATORS.isValidDate(apt.date)) {
                  filterErrors.push(
                    `Invalid date for today filter at index ${index}: ${apt.date}`
                  );
                  result = false;
                  break;
                }
                // Handle both date strings and date objects
                const appointmentDate = new Date(apt.date);
                const today = new Date();

                // Compare just the date parts (ignore time)
                result =
                  appointmentDate.getFullYear() === today.getFullYear() &&
                  appointmentDate.getMonth() === today.getMonth() &&
                  appointmentDate.getDate() === today.getDate();

                // ✅ ADD DEBUG FOR TODAY
                if (index < 5) {
                  console.log(`🔍 DEBUG today check apt ${apt.id}:`, {
                    date: apt.date,
                    appointmentDate: appointmentDate.toISOString(),
                    today: today.toISOString(),
                    result: result,
                  });
                }
                break;
              }
              case "upcoming": {
                if (!apt.date || !VALIDATORS.isValidDate(apt.date)) {
                  filterErrors.push(
                    `Invalid date for upcoming filter at index ${index}: ${apt.date}`
                  );
                  result = false;
                  break;
                }
                const appointmentDate = new Date(apt.date);
                const today = new Date();

                // Reset today to start of day for proper comparison
                today.setHours(0, 0, 0, 0);
                appointmentDate.setHours(0, 0, 0, 0);

                result = appointmentDate > today;

                // ✅ ADD DEBUG FOR UPCOMING
                if (index < 5) {
                  console.log(`🔍 DEBUG upcoming check apt ${apt.id}:`, {
                    date: apt.date,
                    appointmentDate: appointmentDate.toISOString(),
                    today: today.toISOString(),
                    result: result,
                  });
                }
                break;
              }
              default:
                result = true;
                break;
            }

            return result;
          } catch (filterError) {
            filterErrors.push(
              `Filter error at index ${index}: ${filterError.message}`
            );
            return false;
          }
        });

        // ✅ ADD DEBUG FOR FILTERING RESULTS
        console.log(`🔍 DEBUG: Filter "${actualFilter}" results:`, {
          originalCount: appointments.length,
          filteredCount: filtered.length,
          filterErrors: filterErrors,
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
            rejected: 5,
            overdue: 4,
            pending: 3,
            therapist_confirmed: 3,
            driver_confirmed: 2,
            awaiting_payment: 2,
            in_progress: 1,
            journey: 1,
            session_in_progress: 1,
            confirmed: 0,
            completed: 0,
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
