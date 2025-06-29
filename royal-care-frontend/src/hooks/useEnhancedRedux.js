/**
 * Enhanced Redux Action Wrapper with TanStack Query Integration
 *
 * This wrapper automatically invalidates TanStack Query cache after Redux mutations,
 * solving the cache coherence issue between Redux and TanStack Query.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  invalidateAppointmentCaches,
  optimisticUpdate,
  rollbackOptimisticUpdate,
} from "../utils/cacheInvalidation";

/**
 * Enhanced Redux dispatch hook that automatically invalidates TanStack Query cache
 *
 * Usage:
 * const enhancedDispatch = useEnhancedDispatch();
 * await enhancedDispatch(therapistConfirm(appointmentId), {
 *   optimistic: { status: 'therapist_confirmed' },
 *   appointmentId,
 *   userRole: 'therapist'
 * });
 */
export const useEnhancedDispatch = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.auth.user);

  return useCallback(
    async (reduxAction, options = {}) => {
      const {
        optimistic = null,
        appointmentId = null,
        userRole = user?.role,
        userId = user?.id,
        invalidateAll = false,
        skipCache = false,
      } = options;

      let backupData = null;

      try {
        // Apply optimistic update if provided
        if (optimistic && appointmentId) {
          // Backup current data for rollback
          backupData = {
            [JSON.stringify(["appointments", "list"])]:
              queryClient.getQueryData(["appointments", "list"]),
            [JSON.stringify(["appointments", "today"])]:
              queryClient.getQueryData(["appointments", "today"]),
            [JSON.stringify(["appointments", "upcoming"])]:
              queryClient.getQueryData(["appointments", "upcoming"]),
          };

          optimisticUpdate(queryClient, appointmentId, optimistic);
        }

        // Execute Redux action
        const result = await dispatch(reduxAction).unwrap();

        // Invalidate TanStack Query cache after successful Redux mutation
        if (!skipCache) {
          await invalidateAppointmentCaches(queryClient, {
            userId,
            userRole,
            appointmentId,
            invalidateAll,
          });
        }

        return result;
      } catch (error) {
        // Rollback optimistic update on error
        if (backupData) {
          rollbackOptimisticUpdate(queryClient, backupData);
        }

        console.error("Enhanced dispatch failed:", error);
        throw error;
      }
    },
    [dispatch, queryClient, user]
  );
};

/**
 * Specific enhanced action hooks for common appointment mutations
 */

export const useEnhancedTherapistActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector((state) => state.auth.user);

  const acceptAppointment = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can accept appointments");
      }

      const { therapistConfirm } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(therapistConfirm(appointmentId), {
        optimistic: {
          status: "therapist_confirmed",
          therapist_accepted: true,
          therapist_accepted_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "therapist",
        userId: user?.id,
        // Therapist acceptance affects driver and operator dashboards
        invalidateAll: true,
      });
    },
    [enhancedDispatch, user]
  );

  const rejectAppointment = useCallback(
    async (appointmentId, rejectionReason) => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can reject appointments");
      }

      const { rejectAppointment } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        rejectAppointment({ id: appointmentId, rejectionReason }),
        {
          optimistic: {
            status: "rejected",
            rejection_reason: rejectionReason,
            rejected_at: new Date().toISOString(),
            rejected_by: user?.id,
          },
          appointmentId,
          userRole: "therapist",
          userId: user?.id,
          invalidateAll: true, // Rejection affects all dashboards
        }
      );
    },
    [enhancedDispatch, user]
  );

  const confirmReadiness = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can confirm readiness");
      }

      const { therapistConfirm } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(therapistConfirm(appointmentId), {
        optimistic: {
          status: "therapist_confirmed",
          confirmed_ready_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "therapist",
        userId: user?.id,
        invalidateAll: true, // Readiness confirmation affects driver and operator dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const startSession = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized therapist for this appointment
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can start sessions");
      }

      // TODO: Add appointment ownership validation here if needed
      // This would require checking if the user is assigned to this appointment

      const { startSession } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(startSession(appointmentId), {
        optimistic: {
          status: "session_in_progress",
          session_started_at: new Date().toISOString(),
          started_by: user?.id,
        },
        appointmentId,
        userRole: "therapist",
        userId: user?.id,
        invalidateAll: true, // Session start affects all dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const completeSession = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can complete sessions");
      }

      const { completeAppointment } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(completeAppointment(appointmentId), {
        optimistic: {
          status: "awaiting_payment",
          session_completed_at: new Date().toISOString(),
          completed_by: user?.id,
        },
        appointmentId,
        userRole: "therapist",
        userId: user?.id,
        invalidateAll: true, // Session completion affects all dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const requestPickup = useCallback(
    async (appointmentId, urgency = "normal") => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can request pickups");
      }

      const { requestPickup } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        requestPickup({
          appointmentId,
          pickup_urgency: urgency,
          pickup_notes:
            urgency === "urgent"
              ? "Urgent pickup requested by therapist"
              : "Pickup requested by therapist",
        }),
        {
          optimistic: {
            status: "pickup_requested",
            pickup_urgency: urgency,
            pickup_requested_at: new Date().toISOString(),
            pickup_requested_by: user?.id,
          },
          appointmentId,
          userRole: "therapist",
          userId: user?.id,
          invalidateAll: true, // Pickup requests affect driver and operator dashboards
        }
      );
    },
    [enhancedDispatch, user]
  );

  const markPaymentRequest = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized therapist
      if (!user || user.role !== "therapist") {
        throw new Error("Only therapists can request payments");
      }

      const { requestPayment } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(requestPayment(appointmentId), {
        optimistic: {
          status: "awaiting_payment",
          payment_requested_at: new Date().toISOString(),
          payment_requested_by: user?.id,
        },
        appointmentId,
        userRole: "therapist",
        userId: user?.id,
        invalidateAll: true, // Payment requests affect operator dashboard
      });
    },
    [enhancedDispatch, user]
  );

  return {
    acceptAppointment,
    rejectAppointment,
    confirmReadiness,
    startSession,
    completeSession,
    requestPickup,
    markPaymentRequest,
  };
};

export const useEnhancedDriverActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector((state) => state.auth.user);

  const confirmAppointment = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can confirm appointments");
      }

      const { driverConfirm } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(driverConfirm(appointmentId), {
        optimistic: {
          status: "driver_confirmed",
          driver_accepted: true,
          driver_accepted_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        // Driver confirmation affects therapist and operator dashboards
        invalidateAll: true,
      });
    },
    [enhancedDispatch, user]
  );

  const confirmPickup = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can confirm pickups");
      }

      const { confirmPickup } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(confirmPickup(appointmentId), {
        optimistic: {
          pickup_confirmed: true,
          pickup_confirmed_at: new Date().toISOString(),
          pickup_confirmed_by: user.id,
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        // Pickup confirmation affects therapist dashboard
        invalidateAll: true,
      });
    },
    [enhancedDispatch, user]
  );

  const rejectPickup = useCallback(
    async (appointmentId, reason) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can reject pickups");
      }

      const { rejectPickup } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(rejectPickup({ appointmentId, reason }), {
        optimistic: {
          pickup_rejected: true,
          pickup_rejection_reason: reason,
          pickup_rejected_at: new Date().toISOString(),
          pickup_rejected_by: user.id,
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        invalidateAll: true, // Affects operator and therapist dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const startJourney = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can start journeys");
      }

      const { startJourney } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(startJourney(appointmentId), {
        optimistic: {
          status: "journey",
          journey_started_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        invalidateAll: true, // Journey status affects therapist and operator dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const arriveAtLocation = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can mark arrival");
      }

      const { markArrived } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(markArrived(appointmentId), {
        optimistic: {
          status: "arrived",
          arrived_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        invalidateAll: true, // Arrival affects therapist and operator dashboards
      });
    },
    [enhancedDispatch, user]
  );

  const dropOffTherapist = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can complete drop-offs");
      }

      const { updateAppointmentStatus } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "therapist_dropped_off",
        }),
        {
          optimistic: {
            status: "therapist_dropped_off",
            dropped_off_at: new Date().toISOString(),
            transport_completed: true,
          },
          appointmentId,
          userRole: "driver",
          userId: user?.id,
          invalidateAll: true, // Drop-off affects all dashboards
        }
      );
    },
    [enhancedDispatch, user]
  );

  const completeReturnJourney = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized driver
      if (!user || user.role !== "driver") {
        throw new Error("Only drivers can complete return journeys");
      }

      const { completeReturnJourney } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(completeReturnJourney(appointmentId), {
        optimistic: {
          status: "transport_completed",
          return_journey_completed_at: new Date().toISOString(),
        },
        appointmentId,
        userRole: "driver",
        userId: user?.id,
        invalidateAll: true, // Return journey completion affects all dashboards
      });
    },
    [enhancedDispatch, user]
  );

  return {
    confirmAppointment,
    confirmPickup,
    rejectPickup,
    startJourney,
    arriveAtLocation,
    dropOffTherapist,
    completeReturnJourney,
  };
};

export const useEnhancedOperatorActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector((state) => state.auth.user);

  const startAppointment = useCallback(
    async (appointmentId) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can start appointments");
      }

      const { updateAppointmentStatus } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        updateAppointmentStatus({ id: appointmentId, status: "in_progress" }),
        {
          optimistic: {
            status: "in_progress",
            started_at: new Date().toISOString(),
            started_by: user.id,
          },
          appointmentId,
          userRole: "operator",
          userId: user?.id,
          // Comprehensive cache invalidation for multi-role view
          invalidateAll: true, // Affects all roles/views
        }
      );
    },
    [enhancedDispatch, user]
  );

  const cancelAppointment = useCallback(
    async (appointmentId, reason) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can cancel appointments");
      }

      const { cancelAppointment } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        cancelAppointment({ id: appointmentId, reason }),
        {
          optimistic: {
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
            cancellation_reason: reason,
          },
          appointmentId,
          userRole: "operator",
          userId: user?.id,
          invalidateAll: true, // Affects all roles/views
        }
      );
    },
    [enhancedDispatch, user]
  );

  const verifyPayment = useCallback(
    async (appointmentId, paymentData) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can verify payments");
      }

      const { markAppointmentPaid } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        markAppointmentPaid({ appointmentId, paymentData }),
        {
          optimistic: {
            status: "completed",
            payment_verified: true,
            payment_verified_at: new Date().toISOString(),
            payment_verified_by: user.id,
            payment_method: paymentData.method,
            payment_amount: parseInt(paymentData.amount) || 0,
          },
          appointmentId,
          userRole: "operator",
          userId: user?.id,
          invalidateAll: true, // Payment affects all views
        }
      );
    },
    [enhancedDispatch, user]
  );

  const reviewRejection = useCallback(
    async (id, reviewDecision, reviewNotes) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can review rejections");
      }

      const { reviewRejection } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        reviewRejection({ id, reviewDecision, reviewNotes }),
        {
          optimistic: {
            status: reviewDecision === "accept" ? "cancelled" : "pending",
            review_completed: true,
            review_completed_at: new Date().toISOString(),
            reviewed_by: user.id,
            review_notes: reviewNotes,
          },
          appointmentId: id,
          userRole: "operator",
          userId: user?.id,
          invalidateAll: true, // Rejection review affects all views
        }
      );
    },
    [enhancedDispatch, user]
  );

  const autoCancelOverdue = useCallback(async () => {
    // Enhanced validation: Check if user is authorized operator
    if (!user || user.role !== "operator") {
      throw new Error("Only operators can auto-cancel overdue appointments");
    }

    const { autoCancelOverdueAppointments } = await import(
      "../features/scheduling/schedulingSlice"
    );

    return enhancedDispatch(autoCancelOverdueAppointments(), {
      invalidateAll: true, // This affects multiple appointments across all roles
      userRole: "operator",
      userId: user?.id,
    });
  }, [enhancedDispatch, user]);

  // NEW: Add missing operator actions for comprehensive coverage
  const assignDriver = useCallback(
    async (appointmentId, driverId) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can assign drivers");
      }

      const { updateAppointmentStatus } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        updateAppointmentStatus({
          id: appointmentId,
          driver: driverId,
          status: "driver_assigned",
        }),
        {
          optimistic: {
            driver: driverId,
            driver_assigned_at: new Date().toISOString(),
            assigned_by: user.id,
          },
          appointmentId,
          userRole: "operator",
          userId: user?.id,
          invalidateAll: true, // Driver assignment affects all dashboards
        }
      );
    },
    [enhancedDispatch, user]
  );

  const manualPickupAssignment = useCallback(
    async (appointmentId, driverId, therapistId, pickupData = {}) => {
      // Enhanced validation: Check if user is authorized operator
      if (!user || user.role !== "operator") {
        throw new Error("Only operators can assign pickup drivers");
      }

      const { updateAppointmentStatus } = await import(
        "../features/scheduling/schedulingSlice"
      );

      return enhancedDispatch(
        updateAppointmentStatus({
          id: appointmentId,
          status: "driver_assigned_pickup",
          pickup_driver: driverId,
          pickup_assigned_at: new Date().toISOString(),
          ...pickupData,
        }),
        {
          optimistic: {
            status: "driver_assigned_pickup",
            pickup_driver: driverId,
            pickup_assigned_at: new Date().toISOString(),
            pickup_assigned_by: user.id,
          },
          appointmentId,
          userRole: "operator",
          userId: user?.id,
          invalidateAll: true, // Pickup assignment affects therapist and driver dashboards
        }
      );
    },
    [enhancedDispatch, user]
  );

  return {
    startAppointment,
    cancelAppointment,
    verifyPayment,
    reviewRejection,
    autoCancelOverdue,
    assignDriver,
    manualPickupAssignment,
  };
};

/**
 * Backward compatibility hook for existing code
 * Gradually replace existing dispatch calls with this
 */
export const useDispatchWithCache = () => {
  const enhancedDispatch = useEnhancedDispatch();

  return useCallback(
    (action, cacheOptions = {}) => {
      return enhancedDispatch(action, cacheOptions);
    },
    [enhancedDispatch]
  );
};

export default {
  useEnhancedDispatch,
  useEnhancedTherapistActions,
  useEnhancedDriverActions,
  useEnhancedOperatorActions,
  useDispatchWithCache,
};
