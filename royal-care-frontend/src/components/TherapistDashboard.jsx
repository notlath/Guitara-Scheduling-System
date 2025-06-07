import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  rejectAppointment,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";

import "../styles/TherapistDashboard.css";
import "../styles/TabSwitcher.css";
import { runAuthDiagnostics, testLogin } from "../utils/authFixer";
import RejectionModal from "./RejectionModal";
import WebSocketStatus from "./scheduling/WebSocketStatus";

const TherapistDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();
  
  const [view, setView] = useState("today"); // 'today', 'upcoming', 'all'  const [pollingInterval, setPollingInterval] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { user } = useSelector((state) => state.auth);
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    loading,
    error,
  } = useSelector((state) => state.scheduling);

  // Filter appointments for current therapist
  const myAppointments = appointments.filter(
    (apt) => apt.therapist === user?.id
  );

  const myTodayAppointments = todayAppointments.filter(
    (apt) => apt.therapist === user?.id
  );

  const myUpcomingAppointments = upcomingAppointments.filter(
    (apt) => apt.therapist === user?.id
  ); // Refresh appointments data silently in background
  const refreshAppointments = useCallback(
    async (isBackground = false, targetView = null) => {
      // Never show loading indicators for background updates
      // Only show loading on initial load via Redux state

      try {
        // Optimize by only fetching what's needed based on current view
        if (isBackground) {
          // For background updates, fetch only the currently viewed data to reduce load
          const currentView = targetView || view;
          switch (currentView) {
            case "today":
              await dispatch(fetchTodayAppointments());
              break;
            case "upcoming":
              await dispatch(fetchUpcomingAppointments());
              break;
            case "all":
            default:
              await dispatch(fetchAppointments());
              break;
          }
        } else {
          // For initial load, fetch all data
          await Promise.all([
            dispatch(fetchAppointments()),
            dispatch(fetchTodayAppointments()),
            dispatch(fetchUpcomingAppointments()),
          ]);
        }
      } catch (error) {
        // Silent error handling for background updates to avoid disrupting UX
        if (!isBackground) {
          console.error("Error fetching appointments:", error);
        }
      }
    },
    [dispatch, view]
  ); // Remove isInitialLoad from dependencies to prevent loops  // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
    console.log("WebSocket connections disabled - using polling mode");

    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Set up adaptive polling with smart refresh
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(30000); // Base 30 seconds for therapist
      return setInterval(() => {
        if (syncService.shouldRefresh('therapist_appointments')) {
          dispatch(fetchAppointments());
          dispatch(fetchTodayAppointments());
          dispatch(fetchUpcomingAppointments());
          syncService.markUpdated('therapist_appointments');
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]); // Simplified dependencies
  // Load appointments on component mount and debug authentication
  useEffect(() => {
    let mounted = true;

    // Debug authentication on mount using new diagnostics
    console.log(
      "🚀 TherapistDashboard mounted - running authentication diagnostics..."
    );
    const runDiagnostics = async () => {
      if (!mounted) return;

      const isAuthOk = await runAuthDiagnostics();

      if (!isAuthOk) {
        console.log(
          "❌ Authentication diagnostics failed - attempting test login..."
        );
        // Try automatic login with test credentials for development
        const token = localStorage.getItem("knoxToken");
        if (!token && import.meta.env.MODE === "development") {
          console.log("🔄 No token found, attempting test login...");
          const loginSuccess = await testLogin();
          if (loginSuccess) {
            console.log("✅ Test login successful, retrying diagnostics...");
            await runAuthDiagnostics();
          }
        }
      }

      // Initialize appointment fetching regardless (will show proper errors if auth fails)
      console.log(
        "🚀 TherapistDashboard: Initial load, fetching appointments..."
      );
      if (mounted) {
        await Promise.all([
          dispatch(fetchAppointments()),
          dispatch(fetchTodayAppointments()),
          dispatch(fetchUpcomingAppointments()),
        ]);
        setIsInitialLoad(false);
      }
    };

    runDiagnostics();

    return () => {
      mounted = false;
    };
  }, [dispatch]); // Only depend on dispatch

  // Refresh specific view data when view changes (silent background update)
  useEffect(() => {
    if (!isInitialLoad) {
      // Call dispatch actions directly to avoid dependency issues
      dispatch(fetchAppointments());
      dispatch(fetchTodayAppointments());
      dispatch(fetchUpcomingAppointments());
    }
  }, [view, dispatch, isInitialLoad]); // Include all dependencies

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }; // Handle appointment status changes with optimized refresh and optimistic updates
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "confirmed",
        })
      ).unwrap();
      // Only refresh current view data to minimize API calls
      refreshAppointments(true);
    } catch (error) {
      console.error("Error accepting appointment:", error);
      // More user-friendly error message
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to accept appointment. Please try again.");
      }
    }
  };

  const handleStartAppointment = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "in_progress",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Error starting appointment:", error);
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to start appointment. Please try again.");
      }
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    if (window.confirm("Mark this appointment as completed?")) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "completed",
          })
        ).unwrap();
        refreshAppointments(true);
      } catch (error) {
        console.error("Error completing appointment:", error);
        if (
          error?.message?.includes("401") ||
          error?.message?.includes("Authentication")
        ) {
          alert("Session expired. Please refresh the page and log in again.");
        } else {
          alert("Failed to complete appointment. Please try again.");
        }
      }
    }
  };
  const handleRejectAppointment = (appointmentId) => {
    setRejectionModal({
      isOpen: true,
      appointmentId: appointmentId,
    });
  };

  const handleRejectionSubmit = async (appointmentId, rejectionReason) => {
    console.log(
      "🔍 TherapistDashboard handleRejectionSubmit - DETAILED DEBUG:",
      {
        appointmentId,
        rejectionReason,
        reasonType: typeof rejectionReason,
        reasonLength: rejectionReason?.length,
        reasonTrimmed: String(rejectionReason || "").trim(),
        reasonTrimmedLength: String(rejectionReason || "").trim().length,
      }
    );

    // Additional validation on the frontend
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      console.error("❌ TherapistDashboard: Empty reason detected");
      alert("Please provide a reason for rejection.");
      return;
    }

    console.log("✅ TherapistDashboard: Dispatching rejectAppointment with:", {
      id: appointmentId,
      rejectionReason: cleanReason,
    });

    try {
      const result = await dispatch(
        rejectAppointment({
          id: appointmentId,
          rejectionReason: cleanReason,
        })
      ).unwrap();
      console.log("✅ TherapistDashboard: Rejection successful:", result);
      refreshAppointments(true); // Silent background refresh after action
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error(
        "❌ TherapistDashboard: Error rejecting appointment:",
        error
      );

      // Better error message handling with authentication awareness
      let errorMessage = "Failed to reject appointment. Please try again.";

      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        errorMessage =
          "Session expired. Please refresh the page and log in again.";
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Show specific error from backend if available
      if (error?.error === "Rejection reason is required") {
        errorMessage =
          "Rejection reason is required. Please provide a valid reason.";
      }

      alert(`Failed to reject appointment: ${errorMessage}`);
      setRejectionModal({ isOpen: false, appointmentId: null });
    }
  };

  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, appointmentId: null });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "in_progress":
        return "status-in-progress";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  const renderActionButtons = (appointment) => {
    const { status, id } = appointment;

    switch (status) {
      case "pending":
        return (
          <div className="appointment-actions">
            <button
              className="accept-button"
              onClick={() => handleAcceptAppointment(id)}
            >
              Accept
            </button>
            <button
              className="reject-button"
              onClick={() => handleRejectAppointment(id)}
            >
              Reject
            </button>
          </div>
        );

      case "confirmed":
        return (
          <div className="appointment-actions">
            <button
              className="start-button"
              onClick={() => handleStartAppointment(id)}
            >
              Start Service
            </button>
          </div>
        );

      case "in_progress":
        return (
          <div className="appointment-actions">
            <button
              className="complete-button"
              onClick={() => handleCompleteAppointment(id)}
            >
              Mark Complete
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAppointmentsList = (appointmentsList) => {
    if (appointmentsList.length === 0) {
      return <p className="no-appointments">No appointments found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-header">
              <h3>
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </h3>
              <span
                className={`status-badge ${getStatusBadgeClass(
                  appointment.status
                )}`}
              >
                {appointment.status.charAt(0).toUpperCase() +
                  appointment.status.slice(1)}
              </span>
            </div>

            <div className="appointment-details">
              <p>
                <strong>Date:</strong>{" "}
                {new Date(appointment.date).toLocaleDateString()}
              </p>
              <p>
                <strong>Time:</strong> {appointment.start_time} -{" "}
                {appointment.end_time}
              </p>
              <p>
                <strong>Location:</strong> {appointment.location}
              </p>
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              {appointment.driver_details && (
                <p>
                  <strong>Driver:</strong>{" "}
                  {appointment.driver_details.first_name}{" "}
                  {appointment.driver_details.last_name}
                </p>
              )}
              {appointment.notes && (
                <p>
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>

            {renderActionButtons(appointment)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="therapist-dashboard">
      {" "}
      <div className="dashboard-header">
        {" "}
        <div>
          <h1>Therapist Dashboard</h1>
          <p>
            Welcome, {user?.first_name} {user?.last_name}!
          </p>
        </div>
        <div className="action-buttons">
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>{" "}
      {/* Only show loading spinner on initial load, not for background updates */}
      {loading && isInitialLoad && (
        <div className="loading-spinner">Loading appointments...</div>
      )}
      {/* Improved error handling with retry option */}
      {error && !isInitialLoad && (
        <div className="error-message">
          <div>
            {typeof error === "object"
              ? error.message || error.error || "An error occurred"
              : error}
          </div>
          <button
            onClick={() => refreshAppointments(false)}
            className="retry-button"
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div className="view-selector">
        <button
          className={view === "today" ? "active" : ""}
          onClick={() => setView("today")}
        >
          Today's Appointments
        </button>
        <button
          className={view === "upcoming" ? "active" : ""}
          onClick={() => setView("upcoming")}
        >
          Upcoming Appointments
        </button>
        <button
          className={view === "all" ? "active" : ""}
          onClick={() => setView("all")}
        >
          All My Appointments
        </button>
      </div>
      <div className="dashboard-content">
        {view === "today" && (
          <div className="todays-appointments">
            <h2>Today's Appointments</h2>
            {renderAppointmentsList(myTodayAppointments)}
          </div>
        )}
        {view === "upcoming" && (
          <div className="upcoming-appointments">
            <h2>Upcoming Appointments</h2>
            {renderAppointmentsList(myUpcomingAppointments)}
          </div>
        )}
        {view === "all" && (
          <div className="all-appointments">
            <h2>All My Appointments</h2>
            {renderAppointmentsList(myAppointments)}
          </div>
        )}{" "}
      </div>
      <WebSocketStatus />
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={handleRejectionCancel}
        onSubmit={handleRejectionSubmit}
        appointmentId={rejectionModal.appointmentId}
        loading={loading}
      />
    </div>
  );
};

export default TherapistDashboard;
