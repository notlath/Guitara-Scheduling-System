import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import {
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  markAppointmentPaid,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";

/**
 * Simplified Data Management Hook with Sequential Loading
 * Prevents rate limiting by loading data sequentially with delays
 * Fixed to prevent infinite loops
 */
export const useOperatorData = () => {
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState({});
  const [lastFetch, setLastFetch] = useState(0);
  const hasInitialized = useRef(false);
  const isLoading = useRef(false);
  const mountedRef = useRef(true);

  // Memoized selector with shallowEqual to prevent unnecessary re-renders
  const reduxState = useSelector(
    (state) => ({
      appointments: state.scheduling?.appointments || [],
      todayAppointments: state.scheduling?.todayAppointments || [],
      upcomingAppointments: state.scheduling?.upcomingAppointments || [],
      notifications: state.scheduling?.notifications || [],
      loading: state.scheduling?.loading || false,
      error: state.scheduling?.error || null,
    }),
    shallowEqual
  );

  // Extract and normalize data to ensure arrays
  const {
    appointments: rawAppointments,
    todayAppointments: rawTodayAppointments,
    upcomingAppointments: rawUpcomingAppointments,
    notifications: rawNotifications,
    loading,
    error,
  } = reduxState;

  // Memoized data processing to prevent re-renders
  const processedData = useMemo(() => {
    const ensureArray = (data) => {
      if (Array.isArray(data)) return data;
      if (data?.results && Array.isArray(data.results)) return data.results;
      return [];
    };

    return {
      appointments: ensureArray(rawAppointments),
      todayAppointments: ensureArray(rawTodayAppointments),
      upcomingAppointments: ensureArray(rawUpcomingAppointments),
      notifications: ensureArray(rawNotifications),
    };
  }, [
    rawAppointments,
    rawTodayAppointments,
    rawUpcomingAppointments,
    rawNotifications,
  ]);

  // Extract processed data
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
  } = processedData;

  // Simple data loading with sequential requests to prevent rate limiting
  const loadData = useCallback(
    async (force = false) => {
      const now = Date.now();

      // Prevent duplicate loading attempts
      if (isLoading.current) {
        console.log("🔄 Data loading already in progress, skipping");
        return;
      }

      // Only fetch if it's been more than 30 seconds since last fetch (unless forced)
      if (!force && now - lastFetch < 30000) {
        console.log("🔄 Data still fresh, skipping reload");
        return;
      }

      // Check if this is a duplicate initialization
      if (!force && hasInitialized.current) {
        console.log("🔄 Data already initialized, skipping");
        return;
      }

      isLoading.current = true;
      hasInitialized.current = true;

      console.log("🚀 Starting sequential data load...");

      try {
        // Load critical data first (appointments)
        console.log("📥 Loading critical data: appointments");
        await dispatch(fetchAppointments()).unwrap();

        // Wait to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Load secondary data with staggered timing
        console.log("📥 Loading secondary data: today & upcoming appointments");
        const secondaryPromises = [
          dispatch(fetchTodayAppointments()),
          new Promise((resolve) =>
            setTimeout(
              () => resolve(dispatch(fetchUpcomingAppointments())),
              200
            )
          ),
        ];

        await Promise.allSettled(secondaryPromises);

        // Wait again before loading tertiary data
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Load tertiary data with staggered timing
        console.log("📥 Loading tertiary data: staff & notifications");
        const tertiaryPromises = [
          dispatch(fetchStaffMembers()),
          new Promise((resolve) =>
            setTimeout(() => resolve(dispatch(fetchNotifications())), 200)
          ),
        ];

        await Promise.allSettled(tertiaryPromises);

        setLastFetch(now);
        console.log("✅ Sequential data load completed successfully");
      } catch (error) {
        console.error("❌ Data loading failed:", error);
      } finally {
        isLoading.current = false;
      }
    },
    [dispatch, lastFetch]
  );

  // Load data on mount with deduplication
  useEffect(() => {
    // Only load if we haven't initialized yet
    if (!hasInitialized.current) {
      loadData(true); // Force initial load
    }
  }, [loadData]); // Include loadData but it's stable due to useCallback

  // Manual refresh function that resets initialization state
  const refreshData = useCallback(() => {
    hasInitialized.current = false;
    loadData(true);
  }, [loadData]);

  // Simple button loading management
  const setActionLoading = useCallback((actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  }, []);

  // Simplified appointment actions
  const startAppointment = useCallback(
    async (appointmentId) => {
      const actionKey = `start_${appointmentId}`;
      setActionLoading(actionKey, true);

      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "in_progress",
            action: "start_appointment",
          })
        ).unwrap();

        // Refresh data
        await loadData(true);
      } catch (error) {
        console.error("Failed to start appointment:", error);
        alert("Failed to start appointment. Please try again.");
      } finally {
        setActionLoading(actionKey, false);
      }
    },
    [dispatch, loadData, setActionLoading]
  );

  const verifyPayment = useCallback(
    async (appointment, paymentData) => {
      const actionKey = `payment_${appointment.id}`;
      setActionLoading(actionKey, true);

      try {
        await dispatch(
          markAppointmentPaid({
            appointmentId: appointment.id,
            paymentData,
          })
        ).unwrap();

        // Refresh data
        await loadData(true);
        return true;
      } catch (error) {
        console.error("Failed to verify payment:", error);
        alert("Failed to verify payment. Please try again.");
        return false;
      } finally {
        setActionLoading(actionKey, false);
      }
    },
    [dispatch, loadData, setActionLoading]
  );

  // Simple filtering (computed on demand, not memoized to avoid complexity)
  const getFilteredAppointments = useCallback(
    (filterType) => {
      if (!Array.isArray(appointments)) return [];

      switch (filterType) {
        case "rejected":
          return appointments.filter((apt) => apt.status === "rejected");
        case "pending":
          return appointments.filter((apt) => apt.status === "pending");
        case "awaiting_payment":
          return appointments.filter(
            (apt) => apt.status === "awaiting_payment"
          );
        case "overdue":
          return appointments.filter((apt) => {
            if (apt.status !== "pending") return false;
            if (!apt.response_deadline) return false;
            return new Date(apt.response_deadline) < new Date();
          });
        case "today": {
          const today = new Date().toISOString().split("T")[0];
          return appointments.filter((apt) => apt.date === today);
        }
        default:
          return appointments;
      }
    },
    [appointments]
  );

  return {
    // Data
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    error,

    // Computed data (called as functions to avoid memoization complexity)
    rejectedAppointments: getFilteredAppointments("rejected"),
    pendingAppointments: getFilteredAppointments("pending"),
    awaitingPaymentAppointments: getFilteredAppointments("awaiting_payment"),
    overdueAppointments: getFilteredAppointments("overdue"),
    todayAppointmentsFiltered: getFilteredAppointments("today"),

    // Actions
    loadData,
    refreshData,
    startAppointment,
    verifyPayment,

    // Loading states
    buttonLoading,
    setActionLoading,
  };
};
