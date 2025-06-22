/**
 * TanStack Query Migration Example for TherapistDashboard
 * Shows how to replace useOptimizedDashboardData with TanStack Query
 */

import { shallowEqual } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDashboardData } from "../../hooks/useAppointmentQueries";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import { LoadingButton } from "../common/LoadingComponents";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import "../../globals/TabSwitcher.css";
import "../styles/TherapistDashboard.css";

const TherapistDashboardTanStack = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "today";

  // Get user info from Redux (keep this for user identification)
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

  // Replace useOptimizedDashboardData with TanStack Query
  const {
    appointments: myAppointments,
    todayAppointments: myTodayAppointments,
    upcomingAppointments: myUpcomingAppointments,
    isLoading,
    error,
    isRefetching,
    refetch,
  } = useDashboardData("therapist", user?.id);

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

  const renderAppointmentsList = (appointments) => {
    if (isLoading && appointments.length === 0) {
      return <MinimalLoadingIndicator />;
    }

    if (appointments.length === 0) {
      return (
        <div className="empty-state">
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
                {appointment.client_name ||
                  `${appointment.client_details?.first_name || ""} ${
                    appointment.client_details?.last_name || ""
                  }`.trim() ||
                  "Unknown Client"}
              </h3>
              <span className={`status-badge ${appointment.status}`}>
                {appointment.status?.replace("_", " ").toUpperCase()}
              </span>
            </div>

            <div className="appointment-details">
              <p>
                <strong>Date:</strong> {appointment.date}
              </p>
              <p>
                <strong>Time:</strong> {appointment.start_time} -{" "}
                {appointment.end_time}
              </p>
              <p>
                <strong>Location:</strong> {appointment.location}
              </p>

              {appointment.services_details && (
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details.map((s) => s.name).join(", ")}
                </p>
              )}

              {appointment.notes && (
                <p>
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>

            <div className="appointment-actions">
              {appointment.status === "pending" && (
                <>
                  <LoadingButton
                    onClick={() => handleAcceptAppointment(appointment.id)}
                    className="btn btn-success btn-sm"
                    isLoading={false} // You'd implement action loading state
                  >
                    Accept
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => handleRejectAppointment(appointment.id)}
                    className="btn btn-danger btn-sm"
                    isLoading={false}
                  >
                    Reject
                  </LoadingButton>
                </>
              )}

              {appointment.status === "therapist_confirmed" && (
                <LoadingButton
                  onClick={() => handleStartSession(appointment.id)}
                  className="btn btn-primary btn-sm"
                  isLoading={false}
                >
                  Start Session
                </LoadingButton>
              )}

              {appointment.status === "in_progress" && (
                <>
                  <LoadingButton
                    onClick={() => handleCompleteSession(appointment.id)}
                    className="btn btn-success btn-sm"
                    isLoading={false}
                  >
                    Complete Session
                  </LoadingButton>
                  <LoadingButton
                    onClick={() => handleRequestPickup(appointment.id)}
                    className="btn btn-info btn-sm"
                    isLoading={false}
                  >
                    Request Pickup
                  </LoadingButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Placeholder action handlers (you'd implement these with mutations)
  const handleAcceptAppointment = (appointmentId) => {
    console.log("Accept appointment:", appointmentId);
    // Use useMutation hook for therapistConfirm
  };

  const handleRejectAppointment = (appointmentId) => {
    console.log("Reject appointment:", appointmentId);
    // Use useMutation hook for rejectAppointment
  };

  const handleStartSession = (appointmentId) => {
    console.log("Start session:", appointmentId);
    // Use useMutation hook for startSession
  };

  const handleCompleteSession = (appointmentId) => {
    console.log("Complete session:", appointmentId);
    // Use useMutation hook for completeAppointment
  };

  const handleRequestPickup = (appointmentId) => {
    console.log("Request pickup:", appointmentId);
    // Use useMutation hook for requestPickup
  };

  if (error) {
    return (
      <PageLayout>
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error.message}</p>
          <button onClick={refetch} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </PageLayout>
    );
  }

  const tabs = [
    { id: "today", label: "Today", count: myTodayAppointments.length },
    { id: "upcoming", label: "Upcoming", count: myUpcomingAppointments.length },
    { id: "all", label: "All", count: myAppointments.length },
  ];

  return (
    <PageLayout>
      <LayoutRow>
        <div className="dashboard-header">
          <h1>Therapist Dashboard</h1>
          <div className="dashboard-actions">
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
        </div>
      </LayoutRow>

      <LayoutRow>
        <TabSwitcher
          tabs={tabs}
          activeTab={currentView}
          onTabChange={setView}
        />
      </LayoutRow>

      <LayoutRow>
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
        </div>
      </LayoutRow>
    </PageLayout>
  );
};

export default TherapistDashboardTanStack;
