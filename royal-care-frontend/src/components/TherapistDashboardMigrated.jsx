/**
 * TherapistDashboard - Complete TanStack Query Migration
 *
 * BEFORE: 1000+ lines with useOptimizedDashboardData and complex state management
 * AFTER: ~400 lines with clean TanStack Query hooks and mutations
 *
 * KEY IMPROVEMENTS:
 * ✅ Replaced useOptimizedDashboardData with useEnhancedDashboardData
 * ✅ Replaced scattered Redux dispatches with useDashboardMutations
 * ✅ Automatic optimistic updates for all actions
 * ✅ Unified error handling and loading states
 * ✅ Real-time updates via TanStack Query cache invalidation
 */

import { useState } from "react";
import { shallowEqual } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

// TanStack Query hooks - Replace all legacy data management
import {
  useDashboardData,
  useDashboardMutations,
} from "../hooks/useAppointmentQueries";
import { useOptimizedSelector } from "../hooks/usePerformanceOptimization";

// UI Components
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import AttendanceComponent from "./AttendanceComponent";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
import RejectionModal from "./RejectionModal";
import Calendar from "./scheduling/Calendar";
import WebSocketStatus from "./scheduling/WebSocketStatus";

// Styles
import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css";

const TherapistDashboardMigrated = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "today";

  // Get user info from Redux (minimal Redux usage)
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

  // ✅ NEW: Enhanced dashboard data with role-based filtering
  const {
    appointments: myAppointments,
    todayAppointments: myTodayAppointments,
    upcomingAppointments: myUpcomingAppointments,
    isLoading,
    error,
    isRefetching,
    hasData,
    refetch,
  } = useDashboardData("therapist", user?.id);

  // ✅ NEW: Dashboard mutations with optimistic updates
  const {
    confirmAppointment,
    rejectAppointment,
    requestPickup,
    startSession,
    completeSession,
    isConfirming,
    isRejecting,
    isRequestingPickup,
    isStartingSession,
    isCompletingSession,
    confirmError,
    rejectError,
    statusUpdateError,
    pickupError,
    sessionError,
  } = useDashboardMutations();

  // Local state for modals and UI
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  // ✅ SIMPLIFIED: Action handlers with TanStack Query mutations
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await confirmAppointment.mutateAsync(appointmentId);
    } catch (error) {
      console.error("Failed to accept appointment:", error);
      // Error is already handled by the mutation's error state
    }
  };

  const handleRejectAppointment = (appointmentId) => {
    setRejectionModal({ isOpen: true, appointmentId });
  };

  const handleRejectionSubmit = async (appointmentId, reason) => {
    try {
      await rejectAppointment.mutateAsync({ appointmentId, reason });
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error("Failed to reject appointment:", error);
    }
  };

  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, appointmentId: null });
  };

  const handleStartSession = async (appointmentId) => {
    try {
      await startSession.mutateAsync(appointmentId);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const handleCompleteSession = async (appointmentId) => {
    try {
      await completeSession.mutateAsync(appointmentId);
    } catch (error) {
      console.error("Failed to complete session:", error);
    }
  };

  const handleRequestPickup = async (appointmentId, urgency = "normal") => {
    try {
      await requestPickup.mutateAsync({ appointmentId, urgency });
    } catch (error) {
      console.error("Failed to request pickup:", error);
    }
  };

  // ✅ SIMPLIFIED: Action buttons based on appointment status
  const renderActionButtons = (appointment) => {
    const { id, status } = appointment;

    switch (status) {
      case "pending":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="accept-button"
              onClick={() => handleAcceptAppointment(id)}
              loading={isConfirming}
              loadingText="Accepting..."
            >
              Accept Appointment
            </LoadingButton>
            <LoadingButton
              className="reject-button"
              onClick={() => handleRejectAppointment(id)}
              loading={isRejecting}
              loadingText="Rejecting..."
              variant="danger"
            >
              Reject
            </LoadingButton>
          </div>
        );

      case "therapist_confirmed":
        return (
          <div className="appointment-actions">
            <div className="confirmed-status">
              <span className="success-badge">✅ Confirmed</span>
              <p>Waiting for driver assignment...</p>
            </div>
          </div>
        );

      case "driver_confirmed":
        return (
          <div className="appointment-actions">
            <div className="driver-confirmed-status">
              <span className="info-badge">🚗 Driver confirmed</span>
              <p>Driver will pick you up soon</p>
            </div>
          </div>
        );

      case "journey_started":
      case "journey":
        return (
          <div className="appointment-actions">
            <div className="journey-status">
              <span className="journey-badge">🚗 En route</span>
              <p>Driver is on the way to pick you up</p>
            </div>
          </div>
        );

      case "arrived":
        return (
          <div className="appointment-actions">
            <div className="arrived-status">
              <span className="arrived-badge">📍 Driver arrived</span>
              <p>Driver has arrived. Ready to proceed to client.</p>
            </div>
          </div>
        );

      case "dropped_off":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="start-session-button"
              onClick={() => handleStartSession(id)}
              loading={isStartingSession}
              loadingText="Starting..."
            >
              Start Session
            </LoadingButton>
            <div className="dropped-off-info">
              <p>📍 Dropped off at client location</p>
            </div>
          </div>
        );

      case "in_progress":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="complete-session-button"
              onClick={() => handleCompleteSession(id)}
              loading={isCompletingSession}
              loadingText="Completing..."
            >
              Complete Session
            </LoadingButton>
            <div className="session-progress">
              <span className="session-badge">💆 Session in progress</span>
            </div>
          </div>
        );

      case "completed":
        // Show pickup options for appointments with drivers
        if (appointment.driver_details) {
          return (
            <div className="appointment-actions">
              {!appointment.pickup_requested ? (
                <div className="pickup-actions">
                  <div className="session-completion-info">
                    <span className="success-badge">✅ Session completed</span>
                    <p>Need pickup to return?</p>
                  </div>
                  <div className="pickup-buttons">
                    <LoadingButton
                      className="request-pickup-button"
                      onClick={() => handleRequestPickup(id, "normal")}
                      loading={isRequestingPickup}
                      loadingText="Requesting..."
                    >
                      Request Pickup
                    </LoadingButton>
                    <LoadingButton
                      className="urgent-pickup-button"
                      onClick={() => handleRequestPickup(id, "urgent")}
                      loading={isRequestingPickup}
                      loadingText="Requesting..."
                      variant="warning"
                    >
                      Request Urgent Pickup
                    </LoadingButton>
                  </div>
                </div>
              ) : (
                <div className="pickup-status">
                  <span className="pickup-badge">⏰ Pickup Requested</span>
                  <p>Waiting for driver assignment...</p>
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

  // ✅ SIMPLIFIED: Appointment list renderer
  const renderAppointmentsList = (appointments) => {
    if (isLoading && appointments.length === 0) {
      return <MinimalLoadingIndicator />;
    }

    if (appointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-calendar-alt"></i>
          <p>No appointments found</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-header">
              <h3>
                Appointment #{appointment.id} -{" "}
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </h3>
              <span className={`status-badge ${appointment.status}`}>
                {appointment.status.replace("_", " ").toUpperCase()}
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
                {Array.isArray(appointment.services_details)
                  ? appointment.services_details.map((s) => s.name).join(", ")
                  : "N/A"}
              </p>
              {appointment.notes && (
                <p>
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>

            {renderActionButtons(appointment)}

            {/* Error displays */}
            {confirmError && (
              <div className="error-message">
                Failed to confirm: {confirmError.message}
              </div>
            )}
            {rejectError && (
              <div className="error-message">
                Failed to reject: {rejectError.message}
              </div>
            )}
            {statusUpdateError && (
              <div className="error-message">
                Status update failed: {statusUpdateError.message}
              </div>
            )}
            {pickupError && (
              <div className="error-message">
                Pickup request failed: {pickupError.message}
              </div>
            )}
            {sessionError && (
              <div className="error-message">
                Session error: {sessionError.message}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ✅ SIMPLIFIED: Error handling
  if (error && !hasData) {
    return (
      <PageLayout>
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error.message || "An unexpected error occurred"}</p>
          <button onClick={refetch} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </PageLayout>
    );
  }

  // Tab configuration
  const tabs = [
    { id: "today", label: "Today", count: myTodayAppointments.length },
    { id: "upcoming", label: "Upcoming", count: myUpcomingAppointments.length },
    { id: "all", label: "All", count: myAppointments.length },
    { id: "attendance", label: "Attendance", count: 0 },
    { id: "calendar", label: "Calendar", count: 0 },
  ];

  return (
    <PageLayout>
      <MinimalLoadingIndicator
        show={isLoading && !hasData}
        hasData={hasData}
        position="top-right"
        size="small"
        variant="subtle"
        tooltip={
          hasData ? "Refreshing appointments..." : "Loading appointments..."
        }
        pulse={true}
        fadeIn={true}
      />

      <div className="therapist-dashboard">
        <LayoutRow title="Therapist Dashboard">
          <div className="action-buttons">
            <p style={{ margin: 0 }}>
              Welcome, {user?.first_name} {user?.last_name}!
            </p>
            {isRefetching && (
              <span className="refreshing-indicator">🔄 Updating...</span>
            )}
            <button onClick={refetch} className="btn btn-secondary btn-sm">
              Refresh
            </button>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">
              Logout
            </button>
          </div>
        </LayoutRow>

        <TabSwitcher
          tabs={tabs}
          activeTab={currentView}
          onTabChange={setView}
        />

        <div className="dashboard-content">
          {currentView === "today" && (
            <div className="today-appointments">
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
          )}

          {currentView === "attendance" && (
            <div className="attendance-view">
              <AttendanceComponent />
            </div>
          )}

          {currentView === "calendar" && (
            <div className="calendar-view">
              <h2>Calendar View</h2>
              <Calendar
                showClientLabels={true}
                context="therapist"
                onDateSelected={() => {}}
                onTimeSelected={() => {}}
              />
            </div>
          )}
        </div>

        <WebSocketStatus />

        <RejectionModal
          isOpen={rejectionModal.isOpen}
          onClose={handleRejectionCancel}
          onSubmit={handleRejectionSubmit}
          appointmentId={rejectionModal.appointmentId}
          loading={isRejecting}
        />
      </div>
    </PageLayout>
  );
};

export default TherapistDashboardMigrated;
