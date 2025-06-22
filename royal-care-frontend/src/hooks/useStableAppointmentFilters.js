/**
 * STABLE APPOINTMENT FILTERING SYSTEM
 * Prevents infinite render loops by using stable references and intelligent caching
 */

import { useCallback, useMemo, useRef } from "react";

// Stable empty constants to prevent reference changes
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_STATS = Object.freeze({
  total: 0,
  therapist: 0,
  driver: 0,
  pending: 0,
});

const STABLE_EMPTY_RESULTS = Object.freeze({
  rejected: EMPTY_ARRAY,
  pending: EMPTY_ARRAY,
  awaitingPayment: EMPTY_ARRAY,
  overdue: EMPTY_ARRAY,
  approachingDeadline: EMPTY_ARRAY,
  activeSessions: EMPTY_ARRAY,
  pickupRequests: EMPTY_ARRAY,
  rejectionStats: EMPTY_STATS,
  error: null,
  validationErrors: EMPTY_ARRAY,
  processedCount: 0,
  skippedCount: 0,
});

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

// Pre-compiled validation functions - stable references
const VALIDATORS = Object.freeze({
  isValidAppointment: (appointment) => {
    if (!appointment || typeof appointment !== "object") return false;
    if (!appointment.id) return false;
    if (!appointment.status || !VALID_STATUSES.includes(appointment.status)) return false;
    return true;
  },

  isValidDate: (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },
});

// Status categorization with error handling - stable references
const STATUS_CHECKS = Object.freeze({
  isRejected: (status) => status === "rejected",
  isPending: (status) => status === "pending",
  isAwaitingPayment: (status, paymentStatus) => {
    return (
      status === "awaiting_payment" ||
      (status === "completed" &&
        (!paymentStatus ||
          paymentStatus === "pending" ||
          paymentStatus === "unpaid"))
    );
  },
  isActiveSession: (status) => {
    return [
      "session_in_progress",
      "in_progress",
      "arrived",
      "at_location",
    ].includes(status);
  },
  isPickupRequest: (status) => {
    return [
      "pickup_requested",
      "driver_assigned_pickup", 
      "return_journey"
    ].includes(status);
  },
});

// Timeout thresholds
const TIMEOUT_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const URGENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Stable appointment filtering hook that prevents infinite render loops
 */
export const useStableAppointmentFilters = (appointments) => {
  const lastResultRef = useRef(STABLE_EMPTY_RESULTS);
  const lastInputHashRef = useRef(null);
  const processedCountRef = useRef(0);

  // Create a stable input hash to detect real changes
  const inputHash = useMemo(() => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return 'empty';
    }
    
    // Create a lightweight hash based on length and key properties
    const keyProperties = appointments.slice(0, 10).map(apt => 
      `${apt?.id || ''}-${apt?.status || ''}-${apt?.payment_status || ''}`
    ).join('|');
    
    return `${appointments.length}-${keyProperties}`;
  }, [appointments]);

  // Stable filter function with no dependencies
  const filterAppointments = useCallback((rawAppointments) => {
    if (!Array.isArray(rawAppointments) || rawAppointments.length === 0) {
      return STABLE_EMPTY_RESULTS;
    }

    const result = {
      rejected: [],
      pending: [],
      awaitingPayment: [],
      overdue: [],
      approachingDeadline: [],
      activeSessions: [],
      pickupRequests: [],
      rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
      error: null,
      validationErrors: [],
      processedCount: 0,
      skippedCount: 0,
    };

    const now = Date.now();

    for (let i = 0; i < rawAppointments.length; i++) {
      try {
        const apt = rawAppointments[i];

        // Skip invalid appointments
        if (!VALIDATORS.isValidAppointment(apt)) {
          result.skippedCount++;
          continue;
        }

        const status = apt.status;
        const paymentStatus = apt.payment_status;
        const createdAt = apt.created_at;

        // Rejection handling
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
        } 
        // Pending appointments with timeout calculations
        else if (STATUS_CHECKS.isPending(status)) {
          result.pending.push(apt);

          if (createdAt && VALIDATORS.isValidDate(createdAt)) {
            try {
              const appointmentAge = now - new Date(createdAt).getTime();
              if (appointmentAge > TIMEOUT_THRESHOLD) {
                result.overdue.push(apt);
              } else if (appointmentAge > URGENT_THRESHOLD) {
                result.approachingDeadline.push(apt);
              }
            } catch {
              // Silent fail for timeout calculations
            }
          }
        } 
        // Other status categories
        else if (STATUS_CHECKS.isAwaitingPayment(status, paymentStatus)) {
          result.awaitingPayment.push(apt);
        } else if (STATUS_CHECKS.isActiveSession(status)) {
          result.activeSessions.push(apt);
        } else if (STATUS_CHECKS.isPickupRequest(status)) {
          result.pickupRequests.push(apt);
        }

        result.processedCount++;
      } catch (error) {
        result.skippedCount++;
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
  }, []); // No dependencies - completely stable

  // Memoized result with stable hash comparison
  return useMemo(() => {
    // If input hasn't changed, return cached result
    if (lastInputHashRef.current === inputHash && lastResultRef.current !== STABLE_EMPTY_RESULTS) {
      return lastResultRef.current;
    }

    // Process new data
    lastInputHashRef.current = inputHash;
    const result = filterAppointments(appointments);
    lastResultRef.current = result;
    
    processedCountRef.current++;
    
    // Only log occasionally to avoid spam
    if (processedCountRef.current % 10 === 1) {
      console.log('🔒 Stable filtering processed:', {
        appointmentsCount: appointments?.length || 0,
        rejectedCount: result.rejected.length,
        pendingCount: result.pending.length,
        processedCount: processedCountRef.current,
        inputHash,
      });
    }

    return result;
  }, [inputHash, appointments, filterAppointments]);
};

/**
 * Stable appointment sorting hook
 */
export const useStableAppointmentSorting = (appointments, currentFilter) => {
  const sortCacheRef = useRef(new Map());
  const lastInputRef = useRef({ appointments: null, filter: null });

  return useMemo(() => {
    // Return empty result for invalid input
    if (!Array.isArray(appointments)) {
      return Object.freeze({
        items: EMPTY_ARRAY,
        error: null,
        appliedFilter: currentFilter,
        originalCount: 0,
        filteredCount: 0,
      });
    }

    if (appointments.length === 0) {
      return Object.freeze({
        items: EMPTY_ARRAY,
        error: null,
        appliedFilter: currentFilter,
        originalCount: 0,
        filteredCount: 0,
      });
    }

    // Create cache key
    const cacheKey = `${appointments.length}-${currentFilter}`;
    
    // Check if input hasn't changed
    if (
      lastInputRef.current.appointments === appointments &&
      lastInputRef.current.filter === currentFilter &&
      sortCacheRef.current.has(cacheKey)
    ) {
      return sortCacheRef.current.get(cacheKey);
    }

    // Apply basic filtering based on currentFilter
    let filteredItems = [...appointments];
    
    if (currentFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filteredItems = appointments.filter(apt => 
        apt.date && apt.date.startsWith(today)
      );
    } else if (currentFilter === 'pending') {
      filteredItems = appointments.filter(apt => apt.status === 'pending');
    } else if (currentFilter === 'rejected') {
      filteredItems = appointments.filter(apt => apt.status === 'rejected');
    }
    // 'all' filter shows everything

    // Sort by created_at (newest first)
    filteredItems.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    const result = Object.freeze({
      items: Object.freeze(filteredItems),
      error: null,
      appliedFilter: currentFilter,
      originalCount: appointments.length,
      filteredCount: filteredItems.length,
    });

    // Cache the result
    sortCacheRef.current.set(cacheKey, result);
    
    // Keep cache size reasonable
    if (sortCacheRef.current.size > 20) {
      const firstKey = sortCacheRef.current.keys().next().value;
      sortCacheRef.current.delete(firstKey);
    }

    // Update last input reference
    lastInputRef.current = { appointments, filter: currentFilter };

    return result;
  }, [appointments, currentFilter]);
};

export default useStableAppointmentFilters;
