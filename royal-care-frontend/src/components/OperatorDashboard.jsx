import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { approveAttendance } from "../features/attendance/attendanceSlice";
import { logout } from "../features/auth/authSlice";
import {
  autoCancelOverdueAppointments,
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  fetchTodayAppointments,
  markAppointmentPaid,
  reviewRejection,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
// PERFORMANCE: Ultra-optimized imports
import {
  useUltraOptimizedAppointmentFilters,
  useUltraOptimizedSorting,
} from "../hooks/useUltraOptimizedFilters";
import { useVirtualizedPagination } from "../hooks/useVirtualizedPagination";
import Pagination from "./Pagination";
// OPTIMIZED: Replace old data hooks with optimized versions
import {
  useOptimizedButtonLoading,
  useOptimizedCountdown,
} from "../hooks/useOperatorPerformance";
import { useStableCallback } from "../hooks/usePerformanceOptimization";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import styles from "../pages/SettingsDataPage/SettingsDataPage.module.css";
import optimizedDataManager from "../services/optimizedDataManager";
import syncService from "../services/syncService";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
import {
  useAttendanceActions,
  useAttendanceRecords,
} from "./contexts/AttendanceContext";
import PerformanceMonitor from "./PerformanceMonitor";

import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
import "../styles/OperatorDashboard.css";
import "../styles/OperatorDashboardOptimized.css"; // Performance optimization styles
import "../styles/Performance.css";
import "../styles/UrgencyIndicators.css";

const OperatorDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams(); // Get view and filters from URL params with defaults - FOCUS ON ACTIONABLE ITEMS
  const currentView = searchParams.get("view") || "rejected"; // Start with most critical
  const currentFilter = searchParams.get("filter") || "all";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // Optimized view setter with stable callback
  const setView = useStableCallback((newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    // Reset page when changing views
    newSearchParams.set("page", "1");
    setSearchParams(newSearchParams);
  });

  // Filter and page management
  const setFilter = useStableCallback((newFilter) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("filter", newFilter);
    newSearchParams.set("page", "1"); // Reset to first page
    setSearchParams(newSearchParams);
  });

  const setPage = useStableCallback((page) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", page.toString());
    setSearchParams(newSearchParams);
  });
  // Modal states - memoized to prevent unnecessary re-renders
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    appointmentId: null,
    rejectionReason: "",
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [autoCancelLoading, setAutoCancelLoading] = useState(false);
  // Payment verification modal state
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    appointmentId: null,
    appointmentDetails: null,
  });
  const [paymentData, setPaymentData] = useState({
    method: "cash",
    amount: "",
    notes: "",
    receiptFile: null,
    receiptHash: "",
    receiptUrl: "",
    isUploading: false,
    uploadError: "",
  });
  // ✅ PERFORMANCE FIX: Use optimized attendance context with caching
  const {
    attendanceRecords,
    loading: attendanceLoading,
    selectedDate,
  } = useAttendanceRecords();

  const { setSelectedDate, forceRefreshAttendance } = useAttendanceActions();
  // Driver coordination state
  const [driverAssignment, setDriverAssignment] = useState({
    availableDrivers: [],
    busyDrivers: [],
    pendingPickups: [],
  }); // 🚀 TEMPORARY: Use a simple Redux selector instead of complex optimized hook
  const {
    appointments: reduxAppointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    error,
  } = useSelector((state) => ({
    appointments: state.scheduling?.appointments || [],
    todayAppointments: state.scheduling?.todayAppointments || [],
    upcomingAppointments: state.scheduling?.upcomingAppointments || [],
    notifications: state.scheduling?.notifications || [],
    loading: state.scheduling?.loading || false,
    error: state.scheduling?.error || null,
  }));
  // Use Redux appointments as actionable appointments for now
  const actionableAppointments = reduxAppointments;
  const appointments = actionableAppointments;
  const hasData = appointments.length > 0;
  // � ULTRA-PERFORMANCE: Replace all filtering logic with optimized versions
  const {
    rejected: rejectedAppointments,
    pending: pendingAppointments,
    awaitingPayment: awaitingPaymentAppointments,
    overdue: overdueAppointments,
    approachingDeadline: approachingDeadlineAppointments,
    activeSessions,
    pickupRequests,
    rejectionStats,
  } = useUltraOptimizedAppointmentFilters(appointments);

  // � ULTRA-PERFORMANCE: Replace sorting with optimized version
  const filteredAndSortedAppointments = useUltraOptimizedSorting(
    appointments,
    currentFilter
  );

  // � ULTRA-PERFORMANCE: Replace pagination with virtualized version
  const appointmentsPagination = useVirtualizedPagination(
    filteredAndSortedAppointments,
    10,
    800 // Container height in pixels
  ); // 🚀 ULTRA-PERFORMANCE: Optimized button loading management
  const { buttonLoading, setActionLoading, forceClearLoading } =
    useOptimizedButtonLoading();  // Dashboard tabs with "All Appointments" restored
  const dashboardTabs = useMemo(() => {
    // Pre-calculate counts to avoid repeated access
    const rejectedCount = rejectedAppointments?.length || 0;
    const pendingCount = pendingAppointments?.length || 0;
    const overdueCount = overdueAppointments?.length || 0;
    const awaitingPaymentCount = awaitingPaymentAppointments?.length || 0;
    const attendanceCount = attendanceRecords?.length || 0;
    const notificationsCount = notifications?.length || 0;
    const pendingPickupsCount = driverAssignment?.pendingPickups?.length || 0;
    const activeSessionsCount = activeSessions?.length || 0;
    const pickupRequestsCount = pickupRequests?.length || 0;

    return [
      {
        id: "all",
        label: "All Appointments",
        count: appointments?.length || 0,
        priority: "low", // Overview tab
      },
      {
        id: "rejected",
        label: "Rejection Reviews",
        count: rejectedCount,
        priority: "high", // Needs immediate action
      },
      {
        id: "pending",
        label: "Pending Acceptance",
        count: pendingCount,
        priority: "high", // Needs immediate action
      },
      {
        id: "timeout",
        label: "Timeout Monitoring",
        count: overdueCount,
        priority: "critical", // Most urgent
      },
      {
        id: "payment",
        label: "Payment Verification",
        count: awaitingPaymentCount,
        priority: "medium", // Needs action but less urgent
      },
      {
        id: "sessions",
        label: "Active Sessions",
        count: activeSessionsCount,
        priority: "medium", // Monitor only
      },
      {
        id: "pickup",
        label: "Pickup Requests",
        count: pickupRequestsCount,
        priority: "high", // Needs immediate action
      },
      {
        id: "driver",
        label: "Driver Coordination",
        count: pendingPickupsCount,
        priority: "medium", // Monitor and coordinate
      },
      {
        id: "attendance",
        label: "Attendance",
        count: attendanceCount,
        priority: "low", // Daily review
      },
      {
        id: "notifications",
        label: "Notifications",
        count: notificationsCount,
        priority: "low", // Informational
      },
      {
        id: "workflow",
        label: "Service Workflow",
        count: 0,
        priority: "low", // Process monitoring
      },
    ];  }, [
    appointments?.length,
    rejectedAppointments?.length,
    pendingAppointments?.length,
    overdueAppointments?.length,
    awaitingPaymentAppointments?.length,
    attendanceRecords?.length,
    notifications?.length,
    driverAssignment?.pendingPickups?.length,
    activeSessions?.length,
    pickupRequests?.length,
  ]);// OPTIMIZED: Remove auto-refresh logic (handled by optimized data manager)
  // The optimized data manager handles background refreshes automatically
  // 🚀 ULTRA-PERFORMANCE: Optimized countdown timer management
  const isTimeoutViewActive = currentView === "timeout";
  const { countdowns, manageTimer, stopTimer } = useOptimizedCountdown(
    overdueAppointments,
    isTimeoutViewActive
  );

  // 🔥 PERFORMANCE OPTIMIZATION: Optimized countdown timer management
  useEffect(() => {
    if (isTimeoutViewActive) {
      manageTimer();
    } else {
      stopTimer();
    }

    // Cleanup on unmount
    return () => {
      stopTimer();
    };
  }, [isTimeoutViewActive, manageTimer, stopTimer]); // Helper function to get driver task description based on appointment status
  const getDriverTaskDescription = useCallback((appointment) => {
    if (!appointment) return "On assignment";

    const therapistName = appointment.therapist_details
      ? `${appointment.therapist_details.first_name} ${appointment.therapist_details.last_name}`
      : appointment.therapist_name || "therapist";

    switch (appointment.status) {
      case "driver_confirmed":
        return `Ready to transport ${therapistName}`;
      case "in_progress":
        return `Starting journey - picking up ${therapistName}`;
      case "journey_started":
      case "journey":
        return `Transporting ${therapistName} to client location`;
      case "arrived":
        return `Arrived - dropping off ${therapistName}`;
      case "return_journey":
        return `Return journey - picking up ${therapistName}`;
      case "driver_assigned_pickup":
        return `Assigned pickup for ${therapistName}`;
      default:
        return `Active with ${therapistName}`;
    }
  }, []); // No dependencies needed as it's a pure function  // Load driver data on component mount and refresh
  const initialDriverDataLoaded = useRef(false); // 🚀 PERFORMANCE FIX: Stabilize appointments reference to prevent useCallback recreation
  const stableAppointments = useMemo(() => {
    // Return the same array reference if content hasn't actually changed
    return appointments || [];
  }, [appointments]);
  // Memoize the driver data loading to prevent recreation on every render
  const loadDriverData = useCallback(async () => {
    try {
      // Fetch real staff data from backend
      const staffResponse = await dispatch(fetchStaffMembers()).unwrap();

      // Ensure staffResponse is an array before filtering
      const staffArray = Array.isArray(staffResponse) ? staffResponse : [];
      console.log(
        "🔍 loadDriverData: staffResponse type:",
        typeof staffResponse,
        "isArray:",
        Array.isArray(staffResponse),
        "length:",
        staffArray.length
      );

      // Filter drivers and categorize by availability status
      const drivers = staffArray.filter((staff) => staff.role === "driver");

      // Get current appointments to determine driver status
      // Note: "dropped_off" is NOT included here, so drivers who dropped off therapists will be available
      const activeAppointmentStatuses = [
        "driver_confirmed",
        "in_progress",
        "journey_started",
        "journey",
        "arrived",
        "return_journey", // Driver is en route to pick up therapist after session        "driver_assigned_pickup", // Driver assigned for pickup but hasn't confirmed yet
      ];

      // Find drivers with active appointments (busy)
      const busyDriverIds = (stableAppointments || [])
        .filter(
          (apt) => activeAppointmentStatuses.includes(apt.status) && apt.driver
        )
        .map((apt) => apt.driver);

      // Categorize drivers
      const availableDrivers = [];
      const busyDrivers = [];
      drivers.forEach((driver) => {
        // Find the current appointment for this driver
        const currentAppointment = (stableAppointments || []).find(
          (apt) =>
            activeAppointmentStatuses.includes(apt.status) &&
            apt.driver === driver.id
        );

        const driverData = {
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          role: driver.role,
          specialization: driver.specialization,
          vehicle_type: driver.vehicle_type || "Motorcycle",
          current_location: driver.current_location || "Available",
          last_available_at: driver.last_available_at,
          last_drop_off_time: driver.last_drop_off_time,
          last_vehicle_used:
            driver.last_vehicle_used || driver.vehicle_type || "Motorcycle",
          last_location: driver.current_location || "Available",
          available_since: driver.last_available_at || new Date().toISOString(),
          status: busyDriverIds.includes(driver.id) ? "busy" : "available", // Enhanced appointment details for busy drivers
          currentAppointment: currentAppointment,
          current_task: currentAppointment
            ? getDriverTaskDescription(currentAppointment)
            : null,
          therapist_name: currentAppointment?.therapist_details
            ? `${currentAppointment.therapist_details.first_name} ${currentAppointment.therapist_details.last_name}`
            : currentAppointment?.therapist_name || "Unknown Therapist",
          client_name:
            currentAppointment?.client_details?.name ||
            currentAppointment?.client_name ||
            "Unknown Client",
          appointment_status: currentAppointment?.status,
          appointment_location: currentAppointment?.location,
        };

        if (busyDriverIds.includes(driver.id)) {
          busyDrivers.push(driverData);
        } else {
          availableDrivers.push(driverData);
        }
      });

      setDriverAssignment({
        availableDrivers,
        busyDrivers,
        pendingPickups: [],
      });
    } catch (error) {
      console.error("Failed to load driver data:", error);
      // Fallback to mock data if API fails
      setDriverAssignment({
        availableDrivers: [
          {
            id: 1,
            first_name: "Juan",
            last_name: "Dela Cruz",
            vehicle_type: "Motorcycle",
            last_location: "Quezon City",
            available_since: new Date().toISOString(),
            status: "available",
          },
          {
            id: 2,
            first_name: "Maria",
            last_name: "Santos",
            vehicle_type: "Car",
            last_location: "Makati",
            available_since: new Date().toISOString(),
            status: "available",
          },
        ],
        busyDrivers: [
          {
            id: 3,
            first_name: "Jose",
            last_name: "Garcia",
            vehicle_type: "Motorcycle",
            current_task: "Transporting therapist to session",
            estimated_completion: new Date(
              Date.now() + 30 * 60000
            ).toISOString(),
            status: "busy",
          },
        ],
        pendingPickups: [],
      });
    }
  }, [dispatch, stableAppointments, getDriverTaskDescription]);

  // 🚀 PERFORMANCE FIX: Load driver data once on mount, not on every appointment change
  useEffect(() => {
    // Only load once when component mounts and we have actionable appointments
    if (!initialDriverDataLoaded.current && hasData && !loading) {
      const loadInitialData = async () => {
        console.log("🚗 Loading initial driver data on mount");
        try {
          await loadDriverData();
          dispatch(fetchNotifications());
        } catch (error) {
          console.error("Failed to load initial data:", error);
        } finally {
          initialDriverDataLoaded.current = true;
        }
      };
      loadInitialData();
    }
  }, [hasData, loading, dispatch, loadDriverData]); // Simplified, stable dependencies

  // Remove the old useEffect that was causing loops
  // Listen for real-time driver updates via sync service
  useEffect(() => {
    const handleDriverUpdate = (data) => {
      setDriverAssignment((prev) => {
        switch (data.type) {
          case "driver_available":
            return {
              ...prev,
              availableDrivers: [
                ...prev.availableDrivers.filter((d) => d.id !== data.driver_id),
                data.driver,
              ],
              busyDrivers: prev.busyDrivers.filter(
                (d) => d.id !== data.driver_id
              ),
            };
          case "driver_assigned":
            return {
              ...prev,
              availableDrivers: prev.availableDrivers.filter(
                (d) => d.id !== data.driver_id
              ),
              busyDrivers: [
                ...prev.busyDrivers.filter((d) => d.id !== data.driver_id),
                data.driver,
              ],
            };
          case "pickup_requested":
            return {
              ...prev,
              pendingPickups: [
                ...prev.pendingPickups.filter(
                  (p) => p.id !== data.therapist_id
                ),
                data.therapist,
              ],
            };
          default:
            return prev;
        }
      });
    };

    // Subscribe to driver-related events and store the unsubscribe function
    const unsubscribe = syncService.subscribe(
      "driver_update",
      handleDriverUpdate
    );

    return () => {
      unsubscribe();
    };
  }, []);
  // 🔥 REMOVED: All redundant filtering and memoized computations
  // The useOperatorDashboardData hook provides all filtered data

  // 🔥 REMOVED: Old redundant polling - now handled by centralized DataManager
  // Real-time sync is handled by useSyncEventHandlers hook and centralized data manager
  // OPTIMIZED: Remove manual data loading (handled by optimized data manager)
  // The optimized data manager handles initial data loading automatically  // Real-time timer for updating countdown displays - FIXED to prevent infinite loops
  const stablePendingCount = useMemo(
    () => pendingAppointments?.length || 0,
    [pendingAppointments?.length]
  );

  useEffect(() => {
    let timer;

    if (currentView === "timeout" && stablePendingCount > 0) {
      timer = setInterval(() => {
        // Instead of forcing re-render with dummy state update,
        // let the countdown hooks handle their own updates
        console.log("⏰ Timer tick for timeout view");
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [currentView, stablePendingCount]); // Use stable count// 🔍 DEBUG: Add debug code to identify the loop source - placed after all hooks
  const renderCount = useRef(0);
  renderCount.current++;

  // 🚀 PERFORMANCE FIX: Log warning for high render count but don't break rendering
  if (renderCount.current > 50) {
    console.error(
      "🚨 HIGH RENDER COUNT DETECTED - Component rendered more than 50 times"
    );
    console.error(
      "This suggests an infinite loop. Check the hooks and dependencies."
    );
  }

  // 🚀 PERFORMANCE FIX: Consolidated debug logging with useRef to prevent re-renders
  const debugDataRef = useRef({});
  const currentDebugData = {
    appointmentsCount: appointments?.length || 0,
    hasData,
    loading,
    error: !!error,
    currentView,
    currentFilter,
    rejectedCount: rejectedAppointments?.length || 0,
    pendingCount: pendingAppointments?.length || 0,
  };

  // Only log if data actually changed (prevent spam)
  if (
    JSON.stringify(currentDebugData) !== JSON.stringify(debugDataRef.current)
  ) {
    console.log(
      `� OperatorDashboard render #${renderCount.current}`,
      currentDebugData
    );
    debugDataRef.current = currentDebugData;
  }

  // Helper function to display therapist information (single or multiple)
  const renderTherapistInfo = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      return (
        <p>
          <strong>Therapists:</strong>{" "}
          {appointment.therapists_details.map((therapist, index) => (
            <span key={therapist.id}>
              {therapist.first_name} {therapist.last_name}
              {therapist.specialization && ` (${therapist.specialization})`}
              {index < appointment.therapists_details.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return (
        <p>
          <strong>Therapist:</strong> {appointment.therapist_details.first_name}{" "}
          {appointment.therapist_details.last_name}
          {appointment.therapist_details.specialization &&
            ` (${appointment.therapist_details.specialization})`}
        </p>
      );
    }

    return (
      <p>
        <strong>Therapist:</strong> No therapist assigned
      </p>
    );
  };
  // Helper function to get therapist acceptance status
  const getTherapistAcceptanceStatus = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      const acceptedCount = appointment.therapists_details.filter(
        (_, index) =>
          appointment.therapists_accepted &&
          appointment.therapists_accepted[index]
      ).length;
      const totalCount = appointment.therapists_details.length;

      if (acceptedCount === totalCount) {
        return (
          <span className="acceptance-indicator accepted">All accepted ✓</span>
        );
      } else if (acceptedCount > 0) {
        return (
          <span className="acceptance-indicator partial">
            {acceptedCount}/{totalCount} accepted ⏳
          </span>
        );
      } else {
        return <span className="acceptance-indicator pending">Pending ⏳</span>;
      }
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return appointment.therapist_accepted ? (
        <span className="acceptance-indicator accepted">Accepted ✓</span>
      ) : (
        <span className="acceptance-indicator pending">Pending ⏳</span>
      );
    }

    return (
      <span className="acceptance-indicator no-therapist">No therapist</span>
    );
  };

  // Helper function to get urgency level for visual display
  const getUrgencyLevel = (appointment) => {
    const now = new Date();
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.start_time}`
    );
    const timeDiff = appointmentDateTime - now;
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);

    // Same logic as in sortAppointmentsByTimeAndUrgency
    switch (appointment.status) {
      case "pending":
        if (appointment.response_deadline) {
          const deadline = new Date(appointment.response_deadline);
          const timeToDeadline = deadline - now;
          const minutesToDeadline = timeToDeadline / (1000 * 60);
          if (minutesToDeadline <= 5) return "critical";
          if (minutesToDeadline <= 15) return "high";
          if (minutesToDeadline <= 30) return "medium";
        }
        return "normal";

      case "confirmed":
      case "driver_confirmed":
        if (hoursUntilAppointment <= 1) return "high";
        if (hoursUntilAppointment <= 2) return "medium";
        return "normal";

      case "in_progress":
      case "session_started":
      case "journey_started":
        return "critical";

      case "awaiting_payment":
        return "medium";

      default:
        return "normal";
    }
  };

  // Helper function to get urgency badge
  const getUrgencyBadge = (urgencyLevel) => {
    const badges = {
      critical: {
        icon: "🚨",
        label: "Critical",
        className: "urgency-critical",
      },
      high: { icon: "🔥", label: "High", className: "urgency-high" },
      medium: { icon: "⚠️", label: "Medium", className: "urgency-medium" },
      normal: { icon: "⚪", label: "Normal", className: "urgency-normal" },
    };
    return badges[urgencyLevel] || badges.normal;
  };

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  const handleReviewRejection = (appointment) => {
    setReviewModal({
      isOpen: true,
      appointmentId: appointment.id,
      rejectionReason: appointment.rejection_reason || "",
    });
    setReviewNotes("");
  };
  const handleReviewSubmit = async (decision) => {
    const actionKey = `review_${reviewModal.appointmentId}_${decision}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(
        reviewRejection({
          id: reviewModal.appointmentId,
          reviewDecision: decision,
          reviewNotes: reviewNotes,
        })
      ).unwrap();
      // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
      await optimizedDataManager.forceRefresh([
        "appointments",
        "todayAppointments",
      ]);
      setReviewModal({
        isOpen: false,
        appointmentId: null,
        rejectionReason: "",
      });
      setReviewNotes("");
    } catch {
      alert("Failed to review rejection. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };
  const handleReviewCancel = () => {
    setReviewModal({ isOpen: false, appointmentId: null, rejectionReason: "" });
    setReviewNotes("");
  };
  const handleAutoCancelOverdue = async () => {
    if (
      !window.confirm(
        "This will auto-cancel all overdue appointments and disable therapists who didn't respond. Continue?"
      )
    ) {
      return;
    }

    setAutoCancelLoading(true);
    try {
      await dispatch(autoCancelOverdueAppointments()).unwrap();
      // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
      await optimizedDataManager.forceRefresh([
        "appointments",
        "todayAppointments",
      ]);
      alert("Successfully processed overdue appointments");
    } catch {
      alert("Failed to process overdue appointments. Please try again.");
    } finally {
      setAutoCancelLoading(false);
    }
  };
  const handleStartAppointment = async (appointmentId) => {
    const actionKey = `start_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "in_progress",
          action: "start_appointment",
        })
      ).unwrap(); // Refresh dashboard data to get updated status
      // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
      await optimizedDataManager.forceRefresh([
        "appointments",
        "todayAppointments",
      ]);
    } catch (error) {
      console.error("Failed to start appointment:", error);
      alert("Failed to start appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  }; // Payment verification handler
  const handlePaymentVerification = (appointment) => {
    // Calculate total amount from services with proper number handling
    const totalAmount =
      appointment?.services_details?.reduce((total, service) => {
        const price = Number(service.price) || 0;
        return total + price;
      }, 0) || 0;

    setPaymentModal({
      isOpen: true,
      appointmentId: appointment.id,
      appointmentDetails: appointment,
    });
    setPaymentData({
      method: "cash",
      amount: totalAmount.toFixed(2), // totalAmount is guaranteed to be a number
      notes: "",
    });
  };
  const handleMarkPaymentPaid = async () => {
    const actionKey = `payment_${paymentModal.appointmentId}`;

    console.log("🔍 handleMarkPaymentPaid: Starting with data:", {
      actionKey,
      appointmentId: paymentModal.appointmentId,
      paymentData,
      currentButtonLoading: buttonLoading[actionKey],
    });

    // Validate payment data
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      console.log(
        "❌ handleMarkPaymentPaid: Invalid payment amount",
        paymentData.amount
      );
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      console.log(
        "🔄 handleMarkPaymentPaid: Setting loading state to true for",
        actionKey
      );
      setActionLoading(actionKey, true);

      // Safety timeout to clear loading state after 30 seconds
      const safetyTimeout = setTimeout(() => {
        console.log(
          "🚨 handleMarkPaymentPaid: Safety timeout triggered, clearing loading state"
        );
        forceClearLoading(actionKey);
      }, 30000);

      // Pass the appointment ID as a number, not an object
      const appointmentId = parseInt(paymentModal.appointmentId, 10);
      console.log("🔍 handleMarkPaymentPaid: Dispatching markAppointmentPaid", {
        appointmentId,
        paymentData,
        actionKey,
      });

      const result = await dispatch(
        markAppointmentPaid({
          appointmentId,
          paymentData,
        })
      ).unwrap();

      console.log(
        "✅ handleMarkPaymentPaid: Payment verification successful",
        result
      );

      // Clear the safety timeout since operation completed successfully
      clearTimeout(safetyTimeout);

      // Close modal and refresh data
      setPaymentModal({
        isOpen: false,
        appointmentId: null,
        appointmentDetails: null,
      });
      setPaymentData({
        method: "cash",
        amount: "",
        notes: "",
      });
      console.log("🔄 handleMarkPaymentPaid: Refreshing dashboard data");
      // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
      await optimizedDataManager.forceRefresh([
        "appointments",
        "todayAppointments",
      ]);

      alert("Payment marked as received successfully!");
    } catch (error) {
      console.error("❌ handleMarkPaymentPaid: Error occurred:", error);

      // Show more detailed error information
      const errorMessage =
        error?.message || error?.error || error || "Unknown error occurred";
      alert(`Failed to mark payment as paid: ${errorMessage}`);
    } finally {
      console.log(
        "🔄 handleMarkPaymentPaid: Setting loading state to false for",
        actionKey
      );
      setActionLoading(actionKey, false);

      // Add a small delay to ensure state update completes
      setTimeout(() => {
        console.log("🔍 handleMarkPaymentPaid: Loading state after cleanup:", {
          actionKey,
          isLoading: buttonLoading[actionKey],
        });
      }, 100);
    }
  };
  const handlePaymentModalCancel = () => {
    // Clear any payment-related loading states when modal is cancelled
    const appointmentId = paymentModal.appointmentId;
    if (appointmentId) {
      const paymentActionKey = `payment_${appointmentId}`;
      console.log(
        "🔄 handlePaymentModalCancel: Clearing loading state for",
        paymentActionKey
      );
      setActionLoading(paymentActionKey, false);
    }

    setPaymentModal({
      isOpen: false,
      appointmentId: null,
      appointmentDetails: null,
    });
    setPaymentData({
      method: "cash",
      amount: "",
      notes: "",
      receiptFile: null,
      receiptHash: "",
      receiptUrl: "",
      isUploading: false,
      uploadError: "",
    });
  };

  // Handle receipt file upload
  const handleReceiptFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Show loading state
      setPaymentData((prev) => ({
        ...prev,
        isUploading: true,
        uploadError: "",
      }));

      // Import the receipt service
      const { receiptService } = await import("../services/receiptService");

      // Upload receipt and get hash
      const appointmentId = parseInt(paymentModal.appointmentId, 10);
      const result = await receiptService.uploadGCashReceipt(
        file,
        appointmentId
      );

      console.log("✅ Receipt uploaded successfully:", result);

      // Update payment data with receipt information
      setPaymentData((prev) => ({
        ...prev,
        receiptFile: file,
        receiptHash: result.hash,
        receiptUrl: result.publicUrl,
        isUploading: false,
      }));
    } catch (error) {
      console.error("❌ Receipt upload failed:", error);
      setPaymentData((prev) => ({
        ...prev,
        isUploading: false,
        uploadError: error.message || "Failed to upload receipt",
      }));
    }
  }; // Driver coordination functions - Pure FIFO system (no proximity filtering)
  const handleAssignDriverPickup = useCallback(
    async (therapistId, driverId = null) => {
      // Helper function to get urgency level based on request time
      const getUrgencyLevel = (requestTime) => {
        if (!requestTime) return "normal";
        const waitTime = (new Date() - new Date(requestTime)) / (1000 * 60); // minutes
        return waitTime > 20 ? "urgent" : "normal"; // Reduced to 20 minutes for Pasig City
      };

      try {
        // Get current pending pickup requests from appointments
        const currentPendingPickups = appointments
          .filter((apt) => apt.status === "pickup_requested")
          .map((apt) => ({
            id: apt.therapist,
            name: apt.therapist_details
              ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
              : "Unknown Therapist",
            location: apt.location,
            appointment_id: apt.id,
            urgency: getUrgencyLevel(apt.pickup_request_time),
            session_end_time: apt.session_end_time,
            requested_at: apt.pickup_request_time,
          }));

        const therapist = currentPendingPickups.find(
          (t) => t.id === therapistId
        );

        if (!therapist) {
          alert("Invalid therapist selection");
          return;
        }

        // Pure FIFO driver selection - get the driver who became available first
        let driver;
        if (driverId) {
          // Manual assignment: use specific driver
          driver = driverAssignment.availableDrivers.find(
            (d) => d.id === driverId
          );
        } else {
          // Auto-assignment: Pure FIFO - first available driver based on last drop-off or availability time
          const availableDriversSorted = driverAssignment.availableDrivers.sort(
            (a, b) => {
              // Use last_drop_off_time if available, otherwise use available_since
              const timeA = new Date(
                a.last_drop_off_time || a.last_available_at || a.available_since
              );
              const timeB = new Date(
                b.last_drop_off_time || b.last_available_at || b.available_since
              );
              return timeA - timeB;
            }
          );
          driver = availableDriversSorted[0];

          // Show FIFO selection details
          const queuePosition =
            availableDriversSorted.findIndex((d) => d.id === driver.id) + 1;
          console.log(
            `🎯 FIFO Assignment: Selected driver ${driver.first_name} ${driver.last_name} (Position #${queuePosition} in queue)`
          );
        }
        if (!driver) {
          alert("No drivers available for assignment");
          return;
        }

        // Fixed estimated arrival time - no proximity calculations
        const estimatedTime = 20; // Standard 20 minutes for all assignments
        const estimatedArrival = new Date();
        estimatedArrival.setMinutes(
          estimatedArrival.getMinutes() + estimatedTime
        );

        // Calculate queue position for detailed FIFO information
        const sortedDrivers = driverAssignment.availableDrivers.sort((a, b) => {
          const timeA = new Date(
            a.last_drop_off_time || a.last_available_at || a.available_since
          );
          const timeB = new Date(
            b.last_drop_off_time || b.last_available_at || b.available_since
          );
          return timeA - timeB;
        });
        const queuePosition =
          sortedDrivers.findIndex((d) => d.id === driver.id) + 1;

        // Update appointment status with detailed FIFO information
        await dispatch(
          updateAppointmentStatus({
            id: therapist.appointment_id,
            status: "driver_assigned_pickup",
            driver: driver.id,
            notes: `Driver assigned for pickup via FIFO Algorithm (Queue Position: #${queuePosition}) - ETA: ${estimatedTime} minutes`,
          })
        ).unwrap();

        // Move driver from available to busy
        setDriverAssignment((prev) => ({
          ...prev,
          availableDrivers: prev.availableDrivers.filter(
            (d) => d.id !== driver.id
          ),
          busyDrivers: [
            ...prev.busyDrivers.filter((d) => d.id !== driver.id),
            {
              ...driver,
              current_task: `Picking up ${therapist.name}`,
              current_location: `En route to ${therapist.location}`,
            },
          ],
          pendingPickups: prev.pendingPickups.filter(
            (t) => t.id !== therapistId
          ),
        }));

        // Broadcast assignment with FIFO indicator
        syncService.broadcast("driver_assigned_pickup", {
          driver_id: driver.id,
          therapist_id: therapistId,
          appointment_id: therapist.appointment_id,
          estimated_arrival: estimatedArrival.toISOString(),
          driver_name: `${driver.first_name} ${driver.last_name}`,
          therapist_name: therapist.name,
          pickup_location: therapist.location,
          estimated_time: estimatedTime,
          assignment_method: "FIFO",
        });
        // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
        await optimizedDataManager.forceRefresh([
          "appointments",
          "todayAppointments",
        ]);

        // Show success notification with FIFO details
        alert(
          `✅ FIFO Assignment Successful!\n\nDriver: ${driver.first_name} ${driver.last_name}\nQueue Position: #${queuePosition}\nTherapist: ${therapist.name}\nLocation: ${therapist.location}\nETA: ${estimatedTime} minutes`
        );
      } catch (error) {
        console.error("Failed to assign driver:", error);
        alert("Failed to assign driver. Please try again.");
      }
    },
    [
      appointments,
      driverAssignment.availableDrivers,
      dispatch,
      setDriverAssignment,
    ]
  );
  const _handleUrgentPickupRequest = async (therapistId) => {
    try {
      // For urgent requests, still use FIFO but assign immediately
      const availableDrivers = driverAssignment.availableDrivers;

      if (availableDrivers.length === 0) {
        alert("No drivers currently available for urgent pickup");
        return;
      }

      // Pure FIFO - use first available driver regardless of location
      const firstAvailableDriver = availableDrivers.sort(
        (a, b) => new Date(a.available_since) - new Date(b.available_since)
      )[0];

      await handleAssignDriverPickup(therapistId, firstAvailableDriver.id);
    } catch (error) {
      console.error("Failed to process urgent pickup request:", error);
      alert("Failed to process urgent pickup request");
    }
  };

  const _getTimeElapsed = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };
  // Helper functions for FIFO coordination
  const _getDriverFIFOPosition = (driver) => {
    const sorted = driverAssignment.availableDrivers.sort(
      (a, b) => new Date(a.available_since) - new Date(b.available_since)
    );
    return sorted.findIndex((d) => d.id === driver.id) + 1;
  };
  // Smart FIFO auto-assignment function
  const handleAutoAssignPickupRequest = useCallback(
    async (pickupRequest) => {
      try {
        console.log(
          "🤖 Auto-assigning pickup request using FIFO:",
          pickupRequest
        );

        // Get available drivers sorted by FIFO (earliest available first)
        const availableDrivers = driverAssignment.availableDrivers
          .filter((driver) => driver.status === "available")
          .sort((a, b) => {
            const timeA = new Date(a.last_available_at || a.available_since);
            const timeB = new Date(b.last_available_at || b.available_since);
            return timeA - timeB; // Earliest first (FIFO)
          });

        if (availableDrivers.length === 0) {
          console.log("❌ No drivers available for auto-assignment");
          return false;
        }

        // Get the first available driver (FIFO)
        const nextDriver = availableDrivers[0];

        console.log(
          `✅ Auto-assigning driver ${nextDriver.first_name} ${nextDriver.last_name} (FIFO position: 1)`
        );

        // Auto-assign the driver
        await handleAssignDriverPickup(
          pickupRequest.therapist_id,
          nextDriver.id
        );

        // Broadcast auto-assignment notification
        syncService.broadcast("auto_assignment_completed", {
          pickup_request: pickupRequest,
          assigned_driver: nextDriver,
          assignment_method: "FIFO",
          assignment_time: new Date().toISOString(),
          message: `Driver ${nextDriver.first_name} ${nextDriver.last_name} auto-assigned via FIFO`,
        });

        return true;
      } catch (error) {
        console.error("Failed to auto-assign pickup request:", error);
        return false;
      }
    },
    [driverAssignment.availableDrivers, handleAssignDriverPickup]
  );
  // Listen for pickup requests and auto-assign drivers
  useEffect(() => {
    const handlePickupRequest = async (data) => {
      console.log("🚖 Pickup request received:", data);

      // Auto-assign driver if available
      if (data.therapist_id) {
        const assigned = await handleAutoAssignPickupRequest({
          therapist_id: data.therapist_id,
          appointment_id: data.appointment_id,
          location: data.location,
          urgency: data.pickup_urgency || "normal",
          timestamp: data.timestamp,
        });

        if (assigned) {
          // Notify therapist that driver has been assigned
          syncService.broadcast("pickup_auto_assigned", {
            therapist_id: data.therapist_id,
            appointment_id: data.appointment_id,
            assignment_method: "auto_fifo",
            message: "Driver automatically assigned for pickup",
          });
        }
      }
    };

    // Subscribe to pickup request events
    const unsubscribePickup = syncService.subscribe(
      "pickup_requested",
      handlePickupRequest
    );

    return () => {
      unsubscribePickup();
    };
  }, [handleAutoAssignPickupRequest]); // Re-subscribe when auto-assignment function changes
  // ✅ PERFORMANCE FIX: Use optimized attendance refresh instead of manual fetch
  const handleFetchAttendanceRecords = useCallback(async () => {
    try {
      await forceRefreshAttendance(selectedDate);
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
    }
  }, [forceRefreshAttendance, selectedDate]);

  const handleApproveAttendance = async (attendanceId) => {
    const actionKey = `approve_${attendanceId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(approveAttendance(attendanceId)).unwrap();
      // Refresh attendance records
      await handleFetchAttendanceRecords();
    } catch (error) {
      console.error("Failed to approve attendance:", error);
      alert("Failed to approve attendance. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };
  // ✅ PERFORMANCE FIX: No need to manually fetch on tab switch - data is cached
  // The useOptimizedAttendance hook automatically handles data fetching and caching
  // Remove the effect that was causing unnecessary refetches

  // Render attendance management view
  const renderAttendanceView = () => {
    const getStatusColor = (status) => {
      switch (status) {
        case "present":
          return "#28a745";
        case "late":
          return "#ffc107";
        case "absent":
          return "#dc3545";
        case "pending_approval":
          return "#007bff";
        default:
          return "#6c757d";
      }
    };

    const getStatusBadge = (status) => {
      const configs = {
        present: { icon: "✅", label: "Present" },
        late: { icon: "⏰", label: "Late" },
        absent: { icon: "❌", label: "Absent" },
        pending_approval: { icon: "⏳", label: "Pending Approval" },
      };
      const config = configs[status] || { icon: "❓", label: "Unknown" };
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: getStatusColor(status),
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {config.icon} {config.label}
        </span>
      );
    };
    const formatTime = (timeString) => {
      if (!timeString) return "--:--";

      // If it's already a full datetime string, parse it directly
      if (timeString.includes("T") || timeString.includes(" ")) {
        return new Date(timeString).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's just a time string (HH:MM:SS), create a proper date
      try {
        const [hours, minutes, seconds] = timeString.split(":").map(Number);

        // Validate the time components
        if (
          isNaN(hours) ||
          isNaN(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          console.error("Invalid time format:", timeString);
          return timeString; // Return original string if invalid
        }

        const today = new Date();
        const dateTime = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          seconds || 0
        );
        return dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch (error) {
        console.error("Error formatting time:", timeString, error);
        return timeString; // Return original string on error
      }
    };

    return (
      <div className="attendance-management-panel">
        <div className="attendance-header">
          <div className="date-selector">
            <label htmlFor="attendance-date">Select Date:</label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="date-input"
            />
            <LoadingButton
              onClick={handleFetchAttendanceRecords}
              loading={attendanceLoading}
              className="refresh-btn"
            >
              Refresh
            </LoadingButton>
          </div>{" "}
        </div>

        {/* Minimal loading indicator for attendance data */}
        <MinimalLoadingIndicator
          show={attendanceLoading}
          position="center-right"
          size="micro"
          variant="ghost"
          tooltip="Loading attendance records..."
          pulse={true}
          fadeIn={true}
        />

        {attendanceRecords.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-check"></i>
            <p>No attendance records found for {selectedDate}</p>
          </div>
        ) : (
          <div className="attendance-records">
            <div className="attendance-summary">
              <div className="summary-stats">
                <div className="stat-card present">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "present")
                        .length
                    }
                  </span>
                  <span className="stat-label">Present</span>
                </div>
                <div className="stat-card late">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "late")
                        .length
                    }
                  </span>
                  <span className="stat-label">Late</span>
                </div>
                <div className="stat-card absent">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "absent")
                        .length
                    }
                  </span>
                  <span className="stat-label">Absent</span>
                </div>
                <div className="stat-card pending">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter(
                        (r) => r.status === "pending_approval"
                      ).length
                    }
                  </span>
                  <span className="stat-label">Pending Approval</span>
                </div>
              </div>
            </div>

            <div className="attendance-list">
              {attendanceRecords.map((record) => (
                <div key={record.id} className="attendance-card">
                  <div className="attendance-info">
                    <div className="staff-details">
                      <h4>
                        {record.staff_member.first_name}{" "}
                        {record.staff_member.last_name}
                      </h4>
                      <span className="role-badge">
                        {record.staff_member.role}
                      </span>
                    </div>
                    <div className="time-details">
                      <div className="time-row">
                        <span className="label">Check-in:</span>
                        <span className="value">
                          {record.check_in_time
                            ? formatTime(record.check_in_time)
                            : "Not checked in"}
                        </span>
                      </div>
                      <div className="time-row">
                        <span className="label">Check-out:</span>
                        <span className="value">
                          {record.check_out_time
                            ? formatTime(record.check_out_time)
                            : "Not checked out"}
                        </span>
                      </div>
                      {record.hours_worked && (
                        <div className="time-row">
                          <span className="label">Hours worked:</span>
                          <span className="value">{record.hours_worked}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="attendance-status">
                    {getStatusBadge(record.status)}
                    {record.status === "pending_approval" && (
                      <LoadingButton
                        onClick={() => handleApproveAttendance(record.id)}
                        loading={buttonLoading[`approve_${record.id}`]}
                        className="approve-btn"
                        size="small"
                      >
                        Approve
                      </LoadingButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="attendance-guidelines">
          <h4>Attendance Rules</h4>
          <ul>
            <li>
              <strong>Present:</strong> Check-in before 1:15 PM
            </li>
            <li>
              <strong>Late:</strong> Check-in after 1:15 PM but before 1:30 AM
              (next day)
            </li>
            <li>
              <strong>Absent:</strong> No check-in recorded by 1:30 AM (next
              day)
            </li>
            <li>
              <strong>Pending Approval:</strong> Requires operator review
            </li>
          </ul>
        </div>
      </div>
    );
  };

  // � PERFORMANCE: Old implementations removed - using ultra-optimized versions above

  // Sync pagination with URL
  useEffect(() => {
    if (currentPage !== appointmentsPagination.currentPage) {
      appointmentsPagination.goToPage(currentPage);
    }
  }, [currentPage, appointmentsPagination]); // Update URL when pagination changes
  useEffect(() => {
    if (appointmentsPagination.currentPage !== currentPage) {
      setPage(appointmentsPagination.currentPage);
    }
  }, [appointmentsPagination.currentPage, currentPage, setPage]);

  // Helper functions for status badge mapping
  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "status-pending",
      confirmed: "status-confirmed",
      driver_confirmed: "status-confirmed",
      therapist_confirmed: "status-confirmed",
      rejected: "status-rejected",
      cancelled: "status-cancelled",
      completed: "status-completed",
      in_progress: "status-confirmed",
      awaiting_payment: "status-warning",
      pickup_requested: "status-pending",
      overdue: "status-overdue",
      timeout: "status-overdue",
      journey_started: "status-confirmed",
      arrived: "status-confirmed",
      dropped_off: "status-confirmed",
      session_started: "status-confirmed",
      payment_requested: "status-warning",
      payment_completed: "status-completed",
    };

    return statusMap[status] || "status-pending";
  };

  const getStatusDisplayText = (status) => {
    const statusTextMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      driver_confirmed: "Driver Confirmed",
      therapist_confirmed: "Therapist Confirmed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      awaiting_payment: "Awaiting Payment",
      pickup_requested: "Pickup Requested",
      overdue: "Overdue",
      timeout: "Timeout",
      journey_started: "Journey Started",
      arrived: "Arrived",
      dropped_off: "Dropped Off",
      session_started: "Session Started",
      payment_requested: "Payment Requested",
      payment_completed: "Payment Completed",
    };

    return (
      statusTextMap[status] ||
      status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, " ") ||
      "Unknown"
    );
  };
  const renderRejectedAppointments = () => {
    if (!rejectedAppointments || rejectedAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-times-circle"></i>
          <p>No rejected appointments to review</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {rejectedAppointments.map((appointment) => {
          const urgencyLevel = getUrgencyLevel(appointment);
          const status = appointment.status || "";

          return (
            <div
              key={appointment.id}
              className={`appointment-card rejected ${urgencyLevel}`}
            >
              <div className="appointment-header">
                <h3>
                  Appointment #{appointment.id} -{" "}
                  {appointment.client_details?.first_name || "Unknown"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h3>
                <div className="status-badges">
                  <span
                    className={`status-badge ${getStatusBadgeClass(status)}`}
                  >
                    {getStatusDisplayText(status)}
                  </span>
                </div>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Date:</strong>{" "}
                  {appointment.date
                    ? new Date(appointment.date).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                  {appointment.end_time || "N/A"}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location || "N/A"}
                </p>
                {renderTherapistInfo(appointment)}

                {appointment.rejection_reason && (
                  <div className="rejection-reason">
                    <strong>Rejection Reason:</strong>
                    <p>{appointment.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="appointment-actions">
                <LoadingButton
                  onClick={() => handleReviewRejection(appointment)}
                  className="review-button"
                >
                  Review Rejection
                </LoadingButton>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPendingAcceptanceAppointments = () => {
    if (!pendingAppointments || pendingAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-clock"></i>
          <p>No appointments pending acceptance</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {pendingAppointments.map((appointment) => {
          const urgencyLevel = getUrgencyLevel(appointment);
          const status = appointment.status || "";
          const acceptanceStatus = getTherapistAcceptanceStatus(appointment);

          return (
            <div
              key={appointment.id}
              className={`appointment-card pending ${urgencyLevel}`}
            >
              <div className="appointment-header">
                <h3>
                  Appointment #{appointment.id} -{" "}
                  {appointment.client_details?.first_name || "Unknown"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h3>
                <div className="status-badges">
                  <span
                    className={`status-badge ${getStatusBadgeClass(status)}`}
                  >
                    {getStatusDisplayText(status)}
                  </span>
                </div>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Date:</strong>{" "}
                  {appointment.date
                    ? new Date(appointment.date).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                  {appointment.end_time || "N/A"}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location || "N/A"}
                </p>
                {renderTherapistInfo(appointment)}

                <div className="acceptance-status">
                  <strong>Acceptance Status:</strong> {acceptanceStatus}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeoutMonitoring = () => {
    const overdueCount = overdueAppointments.length;
    const approachingCount = approachingDeadlineAppointments.length;

    return (
      <div className="timeout-monitoring-panel">
        {/* Auto-cancel controls */}
        <div className="timeout-controls">
          <h3>Automatic Actions</h3>
          <div className="auto-cancel-section">
            <p>
              Auto-cancel overdue appointments and disable non-responsive
              therapists
            </p>
            <LoadingButton
              onClick={handleAutoCancelOverdue}
              loading={autoCancelLoading}
              className="auto-cancel-button"
              disabled={overdueCount === 0}
            >
              Auto-Cancel Overdue ({overdueCount})
            </LoadingButton>
          </div>
        </div>

        {/* Overdue appointments */}
        {overdueCount > 0 && (
          <div className="overdue-section">
            <h4>Overdue Appointments ({overdueCount})</h4>
            <div className="appointments-list">
              {overdueAppointments.map((appointment) => {
                const countdown = countdowns[appointment.id];
                return (
                  <div
                    key={appointment.id}
                    className="appointment-card overdue"
                  >
                    <div className="appointment-header">
                      <h3>
                        Appointment #{appointment.id} -{" "}
                        {appointment.client_details?.first_name || "Unknown"}{" "}
                        {appointment.client_details?.last_name || ""}
                      </h3>
                      <div className="status-badges">
                        <span className="status-badge status-overdue">
                          Overdue
                        </span>
                        {countdown && (
                          <span className="countdown-badge">
                            {countdown.display}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="appointment-details">
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Time:</strong> {appointment.start_time || "N/A"}
                      </p>
                      {renderTherapistInfo(appointment)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approaching deadline appointments */}
        {approachingCount > 0 && (
          <div className="approaching-deadline-section">
            <h4>Approaching Deadline ({approachingCount})</h4>
            <div className="appointments-list">
              {approachingDeadlineAppointments.map((appointment) => {
                const countdown = countdowns[appointment.id];
                return (
                  <div
                    key={appointment.id}
                    className="appointment-card approaching-deadline"
                  >
                    <div className="appointment-header">
                      <h3>
                        Appointment #{appointment.id} -{" "}
                        {appointment.client_details?.first_name || "Unknown"}{" "}
                        {appointment.client_details?.last_name || ""}
                      </h3>
                      <div className="status-badges">
                        <span className="status-badge status-warning">
                          Approaching Deadline
                        </span>
                        {countdown && (
                          <span className="countdown-badge warning">
                            {countdown.display}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="appointment-details">
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Time:</strong> {appointment.start_time || "N/A"}
                      </p>
                      {renderTherapistInfo(appointment)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {overdueCount === 0 && approachingCount === 0 && (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <p>All appointments are on track! No timeout issues detected.</p>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentVerificationView = () => {
    if (
      !awaitingPaymentAppointments ||
      awaitingPaymentAppointments.length === 0
    ) {
      return (
        <div className="empty-state">
          <i className="fas fa-credit-card"></i>
          <p>No payments awaiting verification</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {awaitingPaymentAppointments.map((appointment) => {
          const urgencyLevel = getUrgencyLevel(appointment);
          const status = appointment.status || "";

          // Calculate total amount
          const totalAmount =
            appointment?.services_details?.reduce((total, service) => {
              const price = Number(service.price) || 0;
              return total + price;
            }, 0) || 0;

          return (
            <div
              key={appointment.id}
              className={`appointment-card payment-pending ${urgencyLevel}`}
            >
              <div className="appointment-header">
                <h3>
                  Appointment #{appointment.id} -{" "}
                  {appointment.client_details?.first_name || "Unknown"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h3>
                <div className="status-badges">
                  <span
                    className={`status-badge ${getStatusBadgeClass(status)}`}
                  >
                    {getStatusDisplayText(status)}
                  </span>
                </div>
              </div>

              <div className="appointment-details">
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {appointment.date
                      ? new Date(appointment.date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">
                    {appointment.start_time || "N/A"} -{" "}
                    {appointment.end_time || "N/A"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Location:</span>
                  <span className="value">{appointment.location || "N/A"}</span>
                </div>

                {renderTherapistInfo(appointment)}

                <div className="detail-row">
                  <span className="label">Services:</span>
                  <span className="value">
                    {Array.isArray(appointment.services_details)
                      ? appointment.services_details
                          .map((s) => s.name)
                          .join(", ")
                      : "N/A"}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="label">Total Amount:</span>
                  <span className="value total-amount">
                    ₱{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="appointment-actions">
                <LoadingButton
                  onClick={() => handlePaymentVerification(appointment)}
                  loading={buttonLoading[`payment_${appointment.id}`]}
                  className="payment-button"
                >
                  Verify Payment
                </LoadingButton>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAllAppointments = () => {
    if (
      !Array.isArray(filteredAndSortedAppointments) ||
      filteredAndSortedAppointments.length === 0
    ) {
      return (
        <div className="empty-state">
          <i className="fas fa-calendar"></i>
          <p>No appointments found</p>
          {error && (
            <p className="error-text">
              Error: {typeof error === "string" ? error : JSON.stringify(error)}
            </p>
          )}
        </div>
      );
    }

    const {
      currentItems: paginatedAppointments,
      isVirtualized,
      totalHeight,
    } = appointmentsPagination;

    if (!Array.isArray(paginatedAppointments)) {
      return (
        <div className="empty-state">
          <p>Loading appointments...</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-section">
            <label htmlFor="appointment-filter">Filter by:</label>
            <select
              id="appointment-filter"
              value={currentFilter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">
                All Appointments ({filteredAndSortedAppointments.length})
              </option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Performance Mode Toggle */}
          {appointmentsPagination.shouldVirtualize && (
            <div className="performance-controls">
              <button
                onClick={appointmentsPagination.toggleVirtualization}
                className={`performance-toggle ${
                  isVirtualized ? "active" : ""
                }`}
                title={
                  isVirtualized
                    ? "Switch to Pagination"
                    : "Switch to Virtual Scrolling"
                }
              >
                {isVirtualized ? "📄 Pagination" : "⚡ Virtual Scrolling"}
              </button>
            </div>
          )}

          <div className="quick-filter-buttons">
            <button
              onClick={() => setFilter("completed")}
              className={`quick-filter-btn ${
                currentFilter === "completed" ? "active" : ""
              }`}
              title="View only completed appointments"
            >
              📋 View Completed
            </button>
            <button
              onClick={() => setFilter("today")}
              className={`quick-filter-btn ${
                currentFilter === "today" ? "active" : ""
              }`}
              title="View today's appointments"
            >
              📅 Today
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`quick-filter-btn ${
                currentFilter === "pending" ? "active" : ""
              }`}
              title="View pending appointments"
            >
              ⏳ Pending
            </button>
          </div>
        </div>

        <div className="sort-indicator">
          <i className="fas fa-sort-amount-down"></i>
          <span>Sorted by urgency and time (most urgent first)</span>
          <span className="filter-info">
            •{" "}
            {isVirtualized
              ? "Virtual scrolling"
              : `Showing ${paginatedAppointments.length} of ${filteredAndSortedAppointments.length} appointments`}
            {currentFilter !== "all" && ` (filtered by: ${currentFilter})`}
          </span>
        </div>

        {/* Appointment Cards Container */}
        <div
          className={`appointments-container ${
            isVirtualized ? "virtualized" : "paginated"
          }`}
          style={isVirtualized ? { height: 800, overflowY: "auto" } : {}}
          onScroll={
            isVirtualized ? appointmentsPagination.handleScroll : undefined
          }
          ref={appointmentsPagination.containerRef}
        >
          {isVirtualized && (
            <div style={{ height: totalHeight, position: "relative" }}>
              {paginatedAppointments.map((appointment) => {
                if (!appointment || !appointment.id) return null;

                const urgencyLevel = getUrgencyLevel(appointment);
                const urgencyBadge = getUrgencyBadge(urgencyLevel);
                const status = appointment.status || "";

                return (
                  <div
                    key={appointment.id}
                    className={`appointment-card ${urgencyLevel}`}
                    style={{
                      position: "absolute",
                      top: appointment.offsetY || 0,
                      left: 0,
                      right: 0,
                      height: 200,
                    }}
                  >
                    <div className="appointment-header">
                      <h3>
                        Appointment #{appointment.id} -{" "}
                        {appointment.client_details?.first_name || "Unknown"}{" "}
                        {appointment.client_details?.last_name || ""}
                      </h3>
                      <div className="status-badges">
                        <span
                          className={`status-badge ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {getStatusDisplayText(status)}
                        </span>
                        <span
                          className={`urgency-badge ${
                            urgencyBadge?.className || ""
                          }`}
                        >
                          {urgencyBadge?.icon || ""} {urgencyBadge?.label || ""}
                        </span>
                      </div>
                    </div>

                    <div className="appointment-details">
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Time:</strong> {appointment.start_time || "N/A"}{" "}
                        - {appointment.end_time || "N/A"}
                      </p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {appointment.location || "N/A"}
                      </p>
                      {renderTherapistInfo(appointment)}
                      <p>
                        <strong>Services:</strong>{" "}
                        {Array.isArray(appointment.services_details)
                          ? appointment.services_details
                              .map((s) => s.name)
                              .join(", ")
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Status:</strong> {status || "N/A"}
                      </p>
                    </div>

                    <div className="appointment-actions">
                      {status === "driver_confirmed" && (
                        <LoadingButton
                          onClick={() => handleStartAppointment(appointment.id)}
                          loading={buttonLoading[`start_${appointment.id}`]}
                          className="start-button"
                        >
                          Start Appointment
                        </LoadingButton>
                      )}

                      {status === "awaiting_payment" && (
                        <LoadingButton
                          onClick={() => handlePaymentVerification(appointment)}
                          loading={buttonLoading[`payment_${appointment.id}`]}
                          className="payment-button"
                        >
                          Verify Payment
                        </LoadingButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isVirtualized &&
            paginatedAppointments.map((appointment) => {
              if (!appointment || !appointment.id) return null;

              const urgencyLevel = getUrgencyLevel(appointment);
              const urgencyBadge = getUrgencyBadge(urgencyLevel);
              const status = appointment.status || "";

              return (
                <div
                  key={appointment.id}
                  className={`appointment-card ${urgencyLevel}`}
                >
                  <div className="appointment-header">
                    <h3>
                      Appointment #{appointment.id} -{" "}
                      {appointment.client_details?.first_name || "Unknown"}{" "}
                      {appointment.client_details?.last_name || ""}
                    </h3>
                    <div className="status-badges">
                      <span
                        className={`status-badge ${getStatusBadgeClass(
                          status
                        )}`}
                      >
                        {getStatusDisplayText(status)}
                      </span>
                      <span
                        className={`urgency-badge ${
                          urgencyBadge?.className || ""
                        }`}
                      >
                        {urgencyBadge?.icon || ""} {urgencyBadge?.label || ""}
                      </span>
                    </div>
                  </div>

                  <div className="appointment-details">
                    <p>
                      <strong>Date:</strong>{" "}
                      {appointment.date
                        ? new Date(appointment.date).toLocaleDateString()
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                      {appointment.end_time || "N/A"}
                    </p>
                    <p>
                      <strong>Location:</strong> {appointment.location || "N/A"}
                    </p>
                    {renderTherapistInfo(appointment)}
                    <p>
                      <strong>Services:</strong>{" "}
                      {Array.isArray(appointment.services_details)
                        ? appointment.services_details
                            .map((s) => s.name)
                            .join(", ")
                        : "N/A"}
                    </p>
                    <p>
                      <strong>Status:</strong> {status || "N/A"}
                    </p>
                  </div>

                  <div className="appointment-actions">
                    {status === "driver_confirmed" && (
                      <LoadingButton
                        onClick={() => handleStartAppointment(appointment.id)}
                        loading={buttonLoading[`start_${appointment.id}`]}
                        className="start-button"
                      >
                        Start Appointment
                      </LoadingButton>
                    )}

                    {status === "awaiting_payment" && (
                      <LoadingButton
                        onClick={() => handlePaymentVerification(appointment)}
                        loading={buttonLoading[`payment_${appointment.id}`]}
                        className="payment-button"
                      >
                        Verify Payment
                      </LoadingButton>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pagination Controls - Only show if not virtualized */}
        {!isVirtualized && (
          <Pagination
            {...appointmentsPagination}
            itemName="appointments"
            className="appointments-pagination"
          />
        )}
      </div>
    );
  };

  const renderNotifications = () => {
    if (!notifications || notifications.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-bell"></i>
          <p>No notifications</p>
        </div>
      );
    }

    return (
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-card ${notification.type}`}
          >
            <div className="notification-header">
              <h4>{notification.title}</h4>
              <span className="notification-time">
                {new Date(notification.created_at).toLocaleString()}
              </span>
            </div>
            <div className="notification-content">
              <p>{notification.message}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDriverCoordinationPanel = () => {
    return (
      <div className="driver-coordination-panel">
        <div className="driver-stats">
          <div className="stat-card available">
            <span className="stat-number">
              {driverAssignment.availableDrivers.length}
            </span>
            <span className="stat-label">Available Drivers</span>
          </div>
          <div className="stat-card busy">
            <span className="stat-number">
              {driverAssignment.busyDrivers.length}
            </span>
            <span className="stat-label">Busy Drivers</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-number">{pickupRequests.length}</span>
            <span className="stat-label">Pending Pickups</span>
          </div>
        </div>

        <div className="driver-sections">
          <div className="available-drivers-section">
            <h3>Available Drivers</h3>
            {driverAssignment.availableDrivers.length === 0 ? (
              <p>No drivers currently available</p>
            ) : (
              <div className="drivers-list">
                {driverAssignment.availableDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card available">
                    <div className="driver-info">
                      <h4>
                        {driver.first_name} {driver.last_name}
                      </h4>
                      <p>
                        <strong>Vehicle:</strong> {driver.vehicle_type}
                      </p>
                      <p>
                        <strong>Last Location:</strong> {driver.last_location}
                      </p>
                      <p>
                        <strong>Available Since:</strong>{" "}
                        {new Date(driver.available_since).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="busy-drivers-section">
            <h3>Busy Drivers</h3>
            {driverAssignment.busyDrivers.length === 0 ? (
              <p>No drivers currently busy</p>
            ) : (
              <div className="drivers-list">
                {driverAssignment.busyDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card busy">
                    <div className="driver-info">
                      <h4>
                        {driver.first_name} {driver.last_name}
                      </h4>
                      <p>
                        <strong>Current Task:</strong> {driver.current_task}
                      </p>
                      <p>
                        <strong>Vehicle:</strong> {driver.vehicle_type}
                      </p>
                      <p>
                        <strong>Location:</strong> {driver.current_location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderServiceWorkflowView = () => {
    return (
      <div className="service-workflow-panel">
        <div className="workflow-stats">
          <div className="stat-card">
            <span className="stat-number">{todayAppointments.length}</span>
            <span className="stat-label">Today's Appointments</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{activeSessions.length}</span>
            <span className="stat-label">Active Sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{upcomingAppointments.length}</span>
            <span className="stat-label">Upcoming</span>
          </div>
        </div>
        <div className="workflow-content">
          <p>
            Service workflow overview and management tools will be displayed
            here.
          </p>
        </div>
      </div>
    );
  };

  const renderActiveSessionsView = () => {
    if (activeSessions.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-user-md"></i>
          <p>No active therapy sessions</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {activeSessions.map((session) => (
          <div key={session.id} className="appointment-card active-session">
            <div className="appointment-header">
              <h3>
                Session #{session.id} - {session.client_details?.first_name}{" "}
                {session.client_details?.last_name}
              </h3>
              <span className="status-badge active">Active Session</span>
            </div>
            <div className="appointment-details">
              <p>
                <strong>Started:</strong>{" "}
                {new Date(session.session_started_at).toLocaleString()}
              </p>
              <p>
                <strong>Location:</strong> {session.location}
              </p>
              {renderTherapistInfo(session)}
              <p>
                <strong>Services:</strong>{" "}
                {session.services_details?.map((s) => s.name).join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPickupRequestsView = () => {
    if (pickupRequests.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-car"></i>
          <p>No pickup requests pending</p>
        </div>
      );
    }

    return (
      <div className="pickup-requests-list">
        {pickupRequests.map((request) => (
          <div key={request.id} className="pickup-request-card">
            <div className="request-header">
              <h3>Pickup Request - {request.therapist_name}</h3>
              <span className={`urgency-badge ${request.urgency || "normal"}`}>
                {request.urgency === "urgent" ? "🚨 URGENT" : "⏰ Normal"}
              </span>
            </div>
            <div className="request-details">
              <p>
                <strong>Location:</strong> {request.location}
              </p>
              <p>
                <strong>Requested:</strong>{" "}
                {new Date(request.requested_at).toLocaleString()}
              </p>
              <p>
                <strong>Session Ended:</strong>{" "}
                {new Date(request.session_end_time).toLocaleString()}
              </p>
            </div>
            <div className="request-actions">
              {driverAssignment.availableDrivers.length > 0 ? (
                <div className="driver-assignment">
                  <select
                    onChange={(e) =>
                      e.target.value &&
                      handleAssignDriverPickup(
                        request.therapist_id,
                        parseInt(e.target.value)
                      )
                    }
                  >
                    <option value="">Select Driver</option>
                    {driverAssignment.availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name} -{" "}
                        {driver.vehicle_type}
                      </option>
                    ))}
                  </select>
                  <LoadingButton
                    onClick={() =>
                      handleAssignDriverPickup(request.therapist_id)
                    }
                    className="auto-assign-button"
                  >
                    Auto-Assign (FIFO)
                  </LoadingButton>
                </div>
              ) : (
                <p className="no-drivers">No drivers available</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 🚀 CRITICAL FIX: Load appointments on component mount
  useEffect(() => {
    const loadAppointments = async () => {
      console.log("🔄 OperatorDashboard: Loading appointments on mount");
      try {
        // Load both all appointments and today's appointments
        await Promise.all([
          dispatch(fetchAppointments()).unwrap(),
          dispatch(fetchTodayAppointments()).unwrap(),
        ]);
        console.log("✅ OperatorDashboard: Appointments loaded successfully");
      } catch (error) {
        console.error("❌ OperatorDashboard: Failed to load appointments:", error);
      }
    };

    // Load appointments if we don't have any data
    if (!loading && appointments.length === 0) {
      loadAppointments();
    }
  }, [dispatch, loading, appointments.length]);

  // Render the tab switcher at the top of the dashboard
  return (
    <PageLayout>
      <div className={`operator-dashboard`}>
        {" "}
        <LayoutRow title="Operator Dashboard">
          <div className="action-buttons">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>{" "}
        {/* OPTIMIZED: Simplified loading indicator */}
        <MinimalLoadingIndicator
          show={loading}
          hasData={hasData} // OPTIMIZED: Use hasData instead of hasAnyData
          position="bottom-left"
          size="small"
          variant="subtle" // OPTIMIZED: Remove stale data check
          tooltip={
            hasData
              ? "Refreshing dashboard data..."
              : "Loading dashboard data..."
          }
          pulse={true}
          fadeIn={true}
        />
        {/* OPTIMIZED: Simplified error handling */}
        {error && !hasData && (
          <div className="error-message">
            {typeof error === "object"
              ? error.message || error.error || JSON.stringify(error)
              : error}
          </div>
        )}{" "}
        {/* Statistics Dashboard */}
        <div className="stats-dashboard">
          <div className="stats-card">
            <h4>Rejection Overview</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{rejectionStats.total}</span>
                <span className="stat-label">Total Rejections</span>
              </div>
              <div className="stat-item therapist-stat">
                <span className="stat-number">{rejectionStats.therapist}</span>
                <span className="stat-label">Therapist Rejections</span>
              </div>
              <div className="stat-item driver-stat">
                <span className="stat-number">{rejectionStats.driver}</span>
                <span className="stat-label">Driver Rejections</span>
              </div>{" "}
              <div className="stat-item pending-stat">
                <span className="stat-number">{rejectionStats.pending}</span>
                <span className="stat-label">Pending Reviews</span>
              </div>
            </div>
          </div>
        </div>{" "}        <div className="tab-switcher">
          <TabSwitcher
            tabs={dashboardTabs}
            activeTab={currentView}
            onTabChange={setView}
          />
        </div>
        <div
          className={`dashboard-content ${
            paymentModal.isOpen || reviewModal.isOpen ? "faded" : ""
          }`}
        >
          {" "}
          {/* 🔥 PERFORMANCE MONITOR: Real-time performance tracking */}
          <PerformanceMonitor
            componentName="OperatorDashboard"
            enabled={import.meta.env.DEV || false}
          />
          {currentView === "rejected" && (
            <div className="rejected-appointments">
              <h2>Rejection Reviews</h2>
              {renderRejectedAppointments()}
            </div>
          )}
          {currentView === "pending" && (
            <div className="pending-appointments">
              <h2>Pending Acceptance Appointments</h2>
              {renderPendingAcceptanceAppointments()}
            </div>
          )}{" "}
          {currentView === "timeout" && (
            <div className="timeout-monitoring">
              <h2>Timeout Monitoring</h2>
              {renderTimeoutMonitoring()}
            </div>
          )}
          {currentView === "payment" && (
            <div className="payment-verification">
              <h2>Payment Verification</h2>
              {renderPaymentVerificationView()}
            </div>
          )}{" "}
          {currentView === "all" && (
            <div className="all-appointments-view">
              <div className="performance-warning">
                <i className="fas fa-info-circle"></i>
                <span>
                  Loading all appointments. This may take a moment for large
                  datasets...
                </span>
              </div>

              <div className="all-appointments-header">
                <h2>All Appointments ({appointments?.length || 0})</h2>                <div className="filter-controls">
                  <div className="filter-section">
                    <label htmlFor="appointment-filter">Filter by:</label>
                    <select
                      id="appointment-filter"
                      value={currentFilter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">
                        All Appointments ({appointments?.length || 0})
                      </option>
                      <option value="today">Today</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="appointments-list">{renderAllAppointments()}</div>
            </div>
          )}{" "}
          {currentView === "attendance" && (
            <div className="attendance-management">
              <h2>Attendance Management</h2>
              {renderAttendanceView()}
            </div>
          )}{" "}
          {currentView === "notifications" && (
            <div className="notifications">
              <h2>Notifications</h2>
              {renderNotifications()}
            </div>
          )}{" "}
          {currentView === "driver" && (
            <div className="driver-coordination">
              <h2>Driver Coordination Center</h2>
              {renderDriverCoordinationPanel()}
            </div>
          )}
          {currentView === "workflow" && (
            <div className="service-workflow">
              <h2>Service Workflow Overview</h2>
              {renderServiceWorkflowView()}
            </div>
          )}
          {currentView === "sessions" && (
            <div className="active-sessions">
              <h2>Active Therapy Sessions</h2>
              {renderActiveSessionsView()}
            </div>
          )}{" "}
          {currentView === "pickup" && (
            <div className="pickup-requests">
              <h2>Therapist Pickup Requests</h2>
              {renderPickupRequestsView()}
            </div>
          )}
        </div>
      </div>
      {/* End of operator-dashboard */}

      {/* Payment Verification Modal */}
      {paymentModal.isOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles.modal}>
            <div className={styles["modal-header"]}>
              <h3>Verify Payment Received</h3>
              <button
                className={styles["close-btn"]}
                onClick={handlePaymentModalCancel}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="appointment-summary">
              <h4>Appointment #{paymentModal.appointmentId}</h4>
              <div className="summary-details">
                <p>
                  <strong>Client:</strong>{" "}
                  {paymentModal.appointmentDetails?.client_details?.first_name
                    ? `${
                        paymentModal.appointmentDetails.client_details
                          .first_name
                      } ${
                        paymentModal.appointmentDetails.client_details
                          .last_name || ""
                      }`.trim()
                    : paymentModal.appointmentDetails?.client ||
                      "Unknown Client"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(
                    paymentModal.appointmentDetails?.date
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {paymentModal.appointmentDetails?.services_details
                    ?.map((s) => s.name)
                    .join(", ") || "N/A"}
                </p>{" "}
                <p>
                  <strong>Total Amount:</strong> ₱
                  {(() => {
                    const total =
                      paymentModal.appointmentDetails?.services_details?.reduce(
                        (total, service) => {
                          const price = Number(service.price) || 0;
                          return total + price;
                        },
                        0
                      ) || 0;
                    return total.toFixed(2);
                  })()}
                </p>
              </div>
            </div>
            <div className={styles["modal-form"]}>
              <div className="form-group">
                <label htmlFor="paymentMethod">Payment Method:</label>{" "}
                <select
                  id="paymentMethod"
                  value={paymentData.method}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      method: e.target.value,
                      // Reset receipt data when switching payment methods
                      receiptFile: null,
                      receiptHash: "",
                      receiptUrl: "",
                      uploadError: "",
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="paymentAmount">Amount Received:</label>
                <input
                  type="number"
                  id="paymentAmount"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, amount: e.target.value })
                  }
                  placeholder="Enter amount received"
                  min="0"
                  step="0.01"
                />
              </div>{" "}
              {/* GCash Receipt Upload */}
              {paymentData.method === "gcash" && (
                <div
                  className="form-group"
                  style={{
                    backgroundColor: "#f0f8ff",
                    border: "2px solid #3498db",
                    padding: "15px",
                    borderRadius: "8px",
                    marginTop: "15px",
                  }}
                >
                  <label
                    htmlFor="receiptFile"
                    style={{
                      color: "#2c3e50",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    📄 GCash Receipt Upload{" "}
                    <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <div style={{ marginTop: "0.5rem" }}>
                    <input
                      type="file"
                      id="receiptFile"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptFileChange}
                      disabled={paymentData.isUploading}
                      required
                    />
                    {paymentData.isUploading && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.9rem",
                          color: "#555",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(0,0,0,.1)",
                            borderTopColor: "#3498db",
                            borderRadius: "50%",
                            marginRight: "8px",
                            animation: "spin 1s ease-in-out infinite",
                          }}
                        ></span>
                        Uploading...
                      </div>
                    )}
                    {paymentData.receiptHash && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          background: "#f5f5f5",
                          padding: "8px",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <p
                          style={{
                            color: "#2ecc71",
                            marginBottom: "4px",
                            fontWeight: "500",
                          }}
                        >
                          ✓ Receipt verified
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: "#555",
                            fontFamily: "monospace",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{ fontWeight: "500", marginRight: "8px" }}
                          >
                            SHA-256:
                          </span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}
                            title={paymentData.receiptHash}
                          >
                            {paymentData.receiptHash.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                    )}
                    {paymentData.uploadError && (
                      <p
                        style={{
                          color: "#e74c3c",
                          marginTop: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {paymentData.uploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="paymentNotes">Notes (optional):</label>
                <textarea
                  id="paymentNotes"
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
                  }
                  placeholder="Add any notes about the payment..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <LoadingButton
                  className="verify-button"
                  onClick={handleMarkPaymentPaid}
                  loading={
                    buttonLoading[`payment_${paymentModal.appointmentId}`]
                  }
                  loadingText="Processing..."
                >
                  Mark as Paid
                </LoadingButton>
                <LoadingButton
                  className="cancel-button"
                  onClick={handlePaymentModalCancel}
                  variant="secondary"
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Review Rejection Modal */}
      {reviewModal.isOpen && (
        <div className="modal-overlay">
          <div className="review-modal">
            <h3>Review Appointment Rejection</h3>
            <div className="rejection-details">
              <p>
                <strong>Rejection Reason:</strong>
              </p>
              <p className="rejection-reason-text">
                {reviewModal.rejectionReason}
              </p>
            </div>
            <div className="review-notes">
              <label htmlFor="reviewNotes">Review Notes (optional):</label>
              <textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any additional notes about your decision..."
                rows={3}
              />
            </div>{" "}
            <div className="modal-actions">
              <LoadingButton
                className="accept-button"
                onClick={() => handleReviewSubmit("accept")}
                loading={
                  buttonLoading[`review_${reviewModal.appointmentId}_accept`]
                }
                loadingText="Processing..."
              >
                Accept Rejection
              </LoadingButton>
              <LoadingButton
                className="deny-button"
                onClick={() => handleReviewSubmit("deny")}
                loading={
                  buttonLoading[`review_${reviewModal.appointmentId}_deny`]
                }
                loadingText="Processing..."
              >
                Deny Rejection
              </LoadingButton>
              <LoadingButton
                className="cancel-button"
                onClick={handleReviewCancel}
                variant="secondary"
              >
                Cancel
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
      {/* End of PageLayout */}
    </PageLayout>
  );
};

export default OperatorDashboard;
