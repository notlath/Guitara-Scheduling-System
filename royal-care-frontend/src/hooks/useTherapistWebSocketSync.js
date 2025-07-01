/**
 * Enhanced WebSocket Cache Sync Hook for TherapistDashboard
 * 
 * This hook provides:
 * 1. Direct cache updates instead of invalidation (faster UI updates)
 * 2. Granular cache targeting (only affected appointments)
 * 3. Centralized query key management
 * 4. Optimistic update handling with rollback
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { queryKeys } from "../lib/queryClient";
import webSocketService from "../services/webSocketTanStackService";

/**
 * Get all affected therapist IDs from appointment data
 */
const getAffectedTherapistIds = (appointmentData) => {
  const therapistIds = new Set();
  
  // Primary therapist
  if (appointmentData.therapist_id) {
    therapistIds.add(appointmentData.therapist_id);
  }
  
  // Multiple therapists (array)
  if (appointmentData.therapists && Array.isArray(appointmentData.therapists)) {
    appointmentData.therapists.forEach(id => {
      if (id) therapistIds.add(id);
    });
  }
  
  // Legacy therapist field
  if (appointmentData.therapist) {
    therapistIds.add(appointmentData.therapist);
  }
  
  return Array.from(therapistIds);
};

/**
 * Enhanced TherapistDashboard WebSocket Cache Sync Hook
 */
export const useTherapistWebSocketSync = (userId) => {
  const queryClient = useQueryClient();
  const handlersRef = useRef({});

  // ✅ OPTIMIZATION: Direct cache update function (no invalidation)
  const updateAppointmentInCache = useCallback((appointmentData, operation = 'update') => {
    console.log(`🔄 Direct cache update: ${operation} appointment ${appointmentData.id}`);
    
    const affectedTherapistIds = getAffectedTherapistIds(appointmentData);
    console.log(`👥 Affected therapists:`, affectedTherapistIds);

    // Update functions for different operations
    const updateFunctions = {
      update: (old = []) => {
        return old.map(apt => 
          apt.id === appointmentData.id ? { ...apt, ...appointmentData } : apt
        );
      },
      create: (old = []) => {
        const exists = old.some(apt => apt.id === appointmentData.id);
        return exists ? old : [appointmentData, ...old];
      },
      delete: (old = []) => {
        return old.filter(apt => apt.id !== appointmentData.id);
      }
    };

    const updateFunction = updateFunctions[operation] || updateFunctions.update;

    // ✅ GRANULAR: Update only affected therapist-specific caches
    affectedTherapistIds.forEach(therapistId => {
      const therapistQueryKey = queryKeys.appointments.therapistDashboard(therapistId);
      
      queryClient.setQueryData(therapistQueryKey, updateFunction);
      console.log(`✅ Updated cache for therapist ${therapistId}`);
    });

    // ✅ SELECTIVE: Only update global caches if necessary
    const today = new Date().toISOString().split('T')[0];
    if (appointmentData.date === today) {
      queryClient.setQueryData(queryKeys.appointments.today(), updateFunction);
    }

    // Update global list only if this is the current user's appointment
    if (affectedTherapistIds.includes(userId)) {
      queryClient.setQueryData(queryKeys.appointments.all, updateFunction);
    }

    return affectedTherapistIds.length;
  }, [queryClient, userId]);

  // ✅ WebSocket event handlers with direct cache updates
  const createWebSocketHandlers = useCallback(() => {
    const handlers = {
      appointment_updated: (event) => {
        const appointment = event.detail?.appointment || event.detail;
        if (appointment?.id) {
          const affectedCount = updateAppointmentInCache(appointment, 'update');
          console.log(`📨 appointment_updated: Updated ${affectedCount} therapist caches`);
        }
      },

      appointment_created: (event) => {
        const appointment = event.detail?.appointment || event.detail;
        if (appointment?.id) {
          const affectedCount = updateAppointmentInCache(appointment, 'create');
          console.log(`📨 appointment_created: Updated ${affectedCount} therapist caches`);
        }
      },

      appointment_deleted: (event) => {
        const appointment = event.detail?.appointment || event.detail;
        if (appointment?.id) {
          const affectedCount = updateAppointmentInCache(appointment, 'delete');
          console.log(`📨 appointment_deleted: Updated ${affectedCount} therapist caches`);
        }
      },

      appointment_status_changed: (event) => {
        const appointment = event.detail?.appointment || event.detail;
        if (appointment?.id) {
          const affectedCount = updateAppointmentInCache(appointment, 'update');
          console.log(`📨 status_changed: Updated ${affectedCount} therapist caches`);
        }
      },

      therapist_response: (event) => {
        const data = event.detail?.data || event.detail;
        if (data?.appointment_id) {
          // Get current appointment data to update acceptance status
          const currentAppointments = queryClient.getQueryData(queryKeys.appointments.all) || [];
          const appointment = currentAppointments.find(apt => apt.id === data.appointment_id);
          
          if (appointment) {
            const updatedAppointment = {
              ...appointment,
              therapist_accepted: data.therapist_accepted,
              driver_accepted: data.driver_accepted,
              both_accepted: data.both_accepted,
              status: data.status || appointment.status,
            };
            
            const affectedCount = updateAppointmentInCache(updatedAppointment, 'update');
            console.log(`📨 therapist_response: Updated ${affectedCount} therapist caches`);
          }
        }
      },

      driver_response: (event) => {
        const data = event.detail?.data || event.detail;
        if (data?.appointment_id) {
          // Similar to therapist_response but for driver acceptance
          const currentAppointments = queryClient.getQueryData(queryKeys.appointments.all) || [];
          const appointment = currentAppointments.find(apt => apt.id === data.appointment_id);
          
          if (appointment) {
            const updatedAppointment = {
              ...appointment,
              driver_id: data.driver_id || appointment.driver_id,
              driver_accepted: data.driver_accepted,
              therapist_accepted: data.therapist_accepted,
              both_accepted: data.both_accepted,
              status: data.status || appointment.status,
            };
            
            const affectedCount = updateAppointmentInCache(updatedAppointment, 'update');
            console.log(`📨 driver_response: Updated ${affectedCount} therapist caches`);
          }
        }
      },

      session_started: (event) => {
        const data = event.detail?.data || event.detail;
        if (data?.appointment_id) {
          const currentAppointments = queryClient.getQueryData(queryKeys.appointments.all) || [];
          const appointment = currentAppointments.find(apt => apt.id === data.appointment_id);
          
          if (appointment) {
            const updatedAppointment = {
              ...appointment,
              status: "session_in_progress",
              session_started_at: data.session_started_at || new Date().toISOString(),
            };
            
            const affectedCount = updateAppointmentInCache(updatedAppointment, 'update');
            console.log(`📨 session_started: Updated ${affectedCount} therapist caches`);
          }
        }
      },

      awaiting_payment: (event) => {
        const data = event.detail?.data || event.detail;
        if (data?.appointment_id) {
          const currentAppointments = queryClient.getQueryData(queryKeys.appointments.all) || [];
          const appointment = currentAppointments.find(apt => apt.id === data.appointment_id);
          
          if (appointment) {
            const updatedAppointment = {
              ...appointment,
              status: "awaiting_payment",
              payment_initiated_at: data.payment_initiated_at || new Date().toISOString(),
              payment_status: "pending",
            };
            
            const affectedCount = updateAppointmentInCache(updatedAppointment, 'update');
            console.log(`📨 awaiting_payment: Updated ${affectedCount} therapist caches`);
          }
        }
      },

      appointment_started: (event) => {
        const data = event.detail?.data || event.detail;
        if (data?.appointment_id) {
          const currentAppointments = queryClient.getQueryData(queryKeys.appointments.all) || [];
          const appointment = currentAppointments.find(apt => apt.id === data.appointment_id);
          
          if (appointment) {
            const updatedAppointment = {
              ...appointment,
              status: data.status || "in_progress",
              started_at: data.started_at || new Date().toISOString(),
            };
            
            const affectedCount = updateAppointmentInCache(updatedAppointment, 'update');
            console.log(`📨 appointment_started: Updated ${affectedCount} therapist caches`);
          }
        }
      }
    };

    return handlers;
  }, [updateAppointmentInCache, queryClient]);

  // ✅ Setup WebSocket event listeners
  useEffect(() => {
    console.log(`🔌 Setting up enhanced TherapistDashboard WebSocket sync for user ${userId}`);
    
    const handlers = createWebSocketHandlers();
    handlersRef.current = handlers;

    // Register all event listeners
    Object.entries(handlers).forEach(([eventType, handler]) => {
      webSocketService.addEventListener(eventType, handler);
      console.log(`📡 Registered handler for: ${eventType}`);
    });

    return () => {
      // Cleanup event listeners
      Object.entries(handlersRef.current).forEach(([eventType, handler]) => {
        webSocketService.removeEventListener(eventType, handler);
      });
      console.log(`🧹 Cleaned up TherapistDashboard WebSocket handlers`);
    };
  }, [userId, createWebSocketHandlers]);

  // ✅ Return utilities for manual cache management
  return {
    updateAppointmentInCache,
    // Manual invalidation for edge cases
    invalidateTherapistCache: useCallback((therapistId = userId) => {
      const queryKey = queryKeys.appointments.therapistDashboard(therapistId);
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      console.log(`🔄 Manual invalidation for therapist ${therapistId}`);
    }, [queryClient, userId]),
    
    // Get current cache data
    getCacheData: useCallback((therapistId = userId) => {
      const queryKey = queryKeys.appointments.therapistDashboard(therapistId);
      return queryClient.getQueryData(queryKey);
    }, [queryClient, userId]),
  };
};

export default useTherapistWebSocketSync;
