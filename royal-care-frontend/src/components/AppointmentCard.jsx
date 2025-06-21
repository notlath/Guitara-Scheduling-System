import { memo } from "react";

/**
 * Optimized Appointment Card Component
 * Memoized to prevent unnecessary re-renders
 */
const AppointmentCard = memo(
  ({
    appointment,
    onStartAppointment,
    onPaymentVerification,
    buttonLoading = {},
    showActions = true,
  }) => {
    if (!appointment || !appointment.id) return null;

    const status = appointment.status || "";

    // Simple status badge logic
    const getStatusClass = (status) => {
      const statusMap = {
        pending: "status-pending",
        confirmed: "status-confirmed",
        driver_confirmed: "status-confirmed",
        rejected: "status-rejected",
        cancelled: "status-cancelled",
        completed: "status-completed",
        in_progress: "status-in-progress",
        awaiting_payment: "status-warning",
      };
      return statusMap[status] || "status-pending";
    };

    const getStatusText = (status) => {
      return (
        status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, " ") ||
        "Pending"
      );
    };

    const getUrgencyClass = (appointment) => {
      if (!appointment.date || !appointment.start_time) return "normal";

      const now = new Date();
      const appointmentTime = new Date(
        `${appointment.date}T${appointment.start_time}`
      );
      const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);

      if (appointment.status === "in_progress") return "critical";
      if (hoursUntil <= 1) return "high";
      if (hoursUntil <= 3) return "medium";
      return "normal";
    };

    const urgencyClass = getUrgencyClass(appointment);

    return (
      <div className={`appointment-card ${urgencyClass}`}>
        <div className="appointment-header">
          <h3>
            Appointment #{appointment.id} -{" "}
            {appointment.client_details?.first_name || "Unknown"}{" "}
            {appointment.client_details?.last_name || ""}
          </h3>
          <span className={`status-badge ${getStatusClass(status)}`}>
            {getStatusText(status)}
          </span>
        </div>

        <div className="appointment-details">
          <div className="detail-row">
            <span className="label">Date:</span>
            <span className="value">
              {appointment.date
                ? new Date(appointment.date).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Time:</span>
            <span className="value">
              {appointment.start_time || "N/A"} -{" "}
              {appointment.end_time || "N/A"}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Location:</span>
            <span className="value">{appointment.location || "N/A"}</span>
          </div>

          {appointment.therapist_details && (
            <div className="detail-row">
              <span className="label">Therapist:</span>
              <span className="value">
                {appointment.therapist_details.first_name}{" "}
                {appointment.therapist_details.last_name}
              </span>
            </div>
          )}

          <div className="detail-row">
            <span className="label">Services:</span>
            <span className="value">
              {Array.isArray(appointment.services_details)
                ? appointment.services_details.map((s) => s.name).join(", ")
                : "N/A"}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="appointment-actions">
            {status === "driver_confirmed" && (
              <button
                onClick={() => onStartAppointment(appointment.id)}
                disabled={buttonLoading[`start_${appointment.id}`]}
                className="start-button"
              >
                {buttonLoading[`start_${appointment.id}`]
                  ? "Starting..."
                  : "Start Session"}
              </button>
            )}

            {status === "awaiting_payment" && (
              <button
                onClick={() => onPaymentVerification(appointment)}
                disabled={buttonLoading[`payment_${appointment.id}`]}
                className="payment-button"
              >
                {buttonLoading[`payment_${appointment.id}`]
                  ? "Processing..."
                  : "Verify Payment"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

AppointmentCard.displayName = "AppointmentCard";

export default AppointmentCard;
