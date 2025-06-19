/**
 * PERFORMANCE BREAKTHROUGH: Ultra-optimized appointment filtering
 * Single-pass algorithm with aggressive memoization and stable references
 */

import { useMemo, useRef } from "react";

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
});

// Pre-compiled status check functions for maximum performance
const STATUS_CHECKS = Object.freeze({
  isRejected: (status) =>
    status === "rejected_by_therapist" || status === "rejected_by_driver",
  isPending: (status) =>
    status === "pending" || status === "therapist_confirmed",
  isAwaitingPayment: (status, paymentStatus) =>
    status === "awaiting_payment" ||
    (status === "completed" &&
      (!paymentStatus ||
        paymentStatus === "pending" ||
        paymentStatus === "unpaid")),
  isActiveSession: (status) =>
    status === "in_progress" ||
    status === "journey_started" ||
    status === "arrived" ||
    status === "session_started",
  isPickupRequest: (status) =>
    status === "pickup_requested" || status === "driver_assigned_pickup",
});

// Pre-calculate timeout thresholds
const TIMEOUT_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const URGENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Ultra-fast single-pass appointment filtering with result stability
 */
export const useUltraOptimizedAppointmentFilters = (appointments) => {
  const lastInputRef = useRef();
  const lastResultRef = useRef(EMPTY_FILTER_RESULTS);
  const inputHashRef = useRef();

  return useMemo(() => {
    // Quick bail if no appointments
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return EMPTY_FILTER_RESULTS;
    }

    // Create input hash for change detection
    const inputHash = `${appointments.length}_${appointments[0]?.id || ""}_${
      appointments[appointments.length - 1]?.id || ""
    }`;

    // Return cached result if input hasn't changed
    if (
      inputHashRef.current === inputHash &&
      lastResultRef.current !== EMPTY_FILTER_RESULTS
    ) {
      return lastResultRef.current;
    }

    // PERFORMANCE: Pre-allocate arrays with estimated sizes
    const now = Date.now();

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

    // PERFORMANCE: Single optimized pass with minimal object access
    for (let i = 0; i < appointments.length; i++) {
      const apt = appointments[i];

      // Skip invalid appointments quickly
      if (!apt || !apt.id) continue;

      const status = apt.status;
      const paymentStatus = apt.payment_status;
      const createdAt = apt.created_at;

      // Rejection handling with stats
      if (STATUS_CHECKS.isRejected(status)) {
        result.rejected.push(apt);
        result.rejectionStats.total++;

        if (status === "rejected_by_therapist") {
          result.rejectionStats.therapist++;
        } else {
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

        if (createdAt) {
          const appointmentAge = now - new Date(createdAt).getTime();
          if (appointmentAge > TIMEOUT_THRESHOLD) {
            result.overdue.push(apt);
          } else if (appointmentAge > URGENT_THRESHOLD) {
            result.approachingDeadline.push(apt);
          }
        }
        continue;
      }

      // Other statuses - single checks
      if (STATUS_CHECKS.isAwaitingPayment(status, paymentStatus)) {
        result.awaitingPayment.push(apt);
      } else if (STATUS_CHECKS.isActiveSession(status)) {
        result.activeSessions.push(apt);
      } else if (STATUS_CHECKS.isPickupRequest(status)) {
        result.pickupRequests.push(apt);
      }
    }

    // PERFORMANCE: Freeze arrays to prevent accidental mutations and enable optimizations
    Object.keys(result).forEach((key) => {
      if (Array.isArray(result[key])) {
        Object.freeze(result[key]);
      }
    });
    Object.freeze(result.rejectionStats);
    Object.freeze(result);

    // Cache result
    inputHashRef.current = inputHash;
    lastInputRef.current = appointments;
    lastResultRef.current = result;

    return result;
  }, [appointments]);
};

/**
 * PERFORMANCE: Ultra-optimized appointment sorting with stable results
 */
export const useUltraOptimizedSorting = (appointments, currentFilter) => {
  const sortCacheRef = useRef(new Map());

  return useMemo(() => {
    if (!Array.isArray(appointments) || appointments.length === 0) {
      return Object.freeze([]);
    }

    // Create cache key
    const cacheKey = `${currentFilter}_${appointments.length}_${
      appointments[0]?.id || ""
    }_${appointments[appointments.length - 1]?.id || ""}`;

    // Return cached result if available
    if (sortCacheRef.current.has(cacheKey)) {
      return sortCacheRef.current.get(cacheKey);
    }

    // PERFORMANCE: Single-pass filtering and sorting
    let filtered = appointments;

    if (currentFilter !== "all") {
      filtered = appointments.filter((apt) => {
        if (!apt) return false;

        switch (currentFilter) {
          case "pending":
            return apt.status === "pending";
          case "confirmed":
            return apt.status === "confirmed";
          case "completed":
            return apt.status === "completed";
          case "cancelled":
            return apt.status === "cancelled";
          case "today": {
            const today = new Date().toDateString();
            return apt.date && new Date(apt.date).toDateString() === today;
          }
          case "upcoming": {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return apt.date && new Date(apt.date) >= tomorrow;
          }
          default:
            return true;
        }
      });
    }

    // CRITICAL FIX: Always create a copy before sorting to prevent frozen array mutation
    const sortableArray = [...filtered];

    // PERFORMANCE: Optimized sorting with pre-calculated values
    const sorted = sortableArray.sort((a, b) => {
      // Quick null checks
      if (!a || !b) return 0;

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
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

      return bTime - aTime; // Newer first
    });

    // Freeze result and cache it
    Object.freeze(sorted);
    sortCacheRef.current.set(cacheKey, sorted);

    // Limit cache size
    if (sortCacheRef.current.size > 20) {
      const firstKey = sortCacheRef.current.keys().next().value;
      sortCacheRef.current.delete(firstKey);
    }

    return sorted;
  }, [appointments, currentFilter]);
};

export default useUltraOptimizedAppointmentFilters;
