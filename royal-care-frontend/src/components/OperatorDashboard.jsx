import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  assignDriverToPickup,
  autoCancelOverdueAppointments,
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  reviewRejection,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";
import AvailabilityManager from "./scheduling/AvailabilityManager";

import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
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
  // Driver coordination state
  const [driverAssignment, setDriverAssignment] = useState({
    availableDrivers: [],
    busyDrivers: [],
    pendingPickups: [],
  });
  // Load driver data on component mount and refresh
  useEffect(() => {
    const loadDriverData = async () => {
      try {
        // Fetch real staff data from backend
        const staffResponse = await dispatch(fetchStaffMembers()).unwrap();

        // Filter drivers and categorize by availability status
        const drivers = staffResponse.filter(
          (staff) => staff.role === "driver"
        );

        // For now, we'll assume all drivers are available unless they have active appointments
        // In a real implementation, this would check against current availability/status
        const availableDrivers = drivers.map((driver) => ({
          id: driver.id,
          first_name: driver.first_name,
          last_name: driver.last_name,
          role: driver.role,
          specialization: driver.specialization,
          vehicle_type: driver.vehicle_type || "Motorcycle", // Default if not set
          last_location: "Available", // In real implementation, get from GPS/last known location
          available_since: new Date().toISOString(),
          status: "available",
        }));

        setDriverAssignment({
          availableDrivers,
          busyDrivers: [], // Would be populated based on active assignments
          pendingPickups: [],
        });
      } catch (error) {
        console.error("Failed to load driver data:", error);
        // Fallback to mock data if API fails
        setDriverAssignment({
          availableDrivers: [
            {
              id: 1,
              first_name: "Juan",
              last_name: "Dela Cruz",
              vehicle_type: "Motorcycle",
              last_location: "Quezon City",
              available_since: new Date().toISOString(),
              status: "available",
            },
            {
              id: 2,
              first_name: "Maria",
              last_name: "Santos",
              vehicle_type: "Car",
              last_location: "Makati",
              available_since: new Date().toISOString(),
              status: "available",
            },
          ],
          busyDrivers: [
            {
              id: 3,
              first_name: "Jose",
              last_name: "Garcia",
              vehicle_type: "Motorcycle",
              current_task: "Transporting therapist to session",
              estimated_completion: new Date(
                Date.now() + 30 * 60000
              ).toISOString(),
              status: "busy",
            },
          ],
          pendingPickups: [],
        });
      }
    };

    loadDriverData();
  }, [dispatch]);
  // Listen for real-time driver updates via sync service
  useEffect(() => {
    const handleDriverUpdate = (data) => {
      setDriverAssignment((prev) => {
        switch (data.type) {
          case "driver_available":
            return {
              ...prev,
              availableDrivers: [
                ...prev.availableDrivers.filter((d) => d.id !== data.driver_id),
                data.driver,
              ],
              busyDrivers: prev.busyDrivers.filter(
                (d) => d.id !== data.driver_id
              ),
            };
          case "driver_assigned":
            return {
              ...prev,
              availableDrivers: prev.availableDrivers.filter(
                (d) => d.id !== data.driver_id
              ),
              busyDrivers: [
                ...prev.busyDrivers.filter((d) => d.id !== data.driver_id),
                data.driver,
              ],
            };
          case "pickup_requested":
            return {
              ...prev,
              pendingPickups: [
                ...prev.pendingPickups.filter(
                  (p) => p.id !== data.therapist_id
                ),
                data.therapist,
              ],
            };
          default:
            return prev;
        }
      });
    };

    // Subscribe to driver-related events and store the unsubscribe function
    const unsubscribe = syncService.subscribe(
      "driver_update",
      handleDriverUpdate
    );

    return () => {
      unsubscribe();
    };
  }, []);

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

  // Helper function to display therapist information (single or multiple)
  const renderTherapistInfo = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      return (
        <div className="therapists-list">
          {appointment.therapists_details.map((therapist, index) => (
            <div key={therapist.id} className="therapist-item">
              <span className="therapist-name">
                {therapist.first_name} {therapist.last_name}
              </span>
              {index < appointment.therapists_details.length - 1 && (
                <span className="therapist-separator">, </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return (
        <span className="therapist-name">
          {appointment.therapist_details.first_name}{" "}
          {appointment.therapist_details.last_name}
        </span>
      );
    }

    return <span className="no-therapist">No therapist assigned</span>;
  };

  // Helper function to get therapist acceptance status
  const getTherapistAcceptanceStatus = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      const acceptedCount = appointment.therapists_details.filter(
        (_, index) =>
          appointment.therapists_accepted &&
          appointment.therapists_accepted[index]
      ).length;
      const totalCount = appointment.therapists_details.length;

      if (acceptedCount === totalCount) {
        return {
          status: "all-accepted",
          display: "All accepted ✓",
          class: "accepted",
        };
      } else if (acceptedCount > 0) {
        return {
          status: "partial-accepted",
          display: `${acceptedCount}/${totalCount} accepted ⏳`,
          class: "partial",
        };
      } else {
        return {
          status: "none-accepted",
          display: "Pending ⏳",
          class: "pending",
        };
      }
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return appointment.therapist_accepted
        ? { status: "accepted", display: "Accepted ✓", class: "accepted" }
        : { status: "pending", display: "Pending ⏳", class: "pending" };
    }

    return {
      status: "no-therapist",
      display: "No therapist",
      class: "no-therapist",
    };
  };

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
  // Driver coordination functions
  const handleAssignDriverPickup = async (therapistId, driverId) => {
    try {
      const therapist = pendingPickups.find((t) => t.id === therapistId);
      const driver = driverAssignment.availableDrivers.find(
        (d) => d.id === driverId
      );

      if (!therapist || !driver) {
        alert("Invalid therapist or driver selection");
        return;
      }

      const estimatedArrival = calculateEstimatedArrival(
        driver.last_location,
        therapist.location
      );

      // Use the dedicated assignDriverToPickup action
      await dispatch(
        assignDriverToPickup({
          appointmentId: therapist.appointment_id,
          driverId: driverId,
        })
      ).unwrap();

      // Update local state
      setDriverAssignment((prev) => ({
        ...prev,
        availableDrivers: prev.availableDrivers.filter(
          (d) => d.id !== driverId
        ),
        busyDrivers: [
          ...prev.busyDrivers,
          {
            ...driver,
            current_task: `Picking up ${therapist.name}`,
            current_appointment: therapist.appointment_id,
          },
        ],
        pendingPickups: prev.pendingPickups.filter((t) => t.id !== therapistId),
      }));

      // Broadcast assignment
      syncService.broadcast("driver_assigned_pickup", {
        driver_id: driverId,
        therapist_id: therapistId,
        appointment_id: therapist.appointment_id,
        estimated_arrival: estimatedArrival,
        driver_name: `${driver.first_name} ${driver.last_name}`,
        therapist_name: therapist.name,
        pickup_location: therapist.location,
      });

      refreshData();
    } catch (error) {
      console.error("Failed to assign driver:", error);
      alert("Failed to assign driver. Please try again.");
    }
  };

  const handleUrgentPickupRequest = async (therapistId) => {
    try {
      const therapist = pendingPickups.find((t) => t.id === therapistId);
      const availableDrivers = driverAssignment.availableDrivers;

      if (availableDrivers.length === 0) {
        alert("No drivers currently available for urgent pickup");
        return;
      }

      // Auto-assign nearest available driver
      const bestDriver = findNearestDriver(
        therapist.location,
        availableDrivers
      );
      await handleAssignDriverPickup(therapistId, bestDriver.id);
    } catch (error) {
      console.error("Failed to process urgent pickup request:", error);
      alert("Failed to process urgent pickup request");
    }
  };

  // Helper functions for driver coordination
  const calculateEstimatedArrival = (driverLocation, therapistLocation) => {
    // Simple time estimation based on zones (since no GPS)
    const baseTime = 20; // Base 20 minutes
    const proximityScore = calculateProximityScore(
      driverLocation,
      therapistLocation
    );
    const adjustedTime = baseTime + (10 - proximityScore.score);

    const arrivalTime = new Date();
    arrivalTime.setMinutes(arrivalTime.getMinutes() + adjustedTime);
    return arrivalTime.toISOString();
  };

  const findNearestDriver = (therapistLocation, availableDrivers) => {
    return availableDrivers.reduce((nearest, driver) => {
      const currentScore = calculateProximityScore(
        driver.last_location,
        therapistLocation
      );
      const nearestScore = calculateProximityScore(
        nearest.last_location,
        therapistLocation
      );
      return currentScore.score > nearestScore.score ? driver : nearest;
    });
  };

  const calculateProximityScore = (location1, location2) => {
    // Same zone logic as in DriverDashboard
    const ZONE_MAP = {
      north_manila: ["Quezon City", "Caloocan", "Malabon"],
      south_manila: ["Makati", "Taguig", "Paranaque"],
      east_manila: ["Pasig", "Marikina", "Antipolo"],
      west_manila: ["Manila", "Pasay", "Las Pinas"],
      central_manila: ["Mandaluyong", "San Juan", "Sta. Mesa"],
    };

    const zone1 = Object.keys(ZONE_MAP).find((zone) =>
      ZONE_MAP[zone].some((area) =>
        location1?.toLowerCase().includes(area.toLowerCase())
      )
    );

    const zone2 = Object.keys(ZONE_MAP).find((zone) =>
      ZONE_MAP[zone].some((area) =>
        location2?.toLowerCase().includes(area.toLowerCase())
      )
    );

    if (zone1 === zone2) {
      return { score: 10, label: "Same Zone" };
    } else {
      return { score: 5, label: "Different Zone" };
    }
  };
  // Get therapists who have requested pickup from appointments
  const pendingPickups = appointments
    .filter(
      (apt) =>
        apt.status === "pickup_requested" && // Correct status for pickup requests
        !apt.driver // No driver assigned yet
    )
    .map((apt) => ({
      id: apt.therapist_details?.id || apt.therapist,
      name: apt.therapist_details
        ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
        : "Unknown Therapist",
      location: apt.location,
      appointment_id: apt.id,
      session_end_time: apt.updated_at, // When the pickup was requested
      urgency: apt.notes?.includes("URGENT") ? "urgent" : "normal",
      requested_at: apt.updated_at,
      client_name: apt.client_details
        ? `${apt.client_details.first_name} ${apt.client_details.last_name}`
        : "Unknown Client",
      appointment_time: `${apt.date} ${apt.start_time}`,
    }));

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return "OVERDUE";
    }

    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
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

  // Helper function to calculate time elapsed
  const getTimeElapsed = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  // Helper function to calculate estimated travel time
  const calculateEstimatedTime = (fromLocation, toLocation) => {
    const proximity = calculateProximityScore(fromLocation, toLocation);
    const baseTime =
      proximity.score === 10 ? 15 : proximity.score === 7 ? 25 : 45;

    // Adjust for current time (traffic)
    const hour = new Date().getHours();
    let multiplier = 1.0;
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      multiplier = 1.5; // Rush hour
    } else if (hour >= 12 && hour <= 13) {
      multiplier = 1.2; // Lunch time
    }

    return Math.round(baseTime * multiplier);
  };

  // Render function for rejected appointments
  const renderRejectedAppointments = () => {
    if (rejectedAppointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No rejected appointments pending review.</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {rejectedAppointments.map((appointment) => {
          const rejectedBy = getRejectedByInfo(appointment);
          return (
            <div key={appointment.id} className="appointment-card rejected">
              <div className="appointment-header">
                <h3>Appointment #{appointment.id}</h3>
                <span className={`rejection-badge ${rejectedBy.badgeClass}`}>
                  Rejected by {rejectedBy.text}
                </span>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Client:</strong>{" "}
                  {appointment.client_details
                    ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                    : "Unknown Client"}
                </p>
                <p>
                  <strong>Date:</strong> {appointment.date}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time} -{" "}
                  {appointment.end_time}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location}
                </p>
                <p>
                  <strong>Service:</strong>{" "}
                  {appointment.service_name || "Unknown Service"}
                </p>
                <p>
                  <strong>Therapist:</strong> {renderTherapistInfo(appointment)}
                </p>
                <p>
                  <strong>Rejection Reason:</strong>{" "}
                  {appointment.rejection_reason || "No reason provided"}
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
          );
        })}
      </div>
    );
  };

  // Render function for pending acceptance appointments
  const renderPendingAcceptanceAppointments = () => {
    if (pendingAppointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No appointments pending acceptance.</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {pendingAppointments.map((appointment) => {
          const acceptanceStatus = getTherapistAcceptanceStatus(appointment);
          const timeRemaining = appointment.response_deadline
            ? getTimeRemaining(appointment.response_deadline)
            : "No deadline";

          return (
            <div key={appointment.id} className="appointment-card pending">
              <div className="appointment-header">
                <h3>Appointment #{appointment.id}</h3>
                <span className={`acceptance-badge ${acceptanceStatus.class}`}>
                  {acceptanceStatus.display}
                </span>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Client:</strong>{" "}
                  {appointment.client_details
                    ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                    : "Unknown Client"}
                </p>
                <p>
                  <strong>Date:</strong> {appointment.date}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time} -{" "}
                  {appointment.end_time}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location}
                </p>
                <p>
                  <strong>Service:</strong>{" "}
                  {appointment.service_name || "Unknown Service"}
                </p>
                <p>
                  <strong>Therapist:</strong> {renderTherapistInfo(appointment)}
                </p>
                <p>
                  <strong>Time Remaining:</strong>
                  <span
                    className={timeRemaining === "OVERDUE" ? "overdue" : ""}
                  >
                    {timeRemaining}
                  </span>
                </p>
              </div>

              <div className="appointment-actions">
                <button
                  className="confirm-button"
                  onClick={() => handleConfirmAppointment(appointment.id)}
                >
                  Force Confirm
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render function for timeout monitoring
  const renderTimeoutMonitoring = () => {
    return (
      <div className="timeout-monitoring">
        <div className="timeout-actions">
          <button
            className="auto-cancel-button"
            onClick={handleAutoCancelOverdue}
            disabled={autoCancelLoading || overdueAppointments.length === 0}
          >
            {autoCancelLoading
              ? "Processing..."
              : `Auto-Cancel Overdue (${overdueAppointments.length})`}
          </button>
        </div>

        {/* Overdue Appointments */}
        {overdueAppointments.length > 0 && (
          <div className="timeout-section overdue">
            <h3>🚨 Overdue Appointments ({overdueAppointments.length})</h3>
            <div className="appointments-list">
              {overdueAppointments.map((appointment) => (
                <div key={appointment.id} className="appointment-card overdue">
                  <div className="appointment-header">
                    <h3>Appointment #{appointment.id}</h3>
                    <span className="timeout-badge overdue">OVERDUE</span>
                  </div>

                  <div className="appointment-details">
                    <p>
                      <strong>Client:</strong>{" "}
                      {appointment.client_details
                        ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                        : "Unknown Client"}
                    </p>
                    <p>
                      <strong>Date:</strong> {appointment.date}
                    </p>
                    <p>
                      <strong>Time:</strong> {appointment.start_time} -{" "}
                      {appointment.end_time}
                    </p>
                    <p>
                      <strong>Therapist:</strong>{" "}
                      {renderTherapistInfo(appointment)}
                    </p>
                    <p>
                      <strong>Overdue by:</strong>{" "}
                      {getTimeRemaining(appointment.response_deadline)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approaching Deadline Appointments */}
        {approachingDeadlineAppointments.length > 0 && (
          <div className="timeout-section approaching">
            <h3>
              ⚠️ Approaching Deadline ({approachingDeadlineAppointments.length})
            </h3>
            <div className="appointments-list">
              {approachingDeadlineAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="appointment-card approaching"
                >
                  <div className="appointment-header">
                    <h3>Appointment #{appointment.id}</h3>
                    <span className="timeout-badge approaching">
                      {getTimeRemaining(appointment.response_deadline)}
                    </span>
                  </div>

                  <div className="appointment-details">
                    <p>
                      <strong>Client:</strong>{" "}
                      {appointment.client_details
                        ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                        : "Unknown Client"}
                    </p>
                    <p>
                      <strong>Date:</strong> {appointment.date}
                    </p>
                    <p>
                      <strong>Time:</strong> {appointment.start_time} -{" "}
                      {appointment.end_time}
                    </p>
                    <p>
                      <strong>Therapist:</strong>{" "}
                      {renderTherapistInfo(appointment)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {overdueAppointments.length === 0 &&
          approachingDeadlineAppointments.length === 0 && (
            <div className="no-timeouts">
              <p>No appointments with timeout issues.</p>
            </div>
          )}
      </div>
    );
  };

  // Render function for all appointments
  const renderAllAppointments = () => {
    if (appointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No appointments found.</p>
          <button onClick={refreshData} className="refresh-button">
            Refresh Data
          </button>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className={`appointment-card ${appointment.status}`}
          >
            <div className="appointment-header">
              <h3>Appointment #{appointment.id}</h3>
              <span
                className={`status-badge ${getStatusBadgeClass(
                  appointment.status
                )}`}
              >
                {appointment.status.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>

            <div className="appointment-details">
              <p>
                <strong>Client:</strong>{" "}
                {appointment.client_details
                  ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                  : "Unknown Client"}
              </p>
              <p>
                <strong>Date:</strong> {appointment.date}
              </p>
              <p>
                <strong>Time:</strong> {appointment.start_time} -{" "}
                {appointment.end_time}
              </p>
              <p>
                <strong>Location:</strong> {appointment.location}
              </p>
              <p>
                <strong>Service:</strong>{" "}
                {appointment.service_name || "Unknown Service"}
              </p>
              <p>
                <strong>Therapist:</strong> {renderTherapistInfo(appointment)}
              </p>
              {appointment.driver_details && (
                <p>
                  <strong>Driver:</strong>{" "}
                  {appointment.driver_details.first_name}{" "}
                  {appointment.driver_details.last_name}
                </p>
              )}
              {appointment.rejection_reason && (
                <p>
                  <strong>Rejection Reason:</strong>{" "}
                  {appointment.rejection_reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render function for notifications
  const renderNotifications = () => {
    if (!notifications || notifications.length === 0) {
      return (
        <div className="no-notifications">
          <p>No notifications found.</p>
        </div>
      );
    }

    return (
      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-card ${notification.type || "info"}`}
          >
            <div className="notification-header">
              <h4>{notification.title || "Notification"}</h4>
              <span className="notification-time">
                {notification.created_at
                  ? new Date(notification.created_at).toLocaleString()
                  : "Unknown time"}
              </span>
            </div>
            <div className="notification-content">
              <p>
                {notification.message ||
                  notification.description ||
                  "No message"}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to handle manual appointment confirmation
  const handleConfirmAppointment = async (appointmentId) => {
    const appointment = appointments.find((apt) => apt.id === appointmentId);

    if (!appointment) {
      alert("Appointment not found");
      return;
    }

    if (
      window.confirm(
        "Manually confirm this appointment? This will override the pending status."
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

  // Driver coordination panel rendering
  const renderDriverCoordinationPanel = () => {
    // Get therapists who have requested pickup
    const pendingPickups = appointments
      .filter(
        (apt) =>
          apt.status === "pickup_requested" && // Look for pickup_requested status
          !apt.driver // No driver assigned yet
      )
      .map((apt) => ({
        id: apt.therapist_details?.id || apt.therapist,
        name: apt.therapist_details
          ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
          : "Unknown Therapist",
        location: apt.location,
        appointment_id: apt.id,
        session_end_time: apt.updated_at, // When the pickup was requested
        urgency: apt.notes?.includes("URGENT") ? "urgent" : "normal",
        requested_at: apt.updated_at,
        client_name: apt.client_details
          ? `${apt.client_details.first_name} ${apt.client_details.last_name}`
          : "Unknown Client",
        appointment_time: `${apt.date} ${apt.start_time}`,
      }));

    const availableDrivers = driverAssignment.availableDrivers;
    const busyDrivers = driverAssignment.busyDrivers;

    return (
      <div className="driver-coordination-panel">
        {/* Pending Pickup Requests */}
        <div className="coordination-section">
          <h3>🚖 Pending Pickup Requests ({pendingPickups.length})</h3>
          {pendingPickups.length === 0 ? (
            <p className="no-requests">No pending pickup requests</p>
          ) : (
            <div className="pickup-requests-list">
              {pendingPickups.map((therapist) => (
                <div
                  key={therapist.id}
                  className={`pickup-request-card ${therapist.urgency}`}
                >
                  <div className="request-header">
                    <h4>{therapist.name}</h4>
                    <span className={`urgency-badge ${therapist.urgency}`}>
                      {therapist.urgency === "urgent"
                        ? "🚨 URGENT"
                        : "⏰ Normal"}
                    </span>
                  </div>{" "}
                  <div className="request-details">
                    <p>
                      <strong>📍 Location:</strong> {therapist.location}
                    </p>
                    <p>
                      <strong>👤 Client:</strong> {therapist.client_name}
                    </p>
                    <p>
                      <strong>📅 Original Appointment:</strong>{" "}
                      {therapist.appointment_time}
                    </p>
                    <p>
                      <strong>⏰ Pickup Requested:</strong>{" "}
                      {therapist.session_end_time
                        ? new Date(
                            therapist.session_end_time
                          ).toLocaleTimeString()
                        : "Just now"}
                    </p>
                    <p>
                      <strong>🕒 Waiting Time:</strong>{" "}
                      <span
                        className={
                          therapist.urgency === "urgent"
                            ? "waiting-time urgent"
                            : "waiting-time"
                        }
                      >
                        {therapist.requested_at
                          ? getTimeElapsed(therapist.requested_at)
                          : "Just now"}
                      </span>
                    </p>
                  </div>
                  {/* Driver Assignment Actions */}
                  <div className="assignment-actions">
                    {availableDrivers.length > 0 ? (
                      <div className="driver-selection">
                        <label>Assign Driver:</label>
                        <select
                          onChange={(e) =>
                            e.target.value &&
                            handleAssignDriverPickup(
                              therapist.id,
                              e.target.value
                            )
                          }
                          defaultValue=""
                        >
                          <option value="">Select a driver...</option>
                          {availableDrivers.map((driver) => {
                            const proximity = calculateProximityScore(
                              driver.last_location,
                              therapist.location
                            );
                            return (
                              <option key={driver.id} value={driver.id}>
                                {driver.first_name} {driver.last_name} -{" "}
                                {proximity.label} (~
                                {calculateEstimatedTime(
                                  driver.last_location,
                                  therapist.location
                                )}{" "}
                                min)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ) : (
                      <div className="no-drivers-available">
                        <p>⚠️ No drivers currently available</p>
                      </div>
                    )}

                    {therapist.urgency !== "urgent" && (
                      <button
                        className="urgent-button"
                        onClick={() => handleUrgentPickupRequest(therapist.id)}
                        disabled={availableDrivers.length === 0}
                      >
                        Mark as Urgent
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Drivers */}
        <div className="coordination-section">
          <h3>🚗 Available Drivers ({availableDrivers.length})</h3>
          {availableDrivers.length === 0 ? (
            <p className="no-drivers">All drivers are currently busy</p>
          ) : (
            <div className="drivers-grid">
              {availableDrivers.map((driver) => (
                <div key={driver.id} className="driver-card available">
                  <div className="driver-info">
                    <h4>
                      {driver.first_name} {driver.last_name}
                    </h4>
                    <p>
                      <strong>Vehicle:</strong>{" "}
                      {driver.vehicle_type || "Motorcycle"} 🏍️
                    </p>
                    <p>
                      <strong>Last Location:</strong>{" "}
                      {driver.last_location || "Unknown"}
                    </p>
                    <p>
                      <strong>Available Since:</strong>{" "}
                      {driver.available_since
                        ? new Date(driver.available_since).toLocaleTimeString()
                        : "Now"}
                    </p>
                  </div>
                  <div className="driver-status">
                    <span className="status-badge available">✅ Available</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Busy Drivers */}
        <div className="coordination-section">
          <h3>🚙 Busy Drivers ({busyDrivers.length})</h3>
          {busyDrivers.length === 0 ? (
            <p className="no-busy-drivers">
              No drivers currently on assignment
            </p>
          ) : (
            <div className="drivers-grid">
              {busyDrivers.map((driver) => (
                <div key={driver.id} className="driver-card busy">
                  <div className="driver-info">
                    <h4>
                      {driver.first_name} {driver.last_name}
                    </h4>
                    <p>
                      <strong>Current Task:</strong> {driver.current_task}
                    </p>
                    <p>
                      <strong>ETA:</strong>{" "}
                      {driver.estimated_completion
                        ? new Date(
                            driver.estimated_completion
                          ).toLocaleTimeString()
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="driver-status">
                    <span className="status-badge busy">🚗 Busy</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone-Based Coordination Help */}
        <div className="coordination-section">
          <h3>📍 Zone Coverage Map</h3>
          <div className="zone-map">
            <div className="zone-legend">
              <h4>Zone Assignment Guide:</h4>
              <ul>
                <li>
                  <strong>North Manila:</strong> Quezon City, Caloocan, Malabon
                </li>
                <li>
                  <strong>South Manila:</strong> Makati, Taguig, Paranaque
                </li>
                <li>
                  <strong>East Manila:</strong> Pasig, Marikina, Antipolo
                </li>
                <li>
                  <strong>West Manila:</strong> Manila, Pasay, Las Pinas
                </li>
                <li>
                  <strong>Central Manila:</strong> Mandaluyong, San Juan, Sta.
                  Mesa
                </li>
              </ul>
            </div>
            <div className="coordination-tips">
              <h4>💡 Coordination Tips:</h4>
              <ul>
                {" "}
                <li>Same zone pickups: 10-15 minutes</li>
                <li>Adjacent zone pickups: 20-30 minutes</li>
                <li>Cross-city pickups: 45+ minutes</li>
                <li>Rush hour: Add 50% to estimated time</li>
              </ul>
            </div>{" "}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageLayout>
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
                <span className="stat-number">{rejectionStats.therapist}</span>
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
          <button
            className={currentView === "drivers" ? "active" : ""}
            onClick={() => setView("drivers")}
          >
            Driver Coordination
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
          )}{" "}
          {currentView === "availability" && (
            <div className="availability-management">
              <AvailabilityManager />
            </div>
          )}
          {currentView === "drivers" && (
            <div className="driver-coordination">
              <h2>Driver Coordination Center</h2>
              {renderDriverCoordinationPanel()}
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
    </PageLayout>
  );
};

export default OperatorDashboard;
