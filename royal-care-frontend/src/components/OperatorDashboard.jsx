import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  autoCancelOverdueAppointments,
  fetchAppointments,
  fetchNotifications,
  reviewRejection,
} from "../features/scheduling/schedulingSlice";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";

import "../styles/OperatorDashboard.css";
import "../styles/TabSwitcher.css";

const OperatorDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // Get view from URL params, default to 'rejected'
  const currentView = searchParams.get("view") || "rejected";

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    appointmentId: null,
    rejectionReason: "",
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [autoCancelLoading, setAutoCancelLoading] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const { appointments, notifications, loading, error } = useSelector(
    (state) => state.scheduling
  );
  // Filter rejected appointments for review
  const rejectedAppointments = appointments.filter(
    (apt) => apt.status === "rejected" && !apt.review_decision
  );

  // Filter appointments that are pending and approaching timeout
  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending" && apt.response_deadline
  );

  // Calculate which appointments are overdue
  const overdueAppointments = pendingAppointments.filter(
    (apt) => new Date(apt.response_deadline) < new Date()
  );

  // Calculate which appointments are approaching deadline (within 10 minutes)
  const approachingDeadlineAppointments = pendingAppointments.filter((apt) => {
    const deadline = new Date(apt.response_deadline);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff > 0 && minutesDiff <= 10;
  });
  // Refresh data
  const refreshData = useCallback(() => {
    dispatch(fetchAppointments());
    dispatch(fetchNotifications());
  }, [dispatch]); // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
    console.log("WebSocket connections disabled - using polling mode");

    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Set up adaptive polling based on user activity
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(20000); // Base 20 seconds
      return setInterval(() => {
        if (syncService.shouldRefresh("operator_appointments")) {
          dispatch(fetchAppointments());
          dispatch(fetchNotifications());
          syncService.markUpdated("operator_appointments");
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    // Cleanup polling
    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]); // Simplified dependencies

  // Load data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time timer for updating countdown displays
  useEffect(() => {
    const timer = setInterval(() => {
      // Force re-render every second to update countdown timers
      if (currentView === "timeouts" && pendingAppointments.length > 0) {
        // This will trigger a re-render to update the countdown timers
        setReviewNotes((prev) => prev); // Dummy state update to trigger re-render
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentView, pendingAppointments.length]);

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  const handleReviewRejection = (appointment) => {
    setReviewModal({
      isOpen: true,
      appointmentId: appointment.id,
      rejectionReason: appointment.rejection_reason || "",
    });
    setReviewNotes("");
  };

  const handleReviewSubmit = async (decision) => {
    try {
      await dispatch(
        reviewRejection({
          id: reviewModal.appointmentId,
          reviewDecision: decision,
          reviewNotes: reviewNotes,
        })
      ).unwrap();
      refreshData();
      setReviewModal({
        isOpen: false,
        appointmentId: null,
        rejectionReason: "",
      });
      setReviewNotes("");
    } catch (error) {
      console.error("Error reviewing rejection:", error);
      alert("Failed to review rejection. Please try again.");
    }
  };
  const handleReviewCancel = () => {
    setReviewModal({ isOpen: false, appointmentId: null, rejectionReason: "" });
    setReviewNotes("");
  };

  const handleAutoCancelOverdue = async () => {
    if (
      !window.confirm(
        "This will auto-cancel all overdue appointments and disable therapists who didn't respond. Continue?"
      )
    ) {
      return;
    }

    setAutoCancelLoading(true);
    try {
      await dispatch(autoCancelOverdueAppointments()).unwrap();
      refreshData();
      alert("Successfully processed overdue appointments");
    } catch (error) {
      console.error("Error auto-cancelling overdue appointments:", error);
      alert("Failed to process overdue appointments. Please try again.");
    } finally {
      setAutoCancelLoading(false);
    }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return "OVERDUE";
    }

    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "rejected":
        return "status-rejected";
      case "cancelled":
        return "status-cancelled";
      case "completed":
        return "status-completed";
      default:
        return "";
    }
  };

  const renderRejectedAppointments = () => {
    if (rejectedAppointments.length === 0) {
      return <p className="no-appointments">No pending rejection reviews.</p>;
    }

    return (
      <div className="appointments-list">
        {rejectedAppointments.map((appointment) => (
          <div key={appointment.id} className="appointment-card rejected">
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
                Rejected - Pending Review
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
                <strong>Therapist:</strong>{" "}
                {appointment.therapist_details?.first_name}{" "}
                {appointment.therapist_details?.last_name}
              </p>
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              <p className="rejection-reason">
                <strong>Rejection Reason:</strong>{" "}
                {appointment.rejection_reason}
              </p>
              <p>
                <strong>Rejected At:</strong>{" "}
                {new Date(appointment.rejected_at).toLocaleString()}
              </p>
            </div>

            <div className="appointment-actions">
              <button
                className="review-button"
                onClick={() => handleReviewRejection(appointment)}
              >
                Review Rejection
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAllAppointments = () => {
    return (
      <div className="appointments-list">
        {appointments.map((appointment) => (
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
              {appointment.therapist_details && (
                <p>
                  <strong>Therapist:</strong>{" "}
                  {appointment.therapist_details.first_name}{" "}
                  {appointment.therapist_details.last_name}
                </p>
              )}
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              {appointment.rejection_reason && (
                <p className="rejection-reason">
                  <strong>Rejection Reason:</strong>{" "}
                  {appointment.rejection_reason}
                </p>
              )}
              {appointment.review_decision && (
                <p>
                  <strong>Review Decision:</strong>{" "}
                  {appointment.review_decision}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  const renderNotifications = () => {
    const unreadNotifications = notifications?.filter((n) => !n.is_read) || [];

    if (unreadNotifications.length === 0) {
      return <p className="no-notifications">No unread notifications.</p>;
    }

    return (
      <div className="notifications-list">
        {unreadNotifications.map((notification) => (
          <div key={notification.id} className="notification-card">
            <h4>
              {notification.notification_type.replace("_", " ").toUpperCase()}
            </h4>
            <p>{notification.message}</p>
            <p className="notification-time">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeoutMonitoring = () => {
    return (
      <div className="timeout-monitoring">
        <div className="timeout-controls">
          <h3>Timeout Management</h3>
          <div className="auto-cancel-section">
            <p>
              Auto-cancel overdue appointments and disable unresponsive
              therapists
            </p>
            <button
              className="auto-cancel-button"
              onClick={handleAutoCancelOverdue}
              disabled={autoCancelLoading}
            >
              {autoCancelLoading
                ? "Processing..."
                : "Process Overdue Appointments"}
            </button>
          </div>
        </div>

        {overdueAppointments.length > 0 && (
          <div className="overdue-section">
            <h4>Overdue Appointments ({overdueAppointments.length})</h4>
            <div className="appointments-list">
              {overdueAppointments.map((appointment) => (
                <div key={appointment.id} className="appointment-card overdue">
                  <div className="appointment-header">
                    <h3>
                      {appointment.client_details?.first_name}{" "}
                      {appointment.client_details?.last_name}
                    </h3>
                    <span className="status-badge status-overdue">OVERDUE</span>
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
                      <strong>Therapist:</strong>{" "}
                      {appointment.therapist_details?.first_name}{" "}
                      {appointment.therapist_details?.last_name}
                    </p>
                    <p>
                      <strong>Deadline Passed:</strong>{" "}
                      {new Date(appointment.response_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {approachingDeadlineAppointments.length > 0 && (
          <div className="approaching-deadline-section">
            <h4>
              Approaching Deadline ({approachingDeadlineAppointments.length})
            </h4>
            <div className="appointments-list">
              {approachingDeadlineAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="appointment-card approaching-deadline"
                >
                  <div className="appointment-header">
                    <h3>
                      {appointment.client_details?.first_name}{" "}
                      {appointment.client_details?.last_name}
                    </h3>
                    <span className="status-badge status-warning">
                      {getTimeRemaining(appointment.response_deadline)}{" "}
                      remaining
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
                      <strong>Therapist:</strong>{" "}
                      {appointment.therapist_details?.first_name}{" "}
                      {appointment.therapist_details?.last_name}
                    </p>
                    <p>
                      <strong>Response Deadline:</strong>{" "}
                      {new Date(appointment.response_deadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingAppointments.length === 0 && (
          <p className="no-appointments">
            No pending appointments with timeouts.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="operator-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Operator Dashboard</h1>
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
      )}{" "}
      <div className="view-selector">
        <button
          className={currentView === "rejected" ? "active" : ""}
          onClick={() => setView("rejected")}
        >
          Pending Reviews ({rejectedAppointments.length})
        </button>
        <button
          className={currentView === "timeouts" ? "active" : ""}
          onClick={() => setView("timeouts")}
        >
          Timeouts (
          {overdueAppointments.length + approachingDeadlineAppointments.length})
        </button>
        <button
          className={currentView === "all" ? "active" : ""}
          onClick={() => setView("all")}
        >
          All Appointments
        </button>{" "}
        <button
          className={currentView === "notifications" ? "active" : ""}
          onClick={() => setView("notifications")}
        >
          Notifications
        </button>{" "}
        <button
          className="availability-button"
          onClick={() => navigate("availability")}
        >
          Manage Availability
        </button>
      </div>{" "}
      <div className="dashboard-content">
        {currentView === "rejected" && (
          <div className="rejected-appointments">
            <h2>Rejection Reviews</h2>
            {renderRejectedAppointments()}
          </div>
        )}

        {currentView === "timeouts" && (
          <div className="timeout-monitoring">
            <h2>Timeout Monitoring</h2>
            {renderTimeoutMonitoring()}
          </div>
        )}

        {currentView === "all" && (
          <div className="all-appointments">
            <h2>All Appointments</h2>
            {renderAllAppointments()}
          </div>
        )}

        {currentView === "notifications" && (
          <div className="notifications">
            <h2>Notifications</h2>
            {renderNotifications()}
          </div>
        )}
      </div>
      {/* Review Rejection Modal */}
      {reviewModal.isOpen && (
        <div className="modal-overlay">
          <div className="review-modal">
            <h3>Review Appointment Rejection</h3>
            <div className="rejection-details">
              <p>
                <strong>Rejection Reason:</strong>
              </p>
              <p className="rejection-reason-text">
                {reviewModal.rejectionReason}
              </p>
            </div>

            <div className="review-notes">
              <label htmlFor="reviewNotes">Review Notes (optional):</label>
              <textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any additional notes about your decision..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                className="accept-button"
                onClick={() => handleReviewSubmit("accept")}
              >
                Accept Rejection
              </button>
              <button
                className="deny-button"
                onClick={() => handleReviewSubmit("deny")}
              >
                Deny Rejection
              </button>
              <button className="cancel-button" onClick={handleReviewCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
