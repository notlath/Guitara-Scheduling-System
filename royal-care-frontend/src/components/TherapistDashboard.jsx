import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  updateAppointmentStatus,
  rejectAppointment,
} from "../features/scheduling/schedulingSlice";
import { setupWebSocket } from "../services/webSocketService";
import RejectionModal from "./RejectionModal";
import "../styles/TherapistDashboard.css";

const TherapistDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState("today"); // 'today', 'upcoming', 'all'
  const [pollingInterval, setPollingInterval] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });

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
  );

  // Refresh appointments data
  const refreshAppointments = useCallback(() => {
    dispatch(fetchAppointments());
    dispatch(fetchTodayAppointments());
    dispatch(fetchUpcomingAppointments());
  }, [dispatch]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    let cleanupWebSocket = null;

    try {
      cleanupWebSocket = setupWebSocket({
        onAppointmentUpdate: () => {
          refreshAppointments();
        },
      });
    } catch (err) {
      console.error("Error setting up WebSocket:", err);
      // Fallback to polling if WebSocket fails
      if (!pollingInterval) {
        const interval = setInterval(() => refreshAppointments(), 30000);
        setPollingInterval(interval);
      }
    }

    return () => {
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval, refreshAppointments]);

  // Load appointments on component mount
  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  // Handle appointment status changes
  const handleAcceptAppointment = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "confirmed",
        })
      ).unwrap();
      refreshAppointments();
    } catch (error) {
      console.error("Error accepting appointment:", error);
      alert("Failed to accept appointment. Please try again.");
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
      refreshAppointments();
    } catch (error) {
      console.error("Error starting appointment:", error);
      alert("Failed to start appointment. Please try again.");
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
        refreshAppointments();
      } catch (error) {
        console.error("Error completing appointment:", error);
        alert("Failed to complete appointment. Please try again.");
      }
    }
  };
  const handleRejectAppointment = (appointmentId) => {
    setRejectionModal({
      isOpen: true,
      appointmentId: appointmentId,
    });
  };

  const handleRejectionSubmit = async (rejectionReason) => {
    try {
      await dispatch(
        rejectAppointment({
          id: rejectionModal.appointmentId,
          rejectionReason: rejectionReason,
        })
      ).unwrap();
      refreshAppointments();
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      alert("Failed to reject appointment. Please try again.");
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
      <div className="dashboard-header">
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
      </div>

      {loading && <div className="loading-spinner">Loading...</div>}

      {error && (
        <div className="error-message">
          {typeof error === "object"
            ? error.message || error.error || JSON.stringify(error)
            : error}
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
        )}      </div>

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onSubmit={handleRejectionSubmit}
        onCancel={handleRejectionCancel}
      />
    </div>
  );
};

export default TherapistDashboard;
