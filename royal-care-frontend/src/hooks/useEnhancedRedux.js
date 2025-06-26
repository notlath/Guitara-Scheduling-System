/**
 * Enhanced Redux Action Wrapper with TanStack Query Integration
 * 
 * This wrapper automatically invalidates TanStack Query cache after Redux mutations,
 * solving the cache coherence issue between Redux and TanStack Query.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { invalidateAppointmentCaches, optimisticUpdate, rollbackOptimisticUpdate } from './cacheInvalidation';

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
  const user = useSelector(state => state.auth.user);

  return useCallback(async (reduxAction, options = {}) => {
    const {
      optimistic = null,
      appointmentId = null,
      userRole = user?.role,
      userId = user?.id,
      invalidateAll = false,
      skipCache = false
    } = options;

    let backupData = null;

    try {
      // Apply optimistic update if provided
      if (optimistic && appointmentId) {
        // Backup current data for rollback
        backupData = {
          [JSON.stringify(['appointments', 'list'])]: queryClient.getQueryData(['appointments', 'list']),
          [JSON.stringify(['appointments', 'today'])]: queryClient.getQueryData(['appointments', 'today']),
          [JSON.stringify(['appointments', 'upcoming'])]: queryClient.getQueryData(['appointments', 'upcoming'])
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
          invalidateAll
        });
      }

      return result;

    } catch (error) {
      // Rollback optimistic update on error
      if (backupData) {
        rollbackOptimisticUpdate(queryClient, backupData);
      }

      console.error('Enhanced dispatch failed:', error);
      throw error;
    }
  }, [dispatch, queryClient, user]);
};

/**
 * Specific enhanced action hooks for common appointment mutations
 */

export const useEnhancedTherapistActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector(state => state.auth.user);

  const acceptAppointment = useCallback(async (appointmentId) => {
    const { therapistConfirm } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(therapistConfirm(appointmentId), {
      optimistic: { 
        status: 'therapist_confirmed',
        therapist_accepted: true,
        therapist_accepted_at: new Date().toISOString()
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const rejectAppointment = useCallback(async (appointmentId, rejectionReason) => {
    const { rejectAppointment } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(rejectAppointment({ id: appointmentId, rejectionReason }), {
      optimistic: { 
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by: user?.id
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const confirmReadiness = useCallback(async (appointmentId) => {
    const { therapistConfirm } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(therapistConfirm(appointmentId), {
      optimistic: { 
        status: 'therapist_confirmed'
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const startSession = useCallback(async (appointmentId) => {
    const { startSession } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(startSession(appointmentId), {
      optimistic: { 
        status: 'in_progress',
        started_at: new Date().toISOString()
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const completeSession = useCallback(async (appointmentId) => {
    const { completeAppointment } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(completeAppointment(appointmentId), {
      optimistic: { 
        status: 'awaiting_payment'
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const requestPickup = useCallback(async (appointmentId, urgency = 'normal') => {
    const { requestPickup } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(requestPickup({
      appointmentId,
      pickup_urgency: urgency,
      pickup_notes: urgency === 'urgent' 
        ? 'Urgent pickup requested by therapist'
        : 'Pickup requested by therapist'
    }), {
      optimistic: { 
        status: 'pickup_requested',
        pickup_urgency: urgency
      },
      appointmentId,
      userRole: 'therapist',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  return {
    acceptAppointment,
    rejectAppointment,
    confirmReadiness,
    startSession,
    completeSession,
    requestPickup
  };
};

export const useEnhancedDriverActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector(state => state.auth.user);

  const confirmAppointment = useCallback(async (appointmentId) => {
    const { driverConfirm } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(driverConfirm(appointmentId), {
      optimistic: { 
        status: 'driver_confirmed',
        driver_accepted: true,
        driver_accepted_at: new Date().toISOString()
      },
      appointmentId,
      userRole: 'driver',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const confirmPickup = useCallback(async (appointmentId) => {
    const { confirmPickup } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(confirmPickup(appointmentId), {
      appointmentId,
      userRole: 'driver',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const startJourney = useCallback(async (appointmentId) => {
    const { startJourney } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(startJourney(appointmentId), {
      optimistic: { 
        status: 'journey'
      },
      appointmentId,
      userRole: 'driver',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const completeReturnJourney = useCallback(async (appointmentId) => {
    const { completeReturnJourney } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(completeReturnJourney(appointmentId), {
      optimistic: { 
        status: 'transport_completed'
      },
      appointmentId,
      userRole: 'driver',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  return {
    confirmAppointment,
    confirmPickup,
    startJourney,
    completeReturnJourney
  };
};

export const useEnhancedOperatorActions = () => {
  const enhancedDispatch = useEnhancedDispatch();
  const user = useSelector(state => state.auth.user);

  const startAppointment = useCallback(async (appointmentId) => {
    const { startSession } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(startSession(appointmentId), {
      optimistic: { 
        status: 'in_progress',
        started_at: new Date().toISOString()
      },
      appointmentId,
      userRole: 'operator',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const cancelAppointment = useCallback(async (appointmentId, reason) => {
    const { cancelAppointment } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(cancelAppointment({ id: appointmentId, reason }), {
      optimistic: { 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      },
      appointmentId,
      userRole: 'operator',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const verifyPayment = useCallback(async (appointmentId, paymentData) => {
    const { markAppointmentPaid } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(markAppointmentPaid({ appointmentId, paymentData }), {
      optimistic: { 
        status: 'completed',
        payment_verified: true,
        payment_verified_at: new Date().toISOString()
      },
      appointmentId,
      userRole: 'operator',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const reviewRejection = useCallback(async (id, reviewDecision, reviewNotes) => {
    const { reviewRejection } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(reviewRejection({ id, reviewDecision, reviewNotes }), {
      optimistic: { 
        status: reviewDecision === 'accept' ? 'cancelled' : 'pending',
        review_completed: true,
        review_completed_at: new Date().toISOString()
      },
      appointmentId: id,
      userRole: 'operator',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  const autoCancelOverdue = useCallback(async () => {
    const { autoCancelOverdueAppointments } = await import('../features/scheduling/schedulingSlice');
    
    return enhancedDispatch(autoCancelOverdueAppointments(), {
      invalidateAll: true, // This affects multiple appointments
      userRole: 'operator',
      userId: user?.id
    });
  }, [enhancedDispatch, user]);

  return {
    startAppointment,
    cancelAppointment,
    verifyPayment,
    reviewRejection,
    autoCancelOverdue
  };
};

/**
 * Backward compatibility hook for existing code
 * Gradually replace existing dispatch calls with this
 */
export const useDispatchWithCache = () => {
  const enhancedDispatch = useEnhancedDispatch();
  
  return useCallback((action, cacheOptions = {}) => {
    return enhancedDispatch(action, cacheOptions);
  }, [enhancedDispatch]);
};

export default {
  useEnhancedDispatch,
  useEnhancedTherapistActions,
  useEnhancedDriverActions,
  useEnhancedOperatorActions,
  useDispatchWithCache
};
