import { useState } from "react";
import styles from "./PickupManager.module.css";

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
        className={`${styles.pickupManager} ${styles.empty} ${
          compact ? styles.compact : ""
        } ${className}`}
      >
        <div className={styles.emptyState}>
          <i className="fas fa-check-circle"></i>
          <h3>All Set!</h3>
          <p>No pickup requests at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.pickupManager} ${
        compact ? styles.compact : ""
      } ${className}`}
    >
      <div className={styles.pickupRequestsList}>
        {pickupRequests.map((request) => (
          <div
            key={request.id}
            className={`${styles.pickupRequestCard} ${
              styles[request.urgency_level] || styles.normal
            }`}
            draggable={!compact}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", request.id);
            }}
          >
            <div className={styles.requestHeader}>
              <div className={styles.requestInfo}>
                <h4 className={styles.appointmentTitle}>
                  Appointment #{request.id} -{" "}
                  {request.client_details?.first_name}{" "}
                  {request.client_details?.last_name}
                </h4>
                <div className={styles.urgencyIndicator}>
                  <div
                    className={styles.urgencyDot}
                    style={{
                      backgroundColor: getUrgencyColor(request.urgency_level),
                    }}
                  ></div>
                  <span className={styles.urgencyText}>
                    {request.urgency_level || "normal"} priority
                  </span>
                </div>
              </div>
              {!compact && (
                <div className={styles.requestActions}>
                  <button
                    className={styles.autoAssignBtn}
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
                    className={styles.manualAssignBtn}
                    onClick={() => setSelectedRequest(request)}
                    title="Manual driver assignment"
                  >
                    <i className="fas fa-user-plus"></i>
                  </button>
                </div>
              )}
            </div>

            <div className={styles.requestDetails}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Date:</span>
                <span className={styles.value}>{formatDate(request.date)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Time:</span>
                <span className={styles.value}>
                  {formatTime(request.start_time)} -{" "}
                  {formatTime(request.end_time)}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Location:</span>
                <span className={styles.value}>
                  {request.location || "N/A"}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Client:</span>
                <span className={styles.value}>
                  {request.client_details?.first_name}{" "}
                  {request.client_details?.last_name}
                  {request.client_details?.phone &&
                    ` (${request.client_details.phone})`}
                </span>
              </div>
            </div>

            {compact && (
              <div className={styles.compactActions}>
                <button
                  className={`${styles.assignBtn} ${styles.primary}`}
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
                  className={`${styles.assignBtn} ${styles.secondary}`}
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
          className={styles.assignmentModalOverlay}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className={styles.assignmentModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Assign Driver</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedRequest(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.appointmentSummary}>
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

              <div className={styles.availableDrivers}>
                <h4>Available Drivers ({availableDrivers.length})</h4>
                {availableDrivers.length === 0 ? (
                  <div className={styles.noDrivers}>
                    <p>No drivers available at the moment</p>
                  </div>
                ) : (
                  <div className={styles.driversList}>
                    {availableDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className={styles.driverOption}
                        onClick={() =>
                          handleAssignDriver(selectedRequest.id, driver.id)
                        }
                      >
                        <div className={styles.driverInfo}>
                          <img
                            src={driver.profile_photo || "/default-avatar.png"}
                            alt={driver.name}
                            className={styles.driverAvatar}
                          />
                          <div className={styles.driverDetails}>
                            <h5>{driver.name}</h5>
                            <p>{driver.phone}</p>
                            <p>Rating: {driver.rating || "N/A"}</p>
                          </div>
                        </div>
                        <div className={styles.assignAction}>
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
