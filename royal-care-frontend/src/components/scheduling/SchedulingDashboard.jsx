import { useCallback, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { deleteAppointment } from "../../features/scheduling/schedulingSlice";
// MIGRATED TO TANSTACK QUERY: Replace legacy optimized hooks with TanStack Query
import { useSchedulingDashboardData } from "../../hooks/useDashboardQueries";
import useSyncEventHandlers from "../../hooks/useSyncEventHandlers";
import { SkeletonLoader } from "../common/LoadingComponents";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

import { MdAdd, MdNotifications } from "react-icons/md";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import "../../globals/TabSwitcher.css";
import "../../styles/SchedulingDashboard.css";
import APIErrorDisplay from "../common/APIErrorDisplay";
import ErrorBoundary from "../common/ErrorBoundary";
// Legacy forms (comment out when ready)
// import AppointmentForm from "./AppointmentForm";
// import AppointmentForm from "./AppointmentFormMigrated";

// TanStack Query integrated form
import AppointmentForm from "./AppointmentFormTanStackComplete";
import AvailabilityManager from "./AvailabilityManager";
import Calendar from "./Calendar";
import NotificationCenter from "./NotificationCenter";
import WebSocketStatus from "./WebSocketStatus";
import WeekView from "./WeekView";

const SchedulingDashboard = () => {
  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Get view from URL params, default to 'calendar'
  const currentView = searchParams.get("view") || "calendar";
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);

  // Helper function to update view in URL and close form if open
  const setView = (newView) => {
    // Always close the form and clear selected appointment first
    if (isFormVisible) {
      setIsFormVisible(false);
      setSelectedAppointment(null);
      // Use setTimeout to ensure state updates before changing URL
      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("view", newView);
        setSearchParams(newSearchParams);
      }, 0);
    } else {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("view", newView);
      setSearchParams(newSearchParams);
    }
  };
  const dispatch = useDispatch();
  // MIGRATED TO TANSTACK QUERY: Use TanStack Query hooks instead of legacy optimizedDataManager
  const {
    todayAppointments,
    upcomingAppointments,
    loading,
    error,
    forceRefresh,
    hasData,
  } = useSchedulingDashboardData();

  const { user } = useSelector(
    useCallback(
      (state) => ({
        user: state.auth?.user || null,
      }),
      []
    ),
    shallowEqual
  );

  const { unreadNotificationCount } = useSelector(
    useCallback(
      (state) => ({
        unreadNotificationCount: state.scheduling?.unreadNotificationCount || 0,
      }),
      []
    ),
    shallowEqual
  );
  const defaultDate = useMemo(() => new Date(), []);
  // OPTIMIZED: Remove auto-refresh logic (handled by optimized data manager)
  // The optimized data manager handles background refreshes automatically

  // 🔥 REMOVED: All redundant polling and data fetching
  // The centralized data manager (useSchedulingDashboardData) handles all polling automatically
  // No need for individual dashboard polling or initial data loading

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
        // TANSTACK QUERY: Use forceRefresh from TanStack Query instead of optimizedDataManager
        await forceRefresh();
      } catch (error) {
        // Add user feedback
        alert(`Failed to delete appointment: ${error.message || error}`);
      }
    }
  };
  const handleFormSubmitSuccess = async () => {
    setIsFormVisible(false);
    // TANSTACK QUERY: Use forceRefresh from TanStack Query instead of optimizedDataManager
    await forceRefresh();
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
    // Ensure appointmentsList is always an array - handle all possible undefined/null/non-array values
    const safeAppointmentsList = Array.isArray(appointmentsList)
      ? appointmentsList
      : [];

    if (loading && safeAppointmentsList.length === 0) {
      return (
        <div className="appointments-list">
          <SkeletonLoader
            lines={4}
            avatar={true}
            className="appointment-skeleton"
          />
          <SkeletonLoader
            lines={4}
            avatar={true}
            className="appointment-skeleton"
          />
          <SkeletonLoader
            lines={4}
            avatar={true}
            className="appointment-skeleton"
          />
        </div>
      );
    }

    if (safeAppointmentsList.length === 0) {
      return <p className="no-appointments">No bookings found.</p>;
    }

    return (
      <div className="appointments-list">
        {safeAppointmentsList.map((appointment) => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-header">
              <h3>
                {appointment.client_details?.first_name || "Unknown"}{" "}
                {appointment.client_details?.last_name || "Client"}
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
                {appointment.services_details &&
                Array.isArray(appointment.services_details)
                  ? appointment.services_details.map((s) => s.name).join(", ")
                  : "No services listed"}
              </p>
              {appointment.therapists_details &&
              appointment.therapists_details.length > 0 ? (
                <p>
                  <strong>Therapists:</strong>{" "}
                  {appointment.therapists_details.map((therapist, index) => (
                    <span key={therapist.id}>
                      {therapist.first_name} {therapist.last_name}
                      {therapist.specialization &&
                        ` (${therapist.specialization})`}
                      {index < appointment.therapists_details.length - 1 &&
                        ", "}
                    </span>
                  ))}
                </p>
              ) : appointment.therapist_details ? (
                <p>
                  <strong>Therapist:</strong>{" "}
                  {appointment.therapist_details?.first_name || "Unknown"}{" "}
                  {appointment.therapist_details?.last_name || "Therapist"}
                  {appointment.therapist_details?.specialization &&
                    ` (${appointment.therapist_details.specialization})`}
                </p>
              ) : (
                <p>
                  <strong>Therapist:</strong> Not assigned
                </p>
              )}
              {appointment.driver_details && (
                <p>
                  <strong>Driver:</strong>{" "}
                  {appointment.driver_details?.first_name || "Unknown"}{" "}
                  {appointment.driver_details?.last_name || "Driver"}
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
    <PageLayout>
      <div className="scheduling-dashboard">
        <LayoutRow title="Bookings">
          <div className="action-buttons">
            <button
              className="notification-button"
              onClick={() => {
                setIsNotificationVisible(!isNotificationVisible);
              }}
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
                className="primary-action-btn"
                onClick={handleCreateAppointment}
                title="Create Booking"
              >
                <span className="primary-action-icon">
                  <MdAdd size={20} />
                </span>
                Create Booking
              </button>
            )}
          </div>
        </LayoutRow>
        <TabSwitcher
          tabs={[
            { label: "Month View", value: "calendar" },
            { label: "Week View", value: "week" },
            { label: "Today's Bookings", value: "today" },
            { label: "Upcoming Bookings", value: "list" },
            { label: "Availability Manager", value: "availability" },
          ]}
          activeTab={currentView}
          onTabChange={setView}
        />{" "}
        {/* OPTIMIZED: Simplified loading indicator */}
        {loading && (
          <div className="minimal-dashboard-loading">
            <MinimalLoadingIndicator
              show={true}
              hasData={hasData} // OPTIMIZED: Use hasData instead of hasAnyData
              position="top-right"
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
          </div>
        )}
        {error && <APIErrorDisplay error={error} onRetry={forceRefresh} />}
        {/* Display notifications panel when visible */}
        {isNotificationVisible && (
          <div className="notifications-panel">
            <NotificationCenter
              onClose={() => setIsNotificationVisible(false)}
            />
          </div>
        )}
        {/* Display different views based on user selection */}
        <div className="dashboard-content">
          {currentView === "calendar" && !isFormVisible && (
            <Calendar
              onDateSelected={handleDateSelected}
              onTimeSelected={handleTimeSelected}
              selectedDate={selectedDate}
              showClientLabels={
                user?.role === "therapist" || user?.role === "driver"
              }
            />
          )}

          {currentView === "week" && !isFormVisible && (
            <WeekView
              onAppointmentSelect={handleEditAppointment}
              selectedDate={selectedDate || defaultDate}
            />
          )}

          {currentView === "today" && !isFormVisible && (
            <div className="todays-appointments">
              <h2>Today's Bookings</h2>
              {renderAppointmentsList(todayAppointments || [])}
            </div>
          )}

          {currentView === "list" && !isFormVisible && (
            <div className="upcoming-appointments">
              <h2>Upcoming Bookings</h2>
              {renderAppointmentsList(upcomingAppointments || [])}
            </div>
          )}

          {currentView === "availability" && !isFormVisible && (
            <AvailabilityManager />
          )}

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
    </PageLayout>
  );
};

export default SchedulingDashboard;
