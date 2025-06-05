import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  fetchAppointments,
  reviewRejection,
  fetchNotifications,
} from "../features/scheduling/schedulingSlice";
import { setupWebSocket } from "../services/webSocketService";
import "../styles/OperatorDashboard.css";

const OperatorDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState("rejected"); // 'rejected', 'all', 'notifications'
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    appointmentId: null,
    rejectionReason: "",
  });
  const [reviewNotes, setReviewNotes] = useState("");

  const { user } = useSelector((state) => state.auth);
  const {
    appointments,
    notifications,
    loading,
    error,
  } = useSelector((state) => state.scheduling);

  // Filter rejected appointments for review
  const rejectedAppointments = appointments.filter(
    (apt) => apt.status === "rejected" && !apt.review_decision
  );

  // Refresh data
  const refreshData = useCallback(() => {
    dispatch(fetchAppointments());
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    let cleanupWebSocket = null;

    try {
      cleanupWebSocket = setupWebSocket({
        onAppointmentUpdate: () => {
          refreshData();
        },
        onNotificationReceived: () => {
          refreshData();
        },
      });
    } catch (err) {
      console.error("Error setting up WebSocket:", err);
    }

    return () => {
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
    };
  }, [refreshData]);

  // Load data on component mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
      setReviewModal({ isOpen: false, appointmentId: null, rejectionReason: "" });
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
              <span className={`status-badge ${getStatusBadgeClass(appointment.status)}`}>
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
                <strong>Rejection Reason:</strong> {appointment.rejection_reason}
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
              <span className={`status-badge ${getStatusBadgeClass(appointment.status)}`}>
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
                  <strong>Rejection Reason:</strong> {appointment.rejection_reason}
                </p>
              )}
              {appointment.review_decision && (
                <p>
                  <strong>Review Decision:</strong> {appointment.review_decision}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderNotifications = () => {
    const unreadNotifications = notifications?.filter(n => !n.is_read) || [];
    
    if (unreadNotifications.length === 0) {
      return <p className="no-notifications">No unread notifications.</p>;
    }

    return (
      <div className="notifications-list">
        {unreadNotifications.map((notification) => (
          <div key={notification.id} className="notification-card">
            <h4>{notification.notification_type.replace('_', ' ').toUpperCase()}</h4>
            <p>{notification.message}</p>
            <p className="notification-time">
              {new Date(notification.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="operator-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Operator Dashboard</h1>
          <p>Welcome, {user?.first_name} {user?.last_name}!</p>
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
          className={view === "rejected" ? "active" : ""}
          onClick={() => setView("rejected")}
        >
          Pending Reviews ({rejectedAppointments.length})
        </button>
        <button
          className={view === "all" ? "active" : ""}
          onClick={() => setView("all")}
        >
          All Appointments
        </button>
        <button
          className={view === "notifications" ? "active" : ""}
          onClick={() => setView("notifications")}
        >
          Notifications
        </button>
      </div>

      <div className="dashboard-content">
        {view === "rejected" && (
          <div className="rejected-appointments">
            <h2>Rejection Reviews</h2>
            {renderRejectedAppointments()}
          </div>
        )}

        {view === "all" && (
          <div className="all-appointments">
            <h2>All Appointments</h2>
            {renderAllAppointments()}
          </div>
        )}

        {view === "notifications" && (
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
              <p><strong>Rejection Reason:</strong></p>
              <p className="rejection-reason-text">{reviewModal.rejectionReason}</p>
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
              <button
                className="cancel-button"
                onClick={handleReviewCancel}
              >
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
