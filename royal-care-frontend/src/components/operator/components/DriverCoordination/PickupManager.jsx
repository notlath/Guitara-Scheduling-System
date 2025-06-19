import { useState } from "react";
import "./PickupManager.module.css";

/**
 * PickupManager Component
 * Manages pickup requests and driver assignments
 */
const PickupManager = ({
  pickupRequests = [],
  availableDrivers = [],
  onAssignDriver,
  onAutoAssign,
  loading = {},
  compact = false,
  className = "",
}) => {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getUrgencyColor = (urgencyLevel) => {
    switch (urgencyLevel) {
      case "urgent":
        return "#dc3545";
      case "high":
        return "#fd7e14";
      case "normal":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  const handleAssignDriver = async (appointmentId, driverId) => {
    try {
      await onAssignDriver(appointmentId, driverId);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Assignment failed:", error);
    }
  };

  const handleAutoAssign = async (appointmentId) => {
    try {
      await onAutoAssign(appointmentId);
    } catch (error) {
      console.error("Auto-assignment failed:", error);
    }
  };

  if (pickupRequests.length === 0) {
    return (
      <div
        className={`pickup-manager empty ${
          compact ? "compact" : ""
        } ${className}`}
      >
        <div className="empty-state">
          <i className="fas fa-check-circle"></i>
          <h3>All Set!</h3>
          <p>No pickup requests at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pickup-manager ${compact ? "compact" : ""} ${className}`}>
      <div className="pickup-requests-list">
        {pickupRequests.map((request) => (
          <div
            key={request.id}
            className={`pickup-request-card ${
              request.urgency_level || "normal"
            }`}
            draggable={!compact}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", request.id);
            }}
          >
            <div className="request-header">
              <div className="request-info">
                <h4 className="appointment-title">
                  Appointment #{request.id} -{" "}
                  {request.client_details?.first_name}{" "}
                  {request.client_details?.last_name}
                </h4>
                <div className="urgency-indicator">
                  <div
                    className="urgency-dot"
                    style={{
                      backgroundColor: getUrgencyColor(request.urgency_level),
                    }}
                  ></div>
                  <span className="urgency-text">
                    {request.urgency_level || "normal"} priority
                  </span>
                </div>
              </div>
              {!compact && (
                <div className="request-actions">
                  <button
                    className="auto-assign-btn"
                    onClick={() => handleAutoAssign(request.id)}
                    disabled={
                      availableDrivers.length === 0 ||
                      loading[`auto_${request.id}`]
                    }
                    title="Auto-assign to available driver"
                  >
                    {loading[`auto_${request.id}`] ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-magic"></i>
                    )}
                  </button>
                  <button
                    className="manual-assign-btn"
                    onClick={() => setSelectedRequest(request)}
                    title="Manual driver assignment"
                  >
                    <i className="fas fa-user-plus"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="request-details">
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">{formatDate(request.date)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Time:</span>
                <span className="value">
                  {formatTime(request.start_time)} -{" "}
                  {formatTime(request.end_time)}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Location:</span>
                <span className="value">{request.location || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="label">Client:</span>
                <span className="value">
                  {request.client_details?.first_name}{" "}
                  {request.client_details?.last_name}
                  {request.client_details?.phone &&
                    ` (${request.client_details.phone})`}
                </span>
              </div>
            </div>

            {compact && (
              <div className="compact-actions">
                <button
                  className="assign-btn primary"
                  onClick={() => handleAutoAssign(request.id)}
                  disabled={
                    availableDrivers.length === 0 ||
                    loading[`auto_${request.id}`]
                  }
                >
                  {loading[`auto_${request.id}`] ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i>
                      Auto-Assign
                    </>
                  )}
                </button>
                <button
                  className="assign-btn secondary"
                  onClick={() => setSelectedRequest(request)}
                >
                  <i className="fas fa-user-plus"></i>
                  Manual
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manual Assignment Modal */}
      {selectedRequest && (
        <div
          className="assignment-modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="assignment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Assign Driver</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedRequest(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-content">
              <div className="appointment-summary">
                <h4>Appointment #{selectedRequest.id}</h4>
                <p>
                  {selectedRequest.client_details?.first_name}{" "}
                  {selectedRequest.client_details?.last_name}
                </p>
                <p>
                  {formatDate(selectedRequest.date)} at{" "}
                  {formatTime(selectedRequest.start_time)}
                </p>
                <p>{selectedRequest.location}</p>
              </div>

              <div className="available-drivers">
                <h4>Available Drivers ({availableDrivers.length})</h4>
                {availableDrivers.length === 0 ? (
                  <div className="no-drivers">
                    <p>No drivers available at the moment</p>
                  </div>
                ) : (
                  <div className="drivers-list">
                    {availableDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="driver-option"
                        onClick={() =>
                          handleAssignDriver(selectedRequest.id, driver.id)
                        }
                      >
                        <div className="driver-info">
                          <img
                            src={driver.profile_photo || "/default-avatar.png"}
                            alt={driver.name}
                            className="driver-avatar"
                          />
                          <div className="driver-details">
                            <h5>{driver.name}</h5>
                            <p>{driver.phone}</p>
                            <p>Rating: {driver.rating || "N/A"}</p>
                          </div>
                        </div>
                        <div className="assign-action">
                          {loading[`assign_${selectedRequest.id}`] ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fas fa-plus"></i>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupManager;
