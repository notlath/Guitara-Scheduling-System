import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import {
  autoCancelOverdueAppointments,
  fetchAppointments,
  fetchNotifications,
  fetchStaffMembers,
  markAppointmentPaid,
  reviewRejection,
  updateAppointmentStatus,
} from "../features/scheduling/schedulingSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import syncService from "../services/syncService";
import { LoadingButton, LoadingSpinner } from "./common/LoadingComponents";
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

  // Loading states for individual button actions
  const [buttonLoading, setButtonLoading] = useState({});

  // Helper function to set loading state for specific action
  const setActionLoading = (actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  };

  // Payment verification modal state
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    appointmentId: null,
    appointmentDetails: null,
  });
  const [paymentData, setPaymentData] = useState({
    method: "cash",
    amount: "",
    notes: "",
  });
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
  }, []);
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    staffMembers: _staffMembers,
    loading,
    error,
  } = useSelector((state) => state.scheduling); // Filter rejected appointments for review
  const rejectedAppointments = appointments.filter(
    (apt) => apt.status === "rejected" && !apt.review_decision
  );

  // Filter appointments that are pending and approaching timeout
  const pendingAppointments = appointments.filter(
    (apt) => apt.status === "pending" && apt.response_deadline
  );

  // Filter appointments awaiting payment verification
  const awaitingPaymentAppointments = appointments.filter(
    (apt) => apt.status === "awaiting_payment"
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
        return (
          <span className="acceptance-indicator accepted">All accepted ✓</span>
        );
      } else if (acceptedCount > 0) {
        return (
          <span className="acceptance-indicator partial">
            {acceptedCount}/{totalCount} accepted ⏳
          </span>
        );
      } else {
        return <span className="acceptance-indicator pending">Pending ⏳</span>;
      }
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return appointment.therapist_accepted ? (
        <span className="acceptance-indicator accepted">Accepted ✓</span>
      ) : (
        <span className="acceptance-indicator pending">Pending ⏳</span>
      );
    }

    return (
      <span className="acceptance-indicator no-therapist">No therapist</span>
    );
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
    const actionKey = `review_${reviewModal.appointmentId}_${decision}`;
    try {
      setActionLoading(actionKey, true);
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
    } finally {
      setActionLoading(actionKey, false);
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
  const handleStartAppointment = async (appointmentId) => {
    const actionKey = `start_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "in_progress",
          action: "start_appointment",
        })
      ).unwrap();

      // Refresh appointments to get updated status
      dispatch(fetchAppointments());
    } catch (error) {
      console.error("Failed to start appointment:", error);
      alert("Failed to start appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  // Payment verification handler
  const handlePaymentVerification = (appointment) => {
    setPaymentModal({
      isOpen: true,
      appointmentId: appointment.id,
      appointmentDetails: appointment,
    });
    setPaymentData({
      method: "cash",
      amount: "",
      notes: "",
    });
  };
  const handleMarkPaymentPaid = async () => {
    const actionKey = `payment_${paymentModal.appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(
        markAppointmentPaid({
          appointmentId: paymentModal.appointmentId,
          paymentMethod: paymentData.method,
          paymentAmount: parseFloat(paymentData.amount) || 0,
          paymentNotes: paymentData.notes,
        })
      ).unwrap();

      // Close modal and refresh data
      setPaymentModal({
        isOpen: false,
        appointmentId: null,
        appointmentDetails: null,
      });
      setPaymentData({
        method: "cash",
        amount: "",
        notes: "",
      });
      refreshData();
    } catch (error) {
      console.error("Failed to mark payment as paid:", error);
      alert("Failed to mark payment as paid. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handlePaymentModalCancel = () => {
    setPaymentModal({
      isOpen: false,
      appointmentId: null,
      appointmentDetails: null,
    });
    setPaymentData({
      method: "cash",
      amount: "",
      notes: "",
    });
  };  // Driver coordination functions - Pure FIFO system (no proximity filtering)
  const handleAssignDriverPickup = async (therapistId, driverId = null) => {
    try {
      // Get current pending pickup requests from appointments
      const currentPendingPickups = appointments
        .filter((apt) => apt.status === "pickup_requested")
        .map((apt) => ({
          id: apt.therapist,
          name: apt.therapist_details
            ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
            : "Unknown Therapist",
          location: apt.location,
          appointment_id: apt.id,
          urgency: getUrgencyLevel(apt.pickup_request_time),
          session_end_time: apt.session_end_time,
          requested_at: apt.pickup_request_time,
        }));

      const therapist = currentPendingPickups.find((t) => t.id === therapistId);
      
      if (!therapist) {
        alert("Invalid therapist selection");
        return;
      }

      // Pure FIFO driver selection - get the driver who became available first
      let driver;
      if (driverId) {
        // Manual assignment: use specific driver
        driver = driverAssignment.availableDrivers.find((d) => d.id === driverId);
      } else {
        // Auto-assignment: Pure FIFO - first available driver based on availability time
        const availableDriversSorted = driverAssignment.availableDrivers
          .sort((a, b) => new Date(a.available_since) - new Date(b.available_since));
        driver = availableDriversSorted[0];
      }

      if (!driver) {
        alert("No drivers available for assignment");
        return;
      }      // Fixed estimated arrival time - no proximity calculations
      const estimatedTime = 20; // Standard 20 minutes for all assignments
      const estimatedArrival = new Date();
      estimatedArrival.setMinutes(estimatedArrival.getMinutes() + estimatedTime);
      
      // Update appointment status
      await dispatch(
        updateAppointmentStatus({
          id: therapist.appointment_id,
          status: "driver_assigned_pickup",
          driver: driver.id,
          notes: `Driver assigned for pickup (FIFO) - ETA: ${estimatedTime} minutes`,
        })
      ).unwrap();

      // Move driver from available to busy
      setDriverAssignment((prev) => ({
        ...prev,
        availableDrivers: prev.availableDrivers.filter(
          (d) => d.id !== driver.id
        ),
        busyDrivers: [
          ...prev.busyDrivers.filter((d) => d.id !== driver.id),
          {
            ...driver,
            current_task: `Picking up ${therapist.name}`,
            current_location: `En route to ${therapist.location}`,
          },
        ],
        pendingPickups: prev.pendingPickups.filter((t) => t.id !== therapistId),
      }));

      // Broadcast assignment with FIFO indicator
      syncService.broadcast("driver_assigned_pickup", {
        driver_id: driver.id,
        therapist_id: therapistId,
        appointment_id: therapist.appointment_id,
        estimated_arrival: estimatedArrival.toISOString(),
        driver_name: `${driver.first_name} ${driver.last_name}`,
        therapist_name: therapist.name,
        pickup_location: therapist.location,
        estimated_time: estimatedTime,
        assignment_method: "FIFO",
      });

      refreshData();
    } catch (error) {
      console.error("Failed to assign driver:", error);
      alert("Failed to assign driver. Please try again.");
    }
  };

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
            estimated_completion: estimatedArrival.toISOString(),
            current_location: `En route to ${therapist.location}`,
          },
        ],
        pendingPickups: prev.pendingPickups.filter((t) => t.id !== therapistId),
      }));

      // Broadcast assignment
      syncService.broadcast("driver_assigned_pickup", {
        driver_id: driverId,
        therapist_id: therapistId,
        appointment_id: therapist.appointment_id,
        estimated_arrival: estimatedArrival.toISOString(),
        driver_name: `${driver.first_name} ${driver.last_name}`,
        therapist_name: therapist.name,
        pickup_location: therapist.location,
        pickup_zone: getPasigZone(therapist.location),
        estimated_time: estimatedTime,
      });

      refreshData();
    } catch (error) {
      console.error("Failed to assign driver:", error);
      alert("Failed to assign driver. Please try again.");
    }
  };
  const handleUrgentPickupRequest = async (therapistId) => {
    try {
      // For urgent requests, still use FIFO but assign immediately
      const availableDrivers = driverAssignment.availableDrivers;

      if (availableDrivers.length === 0) {
        alert("No drivers currently available for urgent pickup");
        return;
      }

      // Pure FIFO - use first available driver regardless of location
      const firstAvailableDriver = availableDrivers
        .sort((a, b) => new Date(a.available_since) - new Date(b.available_since))[0];

      await handleAssignDriverPickup(therapistId, firstAvailableDriver.id);
    } catch (error) {
      console.error("Failed to process urgent pickup request:", error);
      alert("Failed to process urgent pickup request");
    }
  };

  const getTimeElapsed = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };

  const getUrgencyLevel = (requestTime) => {
    if (!requestTime) return "normal";
    const waitTime = (new Date() - new Date(requestTime)) / (1000 * 60); // minutes
    return waitTime > 20 ? "urgent" : "normal"; // Reduced to 20 minutes for Pasig City
  };

  // Helper functions for Pasig City coordination
  const getPasigZone = (location) => {
    if (!location) return "Unknown Zone";

    const PASIG_ZONE_MAP = {
      north_pasig: ["Ugong Norte", "Bagong Ilog", "Bambang", "Dela Paz"],
      south_pasig: [
        "Pineda",
        "San Joaquin",
        "Sto. Tomas",
        "Sagad",
        "San Nicolas",
      ],
      east_pasig: ["Malinao", "Santolan", "San Antonio", "Rosario", "Sumilang"],
      west_pasig: [
        "Kapitolyo",
        "Oranbo",
        "San Miguel",
        "Manggahan",
        "Maybunga",
      ],
      central_pasig: [
        "Caniogan",
        "Pasig Proper",
        "Bagong Katipunan",
        "Kalawaan",
      ],
      ortigas_cbd: ["Ortigas Center", "Ugong Sur", "Wack Wack", "San Antonio"],
    };

    for (const [zone, areas] of Object.entries(PASIG_ZONE_MAP)) {
      if (
        areas.some((area) =>
          location.toLowerCase().includes(area.toLowerCase())
        )
      ) {
        return zone.replace("_", " ").toUpperCase();
      }
    }

    return "Central Pasig"; // Default zone
  };

  const calculatePasigProximityScore = (location1, location2) => {
    const PASIG_ZONE_MAP = {
      north_pasig: ["Ugong Norte", "Bagong Ilog", "Bambang", "Dela Paz"],
      south_pasig: [
        "Pineda",
        "San Joaquin",
        "Sto. Tomas",
        "Sagad",
        "San Nicolas",
      ],
      east_pasig: ["Malinao", "Santolan", "San Antonio", "Rosario", "Sumilang"],
      west_pasig: [
        "Kapitolyo",
        "Oranbo",
        "San Miguel",
        "Manggahan",
        "Maybunga",
      ],
      central_pasig: [
        "Caniogan",
        "Pasig Proper",
        "Bagong Katipunan",
        "Kalawaan",
      ],
      ortigas_cbd: ["Ortigas Center", "Ugong Sur", "Wack Wack", "San Antonio"],
    };

    // Adjacent zones in Pasig City
    const ADJACENT_ZONES = {
      north_pasig: ["central_pasig", "east_pasig"],
      south_pasig: ["central_pasig", "west_pasig"],
      east_pasig: ["north_pasig", "central_pasig", "ortigas_cbd"],
      west_pasig: ["south_pasig", "central_pasig"],
      central_pasig: [
        "north_pasig",
        "south_pasig",
        "east_pasig",
        "west_pasig",
        "ortigas_cbd",
      ],
      ortigas_cbd: ["central_pasig", "east_pasig"],
    };

    const getZone = (location) => {
      if (!location) return "central_pasig";

      for (const [zone, areas] of Object.entries(PASIG_ZONE_MAP)) {
        if (
          areas.some((area) =>
            location.toLowerCase().includes(area.toLowerCase())
          )
        ) {
          return zone;
        }
      }
      return "central_pasig";
    };

    const zone1 = getZone(location1);
    const zone2 = getZone(location2);

    if (zone1 === zone2) {
      return { score: 10, label: "Same Zone" };
    } else if (ADJACENT_ZONES[zone1]?.includes(zone2)) {
      return { score: 7, label: "Adjacent Zone" };
    } else {
      return { score: 4, label: "Cross-City" };
    }
  };

  const calculatePasigEstimatedTime = (driverLocation, therapistLocation) => {
    const proximity = calculatePasigProximityScore(
      driverLocation,
      therapistLocation
    );
    const currentHour = new Date().getHours();

    // Base time calculation
    let baseTime;
    if (proximity.score >= 10) baseTime = 8; // Same zone: 8 minutes
    else if (proximity.score >= 7) baseTime = 15; // Adjacent zone: 15 minutes
    else baseTime = 25; // Cross-city: 25 minutes

    // Traffic adjustments for Pasig City
    let trafficMultiplier = 1;

    // Rush hour adjustments (7-9 AM, 5-7 PM)
    if (
      (currentHour >= 7 && currentHour <= 9) ||
      (currentHour >= 17 && currentHour <= 19)
    ) {
      trafficMultiplier = 1.5;
    }

    // Ortigas CBD adjustments during business hours
    if (
      (driverLocation?.includes("Ortigas") ||
        therapistLocation?.includes("Ortigas")) &&
      currentHour >= 8 &&
      currentHour <= 18
    ) {
      trafficMultiplier *= 1.3;
    }

    return Math.round(baseTime * trafficMultiplier);
  };

  // Main render function for driver coordination panel
  const renderDriverCoordinationPanel = () => {
    // Get current pending pickup requests from appointments
    const currentPendingPickups = appointments
      .filter((apt) => apt.status === "pickup_requested")
      .map((apt) => ({
        id: apt.therapist,
        name: apt.therapist_details
          ? `${apt.therapist_details.first_name} ${apt.therapist_details.last_name}`
          : "Unknown Therapist",
        location: apt.location,
        appointment_id: apt.id,
        timestamp: apt.created_at || apt.updated_at,
        urgency: apt.urgency || "normal",
      }));

    return (
      <div className="driver-coordination-panel">
        <div className="driver-coord-header">
          <h3>
            <i className="fas fa-car"></i>
            Driver Coordination - Pasig City
          </h3>
          <div className="coord-stats">
            <span className="stat available">
              <i className="fas fa-user-check"></i>
              {driverAssignment.availableDrivers.length} Available
            </span>
            <span className="stat busy">
              <i className="fas fa-user-clock"></i>
              {driverAssignment.busyDrivers.length} Busy
            </span>
            <span className="stat pending">
              <i className="fas fa-hourglass-half"></i>
              {currentPendingPickups.length} Pending Pickups
            </span>
          </div>
        </div>

        <div className="driver-coord-grid">
          {/* Available Drivers Section */}
          <div className="coord-section available-drivers">
            <div className="section-header">
              <h4>
                <i className="fas fa-users"></i>
                Available Drivers ({driverAssignment.availableDrivers.length})
              </h4>
            </div>
            <div className="driver-list">
              {driverAssignment.availableDrivers.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-user-slash"></i>
                  <p>No drivers currently available</p>
                </div>
              ) : (
                driverAssignment.availableDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card available">
                    <div className="driver-info">
                      <div className="driver-name">
                        <i className="fas fa-user"></i>
                        {driver.first_name} {driver.last_name}
                      </div>
                      <div className="driver-details">
                        <span className="location">
                          <i className="fas fa-map-marker-alt"></i>
                          {driver.current_location || "Location not set"}
                        </span>
                        <span className="zone">
                          <i className="fas fa-globe"></i>
                          {getPasigZone(driver.current_location)}
                        </span>
                      </div>
                      <div className="driver-status available">
                        <i className="fas fa-circle"></i>
                        Ready for Assignment
                      </div>
                    </div>
                    <div className="driver-actions">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignDriverPickup(e.target.value, driver.id);
                            e.target.value = "";
                          }
                        }}
                        className="pickup-selector"
                      >
                        <option value="">Assign Pickup...</option>
                        {currentPendingPickups.map((pickup) => (
                          <option key={pickup.id} value={pickup.id}>
                            {pickup.name} - {pickup.location}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Busy Drivers Section */}
          <div className="coord-section busy-drivers">
            <div className="section-header">
              <h4>
                <i className="fas fa-car"></i>
                Active Assignments ({driverAssignment.busyDrivers.length})
              </h4>
            </div>
            <div className="driver-list">
              {driverAssignment.busyDrivers.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-bed"></i>
                  <p>No drivers currently on assignment</p>
                </div>
              ) : (
                driverAssignment.busyDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card busy">
                    <div className="driver-info">
                      <div className="driver-name">
                        <i className="fas fa-user"></i>
                        {driver.first_name} {driver.last_name}
                      </div>
                      <div className="driver-details">
                        <span className="current-task">
                          <i className="fas fa-tasks"></i>
                          {driver.current_task || "On assignment"}
                        </span>
                        <span className="location">
                          <i className="fas fa-route"></i>
                          {driver.current_location || "En route"}
                        </span>
                        <span className="eta">
                          <i className="fas fa-clock"></i>
                          ETA:{" "}
                          {new Date(
                            driver.estimated_completion
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="driver-status busy">
                        <i className="fas fa-circle"></i>
                        On Assignment
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Pickups Section */}
          <div className="coord-section pending-pickups">
            <div className="section-header">
              <h4>
                <i className="fas fa-hourglass-half"></i>
                Pending Pickups ({currentPendingPickups.length})
              </h4>
            </div>
            <div className="pickup-list">
              {currentPendingPickups.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-check-circle"></i>
                  <p>No pending pickup requests</p>
                </div>
              ) : (
                currentPendingPickups.map((pickup) => (
                  <div
                    key={pickup.id}
                    className={`pickup-card ${getUrgencyLevel(
                      pickup.timestamp
                    )}`}
                  >
                    <div className="pickup-info">
                      <div className="therapist-name">
                        <i className="fas fa-user-md"></i>
                        {pickup.name}
                      </div>
                      <div className="pickup-details">
                        <span className="location">
                          <i className="fas fa-map-marker-alt"></i>
                          {pickup.location}
                        </span>
                        <span className="zone">
                          <i className="fas fa-globe"></i>
                          {getPasigZone(pickup.location)}
                        </span>
                        <span className="time-elapsed">
                          <i className="fas fa-stopwatch"></i>
                          {getTimeElapsed(pickup.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`urgency-indicator ${getUrgencyLevel(
                          pickup.timestamp
                        )}`}
                      >
                        <i
                          className={`fas ${
                            getUrgencyLevel(pickup.timestamp) === "urgent"
                              ? "fa-exclamation-triangle"
                              : "fa-clock"
                          }`}
                        ></i>
                        {getUrgencyLevel(pickup.timestamp)
                          .charAt(0)
                          .toUpperCase() +
                          getUrgencyLevel(pickup.timestamp).slice(1)}
                      </div>
                    </div>
                    <div className="pickup-actions">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignDriverPickup(pickup.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="driver-selector"
                      >                        <option value="">Assign Driver...</option>
                        {driverAssignment.availableDrivers.map((driver, index) => {
                          // Show FIFO order instead of proximity
                          const fifoOrder = index + 1;
                          return (
                            <option key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name} - FIFO #{fifoOrder} (ETA: ~20min)
                            </option>
                          );
                        })}
                      </select>
                      {getUrgencyLevel(pickup.timestamp) === "urgent" && (
                        <button
                          onClick={() => handleUrgentPickupRequest(pickup.id)}
                          className="urgent-action-btn"
                        >
                          <i className="fas fa-bolt"></i>
                          Urgent
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Assignment Tools */}
        <div className="quick-assignment-tools">          <div className="tool-section auto-assignment">
            <h5>
              <i className="fas fa-magic"></i>
              Auto Assignment (FIFO)
            </h5>
            <p>Automatically assign all pending pickups using First-In-First-Out method</p>
            <button
              onClick={() => {
                // Pure FIFO auto-assignment - no proximity calculations
                currentPendingPickups.forEach((pickup) => {
                  // Simply assign to next available driver (FIFO)
                  handleAssignDriverPickup(pickup.id); // No driverId = auto FIFO selection
                });
              }}
              disabled={
                currentPendingPickups.length === 0 ||
                driverAssignment.availableDrivers.length === 0
              }
              className="auto-assign-btn"
            >
              <i className="fas fa-robot"></i>
              Auto-Assign All FIFO ({currentPendingPickups.length})
            </button>
          </div>

          <div className="tool-section zone-overview">
            <h5>
              <i className="fas fa-map"></i>
              Zone Coverage
            </h5>
            <div className="zone-coverage-grid">
              {[
                "north_pasig",
                "south_pasig",
                "east_pasig",
                "west_pasig",
                "central_pasig",
              ].map((zone) => {
                const driversInZone = driverAssignment.availableDrivers.filter(
                  (driver) =>
                    getPasigZone(driver.current_location) ===
                    zone
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                );
                const pickupsInZone = currentPendingPickups.filter(
                  (pickup) =>
                    getPasigZone(pickup.location) ===
                    zone
                      .replace("_", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                );

                return (
                  <div key={zone} className="zone-card">
                    <div className="zone-name">
                      {zone
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    <div className="zone-stats">
                      <span className="drivers">
                        <i className="fas fa-car"></i> {driversInZone.length}
                      </span>
                      <span className="pickups">
                        <i className="fas fa-hand-paper"></i>{" "}
                        {pickupsInZone.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Missing render functions
  const renderRejectedAppointments = () => {
    if (rejectedAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-check-circle"></i>
          <p>No rejected appointments need review</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {rejectedAppointments.map((appointment) => (
          <div key={appointment.id} className="appointment-card rejected">
            <div className="appointment-header">
              <h4>
                <i className="fas fa-times-circle"></i>
                Appointment #{appointment.id}
              </h4>
              <span className="status rejected">Rejected</span>
            </div>
            <div className="appointment-details">
              <div className="detail-row">
                <span className="label">Client:</span>
                <span className="value">
                  {appointment.client_name || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">
                  {new Date(appointment.date).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Time:</span>
                <span className="value">{appointment.start_time}</span>
              </div>
              <div className="detail-row">
                <span className="label">Rejection Reason:</span>
                <span className="value rejection-reason">
                  {appointment.rejection_reason || "No reason provided"}
                </span>
              </div>
              {renderTherapistInfo(appointment)}
            </div>{" "}
            <div className="appointment-actions">
              <LoadingButton
                onClick={() => handleReviewRejection(appointment)}
                className="review-btn"
                loading={buttonLoading[`review_open_${appointment.id}`]}
                loadingText="Loading..."
              >
                <i className="fas fa-eye"></i>
                Review Rejection
              </LoadingButton>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPendingAcceptanceAppointments = () => {
    if (pendingAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-clock"></i>
          <p>No appointments pending acceptance</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {pendingAppointments.map((appointment) => (
          <div key={appointment.id} className="appointment-card pending">
            <div className="appointment-header">
              <h4>
                <i className="fas fa-hourglass-half"></i>
                Appointment #{appointment.id}
              </h4>
              <span className="status pending">Pending</span>
            </div>
            <div className="appointment-details">
              <div className="detail-row">
                <span className="label">Client:</span>
                <span className="value">
                  {appointment.client_name || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">
                  {new Date(appointment.date).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Time:</span>
                <span className="value">{appointment.start_time}</span>
              </div>
              <div className="detail-row">
                <span className="label">Deadline:</span>
                <span className="value deadline">
                  {new Date(appointment.response_deadline).toLocaleString()}
                </span>
              </div>
              {renderTherapistInfo(appointment)}
              {getTherapistAcceptanceStatus(appointment)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeoutMonitoring = () => {
    const urgentAppointments = [
      ...overdueAppointments,
      ...approachingDeadlineAppointments,
    ];

    return (
      <div className="timeout-monitoring">
        <div className="monitoring-stats">
          <div className="stat-card overdue">
            <h4>
              <i className="fas fa-exclamation-triangle"></i>
              Overdue
            </h4>
            <span className="count">{overdueAppointments.length}</span>
          </div>
          <div className="stat-card approaching">
            <h4>
              <i className="fas fa-clock"></i>
              Approaching Deadline
            </h4>
            <span className="count">
              {approachingDeadlineAppointments.length}
            </span>
          </div>
        </div>

        {overdueAppointments.length > 0 && (
          <div className="overdue-section">
            <h3>
              <i className="fas fa-exclamation-triangle"></i>
              Overdue Appointments
            </h3>{" "}
            <LoadingButton
              onClick={handleAutoCancelOverdue}
              loading={autoCancelLoading}
              loadingText="Processing..."
              className="auto-cancel-btn"
              variant="warning"
            >
              <i className="fas fa-times"></i>
              Auto-Cancel All Overdue ({overdueAppointments.length})
            </LoadingButton>
          </div>
        )}

        {urgentAppointments.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <p>All appointments are within acceptable timeframes</p>
          </div>
        ) : (
          <div className="appointments-list">
            {urgentAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`appointment-card ${
                  overdueAppointments.includes(appointment)
                    ? "overdue"
                    : "approaching"
                }`}
              >
                <div className="appointment-header">
                  <h4>
                    <i
                      className={`fas ${
                        overdueAppointments.includes(appointment)
                          ? "fa-exclamation-triangle"
                          : "fa-clock"
                      }`}
                    ></i>
                    Appointment #{appointment.id}
                  </h4>
                  <span
                    className={`status ${
                      overdueAppointments.includes(appointment)
                        ? "overdue"
                        : "approaching"
                    }`}
                  >
                    {overdueAppointments.includes(appointment)
                      ? "Overdue"
                      : "Approaching Deadline"}
                  </span>
                </div>
                <div className="appointment-details">
                  <div className="detail-row">
                    <span className="label">Client:</span>
                    <span className="value">
                      {appointment.client_name || "Unknown"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Deadline:</span>
                    <span className="value deadline">
                      {new Date(appointment.response_deadline).toLocaleString()}
                    </span>
                  </div>
                  {renderTherapistInfo(appointment)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAllAppointments = () => {
    if (appointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-calendar"></i>
          <p>No appointments found</p>
        </div>
      );
    }

    return (
      <div className="all-appointments">
        <div className="appointments-stats">
          <div className="stat-card">
            <h4>Total Appointments</h4>
            <span className="count">{appointments.length}</span>
          </div>
          <div className="stat-card">
            <h4>Today's Appointments</h4>
            <span className="count">{todayAppointments.length}</span>
          </div>
          <div className="stat-card">
            <h4>Upcoming</h4>
            <span className="count">{upcomingAppointments.length}</span>
          </div>
        </div>

        <div className="appointments-list">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`appointment-card ${appointment.status}`}
            >
              <div className="appointment-header">
                <h4>
                  <i className="fas fa-calendar"></i>
                  Appointment #{appointment.id}
                </h4>
                <span className={`status ${appointment.status}`}>
                  {appointment.status}
                </span>
              </div>{" "}
              <div className="appointment-details">
                <div className="detail-row">
                  <span className="label">Client:</span>
                  <span className="value">
                    {appointment.client_name || "Unknown"}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(appointment.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Location:</span>
                  <span className="value">
                    {appointment.location || "Not specified"}
                  </span>
                </div>
                {renderTherapistInfo(appointment)}{" "}
                {/* Action buttons for driver_confirmed status */}
                {appointment.status === "driver_confirmed" && (
                  <div className="appointment-actions">
                    <LoadingButton
                      className="action-btn start-appointment"
                      onClick={() => handleStartAppointment(appointment.id)}
                      loading={buttonLoading[`start_${appointment.id}`]}
                      loadingText="Starting..."
                    >
                      <i className="fas fa-play"></i>
                      Start Appointment
                    </LoadingButton>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    if (!notifications || notifications.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-bell"></i>
          <p>No notifications</p>
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
              <h4>
                <i
                  className={`fas ${
                    notification.type === "urgent"
                      ? "fa-exclamation-triangle"
                      : notification.type === "warning"
                      ? "fa-exclamation-circle"
                      : notification.type === "success"
                      ? "fa-check-circle"
                      : "fa-info-circle"
                  }`}
                ></i>
                {notification.title || "Notification"}
              </h4>
              <span className="timestamp">
                {new Date(notification.created_at).toLocaleString()}
              </span>
            </div>
            <div className="notification-content">
              <p>{notification.message || notification.content}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderServiceWorkflowView = () => {
    const workflowSteps = [
      { id: 1, name: "Appointment Created", status: "completed" },
      { id: 2, name: "Therapist Assignment", status: "in_progress" },
      { id: 3, name: "Driver Coordination", status: "pending" },
      { id: 4, name: "Service Delivery", status: "pending" },
      { id: 5, name: "Session Complete", status: "pending" },
    ];

    return (
      <div className="service-workflow">
        <div className="workflow-overview">
          <h3>Service Workflow Management</h3>
          <p>
            Monitor the complete service delivery process from appointment
            creation to completion.
          </p>
        </div>

        <div className="workflow-steps">
          {workflowSteps.map((step) => (
            <div key={step.id} className={`workflow-step ${step.status}`}>
              <div className="step-indicator">
                <span className="step-number">{step.id}</span>
              </div>
              <div className="step-content">
                <h4>{step.name}</h4>
                <span className={`step-status ${step.status}`}>
                  {step.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="workflow-actions">
          <button className="action-btn">
            <i className="fas fa-play"></i>
            Start New Workflow
          </button>
          <button className="action-btn">
            <i className="fas fa-pause"></i>
            Pause All Workflows
          </button>
          <button className="action-btn">
            <i className="fas fa-sync"></i>
            Refresh Status
          </button>
        </div>
      </div>
    );
  };

  const renderActiveSessionsView = () => {
    // Calculate active sessions from appointments
    const activeSessions = appointments.filter(
      (apt) =>
        apt.status === "in_progress" || apt.status === "therapist_en_route"
    );

    if (activeSessions.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-bed"></i>
          <p>No active therapy sessions</p>
        </div>
      );
    }

    return (
      <div className="active-sessions-list">
        {activeSessions.map((session) => (
          <div key={session.id} className="session-card active">
            <div className="session-header">
              <h4>
                <i className="fas fa-play-circle"></i>
                Session #{session.id}
              </h4>
              <span className={`status ${session.status}`}>
                {session.status}
              </span>
            </div>
            <div className="session-details">
              <div className="detail-row">
                <span className="label">Client:</span>
                <span className="value">
                  {session.client_name || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Location:</span>
                <span className="value">{session.location}</span>
              </div>
              <div className="detail-row">
                <span className="label">Started:</span>
                <span className="value">
                  {new Date(session.start_time).toLocaleString()}
                </span>
              </div>
              {renderTherapistInfo(session)}
            </div>
            <div className="session-actions">
              <button className="action-btn">
                <i className="fas fa-phone"></i>
                Contact Therapist
              </button>
              <button className="action-btn">
                <i className="fas fa-map-marker-alt"></i>
                Track Location
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  const renderPickupRequestsView = () => {
    // Calculate pickup requests from appointments
    const pickupRequests = appointments.filter(
      (apt) =>
        apt.status === "pickup_requested" ||
        apt.status === "driver_assigned_pickup"
    );

    if (pickupRequests.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-car"></i>
          <p>No pending pickup requests</p>
        </div>
      );
    }

    return (
      <div className="pickup-requests-list">
        {pickupRequests.map((request) => (
          <div key={request.id} className="pickup-card">
            <div className="pickup-header">
              <h4>
                <i className="fas fa-hand-paper"></i>
                Pickup Request #{request.id}
              </h4>
              <span className={`status ${request.status}`}>
                {request.status}
              </span>
            </div>
            <div className="pickup-details">
              <div className="detail-row">
                <span className="label">Therapist:</span>
                <span className="value">
                  {request.therapist_details
                    ? `${request.therapist_details.first_name} ${request.therapist_details.last_name}`
                    : "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Pickup Location:</span>
                <span className="value">{request.location}</span>
              </div>
              <div className="detail-row">
                <span className="label">Requested:</span>
                <span className="value">
                  {new Date(request.created_at).toLocaleString()}
                </span>
              </div>
              {request.driver_details && (
                <div className="detail-row">
                  <span className="label">Assigned Driver:</span>
                  <span className="value">
                    {request.driver_details.first_name}{" "}
                    {request.driver_details.last_name}
                  </span>
                </div>
              )}
            </div>
            <div className="pickup-actions">
              <button className="action-btn">
                <i className="fas fa-car"></i>
                Assign Driver
              </button>
              <button className="action-btn">
                <i className="fas fa-phone"></i>
                Contact Therapist
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Payment verification view
  const renderPaymentVerificationView = () => {
    if (awaitingPaymentAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-credit-card"></i>
          <p>No payments pending verification</p>
        </div>
      );
    }

    return (
      <div className="payments-list">
        {awaitingPaymentAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="appointment-card payment-pending"
          >
            <div className="appointment-header">
              <h4>
                <i className="fas fa-credit-card"></i>
                Payment Verification #{appointment.id}
              </h4>
              <span className="status awaiting-payment">Awaiting Payment</span>
            </div>
            <div className="appointment-details">
              {" "}
              <div className="detail-row">
                <span className="label">Client:</span>
                <span className="value">
                  {appointment.client_details?.first_name}{" "}
                  {appointment.client_details?.last_name || "Unknown"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Date:</span>
                <span className="value">
                  {new Date(appointment.date).toLocaleDateString()}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Time:</span>
                <span className="value">{appointment.start_time}</span>
              </div>
              <div className="detail-row">
                <span className="label">Location:</span>
                <span className="value">{appointment.location}</span>
              </div>
              <div className="detail-row">
                <span className="label">Services:</span>
                <span className="value">
                  {appointment.services_details
                    ?.map((s) => s.name)
                    .join(", ") || "N/A"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Total Amount:</span>
                <span className="value">
                  ₱{appointment.total_amount || "0.00"}
                </span>
              </div>
              {renderTherapistInfo(appointment)}
              <div className="detail-row">
                <span className="label">Payment Requested:</span>
                <span className="value">
                  {appointment.payment_requested_at
                    ? new Date(
                        appointment.payment_requested_at
                      ).toLocaleString()
                    : "Just now"}
                </span>
              </div>
            </div>{" "}
            <div className="appointment-actions">
              <LoadingButton
                onClick={() => handlePaymentVerification(appointment)}
                className="verify-payment-btn"
                loading={buttonLoading[`payment_open_${appointment.id}`]}
                loadingText="Loading..."
              >
                <i className="fas fa-check-circle"></i>
                Verify Payment Received
              </LoadingButton>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate counts for tab buttons
  const activeSessions = appointments.filter(
    (apt) => apt.status === "in_progress" || apt.status === "therapist_en_route"
  );

  const pickupRequests = appointments.filter(
    (apt) =>
      apt.status === "pickup_requested" ||
      apt.status === "driver_assigned_pickup"
  );

  return (
    <PageLayout>
      <div className="operator-dashboard">
        <LayoutRow title="Operator Dashboard">
          <div className="action-buttons">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>{" "}
        </LayoutRow>
        {loading && (
          <LoadingSpinner
            size="large"
            variant="primary"
            text="Loading dashboard data..."
            overlay={false}
            className="operator-dashboard-loader"
          />
        )}
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
          </button>{" "}
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
            className={currentView === "payment_verification" ? "active" : ""}
            onClick={() => setView("payment_verification")}
          >
            Payment Verification ({awaitingPaymentAppointments.length})
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
          )}{" "}
          {currentView === "timeouts" && (
            <div className="timeout-monitoring">
              <h2>Timeout Monitoring</h2>
              {renderTimeoutMonitoring()}
            </div>
          )}
          {currentView === "payment_verification" && (
            <div className="payment-verification">
              <h2>Payment Verification</h2>
              {renderPaymentVerificationView()}
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
          )}{" "}
        </div>
        {/* Payment Verification Modal */}
        {paymentModal.isOpen && (
          <div className="modal-overlay">
            <div className="payment-modal">
              <h3>Verify Payment Received</h3>
              <div className="appointment-summary">
                <h4>Appointment #{paymentModal.appointmentId}</h4>
                <div className="summary-details">
                  <p>
                    <strong>Client:</strong>{" "}
                    {
                      paymentModal.appointmentDetails?.client_details
                        ?.first_name
                    }{" "}
                    {paymentModal.appointmentDetails?.client_details?.last_name}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      paymentModal.appointmentDetails?.date
                    ).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Services:</strong>{" "}
                    {paymentModal.appointmentDetails?.services_details
                      ?.map((s) => s.name)
                      .join(", ") || "N/A"}
                  </p>
                  <p>
                    <strong>Total Amount:</strong> ₱
                    {paymentModal.appointmentDetails?.total_amount || "0.00"}
                  </p>
                </div>
              </div>
              <div className="payment-form">
                <div className="form-group">
                  <label htmlFor="paymentMethod">Payment Method:</label>
                  <select
                    id="paymentMethod"
                    value={paymentData.method}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, method: e.target.value })
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Credit/Debit Card</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="paymentAmount">Amount Received:</label>
                  <input
                    type="number"
                    id="paymentAmount"
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, amount: e.target.value })
                    }
                    placeholder="Enter amount received"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="paymentNotes">Notes (optional):</label>
                  <textarea
                    id="paymentNotes"
                    value={paymentData.notes}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, notes: e.target.value })
                    }
                    placeholder="Add any notes about the payment..."
                    rows={3}
                  />
                </div>
              </div>{" "}
              <div className="modal-actions">
                <LoadingButton
                  className="verify-button"
                  onClick={handleMarkPaymentPaid}
                  loading={
                    buttonLoading[`payment_${paymentModal.appointmentId}`]
                  }
                  loadingText="Processing..."
                >
                  Mark as Paid
                </LoadingButton>
                <LoadingButton
                  className="cancel-button"
                  onClick={handlePaymentModalCancel}
                  variant="secondary"
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
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
              </div>{" "}
              <div className="modal-actions">
                <LoadingButton
                  className="accept-button"
                  onClick={() => handleReviewSubmit("accept")}
                  loading={
                    buttonLoading[`review_${reviewModal.appointmentId}_accept`]
                  }
                  loadingText="Processing..."
                >
                  Accept Rejection
                </LoadingButton>
                <LoadingButton
                  className="deny-button"
                  onClick={() => handleReviewSubmit("deny")}
                  loading={
                    buttonLoading[`review_${reviewModal.appointmentId}_deny`]
                  }
                  loadingText="Processing..."
                  variant="secondary"
                >
                  Deny Rejection
                </LoadingButton>
                <LoadingButton
                  className="cancel-button"
                  onClick={handleReviewCancel}
                  variant="secondary"
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default OperatorDashboard;
