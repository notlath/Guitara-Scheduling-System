/**
 * Integration hooks for dashboard components to use centralized data management
 * These hooks eliminate redundant polling and provide optimized data access
 * Enhanced with immediate data display capabilities
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useDashboardData } from "./useDataManager";

/**
 * Enhanced hook for TherapistDashboard with immediate data display
 */
export const useTherapistDashboardData = () => {
  const { user } = useSelector((state) => state.auth);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Enhanced data access with immediate display capabilities
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    loading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    isStaleData,
    error,
    forceRefresh,
    refreshIfStale,
  } = useDashboardData("therapistDashboard", "therapist");

  // Mark initial load as complete when we first get data
  useEffect(() => {
    if (hasAnyData || (!loading && isInitialLoad)) {
      setIsInitialLoad(false);
    }
  }, [hasAnyData, loading, isInitialLoad]);

  // Memoized filtering for therapist-specific appointments
  const myAppointments = useMemo(() => {
    return appointments.filter(
      (apt) =>
        apt.therapist === user?.id ||
        (apt.therapists && apt.therapists.includes(user?.id))
    );
  }, [appointments, user?.id]);

  const myTodayAppointments = useMemo(() => {
    return todayAppointments.filter(
      (apt) =>
        (apt.therapist === user?.id ||
          (apt.therapists && apt.therapists.includes(user?.id))) &&
        apt.status !== "transport_completed"
    );
  }, [todayAppointments, user?.id]);

  const myUpcomingAppointments = useMemo(() => {
    return upcomingAppointments.filter(
      (apt) =>
        (apt.therapist === user?.id ||
          (apt.therapists && apt.therapists.includes(user?.id))) &&
        apt.status !== "transport_completed"
    );
  }, [upcomingAppointments, user?.id]);

  // Optimized refresh function that uses centralized data manager
  const refreshAppointments = useCallback(
    async (isBackground = false, targetView = null) => {
      console.log(
        "🔄 TherapistDashboard: Refreshing data via centralized manager"
      );

      const dataTypesToRefresh = [];
      if (targetView) {
        switch (targetView) {
          case "today":
            dataTypesToRefresh.push("todayAppointments");
            break;
          case "upcoming":
            dataTypesToRefresh.push("upcomingAppointments");
            break;
          default:
            dataTypesToRefresh.push("appointments");
            break;
        }
      }

      try {
        await forceRefresh(dataTypesToRefresh);
      } catch (error) {
        if (!isBackground) {
          console.error("Error refreshing appointments:", error);
        }
      }
    },
    [forceRefresh]
  );

  return {
    // Filtered data specific to therapist
    myAppointments,
    myTodayAppointments,
    myUpcomingAppointments,

    // Raw data for other uses
    appointments,
    todayAppointments,
    upcomingAppointments,

    // Enhanced state management for immediate display
    loading: loading && !hasImmediateData, // Only show loading if no cached data
    isRefreshing: isRefreshing || (loading && hasImmediateData), // Background refresh
    hasImmediateData, // Whether we have cached data available
    hasAnyData, // Whether we have any data (cached or fresh)
    isStaleData, // Whether current data might be outdated
    error,
    isInitialLoad,

    // Actions
    refreshAppointments,
    forceRefresh,
    refreshIfStale, // Auto-refresh if data is stale
  };
};

/**
 * Enhanced hook for DriverDashboard with immediate data display
 */
export const useDriverDashboardData = () => {
  const { user } = useSelector((state) => state.auth);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Enhanced data access with immediate display capabilities
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    loading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    isStaleData,
    error,
    forceRefresh,
    refreshIfStale,
  } = useDashboardData("driverDashboard", "driver");

  // Mark initial load as complete when we first get data
  useEffect(() => {
    if (hasAnyData || (!loading && isInitialLoad)) {
      setIsInitialLoad(false);
    }
  }, [hasAnyData, loading, isInitialLoad]);

  // Memoized filtering for driver-specific appointments
  const myAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const isAssignedDriver = apt.driver === user?.id;
      if (!isAssignedDriver) return false;

      const visibleStatuses = [
        "pending",
        "therapist_confirmed",
        "driver_confirmed",
        "in_progress",
        "journey_started",
        "journey",
        "arrived",
        "pickup_requested",
        "driver_assigned_pickup",
        "return_journey",
        "dropped_off",
        "driver_transport_completed",
        "transport_completed",
        "payment_completed",
      ];

      return visibleStatuses.includes(apt.status);
    });
  }, [appointments, user?.id]);

  const myTodayAppointments = useMemo(() => {
    return todayAppointments.filter((apt) => {
      const isAssignedDriver = apt.driver === user?.id;
      if (!isAssignedDriver) return false;

      const visibleStatuses = [
        "pending",
        "therapist_confirmed",
        "driver_confirmed",
        "in_progress",
        "journey_started",
        "journey",
        "arrived",
        "pickup_requested",
        "driver_assigned_pickup",
        "return_journey",
      ];

      return visibleStatuses.includes(apt.status);
    });
  }, [todayAppointments, user?.id]);

  const myUpcomingAppointments = useMemo(() => {
    return upcomingAppointments.filter((apt) => {
      const isAssignedDriver = apt.driver === user?.id;
      if (!isAssignedDriver) return false;

      const visibleStatuses = [
        "pending",
        "therapist_confirmed",
        "driver_confirmed",
        "in_progress",
        "journey_started",
        "journey",
        "arrived",
        "pickup_requested",
        "driver_assigned_pickup",
        "return_journey",
      ];

      return visibleStatuses.includes(apt.status);
    });
  }, [upcomingAppointments, user?.id]);

  // All transports for "All My Transports" view
  const myAllTransports = useMemo(() => {
    return myAppointments; // All filtered appointments including completed ones
  }, [myAppointments]);

  // Check for active pickup assignments
  const hasActivePickupAssignment = useMemo(() => {
    return myAppointments.some(
      (apt) => apt.status === "driver_assigned_pickup"
    );
  }, [myAppointments]);

  const activePickupAssignment = useMemo(() => {
    return myAppointments.find(
      (apt) => apt.status === "driver_assigned_pickup"
    );
  }, [myAppointments]);

  // Optimized refresh function that uses centralized data manager
  const refreshAppointments = useCallback(
    async (isBackground = false, targetView = null) => {
      console.log(
        "🔄 DriverDashboard: Refreshing data via centralized manager"
      );

      const dataTypesToRefresh = [];
      if (targetView) {
        switch (targetView) {
          case "today":
            dataTypesToRefresh.push("todayAppointments");
            break;
          case "upcoming":
            dataTypesToRefresh.push("upcomingAppointments");
            break;
          default:
            dataTypesToRefresh.push("appointments");
            break;
        }
      }

      try {
        await forceRefresh(dataTypesToRefresh);
      } catch (error) {
        if (!isBackground) {
          console.error("Error refreshing appointments:", error);
        }
      }
    },
    [forceRefresh]
  );

  return {
    // Filtered data specific to driver
    myAppointments,
    myTodayAppointments,
    myUpcomingAppointments,
    myAllTransports,

    // Driver-specific state
    hasActivePickupAssignment,
    activePickupAssignment,

    // Raw data for other uses
    appointments,
    todayAppointments,
    upcomingAppointments,

    // Enhanced state management for immediate display
    loading: loading && !hasImmediateData, // Only show loading if no cached data
    isRefreshing: isRefreshing || (loading && hasImmediateData), // Background refresh
    hasImmediateData, // Whether we have cached data available
    hasAnyData, // Whether we have any data (cached or fresh)
    isStaleData, // Whether current data might be outdated
    error,
    isInitialLoad,

    // Actions
    refreshAppointments,
    forceRefresh,
    refreshIfStale, // Auto-refresh if data is stale
  };
};

/**
 * Enhanced hook for OperatorDashboard with immediate data display
 */
export const useOperatorDashboardData = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Enhanced data access with immediate display capabilities
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading: centralLoading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    isStaleData,
    error,
    forceRefresh,
    refreshIfStale,
  } = useDashboardData("operatorDashboard", "operator");

  // Timeout mechanism to prevent infinite loading
  useEffect(() => {
    if (centralLoading) {
      const timeout = setTimeout(() => {
        console.warn(
          "⚠️ OperatorDashboard: Loading timeout reached, forcing load completion"
        );
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [centralLoading]);

  // Handle loading state more intelligently with immediate data support
  const loading = useMemo(() => {
    // If timeout reached, don't show loading
    if (loadingTimeout) {
      return false;
    }

    // If we have immediate data available, don't show loading
    if (hasImmediateData || hasAnyData) {
      return false;
    }

    // If we have appointments array (even if empty), we're not loading
    if (Array.isArray(appointments)) {
      return false;
    }

    // If central loading is false, we're not loading
    if (!centralLoading) {
      return false;
    }

    // Only show loading if centrally loading AND no data available
    return centralLoading && !hasAnyData;
  }, [
    centralLoading,
    appointments,
    loadingTimeout,
    hasImmediateData,
    hasAnyData,
  ]);

  // Debug logging to track the loading state
  useEffect(() => {
    console.log("🔍 OperatorDashboard Debug:", {
      centralLoading,
      loading,
      loadingTimeout,
      appointmentsLength: appointments?.length || 0,
      appointmentsIsArray: Array.isArray(appointments),
      hasAppointments: !!appointments,
      isInitialLoad,
      appointmentsType: typeof appointments,
    });
  }, [loading, centralLoading, appointments, isInitialLoad, loadingTimeout]);

  // Mark initial load as complete when we have data or loading is complete
  useEffect(() => {
    if ((!loading || hasAnyData) && isInitialLoad) {
      console.log("✅ OperatorDashboard: Marking initial load as complete");
      setIsInitialLoad(false);
    }
  }, [loading, hasAnyData, isInitialLoad]);

  // Memoized filtering for operator-specific views - Fixed to match actual system statuses
  const rejectedAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter(
      (apt) =>
        (apt.status === "rejected_by_therapist" ||
          apt.status === "rejected_by_driver") &&
        apt.rejection_status !== "reviewed"
    );
  }, [appointments]);

  const pendingAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter(
      (apt) => apt.status === "pending" || apt.status === "therapist_confirmed"
    );
  }, [appointments]);

  const awaitingPaymentAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];

    const paymentAppointments = appointments.filter(
      (apt) =>
        // Include appointments with "awaiting_payment" status (new correct status)
        apt.status === "awaiting_payment" ||
        // Also include completed appointments that haven't been paid (legacy/fallback)
        (apt.status === "completed" &&
          (!apt.payment_status ||
            apt.payment_status === "pending" ||
            apt.payment_status === "unpaid"))
    );

    // Debug logging for payment verification
    console.log("🔍 Payment Verification Debug:", {
      totalAppointments: appointments.length,
      awaitingPaymentCount: paymentAppointments.length,
      awaitingPaymentStatuses: paymentAppointments.map((apt) => ({
        id: apt.id,
        status: apt.status,
        payment_status: apt.payment_status,
      })),
    });

    return paymentAppointments;
  }, [appointments]);

  // Calculate timeout monitoring based on created_at timestamps
  const overdueAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const now = new Date();
    const timeoutThreshold = 15 * 60 * 1000; // 15 minutes

    return appointments.filter((apt) => {
      if (!apt.created_at || apt.status !== "pending") return false;
      const appointmentAge = now - new Date(apt.created_at);
      return appointmentAge > timeoutThreshold;
    });
  }, [appointments]);

  const approachingDeadlineAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    const now = new Date();
    const urgentThreshold = 5 * 60 * 1000; // 5 minutes
    const timeoutThreshold = 15 * 60 * 1000; // 15 minutes

    return appointments.filter((apt) => {
      if (!apt.created_at || apt.status !== "pending") return false;
      const appointmentAge = now - new Date(apt.created_at);
      return (
        appointmentAge > urgentThreshold && appointmentAge <= timeoutThreshold
      );
    });
  }, [appointments]);

  const activeSessions = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter((apt) =>
      ["in_progress", "journey_started", "arrived", "session_started"].includes(
        apt.status
      )
    );
  }, [appointments]);

  const pickupRequests = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter(
      (apt) =>
        apt.status === "pickup_requested" ||
        apt.status === "driver_assigned_pickup"
    );
  }, [appointments]);

  // Rejection statistics - Fixed to match actual rejection statuses
  const rejectionStats = useMemo(() => {
    if (!Array.isArray(appointments)) {
      return { total: 0, therapist: 0, driver: 0, pending: 0 };
    }

    const rejected = appointments.filter(
      (apt) =>
        apt.status === "rejected_by_therapist" ||
        apt.status === "rejected_by_driver"
    );

    const therapistRejections = rejected.filter(
      (apt) => apt.status === "rejected_by_therapist"
    );

    const driverRejections = rejected.filter(
      (apt) => apt.status === "rejected_by_driver"
    );

    return {
      total: rejected.length,
      therapist: therapistRejections.length,
      driver: driverRejections.length,
      pending: rejectedAppointments.length,
    };
  }, [appointments, rejectedAppointments]);

  // Optimized refresh function
  const refreshData = useCallback(() => {
    console.log(
      "🔄 OperatorDashboard: Refreshing data via centralized manager"
    );
    return forceRefresh(["appointments", "notifications"]);
  }, [forceRefresh]);

  return {
    // Filtered appointment data
    rejectedAppointments,
    pendingAppointments,
    awaitingPaymentAppointments,
    overdueAppointments,
    approachingDeadlineAppointments,
    activeSessions,
    pickupRequests,
    rejectionStats,

    // Raw data
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,

    // Enhanced state management for immediate display
    loading, // Smart loading that considers immediate data
    isRefreshing: isRefreshing || (centralLoading && hasAnyData), // Background refresh
    hasImmediateData, // Whether we have cached data available
    hasAnyData, // Whether we have any data (cached or fresh)
    isStaleData, // Whether current data might be outdated
    error,
    isInitialLoad,

    // Actions
    refreshData,
    forceRefresh,
    refreshIfStale, // Auto-refresh if data is stale
  };
};

/**
 * Hook for SchedulingDashboard with immediate data display
 */
export const useSchedulingDashboardData = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Enhanced data access with immediate display capabilities
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    loading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    isStaleData,
    error,
    forceRefresh,
    refreshIfStale,
  } = useDashboardData("schedulingDashboard", "scheduling");

  // Mark initial load as complete when we first get data
  useEffect(() => {
    if (hasAnyData || (!loading && isInitialLoad)) {
      setIsInitialLoad(false);
    }
  }, [hasAnyData, loading, isInitialLoad]);

  // Optimized refresh for form submissions
  const refreshAfterFormSubmit = useCallback(() => {
    return forceRefresh([
      "appointments",
      "todayAppointments",
      "upcomingAppointments",
    ]);
  }, [forceRefresh]);

  return {
    appointments,
    todayAppointments,
    upcomingAppointments,

    // Enhanced state management for immediate display
    loading: loading && !hasImmediateData, // Only show loading if no cached data
    isRefreshing: isRefreshing || (loading && hasImmediateData), // Background refresh
    hasImmediateData, // Whether we have cached data available
    hasAnyData, // Whether we have any data (cached or fresh)
    isStaleData, // Whether current data might be outdated
    error,
    isInitialLoad,

    // Actions
    refreshAfterFormSubmit,
    forceRefresh,
    refreshIfStale, // Auto-refresh if data is stale
  };
};
