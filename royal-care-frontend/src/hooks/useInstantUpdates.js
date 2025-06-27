/**
 * Instant Updates Hook - Ultimate Solution for Real-time UI Updates
 *
 * This hook provides the most robust approach for instant updates across
 * TherapistDashboard, DriverDashboard, and OperatorDashboard.
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation across all dashboards
 * - Error rollback with user-friendly messages
 * - WebSocket integration for cross-tab synchronization
 * - Consistent loading states
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { invalidateAppointmentCaches } from "../utils/cacheInvalidation";

/**
 * Optimistic update helper - immediately updates UI
 */
const applyOptimisticUpdate = (queryClient, appointmentId, updates) => {
  const appointmentQueryKeys = [
    ["appointments"],
    ["appointments", "list"],
    ["appointments", "today"],
    ["appointments", "upcoming"],
    ["appointments", "therapist"],
    ["appointments", "driver"],
    ["appointments", "operator"],
  ];

  appointmentQueryKeys.forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, (oldData) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, ...updates }
          : appointment
      );
    });
  });
};

/**
 * Rollback optimistic updates on error
 */
const rollbackOptimisticUpdate = async (queryClient) => {
  // Simply refetch all appointment data to restore correct state
  await queryClient.invalidateQueries({ queryKey: ["appointments"] });
};

/**
 * Main hook for instant updates
 */
export const useInstantUpdates = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);

  /**
   * Generic instant update function
   */
  const performInstantUpdate = useCallback(
    async ({
      appointmentId,
      reduxAction,
      optimisticUpdate,
      errorMessage = "Operation failed. Please try again.",
      onSuccess = null,
      onError = null,
    }) => {
      let backendSuccess = false;
      let backendResult = null;

      try {
        // 1. INSTANT UI UPDATE - User sees change immediately
        if (optimisticUpdate) {
          applyOptimisticUpdate(queryClient, appointmentId, optimisticUpdate);
        }

        // 2. BACKEND UPDATE - Process the actual change
        backendResult = await dispatch(reduxAction).unwrap();
        backendSuccess = true;

        // 3. CACHE INVALIDATION - Ensure all dashboards are synced
        try {
          await invalidateAppointmentCaches(queryClient, {
            userId: user?.id,
            userRole: user?.role,
            appointmentId,
            invalidateAll: true, // Updates all dashboards instantly
          });
        } catch (cacheError) {
          console.warn(
            "Cache invalidation failed, but backend operation succeeded:",
            cacheError
          );
          // Don't throw here - the backend operation was successful
        }

        // 4. SUCCESS CALLBACK
        if (onSuccess) {
          onSuccess(backendResult);
        }

        return backendResult;
      } catch (error) {
        // 5. ERROR HANDLING - Only rollback if backend operation failed
        if (!backendSuccess && optimisticUpdate) {
          await rollbackOptimisticUpdate(queryClient);
        }

        const userFriendlyMessage =
          error?.message?.includes("401") ||
          error?.message?.includes("Authentication")
            ? "Session expired. Please refresh the page and log in again."
            : errorMessage;

        if (onError) {
          onError(error, userFriendlyMessage);
        } else {
          // Only show alert if backend operation actually failed
          if (!backendSuccess) {
            alert(userFriendlyMessage);
          }
        }

        // Only throw if backend operation failed
        if (!backendSuccess) {
          throw error;
        }

        // If backend succeeded but cache failed, return the successful result
        return backendResult;
      }
    },
    [dispatch, queryClient, user]
  );

  return { performInstantUpdate };
};

/**
 * Specific hooks for each dashboard action
 */

// Therapist Dashboard Actions
export const useTherapistInstantActions = () => {
  const { performInstantUpdate } = useInstantUpdates();

  const acceptAppointment = useCallback(
    async (appointmentId, setLoading) => {
      const { therapistConfirm } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: therapistConfirm(appointmentId),
        optimisticUpdate: {
          status: "therapist_confirmed",
          therapist_accepted: true,
          therapist_accepted_at: new Date().toISOString(),
        },
        errorMessage: "Failed to accept appointment. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  const rejectAppointment = useCallback(
    async (appointmentId, rejectionReason, setLoading) => {
      const { rejectAppointment } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: rejectAppointment({ appointmentId, rejectionReason }),
        optimisticUpdate: {
          status: "rejected",
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
        },
        errorMessage: "Failed to reject appointment. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  const requestPickup = useCallback(
    async (appointmentId, setLoading) => {
      const { requestPickup } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: requestPickup(appointmentId),
        optimisticUpdate: {
          status: "pickup_requested",
          pickup_requested_at: new Date().toISOString(),
        },
        errorMessage: "Failed to request pickup. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  return {
    acceptAppointment,
    rejectAppointment,
    requestPickup,
  };
};

// Driver Dashboard Actions
export const useDriverInstantActions = () => {
  const { performInstantUpdate } = useInstantUpdates();

  const confirmPickup = useCallback(
    async (appointmentId, setLoading) => {
      const { confirmPickup } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: confirmPickup(appointmentId),
        optimisticUpdate: {
          status: "driver_confirmed",
          driver_confirmed_at: new Date().toISOString(),
        },
        errorMessage: "Failed to confirm pickup. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  const startJourney = useCallback(
    async (appointmentId, setLoading) => {
      const { startJourney } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: startJourney(appointmentId),
        optimisticUpdate: {
          status: "journey_started",
          journey_started_at: new Date().toISOString(),
        },
        errorMessage: "Failed to start journey. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  return {
    confirmPickup,
    startJourney,
  };
};

// Operator Dashboard Actions
export const useOperatorInstantActions = () => {
  const { performInstantUpdate } = useInstantUpdates();

  const startAppointment = useCallback(
    async (appointmentId, setLoading) => {
      const { updateAppointmentStatus } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: updateAppointmentStatus({
          appointmentId,
          status: "in_progress",
        }),
        optimisticUpdate: {
          status: "in_progress",
          started_at: new Date().toISOString(),
        },
        errorMessage: "Failed to start appointment. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  const verifyPayment = useCallback(
    async (appointmentId, paymentData, setLoading) => {
      const { markAppointmentPaid } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return performInstantUpdate({
        appointmentId,
        reduxAction: markAppointmentPaid({ appointmentId, ...paymentData }),
        optimisticUpdate: {
          status: "paid",
          payment_verified_at: new Date().toISOString(),
          payment_method: paymentData.method,
        },
        errorMessage: "Failed to verify payment. Please try again.",
        onSuccess: () => setLoading?.(false),
        onError: () => setLoading?.(false),
      });
    },
    [performInstantUpdate]
  );

  return {
    startAppointment,
    verifyPayment,
  };
};

export default useInstantUpdates;
