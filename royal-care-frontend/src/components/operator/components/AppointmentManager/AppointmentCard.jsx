import "./AppointmentCard.module.css";

/**
 * AppointmentCard Component
 * Displays individual appointment information in different view modes
 */
const AppointmentCard = ({
  appointment,
  viewMode = "list",
  isSelected = false,
  showSelection = false,
  onSelect,
  onAction,
  className = "",
}) => {
  const {
    id,
    date,
    start_time,
    end_time,
    status,
    client_details,
    therapist_details,
    driver_details,
    services_details,
    location,
    total_amount,
    urgency_level,
  } = appointment;

  // Status badge configuration
  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "status-pending",
      confirmed: "status-confirmed",
      driver_confirmed: "status-confirmed",
      therapist_confirmed: "status-confirmed",
      rejected: "status-rejected",
      cancelled: "status-cancelled",
      completed: "status-completed",
      in_progress: "status-confirmed",
      awaiting_payment: "status-warning",
      pickup_requested: "status-pending",
      overdue: "status-overdue",
      timeout: "status-overdue",
    };
    return statusMap[status] || "status-pending";
  };

  const getStatusDisplayText = (status) => {
    const statusTextMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      driver_confirmed: "Driver Confirmed",
      therapist_confirmed: "Therapist Confirmed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      awaiting_payment: "Awaiting Payment",
      pickup_requested: "Pickup Requested",
      overdue: "Overdue",
      timeout: "Timeout",
    };
    return (
      statusTextMap[status] ||
      status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, " ") ||
      "Unknown"
    );
  };

  // Format date and time
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get available actions based on status
  const getAvailableActions = () => {
    const actions = [];

    switch (status) {
      case "pending":
        actions.push({
          id: "approve",
          label: "Approve",
          icon: "fas fa-check",
          variant: "success",
        });
        actions.push({
          id: "reject",
          label: "Reject",
          icon: "fas fa-times",
          variant: "danger",
        });
        break;
      case "confirmed":
        if (!driver_details) {
          actions.push({
            id: "assign-driver",
            label: "Assign Driver",
            icon: "fas fa-car",
            variant: "primary",
          });
        }
        break;
      case "awaiting_payment":
        actions.push({
          id: "verify-payment",
          label: "Verify Payment",
          icon: "fas fa-credit-card",
          variant: "warning",
        });
        break;
      case "pickup_requested":
        actions.push({
          id: "approve-pickup",
          label: "Approve Pickup",
          icon: "fas fa-check-circle",
          variant: "success",
        });
        break;
      default:
        break;
    }

    // Common actions
    actions.push({
      id: "view-details",
      label: "View Details",
      icon: "fas fa-eye",
      variant: "info",
    });

    return actions;
  };

  const handleAction = (actionId) => {
    onAction?.(appointment, actionId);
  };

  const cardClassName = `appointment-card ${viewMode}-mode ${
    urgency_level || ""
  } ${isSelected ? "selected" : ""} ${className}`;

  return (
    <div className={cardClassName}>
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="selection-control">
          <label className="checkbox-container">
            <input type="checkbox" checked={isSelected} onChange={onSelect} />
            <span className="checkmark"></span>
          </label>
        </div>
      )}

      {/* Card Header */}
      <div className="card-header">
        <div className="appointment-info">
          <h3 className="appointment-title">Appointment #{id}</h3>
          <div className="client-info">
            <span className="client-name">
              {client_details?.first_name || "Unknown"}{" "}
              {client_details?.last_name || ""}
            </span>
            {client_details?.phone && (
              <span className="client-phone">
                <i className="fas fa-phone"></i>
                {client_details.phone}
              </span>
            )}
          </div>
        </div>

        <div className="status-badges">
          <span className={`status-badge ${getStatusBadgeClass(status)}`}>
            {getStatusDisplayText(status)}
          </span>
          {urgency_level === "urgent" && (
            <span className="urgency-badge urgent">
              <i className="fas fa-exclamation-triangle"></i>
              Urgent
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <div className="appointment-details">
          <div className="detail-row">
            <span className="detail-label">Date & Time:</span>
            <span className="detail-value">
              {formatDate(date)} at {formatTime(start_time)}
              {end_time && ` - ${formatTime(end_time)}`}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{location || "N/A"}</span>
          </div>

          {services_details && services_details.length > 0 && (
            <div className="detail-row">
              <span className="detail-label">Services:</span>
              <span className="detail-value">
                {services_details.map((service) => service.name).join(", ")}
              </span>
            </div>
          )}

          {therapist_details && (
            <div className="detail-row">
              <span className="detail-label">Therapist:</span>
              <span className="detail-value">
                {therapist_details.first_name} {therapist_details.last_name}
              </span>
            </div>
          )}

          {driver_details && (
            <div className="detail-row">
              <span className="detail-label">Driver:</span>
              <span className="detail-value">
                {driver_details.first_name} {driver_details.last_name}
              </span>
            </div>
          )}

          {total_amount && (
            <div className="detail-row">
              <span className="detail-label">Amount:</span>
              <span className="detail-value amount">₱{total_amount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        {getAvailableActions().map((action) => (
          <button
            key={action.id}
            className={`action-btn ${action.variant}`}
            onClick={() => handleAction(action.id)}
            title={action.label}
          >
            <i className={action.icon}></i>
            {viewMode === "card" && <span>{action.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AppointmentCard;
