import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  driverConfirm,
  fetchAppointments,
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  markArrived,
  rejectAppointment,
  startJourney,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";
import { PageLoadingState, LoadingButton } from "./common/LoadingComponents";

import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css"; // Reuse therapist styles for consistency
import RejectionModal from "./RejectionModal";
import WebSocketStatus from "./scheduling/WebSocketStatus";

// Enhanced driver status states for dynamic coordination
const DRIVER_STATUS_STATES = {
  available: "Available for new assignments",
  driving_to_pickup: "En route to pick up therapist",
  transporting_therapist: "Transporting therapist to client",
  therapist_dropped_off: "Therapist dropped off - driver free",
  returning_for_pickup: "En route to pick up therapist after session",
  session_transport_complete: "Transport cycle completed",
};

// Vehicle type constants
const VEHICLE_TYPES = {
  motorcycle: "🏍️ Motorcycle",
  company_car: "🚗 Company Car",
};

// Zone-based proximity calculation for non-GPS coordination
const ZONE_MAP = {
  north_manila: ["Quezon City", "Caloocan", "Malabon"],
  south_manila: ["Makati", "Taguig", "Paranaque"],
  east_manila: ["Pasig", "Marikina", "Antipolo"],
  west_manila: ["Manila", "Pasay", "Las Pinas"],
  central_manila: ["Mandaluyong", "San Juan", "Sta. Mesa"],
};

// Helper functions for coordination
const calculateProximityScore = (driverLastLocation, therapistLocation) => {
  const driverZone = Object.keys(ZONE_MAP).find((zone) =>
    ZONE_MAP[zone].some((area) =>
      driverLastLocation?.toLowerCase().includes(area.toLowerCase())
    )
  );

  const therapistZone = Object.keys(ZONE_MAP).find((zone) =>
    ZONE_MAP[zone].some((area) =>
      therapistLocation?.toLowerCase().includes(area.toLowerCase())
    )
  );

  if (driverZone === therapistZone) {
    return { score: 10, label: "Same Zone" };
  } else if (isAdjacentZone(driverZone, therapistZone)) {
    return { score: 7, label: "Adjacent Zone" };
  } else {
    return { score: 3, label: "Far Zone" };
  }
};

const isAdjacentZone = (zone1, zone2) => {
  const adjacencyMap = {
    north_manila: ["central_manila", "east_manila"],
    south_manila: ["central_manila", "west_manila"],
    east_manila: ["north_manila", "central_manila"],
    west_manila: ["south_manila", "central_manila"],
    central_manila: [
      "north_manila",
      "south_manila",
      "east_manila",
      "west_manila",
    ],
  };
  return adjacencyMap[zone1]?.includes(zone2) || false;
};

const formatLocationKey = (location) => {
  return location?.toLowerCase().replace(/\s+/g, "_") || "";
};

const DriverDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  // Get view from URL params, default to 'today'
  const currentView = searchParams.get("view") || "today";

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Loading states for individual button actions
  const [buttonLoading, setButtonLoading] = useState({});

  // Helper function to set loading state for specific action
  const setActionLoading = (actionKey, isLoading) => {
    setButtonLoading(prev => ({
      ...prev,
      [actionKey]: isLoading
    }));
  };

  const { user } = useSelector((state) => state.auth);
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    loading,
    error,
  } = useSelector((state) => state.scheduling);

  // Debug: Log all appointments data
  console.log("🔍 Driver Dashboard Debug:", {
    user: user,
    totalAppointments: appointments.length,
    appointmentsWithDriver: appointments.filter(
      (apt) => apt.driver === user?.id
    ),
    allAppointments: appointments,
  }); // Filter appointments for current driver - only show those visible to driver
  const myAppointments = appointments.filter((apt) => {
    // Debug: Log all appointments for this driver
    if (apt.driver === user?.id) {
      console.log(
        `🚗 Driver appointment ${apt.id}: status="${apt.status}", client="${
          apt.client_details?.first_name || "Unknown"
        }"`,
        apt
      );
    }

    // Driver assigned to this appointment
    if (apt.driver !== user?.id) return false; // Only show appointments that should be visible to driver:
    // - pending: Initial booking (driver needs to see to accept)
    // - therapist_confirmed: After therapist(s) confirmed, waiting for driver
    // - driver_confirmed: Driver confirmed, ready to start journey
    // - in_progress: Operator started appointment, ready for journey
    // - journey_started: Driver is traveling to client
    // - arrived: Driver arrived at client location
    // - dropped_off: Driver dropped off therapist
    // - session_in_progress: Therapist(s) dropped off, session ongoing
    // - awaiting_payment: Session complete, awaiting payment
    // - completed: Appointment complete, may need pickup    // - pickup_requested: Therapist requested pickup
    const visibleStatuses = [
      "pending",
      "therapist_confirmed",
      "driver_confirmed",
      "in_progress",
      "journey_started",
      "journey", // Backend is using this status - needs to be included
      "arrived",
      "dropped_off",
      "session_in_progress",
      "awaiting_payment",
      "completed",
      "pickup_requested",
    ];

    return visibleStatuses.includes(apt.status);
  });  const myTodayAppointments = todayAppointments.filter((apt) => {
    if (apt.driver !== user?.id) return false;
    const visibleStatuses = [
      "pending",
      "therapist_confirmed",
      "driver_confirmed",
      "in_progress",
      "journey_started",
      "journey", // Added missing status that backend is using
      "arrived",
      "dropped_off",
      "session_in_progress",
      "awaiting_payment",
      "completed",
      "pickup_requested",
    ];
    return visibleStatuses.includes(apt.status);
  });  const myUpcomingAppointments = upcomingAppointments.filter((apt) => {
    if (apt.driver !== user?.id) return false;
    const visibleStatuses = [
      "pending",
      "therapist_confirmed",
      "driver_confirmed",
      "in_progress",
      "journey_started",
      "journey", // Added missing status that backend is using
      "arrived",
      "dropped_off",
      "session_in_progress",
      "awaiting_payment",
      "completed",
      "pickup_requested",
    ];
    return visibleStatuses.includes(apt.status);
  });

  // Refresh appointments data silently in background
  const refreshAppointments = useCallback(
    async (isBackground = false, targetView = null) => {
      // Never show loading indicators for background updates
      // Only show loading on initial load via Redux state

      try {
        // Optimize by only fetching what's needed based on current view
        if (isBackground) {
          // For background updates, fetch only the currently viewed data to reduce load
          const viewToUse = targetView || currentView;
          switch (viewToUse) {
            case "today":
              await dispatch(fetchTodayAppointments());
              break;
            case "upcoming":
              await dispatch(fetchUpcomingAppointments());
              break;
            case "all":
            default:
              await dispatch(fetchAppointments());
              break;
          }
        } else {
          // For initial load, fetch all data
          await Promise.all([
            dispatch(fetchAppointments()),
            dispatch(fetchTodayAppointments()),
            dispatch(fetchUpcomingAppointments()),
          ]);
        }
      } catch (error) {
        // Silent error handling for background updates to avoid disrupting UX
        if (!isBackground) {
          console.error("Error fetching appointments:", error);
        }
      }
    },
    [dispatch, currentView]
  );
  // Setup polling for real-time updates (WebSocket connections disabled)
  useEffect(() => {
    // Real-time sync is handled by useSyncEventHandlers hook
    // Here we only set up periodic polling as a fallback

    // Set up adaptive polling with smart refresh
    const setupPolling = () => {
      const interval = syncService.getPollingInterval(30000); // Base 30 seconds for driver
      return setInterval(() => {
        if (syncService.shouldRefresh("driver_appointments")) {
          dispatch(fetchAppointments());
          dispatch(fetchTodayAppointments());
          dispatch(fetchUpcomingAppointments());
          syncService.markUpdated("driver_appointments");
        }
      }, interval);
    };

    const pollingInterval = setupPolling();

    return () => {
      clearInterval(pollingInterval);
    };
  }, [dispatch]);
  // Load appointments on component mount
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (!mounted) return;

      // Initialize appointment fetching
      if (mounted) {
        await Promise.all([
          dispatch(fetchAppointments()),
          dispatch(fetchTodayAppointments()),
          dispatch(fetchUpcomingAppointments()),
        ]);
        setIsInitialLoad(false);
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // Refresh specific view data when view changes (silent background update)
  useEffect(() => {
    if (!isInitialLoad) {
      // Call dispatch actions directly to avoid dependency issues
      dispatch(fetchAppointments());
      dispatch(fetchTodayAppointments());
      dispatch(fetchUpcomingAppointments());
    }
  }, [currentView, dispatch, isInitialLoad]);

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };
  // Handle appointment status changes with optimized refresh and optimistic updates
  const handleAcceptAppointment = async (appointmentId) => {
    const actionKey = `accept_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(driverConfirm(appointmentId)).unwrap();
      // Only refresh current view data to minimize API calls
      refreshAppointments(true);
    } catch (error) {
      // More user-friendly error message
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to accept appointment. Please try again.");
      }
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleDriverConfirm = async (appointmentId) => {
    const actionKey = `confirm_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(driverConfirm(appointmentId)).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Failed to confirm appointment:", error);
      alert("Failed to confirm appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleStartJourney = async (appointmentId) => {
    const actionKey = `journey_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(startJourney(appointmentId)).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Failed to start journey:", error);
      alert("Failed to start journey. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleMarkArrived = async (appointmentId) => {
    const actionKey = `arrived_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(markArrived(appointmentId)).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Failed to mark arrived:", error);
      alert("Failed to mark arrived. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const _handleStartDriving = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "driving_to_location",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to start drive. Please try again.");
      }
    }
  };

  const handleArriveAtLocation = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "at_location",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to mark arrival. Please try again.");
      }
    }
  };
  const _handleCompleteTransport = async (appointmentId) => {
    if (window.confirm("Mark transport as completed?")) {
      try {
        await dispatch(
          updateAppointmentStatus({
            id: appointmentId,
            status: "transport_completed",
          })
        ).unwrap();
        refreshAppointments(true);
      } catch (error) {
        if (
          error?.message?.includes("401") ||
          error?.message?.includes("Authentication")
        ) {
          alert("Session expired. Please refresh the page and log in again.");
        } else {
          alert("Failed to complete transport. Please try again.");
        }
      }
    }
  };
  // Enhanced drop-off handler for dynamic coordination
  const handleDropOffComplete = async (appointmentId) => {
    const appointment = myAppointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "therapist_dropped_off",
          notes: `Dropped off at ${
            appointment.location
          } at ${new Date().toISOString()}`,
        })
      ).unwrap();

      // Notify system that driver is available for reassignment
      syncService.broadcast("driver_available", {
        driver_id: user.id,
        last_location: appointment.location,
        vehicle_type: appointment.transport_mode || "motorcycle",
        available_at: new Date().toISOString(),
      });

      refreshAppointments(true);
    } catch (error) {
      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        alert("Session expired. Please refresh the page and log in again.");
      } else {
        alert("Failed to mark drop-off complete. Please try again.");
      }
    }
  };
  const handleDropOff = async (appointmentId) => {
    const actionKey = `dropoff_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "dropped_off",
          action: "drop_off_therapist",
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Failed to mark drop off:", error);
      alert("Failed to mark drop off. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  // Time-based coordination helper functions
  const TRAVEL_TIME_MATRIX = {
    quezon_city_to_makati: 45,
    manila_to_pasig: 30,
    taguig_to_paranaque: 20,
    makati_to_manila: 25,
    pasig_to_quezon_city: 35,
  };

  const TRAFFIC_MULTIPLIERS = {
    morning_rush: 1.5, // 7-9 AM
    lunch_time: 1.2, // 12-1 PM
    evening_rush: 1.8, // 5-7 PM
    night_time: 0.8, // 8 PM-6 AM
    normal: 1.0,
  };

  const _calculateEstimatedPickupTime = (
    driverLocation,
    therapistLocation,
    currentTime = new Date()
  ) => {
    const hour = currentTime.getHours();

    // Determine traffic condition
    let trafficCondition = "normal";
    if (hour >= 7 && hour <= 9) trafficCondition = "morning_rush";
    else if (hour >= 12 && hour <= 13) trafficCondition = "lunch_time";
    else if (hour >= 17 && hour <= 19) trafficCondition = "evening_rush";
    else if (hour >= 20 || hour <= 6) trafficCondition = "night_time";

    // Get base travel time
    const routeKey = `${formatLocationKey(
      driverLocation
    )}_to_${formatLocationKey(therapistLocation)}`;
    const baseTime =
      TRAVEL_TIME_MATRIX[routeKey] ||
      estimateByZoneDistance(driverLocation, therapistLocation);

    // Apply traffic multiplier
    const adjustedTime = Math.round(
      baseTime * TRAFFIC_MULTIPLIERS[trafficCondition]
    );

    // Add buffer time (10% minimum)
    const bufferTime = Math.max(adjustedTime * 0.1, 5);

    const totalMinutes = adjustedTime + bufferTime;
    const eta = new Date(currentTime.getTime() + totalMinutes * 60000);

    return {
      estimatedMinutes: totalMinutes,
      eta: eta,
      trafficCondition: trafficCondition,
      confidence: getConfidenceLevel(routeKey),
    };
  };

  const estimateByZoneDistance = (location1, location2) => {
    const proximity = calculateProximityScore(location1, location2);
    return proximity.score >= 10 ? 15 : proximity.score >= 7 ? 25 : 40;
  };

  const getConfidenceLevel = (routeKey) => {
    return TRAVEL_TIME_MATRIX[routeKey] ? "high" : "medium";
  };

  // Group transport handlers
  const _handleStartGroupPickup = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "picking_up_therapists",
          notes: `Started group pickup at ${new Date().toISOString()}`,
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Error starting group pickup:", error);
      alert("Failed to start group pickup. Please try again.");
    }
  };

  const handleAllTherapistsPickedUp = async (appointmentId) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "transporting_group",
          notes: `All therapists picked up at ${new Date().toISOString()}`,
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Error marking all therapists picked up:", error);
      alert("Failed to mark all therapists picked up. Please try again.");
    }
  };
  // Pickup assignment handler
  const _handlePickupAssignment = async (pickupData) => {
    try {
      await dispatch(
        updateAppointmentStatus({
          id: pickupData.appointment_id,
          status: "driver_assigned_pickup",
          driver: user.id,
          notes: `Driver assigned for pickup, estimated arrival: ${pickupData.estimated_arrival}`,
        })
      ).unwrap();
      refreshAppointments(true);
    } catch (error) {
      console.error("Failed to accept pickup assignment:", error);
      alert("Failed to accept pickup assignment. Please try again.");
    }
  };

  // Enhanced request pickup handler for therapists
  const _handleRequestPickup = async (appointmentId) => {
    const appointment = myAppointments.find((apt) => apt.id === appointmentId);
    if (!appointment) return;

    try {
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "pickup_requested",
          notes: `Pickup requested at ${
            appointment.location
          } on ${new Date().toISOString()}`,
        })
      ).unwrap();

      // Broadcast pickup request to operators
      syncService.broadcast("pickup_requested", {
        therapist_id: user.id,
        appointment_id: appointmentId,
        location: appointment.location,
        urgency: "normal",
        session_end_time: new Date().toISOString(),
        therapist_name: `${user.first_name} ${user.last_name}`,
      });

      refreshAppointments(true);
      alert(
        "Pickup request sent! You'll be notified when a driver is assigned."
      );
    } catch (error) {
      console.error("Failed to request pickup:", error);
      alert("Failed to request pickup. Please try again.");
    }
  };

  // Photo verification helper
  const _handlePhotoVerification = async (
    appointmentId,
    verificationType,
    photoFile
  ) => {
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("verification_type", verificationType);
      formData.append("appointment_id", appointmentId);
      formData.append("timestamp", new Date().toISOString());

      // This would be an API call to upload verification photo
      // await api.uploadVerificationPhoto(formData);

      alert(`${verificationType} photo uploaded successfully`);
    } catch (error) {
      console.error("Failed to upload verification photo:", error);
      alert("Failed to upload verification photo. Please try again.");
    }
  };

  const handleRejectAppointment = (appointmentId) => {
    setRejectionModal({
      isOpen: true,
      appointmentId: appointmentId,
    });
  };
  const handleRejectionSubmit = async (appointmentId, rejectionReason) => {
    // Additional validation on the frontend
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      alert("Please provide a reason for rejection.");
      return;
    }

    try {
      await dispatch(
        rejectAppointment({
          id: appointmentId,
          rejectionReason: cleanReason,
        })
      ).unwrap();
      refreshAppointments(true); // Silent background refresh after action
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      // Better error message handling with authentication awareness
      let errorMessage = "Failed to reject appointment. Please try again.";

      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Authentication")
      ) {
        errorMessage =
          "Session expired. Please refresh the page and log in again.";
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Show specific error from backend if available
      if (error?.error === "Rejection reason is required") {
        errorMessage =
          "Rejection reason is required. Please provide a valid reason.";
      }

      alert(`Failed to reject appointment: ${errorMessage}`);
      setRejectionModal({ isOpen: false, appointmentId: null });
    }
  };

  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, appointmentId: null });
  };
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "therapist_confirmed":
        return "status-therapist-confirmed";
      case "driver_confirmed":
        return "status-driver-confirmed";      case "journey_started":
      case "journey":
        return "status-journey-started";
      case "arrived":
        return "status-arrived";
      case "session_started":
        return "status-session-started";
      case "payment_requested":
        return "status-payment-requested";
      case "payment_completed":
        return "status-payment-completed";
      case "pickup_requested":
        return "status-pickup-requested";
      case "driving_to_location":
        return "status-in-progress";
      case "at_location":
        return "status-confirmed";
      case "transport_completed":
        return "status-completed";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };  const renderActionButtons = (appointment) => {
    const { status, id, both_parties_accepted, requires_car } = appointment;
    const isGroupTransport =
      appointment.therapist_group && appointment.therapist_group.length > 1;
    const requiresCompanyCar = isGroupTransport;

    switch (status) {
      case "pending":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="accept-button"
              onClick={() => handleAcceptAppointment(id)}
              loading={buttonLoading[`accept_${id}`]}
              loadingText="Accepting..."
            >
              Accept {isGroupTransport ? "Group Transport" : "Transport"}
            </LoadingButton>
            <LoadingButton
              className="reject-button"
              onClick={() => handleRejectAppointment(id)}
              variant="secondary"
            >
              Reject
            </LoadingButton>
            {requiresCompanyCar && (
              <div className="transport-info">
                <span className="vehicle-required">
                  🚗 Company Car Required
                </span>
              </div>
            )}
          </div>
        );

      case "confirmed":
        if (both_parties_accepted) {
          return (
            <div className="appointment-actions">
              <div className="waiting-status">
                <span className="waiting-badge">
                  ⏳ Waiting for confirmations
                </span>
                <p>
                  All parties accepted. Waiting for therapist and driver
                  confirmation...
                </p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="warning-status">
                ⚠ Waiting for all parties to accept before starting
              </div>
              {appointment.pending_acceptances?.length > 0 && (
                <small className="waiting-text">
                  Waiting for: {appointment.pending_acceptances.join(", ")}
                </small>
              )}
            </div>
          );
        }      case "therapist_confirmed":
        // Driver always needs to confirm regardless of vehicle type
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="confirm-button"
              onClick={() => handleDriverConfirm(id)}
              loading={buttonLoading[`confirm_${id}`]}
              loadingText="Confirming..."
            >
              Confirm Ready to Drive
            </LoadingButton>
            <div className="workflow-info">
              <p>✅ All therapists confirmed. Please confirm you're ready.</p>
              {requires_car || isGroupTransport ? (
                <p>🚗 Company car required for this appointment</p>
              ) : (
                <p>🏍️ Motorcycle transport for this appointment</p>
              )}
            </div>
          </div>
        );      case "driver_confirmed":
        // Both confirmed, operator will start appointment
        return (
          <div className="appointment-actions">
            <div className="waiting-status">
              <span className="ready-badge">✅ Driver confirmed</span>
              <p>Waiting for operator to start appointment...</p>
            </div>
          </div>
        );      case "in_progress":
        // Operator started appointment, driver can start journey
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="start-journey-button"
              onClick={() => handleStartJourney(id)}
              loading={buttonLoading[`journey_${id}`]}
              loadingText="Starting..."
            >
              Start Journey
            </LoadingButton>
            <div className="ready-info">
              <p>
                🚀 Appointment started by operator. Ready to begin transport!
              </p>
            </div>
          </div>
        );

      case "journey_started":
      case "journey": // Handle both journey statuses
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="arrive-button"
              onClick={() => handleMarkArrived(id)}
              loading={buttonLoading[`arrived_${id}`]}
              loadingText="Marking..."
            >
              Mark Arrived at Pickup
            </LoadingButton>
            <div className="journey-status">
              <span className="journey-badge">🚗 Journey in progress</span>
              <p>Driving to pick up therapist...</p>
            </div>
          </div>
        );
      case "arrived":
        return (
          <div className="appointment-actions">
            <button
              className="drop-off-button"
              onClick={() => handleDropOff(id)}
            >
              Drop Off Therapist
            </button>
            <div className="arrived-status">
              <span className="arrived-badge">
                📍 Arrived at pickup location
              </span>
              <p>Ready to transport therapist to client location.</p>
            </div>
          </div>
        );

      case "dropped_off":
        return (
          <div className="appointment-actions">
            <div className="dropped-off-status">
              <span className="dropped-off-badge">
                ✅ Therapist dropped off
              </span>
              <p>Therapist delivered to client. Session can begin.</p>
            </div>
          </div>
        );

      case "session_in_progress":
      case "payment_requested":
      case "payment_completed":
        return (
          <div className="appointment-actions">
            <div className="session-progress">
              <span className="session-badge">💆 Session in progress</span>
              <p>Waiting for session completion and pickup request...</p>
            </div>
          </div>
        );

      case "pickup_requested":
        return (
          <div className="appointment-actions">
            <div className="pickup-requested">
              <span className="pickup-badge">🚖 Pickup requested</span>
              <p>
                Therapist needs pickup. Check operator dashboard for assignment.
              </p>
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="appointment-actions">
            <div className="completed-status">
              <span className="success-badge">✅ Transport completed</span>
              <p>All services completed successfully.</p>
            </div>
          </div>
        );

      // Legacy status handling
      case "picking_up_therapists":
        return (
          <div className="appointment-actions">
            <div className="group-pickup-progress">
              <p>Collecting therapists...</p>
              <button
                className="complete-pickup-button"
                onClick={() => handleAllTherapistsPickedUp(id)}
              >
                All Therapists Collected
              </button>
            </div>
          </div>
        );

      case "transporting_group":
      case "driving_to_location":
        return (
          <div className="appointment-actions">
            <button
              className="arrive-button"
              onClick={() => handleArriveAtLocation(id)}
            >
              Mark Arrived at Location
            </button>
            <div className="driving-status">
              <span className="driving-badge">🚗 En route</span>
              <p>
                {isGroupTransport
                  ? "Transporting therapist group to client"
                  : "Driving to therapist location"}
              </p>
            </div>
          </div>
        );

      case "at_location":
        return (
          <div className="appointment-actions">
            <button
              className="complete-button"
              onClick={() => handleDropOffComplete(id)}
            >
              Mark Drop-off Complete
            </button>
            <div className="location-status">
              <span className="location-badge">📍 At location</span>
              <p>Ready for drop-off</p>
            </div>
          </div>
        );

      case "transport_completed":
        return (
          <div className="appointment-actions">
            <div className="completed-status">
              <span className="success-badge">✅ Transport Complete</span>
              <p>Available for new assignments</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderAppointmentsList = (appointmentsList) => {
    if (appointmentsList.length === 0) {
      return <p className="no-appointments">No transport assignments found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => {
          const isGroupTransport =
            appointment.therapist_group &&
            appointment.therapist_group.length > 1;
          const requiresCompanyCar = isGroupTransport;

          return (
            <div
              key={appointment.id}
              className={`appointment-card ${
                requiresCompanyCar ? "group-transport" : ""
              }`}
            >
              <div className="appointment-header">
                <h3>
                  {isGroupTransport ? "Group Transport" : "Transport"} for{" "}
                  {appointment.client_details?.first_name}{" "}
                  {appointment.client_details?.last_name}
                </h3>
                <div className="header-badges">
                  <span
                    className={`status-badge ${getStatusBadgeClass(
                      appointment.status
                    )}`}
                  >
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1).replace(/_/g, " ")}
                  </span>
                  {requiresCompanyCar && (
                    <span className="vehicle-badge company-car">
                      🚗 Company Car
                    </span>
                  )}
                  {!requiresCompanyCar && (
                    <span className="vehicle-badge motorcycle">
                      🏍️ Motorcycle
                    </span>
                  )}
                </div>
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
                  <strong>Client Location:</strong> {appointment.location}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details?.map((s) => s.name).join(", ")}
                </p>

                {/* Therapist Information */}
                {isGroupTransport ? (
                  <div className="therapist-group-info">
                    <strong>
                      Therapists ({appointment.therapist_group?.length || 0}):
                    </strong>
                    <div className="therapist-list">
                      {appointment.therapist_group?.map((therapist, index) => (
                        <div
                          key={therapist.id || index}
                          className="therapist-item"
                        >
                          <span className="therapist-name">
                            {therapist.first_name} {therapist.last_name}
                          </span>
                          <span className="therapist-specialization">
                            {therapist.specialization}
                          </span>
                          {appointment.status === "picking_up_therapists" && (
                            <span
                              className={`pickup-status ${
                                therapist.pickup_status || "waiting"
                              }`}
                            >
                              {therapist.pickup_status === "picked_up"
                                ? "✓ In Vehicle"
                                : "⏳ Waiting"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  appointment.therapist_details && (
                    <p>
                      <strong>Therapist:</strong>{" "}
                      {appointment.therapist_details.first_name}{" "}
                      {appointment.therapist_details.last_name}
                      {appointment.therapist_details.specialization && (
                        <span className="specialization">
                          {" "}
                          - {appointment.therapist_details.specialization}
                        </span>
                      )}
                    </p>
                  )
                )}

                {/* Driver Status Information */}
                {appointment.status === "therapist_dropped_off" && (
                  <div className="driver-status-info">
                    <p className="status-message">
                      <strong>Status:</strong> Available for next assignment
                    </p>
                    <p className="last-location">
                      <strong>Last Location:</strong> {appointment.location}
                    </p>
                  </div>
                )}

                {/* Pickup Assignment Information */}
                {appointment.status === "driver_assigned_pickup" && (
                  <div className="pickup-assignment-info">
                    <p>
                      <strong>Pickup Location:</strong> {appointment.location}
                    </p>
                    {appointment.estimated_pickup_time && (
                      <p>
                        <strong>Estimated Arrival:</strong>{" "}
                        {new Date(
                          appointment.estimated_pickup_time
                        ).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Session Progress for Completed Transport */}
                {appointment.status === "transport_completed" &&
                  appointment.session_details && (
                    <div className="session-summary">
                      <p>
                        <strong>Session Duration:</strong>{" "}
                        {appointment.session_details.duration || "N/A"}
                      </p>
                      <p>
                        <strong>Payment Status:</strong>{" "}
                        {appointment.payment_status || "Pending"}
                      </p>
                    </div>
                  )}

                {appointment.notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.notes}
                  </p>
                )}
              </div>

              {renderActionButtons(appointment)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="driver-dashboard">
        <LayoutRow title="Driver Dashboard">
          <div className="action-buttons">
            <p style={{ margin: 0 }}>
              Welcome, {user?.first_name} {user?.last_name}!
            </p>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>
        {/* Only show loading spinner on initial load, not for background updates */}
        {loading && isInitialLoad && (
          <PageLoadingState message="Loading your transport assignments..." />
        )}
        {/* Improved error handling with retry option */}
        {error && !isInitialLoad && (
          <div className="error-message">
            <div>
              {typeof error === "object"
                ? error.message || error.error || "An error occurred"
                : error}
            </div>
            <button
              onClick={() => refreshAppointments(false)}
              className="retry-button"
              style={{
                marginTop: "10px",
                padding: "5px 10px",
                backgroundColor: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}
        <div className="view-selector">
          <button
            className={currentView === "today" ? "active" : ""}
            onClick={() => setView("today")}
          >
            Today's Transports
          </button>
          <button
            className={currentView === "upcoming" ? "active" : ""}
            onClick={() => setView("upcoming")}
          >
            Upcoming Transports
          </button>
          <button
            className={currentView === "all" ? "active" : ""}
            onClick={() => setView("all")}
          >
            All My Transports
          </button>
        </div>
        <div className="dashboard-content">
          {currentView === "today" && (
            <div className="todays-appointments">
              <h2>Today's Transports</h2>
              {renderAppointmentsList(myTodayAppointments)}
            </div>
          )}
          {currentView === "upcoming" && (
            <div className="upcoming-appointments">
              <h2>Upcoming Transports</h2>
              {renderAppointmentsList(myUpcomingAppointments)}
            </div>
          )}
          {currentView === "all" && (
            <div className="all-appointments">
              <h2>All My Transports</h2>
              {renderAppointmentsList(myAppointments)}
            </div>
          )}
        </div>
        <WebSocketStatus />
        <RejectionModal
          isOpen={rejectionModal.isOpen}
          onClose={handleRejectionCancel}
          onSubmit={handleRejectionSubmit}
          appointmentId={rejectionModal.appointmentId}
          loading={loading}
        />
      </div>
    </PageLayout>
  );
};

export default DriverDashboard;
