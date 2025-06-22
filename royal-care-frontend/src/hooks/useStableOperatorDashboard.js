/**
 * ULTRA-STABLE OPERATOR DASHBOARD HOOK
 * Prevents infinite render loops with aggressive memoization and stable references
 */

import { useCallback, useMemo, useRef } from "react";
import { useOperatorDashboardData } from "./useDashboardQueries";
import { useRobustAppointmentFilters } from "./useRobustAppointmentFilters";
import { useStableValue } from "./usePerformanceOptimization";

// Stable empty constants to prevent reference changes
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_STATS = Object.freeze({
  total: 0,
  therapist: 0,
  driver: 0,
  pending: 0,
});

const EMPTY_FILTER_RESULTS = Object.freeze({
  rejected: EMPTY_ARRAY,
  pending: EMPTY_ARRAY,
  awaitingPayment: EMPTY_ARRAY,
  overdue: EMPTY_ARRAY,
  approachingDeadline: EMPTY_ARRAY,
  activeSessions: EMPTY_ARRAY,
  pickupRequests: EMPTY_ARRAY,
  rejectionStats: EMPTY_STATS,
});

/**
 * Ultra-stable dashboard hook that prevents infinite render loops
 */
export const useStableOperatorDashboard = () => {
  const lastStableDataRef = useRef(null);
  const renderCountRef = useRef(0);
  
  // Always call hooks in the same order - never conditionally
  // Get raw data from TanStack Query
  const rawDashboardData = useOperatorDashboardData();

  // Create ultra-stable data references
  const stableAppointments = useStableValue(rawDashboardData?.appointments || EMPTY_ARRAY);
  const stableTodayAppointments = useStableValue(rawDashboardData?.todayAppointments || EMPTY_ARRAY);
  const stableUpcomingAppointments = useStableValue(rawDashboardData?.upcomingAppointments || EMPTY_ARRAY);
  const stableNotifications = useStableValue(rawDashboardData?.notifications || EMPTY_ARRAY);

  // Create stable loading/error states
  const stableLoading = useStableValue(rawDashboardData?.loading || false);
  const stableError = useStableValue(rawDashboardData?.error || null);
  const stableHasData = useStableValue(rawDashboardData?.hasData || false);

  // Get filtering results - call hook directly, not in useMemo
  const filteringResults = useRobustAppointmentFilters(stableAppointments);

  // Create ultra-stable callback references
  const stableForceRefresh = useCallback(() => {
    if (rawDashboardData?.forceRefresh) {
      rawDashboardData.forceRefresh();
    }
  }, [rawDashboardData]);

  // Memoize the final result with stable dependencies only
  const stableResult = useMemo(() => {
    // Track renders but don't log excessively
    renderCountRef.current++;
    
    // Emergency circuit breaker - return cached data if available
    if (renderCountRef.current > 100) {
      console.error("🚨 EMERGENCY: Render loop detected, using cached data");
      if (lastStableDataRef.current) {
        return lastStableDataRef.current;
      }
    }

    const result = {
      // Core data arrays
      appointments: stableAppointments,
      todayAppointments: stableTodayAppointments,
      upcomingAppointments: stableUpcomingAppointments,
      notifications: stableNotifications,

      // Filtered results
      ...filteringResults,

      // State flags
      loading: stableLoading,
      error: stableError,
      hasData: stableHasData,

      // Actions
      forceRefresh: stableForceRefresh,

      // Metadata for debugging
      _isStable: true,
      _renderCount: renderCountRef.current,
      _timestamp: Date.now(),
    };

    // Cache the result for emergency fallback
    lastStableDataRef.current = result;
    
    return result;
  }, [
    stableAppointments,
    stableTodayAppointments, 
    stableUpcomingAppointments,
    stableNotifications,
    filteringResults,
    stableLoading,
    stableError,
    stableHasData,
    stableForceRefresh,
  ]);

  // Only log occasionally to avoid excessive output
  if (renderCountRef.current % 10 === 1) {
    console.log("🔒 useStableOperatorDashboard:", {
      renderCount: renderCountRef.current,
      appointmentsCount: stableResult.appointments.length,
      rejectedCount: stableResult.rejected.length,
      pendingCount: stableResult.pending.length,
      isStable: stableResult._isStable,
    });
  }

  return stableResult;
};
