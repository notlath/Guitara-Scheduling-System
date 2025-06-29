import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { MdClose } from "react-icons/md";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import pageTitles from "../constants/pageTitles";
import { logout } from "../features/auth/authSlice";
// Enhanced Redux hooks for automatic TanStack Query cache invalidation
import { useEnhancedTherapistActions } from "../hooks/useEnhancedRedux";
// TANSTACK QUERY: Replace optimized hooks with TanStack Query
import { useEnhancedDashboardData } from "../hooks/useEnhancedDashboardData";
// Import the new instant updates hook
import { useTherapistInstantActions } from "../hooks/useInstantUpdates";
// SHARED HOOKS: Import shared dashboard logic to eliminate code duplication
import { useDashboardCommon } from "../hooks/useDashboardCommon";
import { useUrlParams } from "../hooks/useUrlParams";
import { useButtonLoading } from "../hooks/useButtonLoading";
// SHARED UTILITIES: Import shared status utilities to eliminate code duplication
import { getStatusBadgeClass, getStatusDisplayText } from "../utils/appointmentStatusUtils";
// Import shared Philippine time and greeting hook
import { usePhilippineTime } from "../hooks/usePhilippineTime";
import { useAutoWebSocketCacheSync } from "../hooks/useWebSocketCacheSync";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
// TanStack Query cache utilities for direct cache management
import { queryKeys } from "../lib/queryClient";

import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import "../globals/TabSwitcher.css";
import { useOptimizedSelector } from "../hooks/usePerformanceOptimization";
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css";

/* ✅ NEW: Component-based CSS imports - Single Source of Truth */
import "../styles/components/AppointmentCard.css";
import "../styles/components/StatusBadge.css";

import RejectionModal from "./RejectionModal";
import WebSocketStatus from "./scheduling/WebSocketStatus";

// API base URL configuration
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

const API_URL = `${getBaseURL()}/scheduling/`;

// Helper function for TanStack Query-only cache invalidation
const invalidateAppointmentQueries = async (queryClient, delay = 0) => {
  console.log("🔄 Invalidating appointment queries (TanStack Query only)");

  // Add optional delay for backend propagation
  if (delay > 0) {
    console.log(`⏳ Waiting ${delay}ms for backend propagation...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Get current data before invalidation for debugging
  const beforeInvalidation = queryClient.getQueryData(["appointments"]);
  console.log(
    "📊 Data before invalidation:",
    beforeInvalidation?.length,
    "appointments"
  );

  // Invalidate all appointment-related queries
  await Promise.all(
    [
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "today"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "upcoming"] }),
      // Invalidate specific query keys if they exist
      queryKeys?.appointments?.all &&
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      queryKeys?.appointments?.list &&
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.list(),
        }),
      queryKeys?.appointments?.today &&
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.today(),
        }),
      queryKeys?.appointments?.upcoming &&
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.upcoming(),
        }),
    ].filter(Boolean)
  );

  console.log("✅ Appointment queries invalidated successfully");

  // Wait a bit and check the data after invalidation
  setTimeout(() => {
    const afterInvalidation = queryClient.getQueryData(["appointments"]);
    console.log(
      "📊 Data after invalidation:",
      afterInvalidation?.length,
      "appointments"
    );
  }, 100);
};

// Helper to get auth token
const getToken = () => localStorage.getItem("knoxToken");

// Helper to get user from localStorage
const getUser = () => {
  const storedUser = localStorage.getItem("user");
  if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse user data:", error);
      localStorage.removeItem("user");
      return null;
    }
  }
  return null;
};

// TanStack Query functions for fetching appointments data
const fetchAppointments = async () => {
  const token = getToken();
  if (!token) throw new Error("Authentication required");

  const response = await axios.get(`${API_URL}appointments/`, {
    headers: { Authorization: `Token ${token}` },
  });
  return response.data.results || response.data;
};

// TanStack Query hook for therapist dashboard data
const useTherapistDashboardData = (userId) => {
  const {
    data: allAppointments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Filter appointments for this therapist
  const myAppointments = useMemo(() => {
    if (!Array.isArray(allAppointments) || !userId) return [];
    return allAppointments.filter(
      (apt) =>
        apt.therapist === userId ||
        (apt.therapists && apt.therapists.includes(userId))
    );
  }, [allAppointments, userId]);

  // Filter today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return myAppointments.filter((apt) => apt.date === todayStr);
  }, [myAppointments]);

  // Filter upcoming appointments (future dates)
  const upcomingAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return myAppointments.filter((apt) => apt.date > todayStr);
  }, [myAppointments]);

  return {
    appointments: myAppointments,
    todayAppointments,
    upcomingAppointments,
    isLoading,
    error,
    refetch,
    hasData: allAppointments.length > 0,
  };
};

// API calls for therapist actions
const therapistAPI = {
  acceptAppointment: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  rejectAppointment: async ({ appointmentId, rejectionReason }) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) throw new Error("Rejection reason cannot be empty");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/reject/`,
      { rejection_reason: cleanReason },
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  confirmReadiness: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  startSession: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/start_session/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  completeSession: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/complete/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  requestPayment: async (appointmentId) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/mark_awaiting_payment/`,
      {},
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },

  requestPickup: async ({ appointmentId, urgency = "normal" }) => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");

    const response = await axios.post(
      `${API_URL}appointments/${appointmentId}/request_pickup/`,
      {
        pickup_urgency: urgency,
        pickup_notes:
          urgency === "urgent"
            ? "Urgent pickup requested by therapist"
            : "Pickup requested by therapist",
      },
      { headers: { Authorization: `Token ${token}` } }
    );
    return response.data;
  },
};

const TherapistDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Initialize real-time cache sync via WebSocket
  useAutoWebSocketCacheSync();

  // Enhanced Redux actions with automatic TanStack Query cache invalidation
  const {
    confirmReadiness: enhancedConfirmReadiness,
    startSession: enhancedStartSession,
    completeSession: enhancedCompleteSession,
    requestPickup: enhancedRequestPickup,
    markPaymentRequest: enhancedMarkPaymentRequest,
  } = useEnhancedTherapistActions();

  // ✅ NEW: Instant updates for immediate UI feedback
  const {
    acceptAppointment: instantAcceptAppointment,
    rejectAppointment: instantRejectAppointment,
  } = useTherapistInstantActions();
  // Remove the sync event handlers - TanStack Query handles real-time updates automatically

  // Get user from Redux state
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

  // Get user name from Redux state or fallback
  const userName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || "Therapist";

  // Use shared Philippine time and greeting hook - REMOVED: Now handled by shared hook

  // URL search params for view persistence - REMOVED: Now handled by shared hook
  // const [searchParams, setSearchParams] = useSearchParams(); - REMOVED
  // Get view from URL params, default to 'today'
  // const currentView = searchParams.get("view") || "today"; - REMOVED

  // Helper function to update view in URL - REMOVED: Now handled by shared hook
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });

  // Loading states for individual button actions - REMOVED: Now handled by shared hook
  // const [buttonLoading, setButtonLoading] = useState({}); - REMOVED

  // Helper function to set loading state for specific action - REMOVED: Now handled by shared hook
  // TANSTACK QUERY: Replace optimized data manager with TanStack Query
  const {
    appointments: myAppointments,
    todayAppointments: myTodayAppointments,
    upcomingAppointments: myUpcomingAppointments,
    isLoading: loading,
    error,
    refetch,
    hasData,
  } = useTherapistDashboardData(user?.id);

  // Debug logging for troubleshooting the "No appointments found" issue
  const DEBUG_LOGS = false; // Set to true to enable debug logs
  if (DEBUG_LOGS) {
    console.log("🔍 TherapistDashboard Debug:", {
      user: user,
      userRole: "therapist",
      userId: user?.id,
      myAppointments: myAppointments,
      myAppointmentsLength: myAppointments?.length || 0,
      myAppointmentsIsArray: Array.isArray(myAppointments),
      myTodayAppointments: myTodayAppointments,
      myTodayAppointmentsLength: myTodayAppointments?.length || 0,
      myUpcomingAppointments: myUpcomingAppointments,
      myUpcomingAppointmentsLength: myUpcomingAppointments?.length || 0,
      loading,
      error,
      hasData,
      currentView,
    });
  }

  // TANSTACK QUERY: Automatic background refreshes handled by TanStack Query
  // No manual refresh logic needed - TanStack Query handles it automatically

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  // Set page title
  useEffect(() => {
    document.title = pageTitles.dashboard;
  }, []);

  // Handle appointment status changes with INSTANT UPDATES (immediate UI feedback)
  const handleAcceptAppointment = async (appointmentId) => {
    const actionKey = `accept_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await acceptAppointmentMutation.mutateAsync(appointmentId);
    } catch (error) {
      console.error("Accept appointment failed:", error);
      alert("Failed to accept appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
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
      await rejectAppointmentMutation.mutateAsync({
        appointmentId,
        rejectionReason: cleanReason,
      });
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error("Reject appointment failed:", error);
      alert("Failed to reject appointment. Please try again.");
      setRejectionModal({ isOpen: false, appointmentId: null });
    }
  };

  // Enhanced workflow handlers for new service flow
  const handleTherapistConfirm = async (appointmentId) => {
    const actionKey = `confirm_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await confirmReadinessMutation.mutateAsync(appointmentId);
      console.log("✅ Therapist confirmation successful");
    } catch (error) {
      console.error("Failed to confirm appointment:", error);
      alert("Failed to confirm appointment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleStartSession = async (appointmentId) => {
    const actionKey = `start_session_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);

      // Debug: Log appointment state before starting session
      const currentData = queryClient.getQueryData(["appointments"]);
      const appointment = currentData?.find((apt) => apt.id === appointmentId);
      console.log(
        "🔍 Before startSession - Appointment status:",
        appointment?.status
      );

      const result = await startSessionMutation.mutateAsync(appointmentId);
      console.log("✅ Session start successful, backend response:", result);

      // Debug: Log appointment state after mutation
      setTimeout(() => {
        const updatedData = queryClient.getQueryData(["appointments"]);
        const updatedAppointment = updatedData?.find(
          (apt) => apt.id === appointmentId
        );
        console.log(
          "🔍 After startSession - Appointment status:",
          updatedAppointment?.status
        );
      }, 100);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleRequestPayment = async (appointmentId) => {
    const actionKey = `request_payment_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await requestPaymentMutation.mutateAsync(appointmentId);
      console.log("✅ Payment request successful");
    } catch (error) {
      console.error("Failed to request payment:", error);
      alert("Failed to request payment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleCompleteSession = async (appointmentId) => {
    if (
      window.confirm("Complete this session? This action cannot be undone.")
    ) {
      const actionKey = `complete_session_${appointmentId}`;
      try {
        setActionLoading(actionKey, true);
        await completeSessionMutation.mutateAsync(appointmentId);
        console.log("✅ Session completion successful");
      } catch (error) {
        console.error("Failed to complete session:", error);
        alert("Failed to complete session. Please try again.");
      } finally {
        setActionLoading(actionKey, false);
      }
    }
  };

  const handleRequestPickupNew = async (appointmentId, urgency = "normal") => {
    const actionKey = `request_pickup_${appointmentId}_${urgency}`;
    try {
      setActionLoading(actionKey, true);
      await requestPickupMutation.mutateAsync({ appointmentId, urgency });
      alert(
        urgency === "urgent"
          ? "Urgent pickup request sent!"
          : "Pickup request sent!"
      );
      console.log("✅ Pickup request successful");
    } catch (error) {
      console.error("Failed to request pickup:", error);
      alert("Failed to request pickup. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  // Legacy handlers (keeping for backward compatibility)
  const handleRejectionCancel = () => {
    setRejectionModal({ isOpen: false, appointmentId: null });
  };

  // ✅ REMOVED: getStatusBadgeClass and getStatusDisplayText functions - now using shared utilities

  // Helper function to display therapist team information
  const renderTherapistTeam = (appointment) => {
    if (
      appointment.therapists_details &&
      Array.isArray(appointment.therapists_details) &&
      appointment.therapists_details.length > 1
    ) {
      const otherTherapists = appointment.therapists_details.filter(
        (t) => t && t.id !== user?.id
      );
      if (otherTherapists.length > 0) {
        return (
          <div className="therapist-team">
            <strong>Team members:</strong>
            <div className="therapist-list">
              {otherTherapists.map((therapist, index) => (
                <div key={therapist.id || index} className="therapist-name">
                  {therapist.first_name} {therapist.last_name}
                  {therapist.specialization && (
                    <span className="therapist-specialization">
                      {" "}
                      ({therapist.specialization})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Special render function for completed transport appointments
  const renderCompletedTransportCard = (appointment) => {
    return (
      <div
        key={appointment.id}
        className="appointment-card completed-transport-card"
      >
        <div className="appointment-header">
          <h3>
            {appointment.client_details?.first_name}{" "}
            {appointment.client_details?.last_name}
          </h3>
          <span className="status-badge status-transport-completed">
            ✅ Transport Completed
          </span>
        </div>

        <div className="appointment-details">
          <p>
            <strong>Date:</strong>{" "}
            {new Date(appointment.date).toLocaleDateString()}
          </p>

          {/* Session Start and End Times */}
          {appointment.session_started_at && (
            <p>
              <strong>Session Started:</strong>{" "}
              {new Date(appointment.session_started_at).toLocaleString()}
            </p>
          )}
          {appointment.session_end_time && (
            <p>
              <strong>Session Ended:</strong>{" "}
              {new Date(appointment.session_end_time).toLocaleString()}
            </p>
          )}

          {/* Client Address */}
          <p>
            <strong>Client Address:</strong> {appointment.location}
          </p>

          {/* Services */}
          <p>
            <strong>Services:</strong>{" "}
            {appointment.services_details?.map((s) => s.name).join(", ") ||
              "N/A"}
          </p>

          {/* Payment Amount */}
          <p>
            <strong>Amount Paid:</strong> ₱
            {appointment.payment_amount
              ? parseFloat(appointment.payment_amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : appointment.total_price?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
          </p>

          {/* Return Journey Completion Time */}
          {appointment.return_journey_completed_at && (
            <p>
              <strong>Transport Completed:</strong>{" "}
              {new Date(
                appointment.return_journey_completed_at
              ).toLocaleString()}
            </p>
          )}

          {/* Driver Information */}
          {appointment.driver_details && (
            <p>
              <strong>Driver:</strong> {appointment.driver_details.first_name}{" "}
              {appointment.driver_details.last_name}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderActionButtons = (appointment) => {
    const {
      status,
      id,
      therapist_accepted,
      both_parties_accepted,
      pending_acceptances,
      therapists_accepted,
      therapists,
    } = appointment;

    // Helper function to check if current therapist has accepted
    const hasCurrentTherapistAccepted = () => {
      // For multi-therapist appointments
      if (therapists && therapists.length > 0) {
        const therapistIndex = therapists.indexOf(user?.id);
        return (
          therapistIndex !== -1 &&
          therapists_accepted &&
          therapists_accepted[therapistIndex]
        );
      }
      // For single therapist appointments (legacy)
      return therapist_accepted;
    };
    switch (status) {
      case "pending":
        // Show accept/reject only if current therapist hasn't accepted yet
        if (!hasCurrentTherapistAccepted()) {
          return (
            <div className="appointment-actions">
              <LoadingButton
                className="accept-button"
                onClick={() => handleAcceptAppointment(id)}
                loading={buttonLoading[`accept_${id}`]}
                loadingText="Accepting..."
              >
                Accept
              </LoadingButton>
              <LoadingButton
                className="reject-button"
                onClick={() => handleRejectAppointment(id)}
                variant="secondary"
              >
                Reject
              </LoadingButton>
            </div>
          );
        } else {
          // Therapist has accepted, show waiting status
          return (
            <div className="appointment-actions">
              <div className="waiting-status">
                <span className="accepted-badge">✓ You have accepted</span>
                {!both_parties_accepted && pending_acceptances?.length > 0 && (
                  <small className="waiting-text">
                    Waiting for: {pending_acceptances.join(", ")}
                  </small>
                )}
              </div>
            </div>
          );
        }

      case "confirmed":
        // New workflow: therapist needs to confirm readiness
        if (both_parties_accepted) {
          return (
            <div className="appointment-actions">
              <LoadingButton
                className="confirm-button"
                onClick={() => handleTherapistConfirm(id)}
                loading={buttonLoading[`confirm_${id}`]}
                loadingText="Confirming..."
              >
                Confirm Ready
              </LoadingButton>
              <div className="workflow-info">
                <p>
                  ✅ All parties accepted. Please confirm you're ready to
                  proceed.
                </p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="warning-status">
                ⚠ Waiting for all parties to accept before confirmation
              </div>
            </div>
          );
        }
      case "therapist_confirmed":
        // Always waiting for driver to confirm - driver is needed for all appointments
        return (
          <div className="appointment-actions">
            <div className="waiting-status">
              <span className="confirmed-badge">✅ You confirmed</span>
              <p>Waiting for driver confirmation...</p>
            </div>
          </div>
        );
      case "driver_confirmed":
        // Both confirmed, but operator must start appointment before journey can begin
        return (
          <div className="appointment-actions">
            <div className="ready-status">
              <span className="ready-badge">⏳ Waiting for Operator</span>
              <p>
                Both you and driver confirmed. Waiting for operator to start
                appointment.
              </p>
              <div className="workflow-reminder">
                <small>🔐 Operator must approve before transport begins</small>
              </div>
            </div>
          </div>
        );

      case "in_progress":
        // Appointment is active, driver will handle journey
        return (
          <div className="appointment-actions">
            <div className="ready-status">
              <span className="ready-badge">✅ Appointment active</span>
              <p>Appointment is in progress. Driver will coordinate pickup.</p>
            </div>
          </div>
        );

      case "journey":
        return (
          <div className="appointment-actions">
            <div className="journey-status">
              <span className="journey-badge">🚗 En route</span>
              <p>Driver is on the way to pick you up</p>
            </div>
          </div>
        );

      case "arrived":
        return (
          <div className="appointment-actions">
            <div className="arrived-status">
              <span className="arrived-badge">📍 Driver arrived</span>
              <p>Driver has arrived. Ready to proceed to client.</p>
            </div>
          </div>
        );
      case "dropped_off":
        // Session should auto-start, but allow manual start if needed
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="start-session-button"
              onClick={() => handleStartSession(id)}
              loading={buttonLoading[`start_session_${id}`]}
              loadingText="Starting..."
            >
              Start Session
            </LoadingButton>
            <div className="dropped-off-info">
              <p>📍 Dropped off at client location</p>
            </div>
          </div>
        );
      case "session_in_progress":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="payment-button"
              onClick={() => handleRequestPayment(id)}
              loading={buttonLoading[`request_payment_${id}`]}
              loadingText="Requesting..."
            >
              Request Payment
            </LoadingButton>
            <div className="session-info">
              <p>💆 Session in progress</p>
            </div>
          </div>
        );

      case "awaiting_payment":
        return (
          <div className="appointment-actions">
            <div className="payment-status">
              <span className="payment-badge">💳 Payment requested</span>
              <p>Waiting for operator to verify payment...</p>
            </div>
          </div>
        );
      case "payment_completed":
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="complete-session-button"
              onClick={() => handleCompleteSession(id)}
              loading={buttonLoading[`complete_session_${id}`]}
              loadingText="Completing..."
            >
              Complete Session
            </LoadingButton>
            <div className="payment-info">
              <p>✅ Payment verified by operator</p>
            </div>
          </div>
        );

      case "completed":
        // Show pickup options for appointments with drivers
        if (appointment.driver_details) {
          return (
            <div className="appointment-actions">
              {appointment.pickup_requested ? (
                <div className="pickup-status">
                  {appointment.assigned_pickup_driver ? (
                    <div className="driver-assigned">
                      <span className="success-badge">
                        ✅ Pickup Driver Assigned
                      </span>
                      <p>Driver en route for pickup</p>
                      {appointment.estimated_pickup_time && (
                        <p>
                          <strong>ETA:</strong>{" "}
                          {new Date(
                            appointment.estimated_pickup_time
                          ).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pickup-pending">
                      <div className="session-completion-info">
                        {appointment.session_end_time && (
                          <p className="completion-timestamp">
                            <strong>Session completed:</strong>{" "}
                            {new Date(
                              appointment.session_end_time
                            ).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`pickup-badge ${
                          appointment.pickup_urgency || "normal"
                        }`}
                      >
                        {appointment.pickup_urgency === "urgent"
                          ? "🚨 URGENT Pickup Requested"
                          : "⏰ Pickup Requested"}
                      </span>
                      <p>Waiting for driver assignment...</p>{" "}
                      {appointment.pickup_urgency !== "urgent" && (
                        <LoadingButton
                          className="urgent-pickup-button"
                          onClick={() => handleRequestPickupNew(id, "urgent")}
                          loading={buttonLoading[`request_pickup_${id}_urgent`]}
                          loadingText="Requesting..."
                          variant="warning"
                          size="small"
                        >
                          Request Urgent Pickup
                        </LoadingButton>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pickup-actions">
                  <div className="session-completion-info">
                    <p className="pickup-info">
                      <span className="success-badge">
                        ✅ Session completed
                      </span>
                      {appointment.session_end_time && (
                        <span className="completion-timestamp">
                          Completed at:{" "}
                          {new Date(
                            appointment.session_end_time
                          ).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <p>Need pickup to return?</p>
                  </div>
                  <div className="pickup-buttons">
                    <LoadingButton
                      className="request-pickup-button"
                      onClick={() => handleRequestPickupNew(id, "normal")}
                      loading={buttonLoading[`request_pickup_${id}_normal`]}
                      loadingText="Requesting..."
                    >
                      Request Pickup
                    </LoadingButton>
                    <LoadingButton
                      className="urgent-pickup-button"
                      onClick={() => handleRequestPickupNew(id, "urgent")}
                      loading={buttonLoading[`request_pickup_${id}_urgent`]}
                      loadingText="Requesting..."
                      variant="warning"
                    >
                      Request Urgent Pickup
                    </LoadingButton>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div className="appointment-actions">
              <div className="completed-status">
                <span className="success-badge">✅ Session Completed</span>
                <p>No transport needed</p>
              </div>
            </div>
          );
        }
      case "pickup_requested":
        return (
          <div className="appointment-actions">
            <div className="pickup-requested-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="pickup-badge">🚖 Pickup requested</span>
              <p>Waiting for pickup assignment...</p>
            </div>
          </div>
        );

      case "driver_assigned_pickup":
        return (
          <div className="appointment-actions">
            <div className="pickup-assigned-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="success-badge">
                ✅ Driver Assigned for Pickup
              </span>
              <p>
                Driver{" "}
                <strong>
                  {appointment.driver_details?.first_name}{" "}
                  {appointment.driver_details?.last_name}
                </strong>{" "}
                has been assigned for your pickup.
              </p>
              {appointment.estimated_pickup_time && (
                <p>
                  <strong>Estimated arrival:</strong>{" "}
                  {new Date(appointment.estimated_pickup_time).toLocaleString()}
                </p>
              )}
              <p className="waiting-confirmation">
                Waiting for driver to confirm pickup...
              </p>
            </div>
          </div>
        );

      case "return_journey":
        return (
          <div className="appointment-actions">
            <div className="return-journey-status">
              {appointment.session_end_time && (
                <div className="session-completion-info">
                  <p className="completion-timestamp">
                    <strong>Session completed:</strong>{" "}
                    {new Date(appointment.session_end_time).toLocaleString()}
                  </p>
                </div>
              )}
              <span className="journey-badge">
                🔄 Driver En Route for Pickup
              </span>
              <p>
                Driver{" "}
                <strong>
                  {appointment.driver_details?.first_name}{" "}
                  {appointment.driver_details?.last_name}
                </strong>{" "}
                confirmed pickup and is on the way.
              </p>
              {appointment.pickup_confirmed_at && (
                <p>
                  <strong>Pickup confirmed at:</strong>{" "}
                  {new Date(appointment.pickup_confirmed_at).toLocaleString()}
                </p>
              )}
              <p>Please wait at the pickup location.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };
  const renderAppointmentsList = (appointmentsList) => {
    // Enhanced safety checks for undefined/null data
    if (
      !appointmentsList ||
      !Array.isArray(appointmentsList) ||
      appointmentsList.length === 0
    ) {
      console.log("🔍 renderAppointmentsList: No appointments to render:", {
        appointmentsList,
        isArray: Array.isArray(appointmentsList),
        length: appointmentsList?.length,
      });
      return <p className="no-appointments">No appointments found.</p>;
    }

    return (
      <div className="appointments-list">
        {appointmentsList.map((appointment) => {
          // Use special rendering for completed transport appointments
          if (appointment.status === "transport_completed") {
            return renderCompletedTransportCard(appointment);
          }

          // Regular appointment card for all other statuses
          return (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-header">
                <h3>
                  {appointment.client_details?.first_name}{" "}
                  {appointment.client_details?.last_name}
                </h3>{" "}
                <span
                  className={`status-badge ${getStatusBadgeClass(
                    appointment.status
                  )}`}
                >
                  {getStatusDisplayText(appointment.status)}
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
                  <strong>Location:</strong> {appointment.location}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details?.map((s) => s.name).join(", ")}
                </p>
                {renderTherapistTeam(appointment)}
                {appointment.driver_details && (
                  <p>
                    <strong>Driver:</strong>{" "}
                    {appointment.driver_details.first_name}{" "}
                    {appointment.driver_details.last_name}
                  </p>
                )}
                {appointment.notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.notes}
                  </p>
                )}

                {/* Show session completion timestamp for pickup-related statuses */}
                {(appointment.status === "pickup_requested" ||
                  appointment.status === "driver_assigned_pickup" ||
                  appointment.status === "return_journey") &&
                  appointment.session_end_time && (
                    <div className="session-completion-info">
                      <h4>📋 Session Completed</h4>
                      <p className="completion-time">
                        <strong>Session completed at:</strong>{" "}
                        {new Date(
                          appointment.session_end_time
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
              </div>

              {renderActionButtons(appointment)}
            </div>
          );
        })}
      </div>
    );
  };
  // Helper to check if appointment is transport completed or completed
  const isTransportCompleted = (appointment) =>
    ["transport_completed", "completed", "driver_transport_completed"].includes(
      appointment.status
    );

  // State for completed appointments modal
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  // Filter today's appointments into pending and completed
  const todayPendingAppointments = useMemo(() => {
    return (
      Array.isArray(myTodayAppointments) ? myTodayAppointments : []
    ).filter((apt) => apt && !isTransportCompleted(apt));
  }, [myTodayAppointments]);

  const todayCompletedAppointments = useMemo(() => {
    return (
      Array.isArray(myTodayAppointments) ? myTodayAppointments : []
    ).filter((apt) => apt && isTransportCompleted(apt));
  }, [myTodayAppointments]);

  const handleCloseCompletedModal = () => {
    setShowCompletedModal(false);
  };

  return (
    <PageLayout>
      {/* OPTIMIZED: Simplified loading indicator */}
      <MinimalLoadingIndicator
        show={loading}
        hasData={hasData}
        position="top-right"
        size="small"
        variant="subtle"
        tooltip={
          hasData ? "Refreshing appointments..." : "Loading appointments..."
        }
        pulse={true}
        fadeIn={true}
      />
      <div className="therapist-dashboard">
        <LayoutRow
          title={`${greeting}, ${userName}!`}
          subtitle={<>Today is {systemTime}</>}
        >
          <div className="action-buttons">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>
        {/* OPTIMIZED: Simplified error handling */}
        {error && !hasData && (
          <div className="error-message">
            <div>
              {typeof error === "object"
                ? error.message || error.error || "An error occurred"
                : error}
            </div>
            <button
              onClick={refetch}
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

        {/* Quick Actions Navigation */}
        <div className="dashboard-quick-actions">
          <button
            className="nav-action-btn scheduling-btn"
            onClick={() => navigate("/dashboard/scheduling")}
            title="Go to full scheduling interface"
          >
            📅 Full Scheduling
          </button>
          <button
            className="nav-action-btn attendance-btn"
            onClick={() => navigate("/dashboard/attendance")}
            title="Go to attendance management"
          >
            👥 My Attendance
          </button>
        </div>

        <TabSwitcher
          tabs={[
            {
              id: "today",
              label: "Today's Appointments",
              count: todayPendingAppointments.length,
            },
            {
              id: "upcoming",
              label: "Upcoming Appointments",
              count: Array.isArray(myUpcomingAppointments)
                ? myUpcomingAppointments.filter(
                    (apt) => apt && !isTransportCompleted(apt)
                  ).length
                : 0,
            },
            {
              id: "all",
              label: "All My Appointments",
              count: Array.isArray(myAppointments) ? myAppointments.length : 0,
            },
          ]}
          activeTab={currentView}
          onTabChange={setView}
        />
        <div className="dashboard-content">
          {currentView === "today" && (
            <div className="todays-appointments">
              <div className="section-header">
                <h2>Today's Appointments (Pending)</h2>
                {todayCompletedAppointments.length > 0 && (
                  <button
                    className="view-completed-btn"
                    onClick={() => setShowCompletedModal(true)}
                  >
                    View Completed ({todayCompletedAppointments.length})
                  </button>
                )}
              </div>
              {renderAppointmentsList(todayPendingAppointments)}
            </div>
          )}
          {currentView === "upcoming" && (
            <div className="upcoming-appointments">
              <h2>Upcoming Appointments</h2>
              {renderAppointmentsList(
                (Array.isArray(myUpcomingAppointments)
                  ? myUpcomingAppointments
                  : []
                ).filter((apt) => apt && !isTransportCompleted(apt))
              )}
            </div>
          )}
          {currentView === "all" && (
            <div className="all-appointments">
              <h2>All My Appointments</h2>
              {renderAppointmentsList(
                Array.isArray(myAppointments) ? myAppointments : []
              )}
            </div>
          )}
        </div>
        <WebSocketStatus />

        {/* Completed Appointments Modal */}
        {/* Completed Appointments Modal */}
        {showCompletedModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              className="modal"
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "0",
                maxWidth: "90vw",
                maxHeight: "80vh",
                overflow: "hidden",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}
                >
                  Today's Completed Appointments
                </h2>
                <button
                  className="close-btn"
                  onClick={handleCloseCompletedModal}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MdClose size={20} />
                </button>
              </div>
              <div
                className="modal-content"
                style={{
                  padding: "1.5rem",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
              >
                {renderAppointmentsList(todayCompletedAppointments)}
              </div>
            </div>
          </div>
        )}

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

export default TherapistDashboard;
