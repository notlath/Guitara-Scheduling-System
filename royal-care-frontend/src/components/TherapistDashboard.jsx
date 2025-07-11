import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
// Enhanced Redux hooks for automatic TanStack Query cache invalidation
import { useEnhancedTherapistActions } from "../hooks/useEnhancedRedux";
// TANSTACK QUERY: Replace optimized hooks with TanStack Query
// Cache invalidation utility
import { invalidateAppointmentCaches } from "../utils/cacheInvalidation";
// Import the new instant updates hook
import { useTherapistInstantActions } from "../hooks/useInstantUpdates";
// Import shared Philippine time and greeting hook
import { usePhilippineTime } from "../hooks/usePhilippineTime";
// TanStack Query hooks for data management (for upstream features)
import { useTherapistDashboardData } from "../hooks/useDashboardQueries";
// TanStack Query cache utilities for direct cache management
import { syncMutationSuccess } from "../services/realTimeSyncService";
// User utilities
import { getUserDisplayName } from "../utils/userUtils";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
// Import PostServiceMaterialModal for material status checking
import PostServiceMaterialModal from "./scheduling/PostServiceMaterialModal";
// Import logout utility
import { performLogout } from "../utils/logoutUtils";
import { profileCache } from "../utils/profileCache";

import { shallowEqual } from "react-redux";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import "../globals/TabSwitcher.css";
import { useOptimizedSelector } from "../hooks/usePerformanceOptimization";
import "../styles/DriverCoordination.css";
import "../styles/TherapistDashboard.css";
import AttendanceComponent from "./AttendanceComponent";
import RejectionModal from "./RejectionModal";
import Calendar from "./scheduling/Calendar";
import WebSocketStatus from "./scheduling/WebSocketStatus";
import StatusDropdown from "./StatusDropdown";

// API base URL configuration
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

const API_URL = `${getBaseURL()}/scheduling/`;

// Helper to get auth token
const getToken = () => localStorage.getItem("knoxToken");

// TanStack Query functions for therapist actions (combining both approaches)
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
  const queryClient = useQueryClient();

  // Enhanced Redux actions with automatic TanStack Query cache invalidation
  const {
    // Only keep the actions we're actually using
    confirmReadiness: enhancedConfirmReadiness,
    startSession: enhancedStartSession,
    completeSession: enhancedCompleteSession,
    requestPickup: enhancedRequestPickup,
  } = useEnhancedTherapistActions();

  // ✅ NEW: Instant updates for immediate UI feedback
  const {
    acceptAppointment: instantAcceptAppointment,
    rejectAppointment: instantRejectAppointment,
    // Remove unused actions
  } = useTherapistInstantActions();
  // Remove the sync event handlers - TanStack Query handles real-time updates automatically

  // Get user from Redux state
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

  // Get user display name consistently (using the same pattern as other dashboards)
  const userName = getUserDisplayName(user, "Therapist");

  // Use shared Philippine time and greeting hook
  const { systemTime, greeting } = usePhilippineTime();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  // Get view from URL params, default to 'today'
  const currentView = searchParams.get("view") || "today";

  // Helper function to update view in URL
  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });

  // Material status modal state for post-service material checking
  const [materialModal, setMaterialModal] = useState({
    isOpen: false,
    appointmentId: null,
    materials: [],
    isSubmitting: false,
  });

  // 🔍 DEBUG: Log material modal state changes
  console.log("🔍 MODAL STATE:", materialModal);

  // Loading states for individual button actions
  const [buttonLoading, setButtonLoading] = useState({});

  // Helper function to set loading state for specific action
  const setActionLoading = (actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  };
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

  // ✅ SIMPLIFIED: Use standardized WebSocket cache sync like DriverDashboard
  // This replaces the complex manual WebSocket listener setup with the standardized approach
  // that automatically handles cache invalidation across all dashboards

  // ✅ DEBUG: Log the data received ONLY when data changes
  useEffect(() => {
    console.log("🔍 TherapistDashboard data changed:", {
      dataLength: myAppointments?.length,
      timestamp: new Date().toLocaleTimeString(),
      isLoading: loading,
      appointmentIds: myAppointments?.map((apt) => apt.id),
      appointmentStatuses: myAppointments?.map((apt) => ({
        id: apt.id,
        status: apt.status,
      })),
    });
  }, [myAppointments, loading]);

  // Add manual refresh function for debugging
  const manualRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered by user");
    try {
      await refetch();
      console.log("✅ Manual refresh completed");
    } catch (error) {
      console.error("❌ Manual refresh failed:", error);
    }
  }, [refetch]);

  // ✅ DEBUGGING: Add window function for manual testing
  useEffect(() => {
    window.refreshTherapistDashboard = manualRefresh;
    return () => {
      delete window.refreshTherapistDashboard;
    };
  }, [manualRefresh]);
  useEffect(() => {
    console.log("🔍 DEBUG: TherapistDashboard data state:", {
      myAppointmentsLength: myAppointments?.length || 0,
      myAppointmentsIsArray: Array.isArray(myAppointments),
      myTodayAppointments: myTodayAppointments,
      myTodayAppointmentsLength: myTodayAppointments?.length || 0,
      myUpcomingAppointments: myUpcomingAppointments,
      myUpcomingAppointmentsLength: myUpcomingAppointments?.length || 0,
      loading,
      error,
      hasData,
      userId: user?.id,
    });
  }, [
    myAppointments,
    myTodayAppointments,
    myUpcomingAppointments,
    loading,
    error,
    hasData,
    user?.id,
  ]);

  // ✅ SIMPLIFIED MUTATIONS: Use DriverDashboard pattern for simpler, more reliable updates
  const _acceptAppointmentMutation = useMutation({
    mutationFn: therapistAPI.acceptAppointment,
    onSuccess: async (backendData, appointmentId) => {
      console.log("✅ Accept appointment mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache and let TanStack Query handle the rest
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // ✅ REAL-TIME SYNC: Broadcast the change for other dashboards
      syncMutationSuccess(
        "accept_appointment",
        appointmentId,
        backendData,
        "therapist"
      );

      console.log(
        "✅ Accept appointment - cache invalidated like DriverDashboard"
      );
    },
    onError: (error) => {
      console.error("❌ Accept appointment mutation failed:", error);
    },
  });

  const _rejectAppointmentMutation = useMutation({
    mutationFn: therapistAPI.rejectAppointment,
    onSuccess: async (backendData, { appointmentId }) => {
      console.log("✅ Reject appointment mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // ✅ REAL-TIME SYNC: Broadcast the change for other dashboards
      syncMutationSuccess(
        "reject_appointment",
        appointmentId,
        backendData,
        "therapist"
      );

      console.log(
        "✅ Reject appointment - cache invalidated like DriverDashboard"
      );
    },
    onError: (error) => {
      console.error("❌ Reject appointment mutation failed:", error);
    },
  });

  const _confirmReadinessMutation = useMutation({
    mutationFn: therapistAPI.confirmReadiness,
    onSuccess: async (backendData, appointmentId) => {
      console.log("✅ Confirm readiness mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // ✅ REAL-TIME SYNC: Broadcast the change for other dashboards
      syncMutationSuccess(
        "confirm_readiness",
        appointmentId,
        backendData,
        "therapist"
      );

      console.log(
        "✅ Confirm readiness - cache invalidated like DriverDashboard"
      );
    },
    onError: (error) => {
      console.error("❌ Confirm readiness mutation failed:", error);
    },
  });

  const _startSessionMutation = useMutation({
    mutationFn: therapistAPI.startSession,
    onSuccess: async (backendData, appointmentId) => {
      console.log("✅ Start session mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // ✅ REAL-TIME SYNC: Broadcast the change for other dashboards
      const updateData = {
        status: "session_in_progress",
        session_started_at: new Date().toISOString(),
        started_by: user?.id,
        ...(backendData?.appointment || {}),
      };

      syncMutationSuccess(
        "start_session",
        appointmentId,
        updateData,
        "therapist"
      );

      console.log("✅ Start session - cache invalidated like DriverDashboard");
    },
    onError: (error) => {
      console.error("❌ Start session mutation failed:", error);
    },
  });

  const requestPaymentMutation = useMutation({
    mutationFn: therapistAPI.requestPayment,
    onSuccess: async () => {
      console.log("✅ Request payment mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      console.log(
        "✅ Request payment - cache invalidated like DriverDashboard"
      );
    },
    onError: (error) => {
      console.error("❌ Request payment mutation failed:", error);
    },
  });

  const _completeSessionMutation = useMutation({
    mutationFn: therapistAPI.completeSession,
    onSuccess: async () => {
      console.log("✅ Complete session mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      console.log(
        "✅ Complete session - cache invalidated like DriverDashboard"
      );
    },
    onError: (error) => {
      console.error("❌ Complete session mutation failed:", error);
    },
  });

  const _requestPickupMutation = useMutation({
    mutationFn: therapistAPI.requestPickup,
    onSuccess: async (backendData, { appointmentId }) => {
      console.log("✅ Request pickup mutation successful");

      // ✅ SIMPLIFIED: Use DriverDashboard pattern - just invalidate cache
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active",
      });

      // ✅ REAL-TIME SYNC: Broadcast the change for other dashboards
      syncMutationSuccess(
        "request_pickup",
        appointmentId,
        backendData,
        "therapist"
      );

      console.log("✅ Request pickup - cache invalidated like DriverDashboard");
    },
    onError: (error) => {
      console.error("❌ Request pickup mutation failed:", error);
    },
  });

  // Modal helper functions
  const _openRejectionModal = ({ appointmentId }) => {
    setRejectionModal({
      isOpen: true,
      appointmentId,
    });
  };

  const _closeRejectionModal = () => {
    setRejectionModal({
      isOpen: false,
      appointmentId: null,
    });
  };

  const _openMaterialModal = ({ appointmentId, materials, isSubmitting }) => {
    // 🚨 GUARD: Prevent material modal from opening during session_in_progress
    const appointment = myAppointments?.find((apt) => apt.id === appointmentId);
    if (appointment && appointment.status === "session_in_progress") {
      console.warn(
        "🚨 BLOCKED: Material modal opening attempted during session_in_progress status"
      );
      alert(
        "Material check is not available during session. Please request payment first."
      );
      return;
    }

    // Additional safeguard: Only allow for payment_verified or completed status
    if (
      appointment &&
      appointment.status !== "payment_verified" &&
      appointment.status !== "completed"
    ) {
      console.warn(
        `🚨 BLOCKED: Material modal opening attempted for status: ${appointment.status}`
      );
      alert(
        `Material check is only available after payment verification. Current status: ${appointment.status}`
      );
      return;
    }

    setMaterialModal({
      isOpen: true,
      appointmentId,
      materials,
      isSubmitting,
    });
  };

  const _closeMaterialModal = () => {
    setMaterialModal({
      isOpen: false,
      appointmentId: null,
      materials: [],
      isSubmitting: false,
    });
  };

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

  const handleLogout = async () => {
    await performLogout(dispatch, navigate, queryClient, profileCache, logout);
  };

  // Handle appointment status changes with INSTANT UPDATES (immediate UI feedback)
  const handleAcceptAppointment = async (appointmentId) => {
    const actionKey = `accept_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);

      // ✅ INSTANT UPDATE: Uses optimistic updates for immediate UI feedback
      // This replaces the old approach and provides instant updates across all dashboards
      await instantAcceptAppointment(appointmentId, (loading) =>
        setActionLoading(actionKey, loading)
      );
    } catch (error) {
      // Error handling is managed by the instant updates hook
      console.error("Accept appointment failed:", error);
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
      // ✅ INSTANT UPDATE: Uses optimistic updates for immediate UI feedback
      await instantRejectAppointment(appointmentId, cleanReason);
      setRejectionModal({ isOpen: false, appointmentId: null });
    } catch (error) {
      // Error handling is managed by the instant updates hook
      console.error("Reject appointment failed:", error);
      setRejectionModal({ isOpen: false, appointmentId: null });
    }
  };

  // Enhanced workflow handlers for new service flow
  const handleTherapistConfirm = async (appointmentId) => {
    const actionKey = `confirm_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);
      await enhancedConfirmReadiness(appointmentId);

      // ✅ FIXED: Ensure TanStack Query cache is invalidated after Redux mutation
      await Promise.all([
        refetch(),
        invalidateAppointmentCaches(queryClient, {
          userId: user?.id,
          userRole: "therapist",
          appointmentId,
        }),
      ]);
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
      await enhancedStartSession(appointmentId);

      // ✅ FIXED: Ensure TanStack Query cache is invalidated after Redux mutation
      await Promise.all([
        refetch(),
        invalidateAppointmentCaches(queryClient, {
          userId: user?.id,
          userRole: "therapist",
          appointmentId,
        }),
      ]);
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

      console.log("🔍 PAYMENT REQUEST STARTED for appointment:", appointmentId);

      // 🚨 FIXED: Remove material modal logic from payment request
      // Material modal should only appear after payment is verified by operator
      // Simply proceed with payment request without checking materials
      await requestPaymentMutation.mutateAsync(appointmentId);
      console.log("✅ Payment request successful");

      console.log("🔍 PAYMENT REQUEST COMPLETED - Payment request successful");
    } catch (error) {
      console.error("Failed to request payment:", error);
      alert("Failed to request payment. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
      console.log("🔍 PAYMENT REQUEST COMPLETED");
    }
  };

  const handleCompleteSession = async (appointmentId) => {
    if (
      window.confirm("Complete this session? This action cannot be undone.")
    ) {
      const actionKey = `complete_session_${appointmentId}`;
      try {
        setActionLoading(actionKey, true);

        // 🚨 FIXED: Materials should have been checked during payment_verified status
        // At this point (payment_completed), we can proceed directly to complete the session
        console.log(
          "🔍 SESSION COMPLETION - Proceeding to complete session (materials already checked during payment verification)"
        );

        // Complete the session directly
        await enhancedCompleteSession(appointmentId);

        // ✅ FIXED: Ensure TanStack Query cache is invalidated after Redux mutation
        await Promise.all([
          refetch(),
          invalidateAppointmentCaches(queryClient, {
            userId: user?.id,
            userRole: "therapist",
            appointmentId,
          }),
        ]);

        console.log("✅ Session completed successfully");
      } catch (error) {
        console.error("Failed to complete session:", error);
        alert("Failed to complete session. Please try again.");
      } finally {
        setActionLoading(actionKey, false);
      }
    }
  };

  // ✅ NEW: Handle materials check for payment_verified appointments
  const handleMaterialsCheck = async (appointmentId) => {
    const actionKey = `materials_check_${appointmentId}`;
    setActionLoading(actionKey, true);

    try {
      // Find the appointment to get its materials
      const appointment = myAppointments.find(
        (apt) => apt.id === appointmentId
      );

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      // 🚨 GUARD: Prevent material modal from opening during session_in_progress
      // Material check should only happen after payment is verified by operator
      if (appointment.status === "session_in_progress") {
        console.warn(
          "🚨 BLOCKED: Material check attempted during session_in_progress status"
        );
        alert(
          "Material check is not available during session. Please request payment first."
        );
        return;
      }

      // Additional check: Only allow material check for payment_verified or completed status
      if (
        appointment.status !== "payment_verified" &&
        appointment.status !== "completed"
      ) {
        console.warn(
          `🚨 BLOCKED: Material check attempted for status: ${appointment.status}`
        );
        alert(
          `Material check is only available after payment verification. Current status: ${appointment.status}`
        );
        return;
      }

      console.log("🔍 MATERIALS CHECK - Found appointment:", appointment);
      console.log(
        "🔍 MATERIALS CHECK - Material usage summary:",
        appointment.material_usage_summary
      );

      // Use material_usage_summary as the primary source since appointment_materials may be missing
      const materialSummary = appointment?.material_usage_summary;
      const hasMaterials =
        materialSummary &&
        (materialSummary.consumable_materials?.length > 0 ||
          materialSummary.reusable_materials?.length > 0);

      if (!hasMaterials) {
        // No materials to check, proceed directly to completion
        console.log("🔍 No materials found, proceeding to complete session");
        alert("No materials to check. Session will be marked as completed.");

        // ✅ FIXED: Use the existing /complete/ endpoint instead of non-existent check_materials_status
        const API_BASE_URL = import.meta.env.PROD
          ? "https://charismatic-appreciation-production.up.railway.app/api"
          : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

        const token =
          localStorage.getItem("knoxToken") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/scheduling/appointments/${appointmentId}/complete/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({
              materials_checked: true,
              materials_are_empty: false, // No materials to check
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to complete materials check"
          );
        }

        // 🆕 IMPORTANT: Mark materials as checked in localStorage for appointments with no materials too
        const storageKey = `materials_checked_${appointmentId}`;
        localStorage.setItem(storageKey, "true");
        console.log(
          `✅ Marked materials as checked for appointment ${appointmentId} in localStorage (no materials case)`
        );

        // Refresh appointment data
        await refetch();
        return;
      }

      // Convert material_usage_summary format to the format expected by PostServiceMaterialModal
      const allMaterials = [
        ...(materialSummary.consumable_materials || []).map((material) => ({
          id: material.id || `consumable_${material.name}`,
          name: material.name,
          category: material.category,
          quantity_used: material.quantity_used,
          unit: material.unit,
          usage_type: "consumable",
          is_reusable: false,
          deducted_at: material.deducted_at,
          returned_at: material.returned_at,
        })),
        ...(materialSummary.reusable_materials || []).map((material) => ({
          id: material.id || `reusable_${material.name}`,
          name: material.name,
          category: material.category,
          quantity_used: material.quantity_used,
          unit: material.unit,
          usage_type: "reusable",
          is_reusable: true,
          deducted_at: material.deducted_at,
          returned_at: material.returned_at,
        })),
      ];

      console.log("🔍 MATERIALS CHECK - All materials to show:", allMaterials);

      // Open the materials modal
      setMaterialModal({
        isOpen: true,
        appointmentId: appointmentId,
        materials: allMaterials,
        isSubmitting: false,
      });

      console.log("🔍 MATERIALS CHECK - Modal opened successfully");
    } catch (error) {
      console.error("Failed to prepare materials check:", error);
      alert(`Failed to prepare materials check: ${error.message}`);
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  // Material modal handlers for post-service material status checking
  const handleMaterialModalSubmit = async (materialStatus) => {
    setMaterialModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // 🚨 FINAL SAFEGUARD: Check appointment status before processing
      const appointment = myAppointments?.find(
        (apt) => apt.id === materialModal.appointmentId
      );
      if (appointment && appointment.status === "session_in_progress") {
        console.error(
          "🚨 CRITICAL ERROR: Material submit attempted during session_in_progress status"
        );
        alert(
          "Error: Material check should not be available during session. Please refresh the page."
        );
        return;
      }

      if (
        appointment &&
        appointment.status !== "payment_verified" &&
        appointment.status !== "completed"
      ) {
        console.error(
          `🚨 CRITICAL ERROR: Material submit attempted for invalid status: ${appointment.status}`
        );
        alert(
          `Error: Material check is only available after payment verification. Current status: ${appointment.status}`
        );
        return;
      }
      console.log("🔍 MATERIAL SUBMIT DEBUG:");
      console.log("🔍 materialStatus:", materialStatus);
      console.log("🔍 materialModal.materials:", materialModal.materials);

      // Get auth token properly - try multiple token keys
      const token =
        localStorage.getItem("knoxToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken");

      console.log("🔍 Auth token found:", token ? "YES" : "NO");
      console.log(
        "🔍 Token preview:",
        token ? token.substring(0, 10) + "..." : "NONE"
      );

      const API_BASE_URL = import.meta.env.PROD
        ? "https://charismatic-appreciation-production.up.railway.app/api"
        : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

      console.log("🔍 API_BASE_URL:", API_BASE_URL);

      // ✅ FIXED: Use the existing /complete/ endpoint instead of non-existent check_materials_status
      // Determine if any materials are marked as empty
      const anyMaterialsEmpty = Object.values(materialStatus).some(
        (isEmpty) => isEmpty === true
      );

      console.log("🔍 Any materials empty:", anyMaterialsEmpty);
      console.log("🔍 Appointment ID:", materialModal.appointmentId);

      const url = `${API_BASE_URL}/scheduling/appointments/${materialModal.appointmentId}/complete/`;
      console.log("🔍 Request URL:", url);

      const requestBody = {
        materials_are_empty: anyMaterialsEmpty,
        materials_checked: true,
        material_status: materialStatus,
      };
      console.log("🔍 Request body:", requestBody);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("🔍 Response status:", response.status);
      console.log("🔍 Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🔍 Error response:", errorData);
        throw new Error(
          errorData.error || `Failed to complete materials check`
        );
      }

      const responseData = await response.json();
      console.log("✅ Materials check completed:", responseData);

      // 🆕 IMPORTANT: Mark materials as checked in localStorage for this appointment
      const storageKey = `materials_checked_${materialModal.appointmentId}`;
      localStorage.setItem(storageKey, "true");
      console.log(
        `✅ Marked materials as checked for appointment ${materialModal.appointmentId} in localStorage`
      );

      // Close modal and refresh data
      setMaterialModal({
        isOpen: false,
        appointmentId: null,
        materials: [],
        isSubmitting: false,
      });

      const statusMessage = anyMaterialsEmpty
        ? "Materials marked as empty and moved to Empty column. Session completed!"
        : "Materials returned to stock. Session completed!";

      alert(statusMessage);

      // Refresh appointment data to show updated status
      await refetch();
    } catch (error) {
      console.error("Failed to complete materials check:", error);
      alert(`Failed to complete materials check: ${error.message}`);
    } finally {
      setMaterialModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleMaterialModalClose = () => {
    setMaterialModal({
      isOpen: false,
      appointmentId: null,
      materials: [],
      isSubmitting: false,
    });
  };

  const handleRequestPickupNew = async (appointmentId, urgency = "normal") => {
    const actionKey = `request_pickup_${appointmentId}_${urgency}`;
    try {
      setActionLoading(actionKey, true);
      await enhancedRequestPickup(appointmentId, urgency);

      // ✅ FIXED: Ensure TanStack Query cache is invalidated after Redux mutation
      await Promise.all([
        refetch(),
        invalidateAppointmentCaches(queryClient, {
          userId: user?.id,
          userRole: "therapist",
          appointmentId,
        }),
      ]);

      alert(
        urgency === "urgent"
          ? "Urgent pickup request sent!"
          : "Pickup request sent!"
      );
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

  const _getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-pending";
      case "confirmed":
        return "status-confirmed";
      case "therapist_confirmed":
        return "status-therapist-confirmed";
      case "driver_confirmed":
        return "status-driver-confirmed";
      case "journey_started":
        return "status-journey-started";
      case "arrived":
        return "status-arrived";
      case "dropped_off":
        return "status-dropped-off";
      case "session_started":
        return "status-session-started";
      case "payment_requested":
        return "status-payment-requested";
      case "payment_completed":
        return "status-payment-completed";
      case "pickup_requested":
        return "status-pickup-requested";
      case "in_progress":
        return "status-in-progress";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "";
    }
  };

  // Helper function to display user-friendly status text
  const _getStatusDisplayText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "therapist_confirmed":
        return "Confirmed by Therapist";
      case "driver_confirmed":
        return "Driver Assigned";
      case "journey_started":
        return "En Route";
      case "arrived":
        return "Driver Arrived";
      case "dropped_off":
        return "Ready to Start";
      case "session_in_progress":
        return "Session in Progress";
      case "awaiting_payment":
        return "Awaiting Payment";
      case "payment_verified":
        return "Payment Verified";
      case "payment_completed":
        return "Payment Completed";
      case "pickup_requested":
        return "Pickup Requested";
      case "transport_completed":
        return "Transport Completed";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return (
          status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
        );
    }
  };
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

    // 🚨 CRITICAL DEBUG: Log every appointment status being rendered
    console.log(
      `🚨 THERAPIST DASHBOARD - Rendering appointment ${id} with status: "${status}"`
    );
    console.log(`🚨 Full appointment object:`, appointment);

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
        // Both confirmed, status will change to in_progress when operator starts
        return (
          <div className="appointment-actions">
            <div className="ready-status">
              <span className="ready-badge">🚀 Ready to start</span>
              <p>
                Driver confirmed. Waiting for operator to start appointment.
              </p>
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

      case "payment_verified":
        console.log(
          `🚨 PAYMENT_VERIFIED CASE TRIGGERED for appointment ${id}!`
        );
        return (
          <div className="appointment-actions">
            <LoadingButton
              className="materials-check-button"
              onClick={() => handleMaterialsCheck(id)}
              loading={buttonLoading[`materials_check_${id}`]}
              loadingText="Checking Materials..."
              style={{ backgroundColor: "#4CAF50", marginRight: "10px" }}
            >
              Check Materials
            </LoadingButton>
            <div className="payment-info">
              <p>✅ Payment verified! Please check materials status.</p>
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

      case "completed": {
        // 🎯 NEW LOGIC: Check if materials have been verified first
        // Use material_usage_summary as the primary source since appointment_materials may be missing
        const materialSummary = appointment?.material_usage_summary;
        const hasMaterials =
          materialSummary &&
          (materialSummary.consumable_materials?.length > 0 ||
            materialSummary.reusable_materials?.length > 0);

        // 🚀 IMPROVED: Check multiple ways to determine if materials were already checked
        // 1. Check if there's a materials_checked timestamp/field
        // 2. Check if status was recently changed from payment_verified to completed (indicating materials were checked)
        // 3. For now, use localStorage to track if we've checked materials for this appointment (temporary solution)
        const storageKey = `materials_checked_${appointment.id}`;
        const materialsAlreadyChecked =
          localStorage.getItem(storageKey) === "true" ||
          appointment?.materials_checked === true ||
          appointment?.materials_verified === true ||
          appointment?.materials_status === "checked";

        console.log(`🔍 COMPLETED CASE - Appointment ${appointment.id}:`, {
          hasMaterials,
          materialsAlreadyChecked,
          storageKey,
          storageValue: localStorage.getItem(storageKey),
          appointmentMaterials: materialSummary,
          materialUsageSummary: appointment?.material_usage_summary,
          appointmentFields: {
            materials_checked: appointment?.materials_checked,
            materials_verified: appointment?.materials_verified,
            materials_status: appointment?.materials_status,
          },
        });

        // 🆕 STEP 1: If has materials and not checked yet, show material check button
        if (hasMaterials && !materialsAlreadyChecked) {
          return (
            <div className="appointment-actions">
              <div
                className="material-check-required"
                style={{
                  backgroundColor: "#fff3cd",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", color: "#856404" }}>
                  📋 Material Check Required
                </h4>
                <p style={{ margin: "0 0 15px 0", color: "#856404" }}>
                  Payment verified! Please check the status of materials used in
                  this session before requesting pickup.
                </p>
                <LoadingButton
                  className="materials-check-button"
                  onClick={() => handleMaterialsCheck(appointment.id)}
                  loading={buttonLoading[`materials_check_${appointment.id}`]}
                  loadingText="Checking Materials..."
                  style={{ backgroundColor: "#4CAF50", color: "white" }}
                >
                  ✅ Check Materials Status
                </LoadingButton>
              </div>
            </div>
          );
        }

        // 🆕 STEP 2: If no materials OR materials already checked, show pickup options
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
                <StatusDropdown
                  appointment={appointment}
                  currentStatus={appointment.status}
                  isOperator={false}
                  disabled={true}
                />
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

        <TabSwitcher
          tabs={[
            {
              id: "today",
              label: "Today's Appointments",
              count: Array.isArray(myTodayAppointments)
                ? myTodayAppointments.filter(
                    (apt) => apt && !isTransportCompleted(apt)
                  ).length
                : 0,
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
            {
              id: "attendance",
              label: "My Attendance",
              count: undefined,
            },
          ]}
          activeTab={currentView}
          onTabChange={setView}
        />

        <div className="dashboard-content">
          {currentView === "today" && (
            <div className="todays-appointments">
              <h2>Today's Appointments</h2>
              {renderAppointmentsList(
                (Array.isArray(myTodayAppointments)
                  ? myTodayAppointments
                  : []
                ).filter((apt) => apt && !isTransportCompleted(apt))
              )}
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
          {currentView === "attendance" && (
            <div className="attendance-view">
              <AttendanceComponent />
            </div>
          )}
          {currentView === "calendar" && (
            <div className="calendar-view">
              <h2>Calendar View</h2>
              <Calendar
                showClientLabels={true}
                context="therapist"
                onDateSelected={() => {}}
                onTimeSelected={() => {}}
              />
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
        {/* Post-Service Material Modal */}
        <PostServiceMaterialModal
          isOpen={materialModal.isOpen}
          onClose={handleMaterialModalClose}
          onSubmit={handleMaterialModalSubmit}
          materials={materialModal.materials}
          appointmentId={materialModal.appointmentId}
          loading={materialModal.isSubmitting}
        />
      </div>
    </PageLayout>
  );
};

export default TherapistDashboard;
