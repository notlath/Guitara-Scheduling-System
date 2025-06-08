import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  autoCancelOverdueAppointments,
  fetchAppointments,
  fetchNotifications,
  reviewRejection,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import LayoutRow from "../globals/LayoutRow";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";
import AvailabilityManager from "./scheduling/AvailabilityManager";

import "../globals/TabSwitcher.css";
import "../styles/OperatorDashboard.css";

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

  // Calculate rejection statistics
  const rejectionStats = useMemo(() => {
    const rejected = appointments.filter((apt) => apt.status === "rejected");
    const therapistRejections = rejected.filter(
      (apt) => apt.rejected_by_details?.role?.toLowerCase() === "therapist"
    );
    const driverRejections = rejected.filter(
      (apt) => apt.rejected_by_details?.role?.toLowerCase() === "driver"
    );

    return {
      total: rejected.length,
      therapist: therapistRejections.length,
      driver: driverRejections.length,
      pending: rejectedAppointments.length,
    };
  }, [appointments, rejectedAppointments]);
  // Refresh data
  const refreshData = useCallback(() => {
    dispatch(fetchAppointments());
    dispatch(fetchNotifications());
  }, [dispatch]); // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
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
    } catch {
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
    } catch {
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
  // Helper function to determine who rejected the appointment
  const getRejectedByInfo = (appointment) => {
    if (!appointment.rejected_by_details) {
      return {
        text: "Unknown",
        role: "unknown",
        badgeClass: "rejection-unknown",
      };
    }

    const rejectedBy = appointment.rejected_by_details;
    const name = `${rejectedBy.first_name} ${rejectedBy.last_name}`;

    // Use the role from rejected_by_details for accurate identification
    const role = rejectedBy.role?.toLowerCase();

    switch (role) {
      case "therapist":
        return {
          text: `Therapist: ${name}`,
          role: "therapist",
          badgeClass: "rejection-therapist",
        };
      case "driver":
        return {
          text: `Driver: ${name}`,
          role: "driver",
          badgeClass: "rejection-driver",
        };
      default:
        return {
          text: `${rejectedBy.role || "Staff"}: ${name}`,
          role: rejectedBy.role?.toLowerCase() || "staff",
          badgeClass: "rejection-other",
        };
    }
  };
  // Helper function to get acceptance status display
  const getAcceptanceStatus = (appointment) => {
    if (!appointment.therapist && !appointment.driver) {
      return { text: "No staff assigned", class: "acceptance-none" };
    }

    const therapistStatus = appointment.therapist
      ? appointment.therapist_accepted
        ? "✓ Accepted"
        : "⏳ Pending"
      : "N/A";
    const driverStatus = appointment.driver
      ? appointment.driver_accepted
        ? "✓ Accepted"
        : "⏳ Pending"
      : "N/A";

    const bothAccepted = appointment.both_parties_accepted;
    const pendingCount = appointment.pending_acceptances?.length || 0;

    return {
      text: `Therapist: ${therapistStatus} | Driver: ${driverStatus}`,
      class: bothAccepted ? "acceptance-complete" : "acceptance-pending",
      bothAccepted,
      pendingCount,
      pendingList: appointment.pending_acceptances || [],
      canProceed: bothAccepted,
    };
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
              </p>{" "}
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              {/* Show acceptance status for pending appointments */}
              {appointment.status === "pending" && (
                <div className="acceptance-status">
                  <strong>Acceptance Status:</strong>{" "}
                  <span
                    className={`acceptance-badge ${
                      getAcceptanceStatus(appointment).class
                    }`}
                  >
                    {getAcceptanceStatus(appointment).text}
                  </span>
                  {getAcceptanceStatus(appointment).pendingCount > 0 && (
                    <div className="pending-acceptances">
                      <small>
                        Waiting for:{" "}
                        {getAcceptanceStatus(appointment).pendingList.join(
                          ", "
                        )}
                      </small>
                    </div>
                  )}
                </div>
              )}
              <p className="rejection-reason">
                <strong>Rejection Reason:</strong>{" "}
                {appointment.rejection_reason}
              </p>
              <p>
                <strong>Rejected At:</strong>{" "}
                {new Date(appointment.rejected_at).toLocaleString()}
              </p>
              <div className="rejected-by-info">
                <strong>Rejected By:</strong>{" "}
                <span
                  className={`rejection-badge ${
                    getRejectedByInfo(appointment).badgeClass
                  }`}
                >
                  {getRejectedByInfo(appointment).text}
                </span>
              </div>
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
              )}{" "}
              <p>
                <strong>Services:</strong>{" "}
                {appointment.services_details?.map((s) => s.name).join(", ")}
              </p>
              {/* Show acceptance status for pending appointments */}
              {appointment.status === "pending" && (
                <div className="acceptance-status">
                  <strong>Acceptance Status:</strong>{" "}
                  <span
                    className={`acceptance-badge ${
                      getAcceptanceStatus(appointment).class
                    }`}
                  >
                    {getAcceptanceStatus(appointment).text}
                  </span>
                  {getAcceptanceStatus(appointment).pendingCount > 0 && (
                    <div className="pending-acceptances">
                      <small>
                        Waiting for:{" "}
                        {getAcceptanceStatus(appointment).pendingList.join(
                          ", "
                        )}
                      </small>
                    </div>
                  )}
                </div>
              )}
              {appointment.rejection_reason && (
                <div className="rejection-reason">
                  <strong>Rejection Reason:</strong>{" "}
                  {appointment.rejection_reason}
                </div>
              )}
              {appointment.rejected_by_details && (
                <div className="rejected-by-info">
                  <strong>Rejected By:</strong>{" "}
                  <span
                    className={`rejection-badge ${
                      getRejectedByInfo(appointment).badgeClass
                    }`}
                  >
                    {getRejectedByInfo(appointment).text}
                  </span>
                </div>
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

  const renderPendingAcceptanceAppointments = () => {
    if (pendingAppointments.length === 0) {
      return (
        <p className="no-appointments">No pending acceptance appointments.</p>
      );
    }

    return (
      <div className="appointments-list">
        {pendingAppointments.map((appointment) => {
          const acceptanceStatus = getAcceptanceStatus(appointment);
          return (
            <div
              key={appointment.id}
              className="appointment-card pending-acceptance"
            >
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
                  Pending Acceptance
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
                    <span
                      className={`acceptance-indicator ${
                        appointment.therapist_accepted ? "accepted" : "pending"
                      }`}
                    >
                      {appointment.therapist_accepted ? " ✓" : " ⏳"}
                    </span>
                  </p>
                )}
                {appointment.driver_details && (
                  <p>
                    <strong>Driver:</strong>{" "}
                    {appointment.driver_details.first_name}{" "}
                    {appointment.driver_details.last_name}
                    <span
                      className={`acceptance-indicator ${
                        appointment.driver_accepted ? "accepted" : "pending"
                      }`}
                    >
                      {appointment.driver_accepted ? " ✓" : " ⏳"}
                    </span>
                  </p>
                )}
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details?.map((s) => s.name).join(", ")}
                </p>

                {/* Enhanced acceptance status display */}
                <div className="dual-acceptance-status">
                  <h4>Acceptance Status:</h4>
                  <div className="acceptance-grid">
                    <div
                      className={`acceptance-item ${
                        appointment.therapist_accepted ? "accepted" : "pending"
                      }`}
                    >
                      <span className="role">Therapist</span>
                      <span className="status">
                        {appointment.therapist_accepted
                          ? "Accepted ✓"
                          : "Pending ⏳"}
                      </span>
                      {appointment.therapist_accepted_at && (
                        <small>
                          {new Date(
                            appointment.therapist_accepted_at
                          ).toLocaleString()}
                        </small>
                      )}
                    </div>
                    {appointment.driver && (
                      <div
                        className={`acceptance-item ${
                          appointment.driver_accepted ? "accepted" : "pending"
                        }`}
                      >
                        <span className="role">Driver</span>
                        <span className="status">
                          {appointment.driver_accepted
                            ? "Accepted ✓"
                            : "Pending ⏳"}
                        </span>
                        {appointment.driver_accepted_at && (
                          <small>
                            {new Date(
                              appointment.driver_accepted_at
                            ).toLocaleString()}
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Overall status */}
                  <div
                    className={`overall-status ${
                      acceptanceStatus.bothAccepted ? "ready" : "waiting"
                    }`}
                  >
                    {acceptanceStatus.bothAccepted ? (
                      <strong>
                        ✅ Ready to Confirm - Both parties accepted
                      </strong>
                    ) : (
                      <strong>
                        ⚠️ Waiting for acceptance from:{" "}
                        {acceptanceStatus.pendingList.join(", ")}
                      </strong>
                    )}
                  </div>

                  {/* Operator actions */}
                  <div className="operator-actions">
                    {acceptanceStatus.bothAccepted ? (
                      <button
                        className="confirm-button"
                        onClick={() => handleConfirmAppointment(appointment.id)}
                        title="Manually confirm appointment (both parties have accepted)"
                      >
                        Confirm Appointment
                      </button>
                    ) : (
                      <div className="blocked-actions">
                        <button
                          className="confirm-button disabled"
                          disabled
                          title="Cannot confirm - waiting for all parties to accept"
                        >
                          Confirm Appointment (Blocked)
                        </button>
                        <small>
                          Both parties must accept before confirmation
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {appointment.response_deadline && (
                  <div className="deadline-info">
                    <strong>Response Deadline:</strong>{" "}
                    {new Date(appointment.response_deadline).toLocaleString()}
                    {appointment.is_overdue && (
                      <span className="overdue-warning"> (OVERDUE)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Handle manual confirmation by operator (only when both parties accepted)
  const handleConfirmAppointment = async (appointmentId) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);
    if (!appointment?.both_parties_accepted) {
      alert("Cannot confirm appointment - both parties must accept first");
      return;
    }

    if (
      window.confirm(
        "Manually confirm this appointment? Both parties have already accepted."
      )
    ) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "confirmed",
          })
        ).unwrap();
        refreshData();
      } catch {
        alert("Failed to confirm appointment. Please try again.");
      }
    }
  };

  return (
    <div className="global-container">
      <div className="global-content">
        <div className="operator-dashboard">
          <LayoutRow title="Operator Dashboard">
            <div className="action-buttons">
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          </LayoutRow>
          {loading && <div className="loading-spinner">Loading...</div>}
          {error && (
            <div className="error-message">
              {typeof error === "object"
                ? error.message || error.error || JSON.stringify(error)
                : error}
            </div>
          )}{" "}
          {/* Statistics Dashboard */}
          <div className="stats-dashboard">
            <div className="stats-card">
              <h4>Rejection Overview</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-number">{rejectionStats.total}</span>
                  <span className="stat-label">Total Rejections</span>
                </div>
                <div className="stat-item therapist-stat">
                  <span className="stat-number">
                    {rejectionStats.therapist}
                  </span>
                  <span className="stat-label">Therapist Rejections</span>
                </div>
                <div className="stat-item driver-stat">
                  <span className="stat-number">{rejectionStats.driver}</span>
                  <span className="stat-label">Driver Rejections</span>
                </div>
                <div className="stat-item pending-stat">
                  <span className="stat-number">{rejectionStats.pending}</span>
                  <span className="stat-label">Pending Reviews</span>
                </div>
              </div>
            </div>
          </div>{" "}
          <div className="view-selector">
            <button
              className={currentView === "rejected" ? "active" : ""}
              onClick={() => setView("rejected")}
            >
              Pending Reviews ({rejectedAppointments.length})
            </button>
            <button
              className={currentView === "pending" ? "active" : ""}
              onClick={() => setView("pending")}
            >
              Pending Acceptance ({pendingAppointments.length})
            </button>
            <button
              className={currentView === "timeouts" ? "active" : ""}
              onClick={() => setView("timeouts")}
            >
              Timeouts (
              {overdueAppointments.length +
                approachingDeadlineAppointments.length}
              )
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
              className={currentView === "availability" ? "active" : ""}
              onClick={() => setView("availability")}
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
            {currentView === "pending" && (
              <div className="pending-appointments">
                <h2>Pending Acceptance Appointments</h2>
                {renderPendingAcceptanceAppointments()}
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
            )}{" "}
            {currentView === "notifications" && (
              <div className="notifications">
                <h2>Notifications</h2>
                {renderNotifications()}
              </div>
            )}
            {currentView === "availability" && (
              <div className="availability-management">
                <AvailabilityManager />
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
      </div>
    </div>
  );
};

export default OperatorDashboard;
