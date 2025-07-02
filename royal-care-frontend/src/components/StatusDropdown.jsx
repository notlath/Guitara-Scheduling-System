/**
 * StatusDropdown Component
 *
 * Transforms status badges into interactive dropdowns for Operators
 * Allows real-time status updates with WebSocket synchronization
 */
import { useEffect, useRef, useState } from "react";
import { useInstantUpdates } from "../hooks/useInstantUpdates";
import "./StatusDropdown.css";

const StatusDropdown = ({
  appointment,
  currentStatus,
  isOperator = false,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef(null);
  const { updateAppointmentInstantly } = useInstantUpdates();

  // Available status options for Operators (in chronological order)
  const statusOptions = [
    { value: "pending", label: "Pending", color: "#ffa500" },
    {
      value: "therapist_confirmed",
      label: "Therapist Confirmed",
      color: "#28a745",
    },
    { value: "driver_confirmed", label: "Driver Confirmed", color: "#17a2b8" },
    { value: "in_progress", label: "In Progress", color: "#6f42c1" },
    { value: "journey", label: "Journey", color: "#20c997" },
    { value: "arrived", label: "Arrived", color: "#fd7e14" },
    { value: "dropped_off", label: "Dropped Off", color: "#198754" },
    {
      value: "session_in_progress",
      label: "Session In Progress",
      color: "#e83e8c",
    },
    { value: "awaiting_payment", label: "Awaiting Payment", color: "#ffc107" },
    { value: "completed", label: "Completed", color: "#28a745" },
  ];

  const getCurrentStatusOption = () => {
    return (
      statusOptions.find((option) => option.value === currentStatus) || {
        value: currentStatus,
        label: currentStatus?.replace(/_/g, " "),
        color: "#6c757d",
      }
    );
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "status-pending",
      therapist_confirmed: "status-confirmed",
      driver_confirmed: "status-confirmed",
      in_progress: "status-confirmed",
      journey: "status-confirmed",
      arrived: "status-confirmed",
      dropped_off: "status-confirmed",
      session_in_progress: "status-confirmed",
      awaiting_payment: "status-warning",
      completed: "status-completed",
    };
    return statusMap[status] || "status-pending";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || !appointment?.id || isUpdating) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);

    try {
      console.log(
        `🔄 StatusDropdown: Updating appointment ${appointment.id} from ${currentStatus} to ${newStatus}`
      );

      // Use instant updates hook for optimistic UI updates
      await updateAppointmentInstantly(appointment.id, {
        status: newStatus,
        action: "update_status",
      });

      // Call parent callback if provided
      if (onStatusChange) {
        onStatusChange(newStatus, appointment);
      }

      console.log(
        `✅ StatusDropdown: Successfully updated appointment ${appointment.id} to ${newStatus}`
      );
    } catch (error) {
      console.error("❌ StatusDropdown: Error updating status:", error);
      // Show user-friendly error message
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const handleBadgeClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOperator || disabled || isUpdating) {
      return;
    }

    setIsOpen(!isOpen);
  };

  const currentOption = getCurrentStatusOption();

  // For non-operators or disabled state, render static badge
  if (!isOperator || disabled) {
    return (
      <span className={`status-badge ${getStatusBadgeClass(currentStatus)}`}>
        {currentOption.label}
      </span>
    );
  }

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <span
        className={`status-badge ${getStatusBadgeClass(currentStatus)} ${
          isOperator ? "clickable" : ""
        } ${isUpdating ? "updating" : ""}`}
        onClick={handleBadgeClick}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBadgeClick(e);
          }
        }}
      >
        {isUpdating ? (
          <>
            <span className="loading-spinner"></span>
            Updating...
          </>
        ) : (
          <>
            {currentOption.label}
            <span className="dropdown-arrow">▼</span>
          </>
        )}
      </span>

      {isOpen && (
        <div className="status-dropdown-menu">
          <div className="status-dropdown-header">Change Status</div>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`status-dropdown-option ${
                option.value === currentStatus ? "current" : ""
              }`}
              onClick={() => handleStatusChange(option.value)}
              disabled={option.value === currentStatus || isUpdating}
              style={{ "--status-color": option.color }}
            >
              <span
                className="status-indicator"
                style={{ backgroundColor: option.color }}
              ></span>
              {option.label}
              {option.value === currentStatus && (
                <span className="current-indicator">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
