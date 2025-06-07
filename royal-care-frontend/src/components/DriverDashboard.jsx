import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { PageLoadingState } from "./common/LoadingComponents";

import LayoutRow from "../globals/LayoutRow";
import "../globals/TabSwitcher.css";
import "../styles/TherapistDashboard.css"; // Reuse therapist styles for consistency
import { runAuthDiagnostics, testLogin } from "../utils/authFixer";
import RejectionModal from "./RejectionModal";
import WebSocketStatus from "./scheduling/WebSocketStatus";

const DriverDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  // Get view from URL params, default to 'today'
  const currentView = searchParams.get("view") || "today";

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };
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

  // Filter appointments for current driver
  const myAppointments = appointments.filter((apt) => apt.driver === user?.id);

  const myTodayAppointments = todayAppointments.filter(
    (apt) => apt.driver === user?.id
  );
  const myUpcomingAppointments = upcomingAppointments.filter(
    (apt) => apt.driver === user?.id
  );

  // Refresh appointments data silently in background
  const refreshAppointments = useCallback(
    async (isBackground = false, targetView = null) => {
      // Never show loading indicators for background updates
      // Only show loading on initial load via Redux state

      try {
        // Optimize by only fetching what's needed based on current view
        if (isBackground) {
          // For background updates, fetch only the currently viewed data to reduce load
          const viewToUse = targetView || currentView;
          switch (viewToUse) {
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
    [dispatch, currentView]
  );

  // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
    console.log("WebSocket connections disabled - using polling mode");

    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Set up adaptive polling with smart refresh
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(30000); // Base 30 seconds for driver
      return setInterval(() => {
        if (syncService.shouldRefresh("driver_appointments")) {
          dispatch(fetchAppointments());
          dispatch(fetchTodayAppointments());
          dispatch(fetchUpcomingAppointments());
          syncService.markUpdated("driver_appointments");
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]);

  // Load appointments on component mount and debug authentication
  useEffect(() => {
    let mounted = true;

    // Debug authentication on mount using new diagnostics
    console.log(
      "🚀 DriverDashboard mounted - running authentication diagnostics..."
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
      console.log("🚀 DriverDashboard: Initial load, fetching appointments...");
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
  }, [dispatch]);

  // Refresh specific view data when view changes (silent background update)
  useEffect(() => {
    if (!isInitialLoad) {
      // Call dispatch actions directly to avoid dependency issues
      dispatch(fetchAppointments());
      dispatch(fetchTodayAppointments());
      dispatch(fetchUpcomingAppointments());
    }
  }, [currentView, dispatch, isInitialLoad]);

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  // Handle appointment status changes with optimized refresh and optimistic updates
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

  const handleStartDriving = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "driving_to_location",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Error starting drive:", error);
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to start drive. Please try again.");
      }
    }
  };

  const handleArriveAtLocation = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "at_location",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Error marking arrival:", error);
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to mark arrival. Please try again.");
      }
    }
  };

  const handleCompleteTransport = async (appointmentId) => {
    if (window.confirm("Mark transport as completed?")) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "transport_completed",
          })
        ).unwrap();
        refreshAppointments(true);
      } catch (error) {
        console.error("Error completing transport:", error);
        if (
          error?.message?.includes("401") ||
          error?.message?.includes("Authentication")
        ) {
          alert("Session expired. Please refresh the page and log in again.");
        } else {
          alert("Failed to complete transport. Please try again.");
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
    console.log("🔍 DriverDashboard handleRejectionSubmit - DETAILED DEBUG:", {
      appointmentId,
      rejectionReason,
      reasonType: typeof rejectionReason,
      reasonLength: rejectionReason?.length,
      reasonTrimmed: String(rejectionReason || "").trim(),
      reasonTrimmedLength: String(rejectionReason || "").trim().length,
    });

    // Additional validation on the frontend
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      console.error("❌ DriverDashboard: Empty reason detected");
      alert("Please provide a reason for rejection.");
      return;
    }

    console.log("✅ DriverDashboard: Dispatching rejectAppointment with:", {
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
      console.log("✅ DriverDashboard: Rejection successful:", result);
      refreshAppointments(true); // Silent background refresh after action
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error("❌ DriverDashboard: Error rejecting appointment:", error);

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
      case "driving_to_location":
        return "status-in-progress";
      case "at_location":
        return "status-confirmed";
      case "transport_completed":
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
              onClick={() => handleStartDriving(id)}
            >
              Start Driving
            </button>
          </div>
        );

      case "driving_to_location":
        return (
          <div className="appointment-actions">
            <button
              className="arrive-button"
              onClick={() => handleArriveAtLocation(id)}
            >
              Mark Arrived
            </button>
          </div>
        );

      case "at_location":
        return (
          <div className="appointment-actions">
            <button
              className="complete-button"
              onClick={() => handleCompleteTransport(id)}
            >
              Complete Transport
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderAppointmentsList = (appointmentsList) => {
    if (appointmentsList.length === 0) {
      return <p className="no-appointments">No transport assignments found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-header">
              <h3>
                Transport for {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </h3>
              <span
                className={`status-badge ${getStatusBadgeClass(
                  appointment.status
                )}`}
              >
                {appointment.status.charAt(0).toUpperCase() +
                  appointment.status.slice(1).replace(/_/g, " ")}
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
                <strong>Pickup Location:</strong> {appointment.location}
              </p>
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              {appointment.therapist_details && (
                <p>
                  <strong>Therapist:</strong>{" "}
                  {appointment.therapist_details.first_name}{" "}
                  {appointment.therapist_details.last_name}
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
    <div className="global-container">
      <div className="global-content">
        <div className="therapist-dashboard">
          <LayoutRow title="Driver Dashboard">
            <div className="action-buttons">
              <p style={{ margin: 0 }}>
                Welcome, {user?.first_name} {user?.last_name}!
              </p>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </LayoutRow>
          {/* Only show loading spinner on initial load, not for background updates */}
          {loading && isInitialLoad && (
            <PageLoadingState message="Loading your transport assignments..." />
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
              className={currentView === "today" ? "active" : ""}
              onClick={() => setView("today")}
            >
              Today's Transports
            </button>
            <button
              className={currentView === "upcoming" ? "active" : ""}
              onClick={() => setView("upcoming")}
            >
              Upcoming Transports
            </button>
            <button
              className={currentView === "all" ? "active" : ""}
              onClick={() => setView("all")}
            >
              All My Transports
            </button>
          </div>
          <div className="dashboard-content">
            {currentView === "today" && (
              <div className="todays-appointments">
                <h2>Today's Transports</h2>
                {renderAppointmentsList(myTodayAppointments)}
              </div>
            )}
            {currentView === "upcoming" && (
              <div className="upcoming-appointments">
                <h2>Upcoming Transports</h2>
                {renderAppointmentsList(myUpcomingAppointments)}
              </div>
            )}
            {currentView === "all" && (
              <div className="all-appointments">
                <h2>All My Transports</h2>
                {renderAppointmentsList(myAppointments)}
              </div>
            )}
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
      </div>
    </div>
  );
};

export default DriverDashboard;
