import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { deleteAppointment } from "../../features/scheduling/schedulingSlice";
import { useSchedulingDashboardData } from "../../hooks/useDashboardIntegration";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import useSyncEventHandlers from "../../hooks/useSyncEventHandlers";
import { SkeletonLoader } from "../common/LoadingComponents";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

import { MdAdd, MdNotifications } from "react-icons/md";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import "../../globals/TabSwitcher.css";
import "../../styles/SchedulingDashboard.css";
import ErrorBoundary from "../common/ErrorBoundary";
import AppointmentForm from "./AppointmentForm";
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

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };

  const dispatch = useDispatch();
  // Enhanced data access with immediate display capabilities
  const {
    todayAppointments,
    upcomingAppointments,
    loading,
    isRefreshing,
    hasAnyData,
    isStaleData,
    error,
    refreshAfterFormSubmit,
    refreshIfStale,
  } = useSchedulingDashboardData();

  const { user } = useOptimizedSelector((state) => state.auth);
  const { unreadNotificationCount } = useOptimizedSelector(
    (state) => state.scheduling
  );
  const defaultDate = useMemo(() => new Date(), []);

  // Auto-refresh stale data in background
  useEffect(() => {
    if (isStaleData && hasAnyData) {
      console.log("🔄 SchedulingDashboard: Auto-refreshing stale data");
      refreshIfStale();
    }
  }, [isStaleData, hasAnyData, refreshIfStale]);

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
        // 🔥 FIXED: Use centralized data manager refresh instead of individual API calls
        await refreshAfterFormSubmit();
      } catch (error) {
        // Add user feedback
        alert(`Failed to delete appointment: ${error.message || error}`);
      }
    }
  };

  const handleFormSubmitSuccess = async () => {
    setIsFormVisible(false);
    // 🔥 FIXED: Use centralized data manager refresh instead of individual API calls
    await refreshAfterFormSubmit();
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
    if (loading && appointmentsList.length === 0) {
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
              {appointment.therapists_details &&
              appointment.therapists_details.length > 0 ? (
                <div>
                  <strong>Therapists:</strong>
                  <div className="therapist-list">
                    {appointment.therapists_details.map((therapist) => (
                      <div key={therapist.id} className="therapist-name">
                        {therapist.first_name} {therapist.last_name}
                        {therapist.specialization && (
                          <span className="therapist-specialization">
                            {" "}
                            ({therapist.specialization})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : appointment.therapist_details ? (
                <div>
                  <strong>Therapist:</strong>
                  <div className="therapist-name">
                    {appointment.therapist_details.first_name}{" "}
                    {appointment.therapist_details.last_name}
                    {appointment.therapist_details.specialization && (
                      <span className="therapist-specialization">
                        {" "}
                        ({appointment.therapist_details.specialization})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p>
                  <strong>Therapist:</strong> Not assigned
                </p>
              )}
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
        />

        {/* Enhanced loading indicator - only show if no cached data available */}
        {loading && (
          <div className="minimal-dashboard-loading">
            <MinimalLoadingIndicator
              show={true}
              hasData={hasAnyData}
              isRefreshing={isRefreshing}
              position="top-right"
              size="small"
              variant={isStaleData ? "warning" : "subtle"}
              tooltip={
                isStaleData
                  ? "Data may be outdated, refreshing..."
                  : hasAnyData
                  ? "Refreshing dashboard data..."
                  : "Loading dashboard data..."
              }
              pulse={true}
              fadeIn={true}
            />
          </div>
        )}

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
              {renderAppointmentsList(todayAppointments)}
            </div>
          )}

          {currentView === "list" && !isFormVisible && (
            <div className="upcoming-appointments">
              <h2>Upcoming Bookings</h2>
              {renderAppointmentsList(upcomingAppointments)}
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
