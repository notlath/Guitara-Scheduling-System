import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  acceptAppointment,
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
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css";
import RejectionModal from "./RejectionModal";
import WebSocketStatus from "./scheduling/WebSocketStatus";

const TherapistDashboard = () => {
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
  // Filter appointments for current therapist (both single and multi-therapist)
  const myAppointments = appointments.filter(
    (apt) =>
      apt.therapist === user?.id ||
      (apt.therapists && apt.therapists.includes(user?.id))
  );

  const myTodayAppointments = todayAppointments.filter(
    (apt) =>
      apt.therapist === user?.id ||
      (apt.therapists && apt.therapists.includes(user?.id))
  );
  const myUpcomingAppointments = upcomingAppointments.filter(
    (apt) =>
      apt.therapist === user?.id ||
      (apt.therapists && apt.therapists.includes(user?.id))
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
  ); // Remove isInitialLoad from dependencies to prevent loops  // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Set up adaptive polling with smart refresh
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(30000); // Base 30 seconds for therapist
      return setInterval(() => {
        if (syncService.shouldRefresh("therapist_appointments")) {
          dispatch(fetchAppointments());
          dispatch(fetchTodayAppointments());
          dispatch(fetchUpcomingAppointments());
          syncService.markUpdated("therapist_appointments");
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]); // Simplified dependencies  // Load appointments on component mount
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!mounted) return;

      // Initialize appointment fetching
      if (mounted) {
        await Promise.all([
          dispatch(fetchAppointments()),
          dispatch(fetchTodayAppointments()),
          dispatch(fetchUpcomingAppointments()),
        ]);
        setIsInitialLoad(false);
      }
    };

    loadInitialData();

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
  }, [currentView, dispatch, isInitialLoad]); // Include all dependencies

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }; // Handle appointment status changes with optimized refresh and optimistic updates
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await dispatch(acceptAppointment(appointmentId)).unwrap();
      // Only refresh current view data to minimize API calls
      refreshAppointments(true);
    } catch (error) {
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
    const appointment = myAppointments.find((apt) => apt.id === appointmentId);
    const needsPickup = appointment?.driver_details ? true : false;

    if (window.confirm("Mark this appointment as completed?")) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "completed",
            session_end_time: new Date().toISOString(),
            pickup_requested: needsPickup,
            pickup_request_time: needsPickup ? new Date().toISOString() : null,
            pickup_urgency: "normal",
          })
        ).unwrap();

        // If transportation was used, automatically request pickup
        if (needsPickup) {
          // Broadcast pickup request to operators
          try {
            // This would trigger real-time notification to operators
            syncService.broadcast("pickup_requested", {
              therapist_id: user.id,
              therapist_name: `${user.first_name} ${user.last_name}`,
              appointment_id: appointmentId,
              location: appointment.location,
              urgency: "normal",
              session_end_time: new Date().toISOString(),
              client_name: `${appointment.client_details?.first_name} ${appointment.client_details?.last_name}`,
            });

            alert(
              "Session completed! Pickup request has been sent to our coordination team."
            );
          } catch (broadcastError) {
            console.error(
              "Failed to broadcast pickup request:",
              broadcastError
            );
            alert(
              "Session completed! Please manually request pickup if needed."
            );
          }
        }

        refreshAppointments(true);
      } catch (error) {
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

  // New function to manually request pickup
  const handleRequestPickup = async (appointmentId) => {
    const appointment = myAppointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          pickup_requested: true,
          pickup_request_time: new Date().toISOString(),
          pickup_urgency: "normal",
        })
      ).unwrap();

      // Broadcast pickup request to operators
      syncService.broadcast("pickup_requested", {
        therapist_id: user.id,
        therapist_name: `${user.first_name} ${user.last_name}`,
        appointment_id: appointmentId,
        location: appointment.location,
        urgency: "normal",
        session_end_time:
          appointment.session_end_time || new Date().toISOString(),
        client_name: `${appointment.client_details?.first_name} ${appointment.client_details?.last_name}`,
      });

      refreshAppointments(true);
      alert(
        "Pickup request sent! You'll be notified when a driver is assigned."
      );
    } catch (error) {
      console.error("Failed to request pickup:", error);
      alert("Failed to request pickup. Please try again.");
    }
  };

  // Function to request urgent pickup
  const handleRequestUrgentPickup = async (appointmentId) => {
    const appointment = myAppointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    if (
      window.confirm(
        "Request URGENT pickup? This will prioritize your request."
      )
    ) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            pickup_requested: true,
            pickup_request_time: new Date().toISOString(),
            pickup_urgency: "urgent",
          })
        ).unwrap();

        // Broadcast urgent pickup request
        syncService.broadcast("urgent_pickup_requested", {
          therapist_id: user.id,
          therapist_name: `${user.first_name} ${user.last_name}`,
          appointment_id: appointmentId,
          location: appointment.location,
          urgency: "urgent",
          session_end_time:
            appointment.session_end_time || new Date().toISOString(),
          client_name: `${appointment.client_details?.first_name} ${appointment.client_details?.last_name}`,
        });

        refreshAppointments(true);
        alert(
          "URGENT pickup request sent! A driver will be assigned immediately."
        );
      } catch (error) {
        console.error("Failed to request urgent pickup:", error);
        alert("Failed to request urgent pickup. Please try again.");
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
    // Additional validation on the frontend
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      alert("Please provide a reason for rejection.");
      return;
    }
    try {
      await dispatch(
        rejectAppointment({
          id: appointmentId,
          rejectionReason: cleanReason,
        })
      ).unwrap();
      refreshAppointments(true); // Silent background refresh after action
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
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

  // Helper function to display therapist team information
  const renderTherapistTeam = (appointment) => {
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 1
    ) {
      const otherTherapists = appointment.therapists_details.filter(
        (t) => t.id !== user?.id
      );
      if (otherTherapists.length > 0) {
        return (
          <div className="therapist-team">
            <strong>Team members:</strong>{" "}
            {otherTherapists
              .map((t) => `${t.first_name} ${t.last_name}`)
              .join(", ")}
          </div>
        );
      }
    }
    return null;
  };

  const renderActionButtons = (appointment) => {
    const {
      status,
      id,
      therapist_accepted,
      both_parties_accepted,
      pending_acceptances,
      therapists_accepted,
      therapists,
    } = appointment;

    // Helper function to check if current therapist has accepted
    const hasCurrentTherapistAccepted = () => {
      // For multi-therapist appointments
      if (therapists && therapists.length > 0) {
        const therapistIndex = therapists.indexOf(user?.id);
        return (
          therapistIndex !== -1 &&
          therapists_accepted &&
          therapists_accepted[therapistIndex]
        );
      }
      // For single therapist appointments (legacy)
      return therapist_accepted;
    };

    switch (status) {
      case "pending":
        // Show accept/reject only if current therapist hasn't accepted yet
        if (!hasCurrentTherapistAccepted()) {
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
        } else {
          // Therapist has accepted, show waiting status
          return (
            <div className="appointment-actions">
              <div className="waiting-status">
                <span className="accepted-badge">✓ You have accepted</span>
                {!both_parties_accepted && pending_acceptances?.length > 0 && (
                  <small className="waiting-text">
                    Waiting for: {pending_acceptances.join(", ")}
                  </small>
                )}
              </div>
            </div>
          );
        }

      case "confirmed":
        // Only show start button if both parties have accepted
        if (both_parties_accepted) {
          return (
            <div className="appointment-actions">
              <button
                className="start-button"
                onClick={() => handleStartAppointment(id)}
              >
                Start Session
              </button>
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="warning-status">
                ⚠ Waiting for all parties to accept before starting
              </div>{" "}
            </div>
          );
        }
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

      case "completed":
        // Show pickup options for appointments with drivers
        if (appointment.driver_details) {
          return (
            <div className="appointment-actions">
              {appointment.pickup_requested ? (
                <div className="pickup-status">
                  {appointment.assigned_driver ? (
                    <div className="driver-assigned">
                      <span className="success-badge">✅ Driver Assigned</span>
                      <p>Driver en route for pickup</p>
                      {appointment.estimated_pickup_time && (
                        <p>
                          <strong>ETA:</strong>{" "}
                          {new Date(
                            appointment.estimated_pickup_time
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pickup-pending">
                      <span
                        className={`pickup-badge ${
                          appointment.pickup_urgency || "normal"
                        }`}
                      >
                        {appointment.pickup_urgency === "urgent"
                          ? "🚨 URGENT Pickup Requested"
                          : "⏰ Pickup Requested"}
                      </span>
                      <p>Waiting for driver assignment...</p>
                      {appointment.pickup_urgency !== "urgent" && (
                        <button
                          className="urgent-pickup-button"
                          onClick={() => handleRequestUrgentPickup(id)}
                        >
                          Request Urgent Pickup
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pickup-actions">
                  <p className="pickup-info">Session completed. Need pickup?</p>
                  <button
                    className="request-pickup-button"
                    onClick={() => handleRequestPickup(id)}
                  >
                    Request Pickup
                  </button>
                  <button
                    className="urgent-pickup-button"
                    onClick={() => handleRequestUrgentPickup(id)}
                  >
                    Request Urgent Pickup
                  </button>
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="completed-status">
                <span className="success-badge">✅ Session Completed</span>
                <p>No transport needed</p>
              </div>
            </div>
          );
        }

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
              {renderTherapistTeam(appointment)}
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
    <div className="global-container">
      <div className="global-content">
        <div className="therapist-dashboard">
          <LayoutRow title="Therapist Dashboard">
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
            <PageLoadingState message="Loading your appointments..." />
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
          )}{" "}
          <div className="view-selector">
            <button
              className={currentView === "today" ? "active" : ""}
              onClick={() => setView("today")}
            >
              Today's Appointments
            </button>
            <button
              className={currentView === "upcoming" ? "active" : ""}
              onClick={() => setView("upcoming")}
            >
              Upcoming Appointments
            </button>
            <button
              className={currentView === "all" ? "active" : ""}
              onClick={() => setView("all")}
            >
              All My Appointments
            </button>
          </div>
          <div className="dashboard-content">
            {currentView === "today" && (
              <div className="todays-appointments">
                <h2>Today's Appointments</h2>
                {renderAppointmentsList(myTodayAppointments)}
              </div>
            )}
            {currentView === "upcoming" && (
              <div className="upcoming-appointments">
                <h2>Upcoming Appointments</h2>
                {renderAppointmentsList(myUpcomingAppointments)}
              </div>
            )}
            {currentView === "all" && (
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
      </div>
    </div>
  );
};

export default TherapistDashboard;
