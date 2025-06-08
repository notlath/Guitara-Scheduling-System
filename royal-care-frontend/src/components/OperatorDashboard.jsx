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
} from "../features/scheduling/schedulingSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";
import AvailabilityManager from "./scheduling/AvailabilityManager";
import NotificationCenter from "./scheduling/NotificationCenter";

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
      }    };

    // Load initial data
    const loadInitialData = async () => {
      await loadDriverData();
      // Also fetch notifications on initial load
      dispatch(fetchNotifications());
    };

    loadInitialData();
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
  }, []);  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    staffMembers,
    loading,
    error,
  } = useSelector((state) => state.scheduling);
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

  // Enhanced workflow status filters
  const getAppointmentsByStatus = (status) => {
    return appointments.filter((apt) => apt.status === status);
  };

  const getPendingTherapistConfirmations = () => {
    return appointments.filter((apt) => apt.status === "pending");
  };

  const getPendingDriverConfirmations = () => {
    return appointments.filter(
      (apt) =>
        apt.status === "therapist_confirm" &&
        (apt.group_size <= 1 || apt.group_confirmation_complete)
    );
  };

  const getActiveJourneys = () => {
    return appointments.filter((apt) =>
      ["journey", "arrived", "dropped_off"].includes(apt.status)
    );
  };

  // Memoized calculations for better performance
  const activeSessions = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments.filter((apt) => apt.status === "session_in_progress");
  }, [appointments]);

  const awaitingPayment = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments.filter((apt) => apt.status === "awaiting_payment");
  }, [appointments]);

  const groupAppointments = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments.filter((apt) => apt.group_size > 1);
  }, [appointments]);

  const getActiveSessions = useCallback(() => {
    return activeSessions;
  }, [activeSessions]);

  const getAwaitingPayment = useCallback(() => {
    return awaitingPayment;
  }, [awaitingPayment]);

  const getGroupAppointments = useCallback(() => {
    return groupAppointments;
  }, [groupAppointments]);
  // Memoized pickup requests calculation
  const pickupRequests = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments
      .filter(
        (apt) =>
          apt.status === "pickup_requested" && // Correct status for pickup requests
          !apt.driver // No driver assigned yet
      )
      .map((apt) => ({
        ...apt,
        priority: apt.pickup_urgency === "urgent" ? 1 : 2,
        requested_at: apt.pickup_request_time || apt.updated_at,
        therapist_name: apt.therapist_details
          ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
          : "Unknown Therapist",
        client_name: apt.client_details
          ? `${apt.client_details.first_name} ${apt.client_details.last_name}`
          : "Unknown Client",
        required_vehicle: apt.group_size > 1 ? "car" : "motorcycle",
      }))
      .sort((a, b) => a.priority - b.priority);
  }, [appointments]);

  const getPickupRequests = useCallback(() => {
    return pickupRequests;
  }, [pickupRequests]); // Memoized available drivers calculation to prevent re-computation on every render
  const availableDrivers = useMemo(() => {
    if (!staffMembers || !Array.isArray(staffMembers)) {
      return [];
    }
    return staffMembers
      .filter(
        (member) =>
          member.role === "driver" &&
          member.is_active &&
          member.driver_available_since
      )
      .sort(
        (a, b) =>
          new Date(a.driver_available_since) -
          new Date(b.driver_available_since)
      );
  }, [staffMembers]);

  const getAvailableDrivers = useCallback(() => {
    return availableDrivers;
  }, [availableDrivers]);
  // Helper function to get busy drivers
  const getBusyDrivers = useCallback(() => {
    if (!staffMembers) return [];
    return staffMembers.filter(
      (member) =>
        member.role === "driver" &&
        member.driver_status &&
        member.driver_status !== "available"
    );
  }, [staffMembers]);
  // Enhanced automatic driver assignment
  const handleAutoAssignPickup = async (appointment) => {
    const currentAvailableDrivers = getAvailableDrivers();

    // Filter drivers by vehicle type (this would require additional driver profile fields)
    const suitableDrivers = currentAvailableDrivers.filter(() => {
      // For now, assume all drivers can handle both vehicle types
      // In production, this would check driver.vehicle_type against required vehicle type
      return true;
    });

    if (suitableDrivers.length === 0) {
      alert("No available drivers for automatic assignment");
      return;
    }

    const selectedDriver = suitableDrivers[0]; // Earliest available

    try {
      await dispatch(
        assignDriverToPickup({
          appointmentId: appointment.id,
          driverId: selectedDriver.id,
        })
      );

      // Update driver availability
      selectedDriver.driver_available_since = null;

      alert(
        `Driver ${selectedDriver.first_name} ${selectedDriver.last_name} automatically assigned for pickup`
      );
    } catch (error) {
      console.error("Auto assignment failed:", error);
      alert("Failed to auto-assign driver");
    }
  };

  // Session progress tracking
  const getSessionProgress = (appointment) => {
    if (!appointment.session_started_at) return null;

    const startTime = new Date(appointment.session_started_at);
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / (1000 * 60)); // minutes

    // Estimate total duration from services
    const estimatedDuration =
      appointment.services?.reduce(
        (total, service) => total + (service.duration || 60),
        0
      ) || 60;

    const progress = Math.min((elapsed / estimatedDuration) * 100, 100);

    return {
      elapsed,
      estimatedDuration,
      progress,
      isOvertime: elapsed > estimatedDuration,
    };
  };

  // Enhanced workflow render functions
  const renderServiceWorkflowView = () => {
    return (
      <div className="workflow-overview">
        <div className="workflow-stats">
          <div className="stat-card">
            <h3>Pending Confirmations</h3>
            <div className="stat-number">
              {getPendingTherapistConfirmations().length}
            </div>
            <small>Therapist confirmations needed</small>
          </div>
          <div className="stat-card">
            <h3>Driver Confirmations</h3>
            <div className="stat-number">
              {getPendingDriverConfirmations().length}
            </div>
            <small>Driver confirmations needed</small>
          </div>
          <div className="stat-card">
            <h3>Active Journeys</h3>
            <div className="stat-number">{getActiveJourneys().length}</div>
            <small>En route to clients</small>
          </div>
          <div className="stat-card">
            <h3>Group Appointments</h3>
            <div className="stat-number">{getGroupAppointments().length}</div>
            <small>Multi-therapist bookings</small>
          </div>
        </div>

        <div className="workflow-stages">
          <h3>Current Workflow Status</h3>
          {renderWorkflowStages()}
        </div>
      </div>
    );
  };

  const renderWorkflowStages = () => {
    const stages = [
      {
        status: "pending",
        label: "Pending",
        appointments: getAppointmentsByStatus("pending"),
      },
      {
        status: "therapist_confirm",
        label: "Therapist Confirmed",
        appointments: getAppointmentsByStatus("therapist_confirm"),
      },
      {
        status: "driver_confirm",
        label: "Driver Confirmed",
        appointments: getAppointmentsByStatus("driver_confirm"),
      },
      {
        status: "journey",
        label: "Journey",
        appointments: getAppointmentsByStatus("journey"),
      },
      {
        status: "arrived",
        label: "Arrived",
        appointments: getAppointmentsByStatus("arrived"),
      },
      {
        status: "session_in_progress",
        label: "Session Active",
        appointments: getAppointmentsByStatus("session_in_progress"),
      },
      {
        status: "awaiting_payment",
        label: "Awaiting Payment",
        appointments: getAppointmentsByStatus("awaiting_payment"),
      },
      {
        status: "completed",
        label: "Completed",
        appointments: getAppointmentsByStatus("completed"),
      },
    ];

    return (
      <div className="workflow-stages-grid">
        {stages.map((stage) => (
          <div key={stage.status} className={`workflow-stage ${stage.status}`}>
            <h4>
              {stage.label} ({stage.appointments.length})
            </h4>
            {stage.appointments.map((apt) => (
              <div key={apt.id} className="appointment-mini-card">
                <div className="appointment-header">
                  <span className="client-name">
                    {apt.client_details
                      ? `${apt.client_details.first_name} ${apt.client_details.last_name}`
                      : "Unknown Client"}
                  </span>
                  <span className="appointment-time">{apt.start_time}</span>
                </div>
                <div className="appointment-details">
                  <span className="therapist">
                    {apt.therapist_details
                      ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
                      : "No Therapist"}
                  </span>
                  {apt.group_size > 1 && (
                    <span className="group-badge">
                      Group ({apt.group_size})
                    </span>
                  )}
                  {stage.status === "session_in_progress" &&
                    renderSessionProgress(apt)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSessionProgress = (appointment) => {
    const progress = getSessionProgress(appointment);
    if (!progress) return null;

    return (
      <div className="session-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(progress.progress, 100)}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {progress.elapsed}m / {progress.estimatedDuration}m
          {progress.isOvertime && <span className="overtime">⚠️ Overtime</span>}
        </div>
      </div>
    );
  };
  const renderActiveSessionsView = () => {
    const currentActiveSessions = getActiveSessions();

    if (currentActiveSessions.length === 0) {
      return <div className="no-sessions">No active therapy sessions</div>;
    }

    return (
      <div className="active-sessions-list">
        {currentActiveSessions.map((appointment) => {
          const progress = getSessionProgress(appointment);
          return (
            <div key={appointment.id} className="session-card">
              <div className="session-header">
                <h3>
                  {appointment.client_details
                    ? `${appointment.client_details.first_name} ${appointment.client_details.last_name}`
                    : "Unknown Client"}
                </h3>
                <span className="session-time">
                  Started:{" "}
                  {new Date(
                    appointment.session_started_at
                  ).toLocaleTimeString()}
                </span>
              </div>

              <div className="session-details">
                <div className="therapist-info">
                  <strong>Therapist:</strong>{" "}
                  {appointment.therapist_details
                    ? `${appointment.therapist_details.first_name} ${appointment.therapist_details.last_name}`
                    : "Unknown Therapist"}
                  {appointment.group_size > 1 && (
                    <span className="group-indicator">
                      + {appointment.group_size - 1} more
                    </span>
                  )}
                </div>

                <div className="location-info">
                  <strong>Location:</strong> {appointment.location}
                </div>

                <div className="services-info">
                  <strong>Services:</strong>
                  {appointment.services
                    ?.map((service) => service.name)
                    .join(", ") || "No services listed"}
                </div>
              </div>

              {progress && (
                <div className="session-progress-card">
                  <div className="progress-header">
                    <span>Session Progress</span>
                    <span
                      className={progress.isOvertime ? "overtime" : "on-time"}
                    >
                      {progress.elapsed} / {progress.estimatedDuration} minutes
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${
                        progress.isOvertime ? "overtime" : ""
                      }`}
                      style={{ width: `${Math.min(progress.progress, 100)}%` }}
                    ></div>
                  </div>
                  {progress.isOvertime && (
                    <div className="overtime-warning">
                      ⚠️ Session is running{" "}
                      {progress.elapsed - progress.estimatedDuration} minutes
                      over estimated time
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  const renderPickupRequestsView = () => {
    const pickupRequests = getPickupRequests();
    const currentAvailableDrivers = getAvailableDrivers();

    return (
      <div className="pickup-requests-container">
        <div className="pickup-stats">
          <div className="stat-item">
            <span className="stat-number">{pickupRequests.length}</span>
            <span className="stat-label">Pending Pickups</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {currentAvailableDrivers.length}
            </span>
            <span className="stat-label">Available Drivers</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {pickupRequests.filter((r) => r.priority === 1).length}
            </span>
            <span className="stat-label">Urgent Requests</span>
          </div>
        </div>

        {pickupRequests.length === 0 ? (
          <div className="no-pickups">No pending pickup requests</div>
        ) : (
          <div className="pickup-requests-list">
            {pickupRequests.map((request) => (
              <div
                key={request.id}
                className={`pickup-request-card ${request.pickup_urgency}`}
              >
                <div className="request-header">
                  <h3>{request.therapist_name}</h3>
                  <div className="request-badges">
                    {request.pickup_urgency === "urgent" && (
                      <span className="urgent-badge">🚨 URGENT</span>
                    )}
                    <span className="vehicle-badge">
                      {request.required_vehicle === "car" ? "🚗" : "🏍️"}{" "}
                      {request.required_vehicle}
                    </span>
                  </div>
                </div>

                <div className="request-details">
                  <div className="client-info">
                    <strong>Client:</strong> {request.client_name}
                  </div>
                  <div className="location-info">
                    <strong>Pickup Location:</strong> {request.location}
                  </div>
                  <div className="timing-info">
                    <strong>Requested:</strong>{" "}
                    {new Date(request.requested_at).toLocaleString()}
                  </div>
                  {request.pickup_notes && (
                    <div className="notes-info">
                      <strong>Notes:</strong> {request.pickup_notes}
                    </div>
                  )}
                </div>

                <div className="pickup-actions">
                  {availableDrivers.length > 0 ? (
                    <div className="driver-assignment">
                      <button
                        className="auto-assign-btn"
                        onClick={() => handleAutoAssignPickup(request)}
                      >
                        Auto-Assign Driver
                      </button>
                      <select
                        className="driver-select"
                        onChange={(e) => {
                          if (e.target.value) {
                            // Manual driver assignment
                            dispatch(
                              assignDriverToPickup({
                                appointmentId: request.id,
                                driverId: parseInt(e.target.value),
                              })
                            );
                          }
                        }}
                      >
                        <option value="">Select Driver</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name} (Available
                            since{" "}
                            {new Date(
                              driver.driver_available_since
                            ).toLocaleTimeString()}
                            )
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="no-drivers-warning">
                      ⚠️ No available drivers
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  // Enhanced render functions for operator dashboard views
  const renderRejectedAppointments = () => {
    const rejectedAppointments = appointments.filter(
      (apt) => apt.status === "rejected" && apt.rejected_by
    );

    if (rejectedAppointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No rejected appointments to review.</p>
        </div>
      );
    }

    return (
      <div className="rejected-appointments-list">
        {rejectedAppointments.map((appointment) => (
          <div key={appointment.id} className="rejection-review-card">
            <div className="appointment-header">
              <h3>
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </h3>
              <span className="rejection-date">
                Rejected: {new Date(appointment.updated_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="appointment-details">
              <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {appointment.start_time} - {appointment.end_time}</p>
              <p><strong>Service:</strong> {appointment.services_details?.map(s => s.name).join(", ")}</p>
              <p><strong>Rejected by:</strong> {appointment.rejected_by_details?.first_name} {appointment.rejected_by_details?.last_name} ({appointment.rejected_by_role})</p>
            </div>

            {appointment.rejection_reason && (
              <div className="rejection-reason">
                <h4>Rejection Reason:</h4>
                <p>{appointment.rejection_reason}</p>
              </div>
            )}

            <div className="review-actions">
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

  const renderPendingAcceptanceAppointments = () => {
    if (pendingAppointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No appointments pending acceptance.</p>
        </div>
      );
    }

    return (
      <div className="pending-appointments-list">
        {pendingAppointments.map((appointment) => (
          <div key={appointment.id} className="pending-appointment-card">
            <div className="appointment-header">
              <h3>
                {appointment.client_details?.first_name}{" "}
                {appointment.client_details?.last_name}
              </h3>
              <span className="appointment-time">
                {appointment.start_time} - {appointment.end_time}
              </span>
            </div>
            
            <div className="appointment-details">
              <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
              <p><strong>Service:</strong> {appointment.services_details?.map(s => s.name).join(", ")}</p>
              <p><strong>Duration:</strong> {appointment.duration} minutes</p>
              {renderTherapistInfo(appointment)}
            </div>

            <div className="acceptance-status">
              {getTherapistAcceptanceStatus(appointment).display}
            </div>

            <div className="time-remaining">
              <p><strong>Time since created:</strong> {getTimeRemaining(appointment.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeoutMonitoring = () => {
    const allTimeoutAppointments = [...overdueAppointments, ...approachingDeadlineAppointments];

    if (allTimeoutAppointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No appointments approaching timeout or overdue.</p>
        </div>
      );
    }

    return (
      <div className="timeout-monitoring-content">
        <div className="auto-cancel-section">
          <h3>Auto-Cancel Overdue Appointments</h3>
          <p>Automatically cancel appointments that have been pending for too long.</p>
          <button
            className="auto-cancel-button"
            onClick={handleAutoCancelOverdue}
            disabled={autoCancelLoading || overdueAppointments.length === 0}
          >
            {autoCancelLoading ? "Processing..." : `Auto-Cancel ${overdueAppointments.length} Overdue`}
          </button>
        </div>

        <div className="timeout-appointments-list">
          <h3>Appointments Requiring Attention</h3>
          {allTimeoutAppointments.map((appointment) => {
            const isOverdue = overdueAppointments.some(apt => apt.id === appointment.id);
            const timeRemaining = getTimeRemaining(appointment.created_at);
            
            return (
              <div key={appointment.id} className={`timeout-appointment-card ${isOverdue ? 'overdue' : 'warning'}`}>
                <div className="appointment-header">
                  <h4>
                    {appointment.client_details?.first_name}{" "}
                    {appointment.client_details?.last_name}
                  </h4>
                  <span className={`timeout-badge ${isOverdue ? 'overdue' : 'warning'}`}>
                    {isOverdue ? '🔴 OVERDUE' : '⚠️ WARNING'}
                  </span>
                </div>
                
                <div className="appointment-details">
                  <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {appointment.start_time}</p>
                  <p><strong>Created:</strong> {timeRemaining} ago</p>
                  <p><strong>Status:</strong> {getTherapistAcceptanceStatus(appointment).display}</p>
                </div>

                <div className="timeout-countdown">
                  {isOverdue ? (
                    <div className="overdue-message">
                      ⏰ This appointment is overdue for acceptance and should be reviewed or cancelled.
                    </div>
                  ) : (
                    <div className="warning-message">
                      ⚠️ This appointment is approaching the acceptance deadline.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAllAppointments = () => {
    if (appointments.length === 0) {
      return (
        <div className="no-appointments">
          <p>No appointments found.</p>
        </div>
      );
    }

    return (
      <div className="all-appointments-content">
        <div className="appointments-stats">
          <div className="stat-item">
            <span className="stat-number">{appointments.length}</span>
            <span className="stat-label">Total Appointments</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{todayAppointments.length}</span>
            <span className="stat-label">Today's Appointments</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{upcomingAppointments.length}</span>
            <span className="stat-label">Upcoming Appointments</span>
          </div>
        </div>

        <div className="appointments-grid">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-summary-card">
              <div className="appointment-header">
                <h4>
                  {appointment.client_details?.first_name}{" "}
                  {appointment.client_details?.last_name}
                </h4>
                <span className={`status-badge ${appointment.status.replace('_', '-')}`}>
                  {appointment.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="appointment-details">
                <p><strong>Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {appointment.start_time} - {appointment.end_time}</p>
                <p><strong>Service:</strong> {appointment.services_details?.map(s => s.name).join(", ")}</p>
                {renderTherapistInfo(appointment)}
                {appointment.driver_details && (
                  <p><strong>Driver:</strong> {appointment.driver_details.first_name} {appointment.driver_details.last_name}</p>
                )}
              </div>

              <div className="appointment-meta">
                <small>Created: {new Date(appointment.created_at).toLocaleDateString()}</small>
                {appointment.updated_at !== appointment.created_at && (
                  <small>Updated: {new Date(appointment.updated_at).toLocaleDateString()}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };  const renderNotifications = () => {
    // Integration with NotificationCenter component
    return (
      <div className="notifications-content">
        <div className="notifications-header">
          <h3>System Notifications</h3>
          <div className="notification-summary">
            <span className="notification-count">
              {notifications?.length || 0} total notifications
            </span>
            {notifications && notifications.filter(n => !n.is_read).length > 0 && (
              <span className="unread-count">
                {notifications.filter(n => !n.is_read).length} unread
              </span>
            )}
          </div>
        </div>

        <div className="notification-panel-wrapper">
          <NotificationCenter 
            onClose={() => {
              // This is embedded in the dashboard, so we don't need to close it
              // but we provide the prop for component compatibility
            }}
          />
        </div>
      </div>
    );
  };

  const renderDriverCoordinationPanel = () => {
    const availableDrivers = getAvailableDrivers();
    const busyDrivers = getBusyDrivers();

    return (
      <div className="driver-coordination-content">
        <div className="driver-stats">
          <div className="stat-card">
            <h4>Available Drivers</h4>
            <div className="stat-number">{availableDrivers.length}</div>
          </div>
          <div className="stat-card">
            <h4>Busy Drivers</h4>
            <div className="stat-number">{busyDrivers.length}</div>
          </div>
          <div className="stat-card">
            <h4>Pending Pickups</h4>
            <div className="stat-number">{pickupRequests.length}</div>
          </div>
        </div>

        <div className="driver-panels">
          <div className="available-drivers-panel">
            <h3>Available Drivers</h3>
            {availableDrivers.length === 0 ? (
              <p>No available drivers at this time.</p>
            ) : (
              <div className="drivers-list">
                {availableDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card available">
                    <div className="driver-info">
                      <h4>{driver.first_name} {driver.last_name}</h4>
                      <p>Available since: {new Date(driver.driver_available_since).toLocaleTimeString()}</p>
                    </div>
                    <div className="driver-actions">
                      <button className="assign-btn">Assign to Pickup</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="busy-drivers-panel">
            <h3>Busy Drivers</h3>
            {busyDrivers.length === 0 ? (
              <p>No busy drivers at this time.</p>
            ) : (
              <div className="drivers-list">
                {busyDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card busy">
                    <div className="driver-info">
                      <h4>{driver.first_name} {driver.last_name}</h4>
                      <p>Status: {driver.driver_status}</p>
                    </div>
                    <div className="driver-eta">
                      <small>ETA: Calculating...</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ...existing code...

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
          <button
            className={currentView === "workflow" ? "active" : ""}
            onClick={() => setView("workflow")}
          >
            Service Workflow
          </button>
          <button
            className={currentView === "active_sessions" ? "active" : ""}
            onClick={() => setView("active_sessions")}
          >
            Active Sessions ({activeSessions.length})
          </button>
          <button
            className={currentView === "pickup_requests" ? "active" : ""}
            onClick={() => setView("pickup_requests")}
          >
            Pickup Requests ({pickupRequests.length})
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
          {currentView === "workflow" && (
            <div className="service-workflow">
              <h2>Service Workflow Overview</h2>
              {renderServiceWorkflowView()}
            </div>
          )}
          {currentView === "active_sessions" && (
            <div className="active-sessions">
              <h2>Active Therapy Sessions</h2>
              {renderActiveSessionsView()}
            </div>
          )}
          {currentView === "pickup_requests" && (
            <div className="pickup-requests">
              <h2>Therapist Pickup Requests</h2>
              {renderPickupRequestsView()}
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
