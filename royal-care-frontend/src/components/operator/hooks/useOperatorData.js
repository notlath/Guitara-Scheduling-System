/**
 * Central data management hook for Operator Dashboard
 * Consolidates all data fetching logic and state management
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { useOptimizedData } from "../../../hooks/useOptimizedData";
import { useOptimizedSelector } from "../../../hooks/usePerformanceOptimization";
import { useUltraOptimizedAppointmentFilters } from "../../../hooks/useUltraOptimizedFilters";
import { useIntelligentCaching } from "./useIntelligentCaching";

export const useOperatorData = () => {
  // Intelligent caching system
  const {
    invalidateRelatedData,
    performOptimisticUpdate,
    prefetchCriticalData,
  } = useIntelligentCaching();

  // Countdown states for timeout monitoring
  const [countdowns, setCountdowns] = useState({});
  const [autoCancelLoading, setAutoCancelLoading] = useState(false);

  // Core data from optimized hooks
  const {
    appointments,
    drivers,
    notifications,
    stats,
    loading: dataLoading,
    refetch,
  } = useOptimizedData("OperatorDashboard", [
    "appointments",
    "drivers",
    "notifications",
    "stats",
  ]);

  // Filtered appointment data
  const filteredAppointments =
    useUltraOptimizedAppointmentFilters(appointments);

  // Redux state selectors
  const authState = useOptimizedSelector((state) => state.auth, shallowEqual);

  // Local loading states
  const [actionLoading, setActionLoading] = useState({});
  const [errors, setErrors] = useState({});

  // Action handlers
  const setButtonLoading = useCallback((buttonId, loading) => {
    setActionLoading((prev) => ({
      ...prev,
      [buttonId]: loading,
    }));
  }, []);

  const clearError = useCallback((errorKey) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });
  }, []);

  const setError = useCallback((errorKey, error) => {
    setErrors((prev) => ({
      ...prev,
      [errorKey]: error,
    }));
  }, []);

  // Enhanced data operations with caching
  const updateAppointmentOptimistically = useCallback(
    async (appointmentId, updateData, mutationPromise) => {
      return performOptimisticUpdate(
        ["appointments"],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...updateData } : apt
          );
        },
        mutationPromise
      );
    },
    [performOptimisticUpdate]
  );

  const invalidateAppointmentData = useCallback(
    (appointmentId) => {
      invalidateRelatedData("appointment", appointmentId);
    },
    [invalidateRelatedData]
  );

  const invalidateDriverData = useCallback(
    (driverId) => {
      invalidateRelatedData("driver", driverId);
    },
    [invalidateRelatedData]
  );

  const invalidatePaymentData = useCallback(
    (appointmentId) => {
      invalidateRelatedData("payment", appointmentId);
    },
    [invalidateRelatedData]
  );

  const preloadCriticalData = useCallback(() => {
    prefetchCriticalData();
  }, [prefetchCriticalData]);

  // Memoized computed values
  const computedStats = useMemo(
    () => ({
      totalAppointments: appointments?.length || 0,
      rejectedCount: filteredAppointments.rejected?.length || 0,
      pendingCount: filteredAppointments.pending?.length || 0,
      overdueCount: filteredAppointments.overdue?.length || 0,
      paymentPendingCount: filteredAppointments.awaitingPayment?.length || 0,
      activeDrivers:
        drivers?.filter((d) => d.status === "available")?.length || 0,
      busyDrivers: drivers?.filter((d) => d.status === "busy")?.length || 0,
    }),
    [appointments, filteredAppointments, drivers]
  );

  // Main loading state
  const loading = useMemo(
    () => ({
      data: dataLoading,
      actions: actionLoading,
      isAnyLoading: dataLoading || Object.values(actionLoading).some(Boolean),
    }),
    [dataLoading, actionLoading]
  );

  return {
    // Raw data
    appointments,
    drivers,
    notifications,
    stats,

    // Filtered data
    filteredAppointments,

    // Computed stats
    computedStats,

    // Loading states
    loading,

    // Error states
    errors,

    // Actions
    setButtonLoading,
    setError,
    clearError,
    refetch,

    // Caching utilities
    updateAppointmentOptimistically,
    invalidateAppointmentData,
    invalidateDriverData,
    invalidatePaymentData,
    preloadCriticalData,

    // Redux state
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
  };
};

export default useOperatorData;
