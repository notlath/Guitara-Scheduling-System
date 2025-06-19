/**
 * Performance-optimized hooks specifically for OperatorDashboard
 * Eliminates unnecessary re-renders and optimizes data filtering
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStableValue } from "./usePerformanceOptimization";

/**
 * Optimized countdown timer hook that minimizes re-renders
 * Only updates when countdown values actually change and implements efficient batching
 */
export const useOptimizedCountdown = (appointments, isActive) => {
  const [countdowns, setCountdowns] = useState({});
  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const batchTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef({});

  // Stable appointments reference to prevent unnecessary timer resets
  const stableAppointments = useStableValue(appointments);

  // Immediate countdown updates for better performance
  const updateCountdownsImmediately = useCallback(() => {
    const updates = { ...pendingUpdatesRef.current };
    pendingUpdatesRef.current = {};

    if (Object.keys(updates).length > 0) {
      setCountdowns((prev) => ({
        ...prev,
        ...updates,
      }));
    }
  }, []);

  // Batched countdown updates for non-critical updates only
  const batchCountdownUpdates = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(() => {
      updateCountdownsImmediately();
    }, 50); // Reduced from 100ms to 50ms for better responsiveness
  }, [updateCountdownsImmediately]);

  const updateCountdowns = useCallback(() => {
    if (!stableAppointments || stableAppointments.length === 0) return;

    const now = Date.now();

    // Throttle updates to prevent excessive calculations
    if (now - lastUpdateRef.current < 950) return; // Update at most every 950ms
    lastUpdateRef.current = now;

    const timeoutThreshold = 15 * 60 * 1000; // 15 minutes
    let hasChanges = false;

    for (let i = 0; i < stableAppointments.length; i++) {
      const apt = stableAppointments[i];

      if (!apt.created_at || apt.status !== "pending") continue;

      const appointmentAge = now - new Date(apt.created_at).getTime();
      const remainingTime = Math.max(0, timeoutThreshold - appointmentAge);
      const remainingSeconds = Math.floor(remainingTime / 1000);

      // Only update if changed significantly (more than 1 second difference)
      const previousSeconds = countdowns[apt.id];
      if (
        previousSeconds === undefined ||
        Math.abs(previousSeconds - remainingSeconds) >= 1
      ) {
        pendingUpdatesRef.current[apt.id] = remainingSeconds;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      batchCountdownUpdates();
    }
  }, [stableAppointments, countdowns, batchCountdownUpdates]);

  // Optimized timer management with reduced frequency
  const startTimer = useCallback(() => {
    if (intervalRef.current) return; // Already running

    intervalRef.current = setInterval(() => {
      updateCountdowns();
    }, 1000); // Keep 1-second interval but batch the updates
  }, [updateCountdowns]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  // Manage timer lifecycle
  const manageTimer = useCallback(() => {
    if (isActive && stableAppointments.length > 0) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [isActive, stableAppointments.length, startTimer, stopTimer]);

  // Optimized initial countdown calculation with memoization
  const initialCountdowns = useMemo(() => {
    if (!stableAppointments || stableAppointments.length === 0) return {};

    const now = Date.now();
    const initial = {};
    const timeoutThreshold = 15 * 60 * 1000;

    for (let i = 0; i < stableAppointments.length; i++) {
      const apt = stableAppointments[i];

      if (!apt.created_at || apt.status !== "pending") continue;

      const appointmentAge = now - new Date(apt.created_at).getTime();
      const remainingTime = Math.max(0, timeoutThreshold - appointmentAge);
      initial[apt.id] = Math.floor(remainingTime / 1000);
    }

    return initial;
  }, [stableAppointments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  return {
    countdowns:
      Object.keys(countdowns).length > 0 ? countdowns : initialCountdowns,
    manageTimer,
    stopTimer,
  };
};

/**
 * Optimized appointments filtering with memoization and batch updates
 * Uses a more efficient single-pass algorithm with better performance characteristics
 */
export const useOptimizedAppointmentFilters = (appointments) => {
  const stableAppointments = useStableValue(appointments);

  // Enhanced single memoization with performance optimizations
  const filteredAppointments = useMemo(() => {
    if (!Array.isArray(stableAppointments) || stableAppointments.length === 0) {
      return {
        rejected: [],
        pending: [],
        awaitingPayment: [],
        overdue: [],
        approachingDeadline: [],
        activeSessions: [],
        pickupRequests: [],
        rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
      };
    }

    const now = Date.now();
    const timeoutThreshold = 15 * 60 * 1000; // 15 minutes
    const urgentThreshold = 5 * 60 * 1000; // 5 minutes

    // Pre-allocate arrays for better performance
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

    // Cache status checks for better performance
    const statusChecks = {
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
        [
          "in_progress",
          "journey_started",
          "arrived",
          "session_started",
        ].includes(status),
      isPickupRequest: (status) =>
        status === "pickup_requested" || status === "driver_assigned_pickup",
    };

    // Single optimized pass through appointments array
    for (let i = 0; i < stableAppointments.length; i++) {
      const apt = stableAppointments[i];
      const { status, rejection_status, created_at, payment_status } = apt;

      // Rejected appointments - optimized check
      if (statusChecks.isRejected(status) && rejection_status !== "reviewed") {
        result.rejected.push(apt);

        // Update rejection stats efficiently
        result.rejectionStats.total++;
        if (status === "rejected_by_therapist") {
          result.rejectionStats.therapist++;
        } else {
          result.rejectionStats.driver++;
        }
        if (rejection_status === "pending") {
          result.rejectionStats.pending++;
        }
        continue; // Skip other checks for rejected appointments
      }

      // Pending appointments with timeout detection
      if (statusChecks.isPending(status)) {
        result.pending.push(apt);

        // Optimize timeout calculations
        if (created_at) {
          const appointmentAge = now - new Date(created_at).getTime();

          if (appointmentAge > timeoutThreshold) {
            result.overdue.push(apt);
          } else if (appointmentAge > urgentThreshold) {
            result.approachingDeadline.push(apt);
          }
        }
        continue; // Skip other checks for pending appointments
      }

      // Awaiting payment appointments
      if (statusChecks.isAwaitingPayment(status, payment_status)) {
        result.awaitingPayment.push(apt);
        continue;
      }

      // Active sessions
      if (statusChecks.isActiveSession(status)) {
        result.activeSessions.push(apt);
        continue;
      }

      // Pickup requests
      if (statusChecks.isPickupRequest(status)) {
        result.pickupRequests.push(apt);
      }
    }

    return result;
  }, [stableAppointments]);

  return filteredAppointments;
};

/**
 * Optimized loading state manager
 * Reduces complex loading calculations and prevents render loops
 */
export const useOptimizedLoadingState = (
  centralLoading,
  appointments,
  hasAnyData
) => {
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const timeoutRef = useRef(null);

  // Stable loading calculation
  const loading = useMemo(() => {
    // Simple, fast checks first
    if (loadingTimeout) return false;
    if (hasAnyData || Array.isArray(appointments)) return false;
    return centralLoading;
  }, [centralLoading, appointments, hasAnyData, loadingTimeout]);

  // Timeout management
  const manageTimeout = useCallback(() => {
    if (centralLoading && !timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        console.warn("⚠️ OperatorDashboard: Loading timeout reached");
        setLoadingTimeout(true);
        timeoutRef.current = null;
      }, 10000);
    } else if (!centralLoading && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setLoadingTimeout(false);
    }
  }, [centralLoading]);

  return {
    loading,
    manageTimeout,
    isTimeout: loadingTimeout,
  };
};

/**
 * Optimized button loading state manager
 * Prevents unnecessary re-renders when button states change
 * ✅ PERFORMANCE FIX: Removed batching delay for immediate button responsiveness
 */
export const useOptimizedButtonLoading = () => {
  const [buttonLoading, setButtonLoading] = useState({});

  // ✅ PERFORMANCE FIX: Immediate button loading updates (removed batching delay)
  const setActionLoading = useCallback((actionKey, isLoading) => {
    setButtonLoading((prev) => {
      if (isLoading) {
        return { ...prev, [actionKey]: true };
      } else {
        const newState = { ...prev };
        delete newState[actionKey];
        return newState;
      }
    });
  }, []);

  // Force clear loading state for emergency situations
  const forceClearLoading = useCallback((actionKey) => {
    setButtonLoading((prev) => {
      const newState = { ...prev };
      delete newState[actionKey];
      return newState;
    });
  }, []);

  return {
    buttonLoading,
    setActionLoading,
    forceClearLoading,
  };
};

/**
 * Optimized state management hook for Operator Dashboard
 * Reduces state updates and prevents unnecessary re-renders
 */
export const useOptimizedOperatorState = () => {
  const [dashboardState, setDashboardState] = useState({
    currentView: "rejected",
    selectedDate: new Date().toISOString().split("T")[0],
    driverAssignment: {
      availableDrivers: [],
      busyDrivers: [],
      pendingPickups: [],
    },
    attendanceRecords: [],
    modals: {
      payment: { isOpen: false, appointmentId: null, appointmentDetails: null },
      review: { isOpen: false, appointmentId: null, rejectionReason: "" },
    },
    loading: {
      attendance: false,
      autoCancel: false,
    },
  });

  // Batch state updates to prevent multiple re-renders
  const updateDashboardState = useCallback((updates) => {
    setDashboardState((prev) => {
      // Only update if there are actual changes
      const newState = { ...prev };
      let hasChanges = false;

      Object.entries(updates).forEach(([key, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // Deep merge for objects
          newState[key] = { ...newState[key], ...value };
          hasChanges = true;
        } else if (newState[key] !== value) {
          newState[key] = value;
          hasChanges = true;
        }
      });

      return hasChanges ? newState : prev;
    });
  }, []);

  // Optimized specific updaters
  const setCurrentView = useCallback(
    (view) => {
      updateDashboardState({ currentView: view });
    },
    [updateDashboardState]
  );

  const setSelectedDate = useCallback(
    (date) => {
      updateDashboardState({ selectedDate: date });
    },
    [updateDashboardState]
  );

  const updateDriverAssignment = useCallback(
    (assignment) => {
      updateDashboardState({ driverAssignment: assignment });
    },
    [updateDashboardState]
  );

  const updateModal = useCallback(
    (modalType, modalData) => {
      updateDashboardState({
        modals: {
          [modalType]: modalData,
        },
      });
    },
    [updateDashboardState]
  );

  const setLoading = useCallback(
    (loadingType, isLoading) => {
      updateDashboardState({
        loading: {
          [loadingType]: isLoading,
        },
      });
    },
    [updateDashboardState]
  );

  return {
    dashboardState,
    updateDashboardState,
    setCurrentView,
    setSelectedDate,
    updateDriverAssignment,
    updateModal,
    setLoading,
  };
};

/**
 * Optimized data fetching hook with intelligent caching
 * Prevents duplicate API calls and manages loading states efficiently
 */
export const useOptimizedDataFetch = () => {
  const [fetchState, setFetchState] = useState({
    inFlight: new Set(),
    lastFetch: new Map(),
    cache: new Map(),
  });

  const fetchWithCache = useCallback(
    async (key, fetchFn, cacheTime = 30000) => {
      // Check if request is already in flight
      if (fetchState.inFlight.has(key)) {
        return null;
      }

      // Check cache
      const cached = fetchState.cache.get(key);
      const lastFetchTime = fetchState.lastFetch.get(key);

      if (cached && lastFetchTime && Date.now() - lastFetchTime < cacheTime) {
        return cached;
      }

      // Mark as in flight
      setFetchState((prev) => ({
        ...prev,
        inFlight: new Set([...prev.inFlight, key]),
      }));

      try {
        const result = await fetchFn();

        // Update cache and remove from in-flight
        setFetchState((prev) => {
          const newInFlight = new Set(prev.inFlight);
          newInFlight.delete(key);

          const newCache = new Map(prev.cache);
          newCache.set(key, result);

          const newLastFetch = new Map(prev.lastFetch);
          newLastFetch.set(key, Date.now());

          return {
            inFlight: newInFlight,
            cache: newCache,
            lastFetch: newLastFetch,
          };
        });

        return result;
      } catch (error) {
        // Remove from in-flight on error
        setFetchState((prev) => {
          const newInFlight = new Set(prev.inFlight);
          newInFlight.delete(key);
          return { ...prev, inFlight: newInFlight };
        });
        throw error;
      }
    },
    [fetchState.inFlight, fetchState.cache, fetchState.lastFetch]
  );

  const clearCache = useCallback((key) => {
    if (key) {
      setFetchState((prev) => {
        const newCache = new Map(prev.cache);
        newCache.delete(key);
        const newLastFetch = new Map(prev.lastFetch);
        newLastFetch.delete(key);
        return { ...prev, cache: newCache, lastFetch: newLastFetch };
      });
    } else {
      setFetchState((prev) => ({
        ...prev,
        cache: new Map(),
        lastFetch: new Map(),
      }));
    }
  }, []);

  return {
    fetchWithCache,
    clearCache,
    isInFlight: (key) => fetchState.inFlight.has(key),
  };
};
