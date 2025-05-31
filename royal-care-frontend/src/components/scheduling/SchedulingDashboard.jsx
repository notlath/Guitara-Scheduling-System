import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteAppointment,
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../../features/scheduling/schedulingSlice";
import { setupWebSocket } from "../../services/webSocketService";
import "../../styles/SchedulingDashboard.css";
import AppointmentForm from "./AppointmentForm";
import AvailabilityManager from "./AvailabilityManager";
import Calendar from "./Calendar";
import NotificationCenter from "./NotificationCenter";
import WebSocketStatus from "./WebSocketStatus";
import WeekView from "./WeekView";

const SchedulingDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [view, setView] = useState("calendar"); // 'calendar', 'week', 'list', 'today', 'availability'
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  // Track connection status for internal use in the component
  const [pollingInterval, setPollingInterval] = useState(null);

  const dispatch = useDispatch();
  const {
    todayAppointments,
    upcomingAppointments,
    unreadNotificationCount,
    loading,
    error,
  } = useSelector((state) => state.scheduling);
  const { user } = useSelector((state) => state.auth);
  const defaultDate = useMemo(() => new Date(), []);

  // Memoize the refreshAppointments function to avoid dependency changes
  const refreshAppointments = useCallback(() => {
    dispatch(fetchAppointments());
    dispatch(fetchTodayAppointments());
    dispatch(fetchUpcomingAppointments());
  }, [dispatch]);

  // Setup websocket connection for real-time updates
  useEffect(() => {
    const cleanupWebSocket = setupWebSocket({
      onAppointmentUpdate: () => {
        // Refresh appointments when we receive real-time updates
        refreshAppointments();
      },
    });

    // Listen for WebSocket status changes
    const handleStatusChange = (event) => {
      if (event.detail.status === "connected") {
        // Clear polling interval when WebSocket connects
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      } else {
        // Start polling if WebSocket disconnects and we're not already polling
        if (!pollingInterval) {
          const interval = setInterval(() => refreshAppointments(), 30000); // Poll every 30 seconds
          setPollingInterval(interval);
        }
      }
    };

    window.addEventListener("websocket-status", handleStatusChange);

    // Cleanup websocket connection and event listeners when component unmounts
    return () => {
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }

      window.removeEventListener("websocket-status", handleStatusChange);

      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval, refreshAppointments]);

  // Load appointments on component mount
  useEffect(() => {
    refreshAppointments();
  }, [refreshAppointments]);

  const handleDateSelected = (date) => {
    setSelectedDate(date);
    // Clear any selected appointment when date changes
    setSelectedAppointment(null);
  };

  const handleTimeSelected = (time) => {
    setSelectedTime(time);
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setIsFormVisible(true);
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    // Also set the selected date and time to match the appointment
    setSelectedDate(new Date(appointment.date));
    setSelectedTime(appointment.start_time);
    setIsFormVisible(true);
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      try {
        await dispatch(deleteAppointment(appointmentId));
        refreshAppointments();
      } catch (error) {
        console.error("Error deleting booking:", error);
      }
    }
  };

  const handleFormSubmitSuccess = () => {
    setIsFormVisible(false);
    refreshAppointments();
  };

  const handleFormCancel = () => {
    setIsFormVisible(false);
  };

  const formatAppointmentTime = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
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

  const formatPaymentStatus = (status) => {
    switch (status) {
      case "unpaid":
        return "Unpaid";
      case "partial":
        return "Partially Paid";
      case "paid":
        return "Paid";
      case "refunded":
        return "Refunded";
      default:
        return status;
    }
  };

  const renderAppointmentsList = (appointmentsList) => {
    if (appointmentsList.length === 0) {
      return <p className="no-appointments">No bookings found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-header">
              <h3>
                {appointment.client_details.first_name}{" "}
                {appointment.client_details.last_name}
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
                <strong>Time:</strong>{" "}
                {formatAppointmentTime(
                  appointment.start_time,
                  appointment.end_time
                )}
              </p>
              <p>
                <strong>Location:</strong> {appointment.location}
              </p>
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details.map((s) => s.name).join(", ")}
              </p>
              <p>
                <strong>Therapist:</strong>{" "}
                {appointment.therapist_details?.first_name}{" "}
                {appointment.therapist_details?.last_name}
              </p>
              {appointment.driver_details && (
                <p>
                  <strong>Driver:</strong>{" "}
                  {appointment.driver_details.first_name}{" "}
                  {appointment.driver_details.last_name}
                </p>
              )}
              <p>
                <strong>Payment:</strong>{" "}
                {formatPaymentStatus(appointment.payment_status)}
              </p>
              {appointment.notes && (
                <p>
                  <strong>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>

            {user.role === "operator" && (
              <div className="appointment-actions">
                <button
                  className="edit-button"
                  onClick={() => handleEditAppointment(appointment)}
                >
                  Edit
                </button>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteAppointment(appointment.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="scheduling-dashboard">
      <div className="dashboard-header">
        <h1>Booking Scheduling</h1>

        <div className="view-selector">
          <button
            className={view === "calendar" ? "active" : ""}
            onClick={() => setView("calendar")}
          >
            Month View
          </button>
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Week View
          </button>
          <button
            className={view === "today" ? "active" : ""}
            onClick={() => setView("today")}
          >
            Today's Bookings
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            Upcoming Bookings
          </button>
          <button
            className={view === "availability" ? "active" : ""}
            onClick={() => setView("availability")}
          >
            Manage Availability
          </button>
        </div>

        <div className="action-buttons">
          <button
            className="notification-button"
            onClick={() => setIsNotificationVisible(!isNotificationVisible)}
          >
            Notifications
            {unreadNotificationCount > 0 && (
              <span className="notification-badge">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {user.role === "operator" && (
            <button
              className="create-appointment-button"
              onClick={handleCreateAppointment}
            >
              Create Booking
            </button>
          )}
        </div>
      </div>

      {loading && <div className="loading-spinner">Loading...</div>}

      {error && <div className="error-message">{error}</div>}

      {/* Display notifications panel when visible */}
      {isNotificationVisible && (
        <div className="notifications-panel">
          <NotificationCenter />
        </div>
      )}

      {/* Display different views based on user selection */}
      <div className="dashboard-content">
        {view === "calendar" && !isFormVisible && (
          <Calendar
            onDateSelected={handleDateSelected}
            onTimeSelected={handleTimeSelected}
            selectedDate={selectedDate}
          />
        )}

        {view === "week" && !isFormVisible && (
          <WeekView
            onAppointmentSelect={handleEditAppointment}
            selectedDate={selectedDate || defaultDate}
          />
        )}

        {view === "today" && !isFormVisible && (
          <div className="todays-appointments">
            <h2>Today's Bookings</h2>
            {renderAppointmentsList(todayAppointments)}
          </div>
        )}

        {view === "list" && !isFormVisible && (
          <div className="upcoming-appointments">
            <h2>Upcoming Bookings</h2>
            {renderAppointmentsList(upcomingAppointments)}
          </div>
        )}

        {view === "availability" && !isFormVisible && <AvailabilityManager />}

        {isFormVisible && (
          <AppointmentForm
            appointment={selectedAppointment}
            onSubmitSuccess={handleFormSubmitSuccess}
            onCancel={handleFormCancel}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />
        )}
      </div>

      {/* Display WebSocket status notification */}
      <WebSocketStatus />
    </div>
  );
};

export default SchedulingDashboard;
