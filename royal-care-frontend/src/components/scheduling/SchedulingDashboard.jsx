import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteAppointment,
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
} from "../../features/scheduling/schedulingSlice";
import useSyncEventHandlers from "../../hooks/useSyncEventHandlers";
import syncService from "../../services/syncService";

import { FaBell } from "react-icons/fa";
import { FiPlus } from "react-icons/fi";
import "../../styles/SchedulingDashboard.css";
import "../../styles/TabSwitcher.css";
import ErrorBoundary from "../common/ErrorBoundary";
import AppointmentForm from "./AppointmentForm";
import AvailabilityManager from "./AvailabilityManager";
import Calendar from "./Calendar";
import NotificationCenter from "./NotificationCenter";
import WebSocketStatus from "./WebSocketStatus";
import WeekView from "./WeekView";
import { MdNotifications, MdAdd } from "react-icons/md";

const SchedulingDashboard = () => {
  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [view, setView] = useState("calendar"); // 'calendar', 'week', 'list', 'today', 'availability'
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);

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

  // Load appointments on component mount and setup polling
  useEffect(() => {
    // Initial load
    dispatch(fetchAppointments());
    dispatch(fetchTodayAppointments());
    dispatch(fetchUpcomingAppointments());

    // Setup polling for real-time updates (WebSocket connections disabled)
    console.log("WebSocket connections disabled - using polling mode");

    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Smart polling with user activity detection
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(20000); // Base 20 seconds
      return setInterval(() => {
        if (syncService.shouldRefresh('scheduling_appointments')) {
          dispatch(fetchAppointments());
          dispatch(fetchTodayAppointments());
          dispatch(fetchUpcomingAppointments());
          syncService.markUpdated('scheduling_appointments');
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    // Cleanup polling interval when component unmounts
    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]); // Simplified dependencies

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
        await dispatch(deleteAppointment(appointmentId)).unwrap();
        // Refresh data after successful deletion
        dispatch(fetchAppointments());
        dispatch(fetchTodayAppointments());
        dispatch(fetchUpcomingAppointments());
      } catch (error) {
        console.error("Error deleting booking:", error);
        // Add user feedback
        alert(`Failed to delete appointment: ${error.message || error}`);
      }
    }
  };

  const handleFormSubmitSuccess = () => {
    setIsFormVisible(false);
    // Refresh data after successful form submission
    dispatch(fetchAppointments());
    dispatch(fetchTodayAppointments());
    dispatch(fetchUpcomingAppointments());
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
        <h1>Bookings</h1>

        <div className="action-buttons">
          <button
            className="notification-button"
            onClick={() => setIsNotificationVisible(!isNotificationVisible)}
            title="Notifications"
          >
            <MdNotifications size={20} />
            {unreadNotificationCount > 0 && (
              <span className="notification-badge">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {user.role === "operator" && (
            <button
              className="create-appointment-button icon-label-btn"
              onClick={handleCreateAppointment}
              title="Create Booking"
            >
              <MdAdd size={20} />
              Create Booking
            </button>
          )}
        </div>
      </div>
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

      {loading && <div className="loading-spinner">Loading...</div>}

      {error && (
        <div className="error-message">
          {typeof error === "object"
            ? error.message || error.error || JSON.stringify(error)
            : error}
        </div>
      )}

      {/* Display notifications panel when visible */}
      {isNotificationVisible && (
        <div className="notifications-panel">
          <NotificationCenter onClose={() => setIsNotificationVisible(false)} />
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
          <ErrorBoundary onReset={() => setIsFormVisible(false)}>
            <AppointmentForm
              key={
                selectedAppointment
                  ? `edit-${selectedAppointment.id}`
                  : "create-new"
              }
              appointment={selectedAppointment}
              onSubmitSuccess={handleFormSubmitSuccess}
              onCancel={handleFormCancel}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          </ErrorBoundary>
        )}
      </div>

      {/* Display WebSocket status notification */}
      <WebSocketStatus />
    </div>
  );
};

export default SchedulingDashboard;
