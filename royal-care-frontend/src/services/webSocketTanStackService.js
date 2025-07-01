/**
 * WebSocket Service with TanStack Query Integration
 * Provides real-time updates for scheduling data with automatic cache synchronization
 */

import { useEffect, useState } from "react";
import { queryClient } from "../lib/queryClient";
import { invalidateAppointmentCaches, handleWebSocketUpdate } from "../utils/cacheInvalidation";
import { getToken } from "../utils/tokenManager";

class WebSocketTanStackService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.connectionStatus = "disconnected";
    this.eventListeners = new Map(); // Store event listeners by event type
    this.messageQueue = [];
    this.isConnecting = false;

    // Track connection across page navigation
    this.persistentConnection = true;

    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
    this.addEventListener = this.addEventListener.bind(this);
    this.removeEventListener = this.removeEventListener.bind(this);
    this.dispatchEvent = this.dispatchEvent.bind(this);
  }

  /**
   * Helper method to update therapist dashboard caches
   * This ensures TherapistDashboard gets updates regardless of appointment data structure
   */
  updateTherapistDashboardCaches(
    appointmentData,
    updateFunction,
    actionDescription = "update"
  ) {
    console.log(
      `🩺 ${actionDescription} - Updating TherapistDashboard caches for appointment:`,
      appointmentData.id
    );

    // Find all possible therapist IDs from the appointment
    const affectedTherapistIds = new Set();

    // Add primary therapist ID
    if (appointmentData.therapist_id) {
      affectedTherapistIds.add(appointmentData.therapist_id);
    }

    // Add legacy therapist field
    if (appointmentData.therapist) {
      affectedTherapistIds.add(appointmentData.therapist);
    }

    // Add all therapists from therapists array (multi-therapist appointments)
    if (
      appointmentData.therapists &&
      Array.isArray(appointmentData.therapists)
    ) {
      appointmentData.therapists.forEach((therapistId) => {
        if (therapistId) affectedTherapistIds.add(therapistId);
      });
    }

    // If no therapist IDs found, try to get appointment from cache to find therapists
    if (affectedTherapistIds.size === 0) {
      const appointments = queryClient.getQueryData(["appointments"]) || [];
      const existingAppointment = appointments.find(
        (apt) => apt.id === appointmentData.id
      );

      if (existingAppointment) {
        if (existingAppointment.therapist_id)
          affectedTherapistIds.add(existingAppointment.therapist_id);
        if (existingAppointment.therapist)
          affectedTherapistIds.add(existingAppointment.therapist);
        if (
          existingAppointment.therapists &&
          Array.isArray(existingAppointment.therapists)
        ) {
          existingAppointment.therapists.forEach((therapistId) => {
            if (therapistId) affectedTherapistIds.add(therapistId);
          });
        }
      }
    }

    console.log(
      `🩺 Found ${affectedTherapistIds.size} affected therapists:`,
      Array.from(affectedTherapistIds)
    );

    // Update each affected therapist's cache
    affectedTherapistIds.forEach((therapistId) => {
      console.log(
        `🩺 Updating TherapistDashboard cache for therapist ${therapistId}`
      );

      // Apply the update function to the therapist's specific cache first
      queryClient.setQueryData(
        ["appointments", "therapist", therapistId],
        updateFunction
      );

      // CRITICAL: Force immediate refetch with aggressive invalidation
      queryClient.invalidateQueries({
        queryKey: ["appointments", "therapist", therapistId],
        refetchType: "all", // Force refetch even for inactive queries
        exact: true // Only invalidate this exact query key
      });

      // Also invalidate without exact match to catch any related queries
      queryClient.invalidateQueries({
        queryKey: ["appointments", "therapist"],
        refetchType: "active"
      });
    });

    return affectedTherapistIds.size;
  }

  /**
   * Add event listener for WebSocket events
   * @param {string} eventType - The event type to listen for
   * @param {function} listener - The callback function
   */
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(listener);
    console.log(`📡 Event listener added for: ${eventType}`);
  }

  /**
   * Remove event listener for WebSocket events
   * @param {string} eventType - The event type to stop listening for
   * @param {function} listener - The callback function to remove
   */
  removeEventListener(eventType, listener) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(listener);
      // Clean up empty sets
      if (this.eventListeners.get(eventType).size === 0) {
        this.eventListeners.delete(eventType);
      }
      console.log(`📡 Event listener removed for: ${eventType}`);
    }
  }

  /**
   * Dispatch custom events to registered listeners
   * @param {string} eventType - The event type to dispatch
   * @param {any} data - The event data
   */
  dispatchEvent(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token = null) {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;
    this.notifyStatusChange("connecting");

    try {
      // Get auth token from localStorage if not provided
      const authToken = token || getToken();

      // Debug environment variables
      console.log("🔍 WebSocket Environment Debug:", {
        PROD: import.meta.env.PROD,
        DEV: import.meta.env.DEV,
        MODE: import.meta.env.MODE,
        VITE_WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL,
      });

      // Build WebSocket URL with authentication
      const wsUrl = import.meta.env.PROD
        ? "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"
        : import.meta.env.VITE_WS_BASE_URL ||
          "ws://localhost:8000/ws/scheduling/appointments/";

      console.log("🔗 WebSocket URL constructed:", wsUrl);

      const wsUrlWithAuth = authToken
        ? `${wsUrl}?token=${encodeURIComponent(authToken)}`
        : wsUrl;

      console.log("🔗 Final WebSocket URL with auth:", wsUrlWithAuth);

      this.ws = new WebSocket(wsUrlWithAuth);

      // Set up event listeners - FIXED: Properly bind methods to 'this'
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      this.isConnecting = false;
      this.notifyStatusChange("error");
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection opened
   */
  handleOpen() {
    console.log("✅ WebSocket connected successfully");
    this.connectionStatus = "connected";
    this.reconnectAttempts = 0;
    this.isConnecting = false;

    this.notifyStatusChange("connected");
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();
  }

  /**
   * Handle incoming WebSocket messages and update TanStack Query cache
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log("📨 WebSocket message received:", data);

      // Add detailed debugging for appointment_updated messages
      if (data.type === "appointment_updated") {
        console.log("🔍 Processing appointment_updated message:", {
          type: data.type,
          hasMessage: !!data.message,
          hasAppointment: !!data.appointment,
          messageContent: data.message,
          appointmentContent: data.appointment
        });
      }

      // Handle different message types
      // CRITICAL FIX: Handle both old (data.message) and new (data.appointment) WebSocket formats
      // Some messages use data.appointment (appointment_updated), others use data.message (driver_assigned)
      let appointmentData = data.appointment || data.message;
      
      switch (data.type) {
        case "appointment_create":
        case "appointment_created":
          console.log("📝 Handling appointment creation");
          this.handleAppointmentCreate(appointmentData);
          break;
        case "appointment_update":
        case "appointment_updated":
          console.log("🔄 Handling appointment update");
          // CRITICAL FIX: Make sure we have valid appointment data
          if (!appointmentData) {
            console.error("❌ appointment_updated: No appointment data found", {
              hasMessage: !!data.message,
              hasAppointment: !!data.appointment,
              fullData: data
            });
            return;
          }
          this.handleAppointmentUpdate(appointmentData);
          // Also dispatch status change event if status was updated
          if (appointmentData && appointmentData.status) {
            this.dispatchEvent("appointment_status_changed", {
              appointment: appointmentData,
              type: "appointment_status_changed",
            });
          }
          break;
        case "appointment_delete":
        case "appointment_deleted":
          this.handleAppointmentDelete(appointmentData);
          break;
        case "availability_update":
          this.handleAvailabilityUpdate(appointmentData);
          break;
        case "heartbeat":
        case "heartbeat_response":
          console.log("💓 Heartbeat response received from server");
          this.handleHeartbeat(data.message);
          break;
        case "driver_assigned":
          // Driver assignment uses different data structure (data.message with appointment_id)
          this.handleDriverAssigned(data.message || data);
          // Dispatch status change event since driver assignment changes status
          this.dispatchEvent("appointment_status_changed", {
            appointment: data.message || data,
            type: "appointment_status_changed",
          });
          break;
        case "therapist_acceptance":
          this.handleTherapistAcceptance(data.message || data);
          // Dispatch status change event since acceptance changes status
          this.dispatchEvent("appointment_status_changed", {
            appointment: data.message || data,
            type: "appointment_status_changed",
          });
          break;
        case "session_started":
          this.handleSessionStarted(data.message || data);
          // Dispatch status change event since session start changes status
          this.dispatchEvent("appointment_status_changed", {
            appointment: data.message || data,
            type: "appointment_status_changed",
          });
          break;
        case "awaiting_payment":
          this.handleAwaitingPayment(data.message || data);
          // Dispatch status change event since payment waiting changes status
          this.dispatchEvent("appointment_status_changed", {
            appointment: data.message || data,
            type: "appointment_status_changed",
          });
          break;
        case "appointment_started":
          this.handleAppointmentStarted(data.message || data);
          // Dispatch status change event since appointment start changes status
          this.dispatchEvent("appointment_status_changed", {
            appointment: data.message || data,
            type: "appointment_status_changed",
          });
          break;
        case "initial_data":
          this.handleInitialData(data);
          break;
        // Handle nested message types from Django's _create_notifications
        case "appointment_message":
          // Django sends nested messages via _create_notifications
          if (data.message && data.message.type) {
            const nestedMessage = {
              type: data.message.type,
              message: {
                appointment_id: data.message.appointment_id,
                ...data.message,
              },
            };
            // Recursively handle the nested message
            this.handleMessage({ data: JSON.stringify(nestedMessage) });
          }
          break;
        default:
          console.log("Unknown WebSocket message type:", data.type);
          console.log("📋 Full message data:", data);
          
          // Try to handle appointment_updated messages that might not be matching
          if (data.type && data.type.includes("appointment") && data.type.includes("update")) {
            console.log("🔧 Attempting to handle as appointment update");
            this.handleAppointmentUpdate(data.message);
          }
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      console.error("Original WebSocket event data:", event.data);
      console.error("Error stack trace:", error.stack);
    }
  }

  /**
   * Handle appointment creation - update TanStack Query cache
   */
  handleAppointmentCreate(appointment) {
    console.log("🆕 WebSocket appointment creation received:", {
      id: appointment.id,
      therapist_id: appointment.therapist_id,
      driver_id: appointment.driver_id,
      therapists: appointment.therapists,
    });

    // Create add function for cache updates
    const addFunction = (old = []) => {
      // Prevent duplicates
      if (old.find((a) => a.id === appointment.id)) return old;
      return [appointment, ...old];
    };

    // Update global appointments list
    queryClient.setQueryData(["appointments"], addFunction);

    // Update today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (appointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], addFunction);
    }

    // Update per-date queries
    queryClient.setQueryData(
      ["appointments", "date", appointment.date],
      addFunction
    );

    // CRITICAL FIX: Update all therapist dashboard queries using the helper method
    const affectedTherapistCount = this.updateTherapistDashboardCaches(
      appointment,
      addFunction,
      "Appointment Creation"
    );

    // Update driver dashboard queries
    if (appointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", appointment.driver_id],
        addFunction
      );
    }

    // Use comprehensive cache invalidation that includes operator-specific queries
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator", // Invalidate operator-specific caches
      invalidateAll: true, // Comprehensive invalidation for WebSocket updates
    }).catch((error) => {
      console.error("❌ WebSocket cache invalidation failed:", error);
    });

    console.log(
      `✅ WebSocket appointment creation applied to all affected caches (${affectedTherapistCount} therapists affected)`
    );

    // Use comprehensive cache invalidation that includes operator-specific queries
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator", // Invalidate operator-specific caches
      invalidateAll: true, // Comprehensive invalidation for WebSocket updates
    }).catch((error) => {
      console.error("❌ WebSocket cache invalidation failed:", error);
    });

    console.log(
      `✅ WebSocket appointment creation applied to all affected caches (${affectedTherapistCount} therapists affected)`
    );

    // Dispatch event for listeners
    this.dispatchEvent("appointment_created", {
      appointment: appointment,
      type: "appointment_created",
    });
  }

  /**
   * Handle appointment update - update TanStack Query cache
   */
  handleAppointmentUpdate(updatedAppointment) {
    // CRITICAL FIX: Add comprehensive null/undefined checks and detailed logging
    console.log("🔧 handleAppointmentUpdate called with:", {
      isNull: updatedAppointment === null,
      isUndefined: updatedAppointment === undefined,
      type: typeof updatedAppointment,
      hasId: updatedAppointment?.id,
      data: updatedAppointment
    });

    if (!updatedAppointment) {
      console.error("❌ handleAppointmentUpdate: updatedAppointment is null/undefined");
      return;
    }

    if (!updatedAppointment.id) {
      console.error("❌ handleAppointmentUpdate: updatedAppointment.id is missing", {
        keys: Object.keys(updatedAppointment || {}),
        fullData: updatedAppointment
      });
      return;
    }

    console.log("🔄 WebSocket appointment update received:", {
      id: updatedAppointment.id,
      status: updatedAppointment.status,
      therapist_id: updatedAppointment.therapist_id,
      driver_id: updatedAppointment.driver_id,
      therapists: updatedAppointment.therapists,
      fullAppointmentData: updatedAppointment
    });

    // Create update function for cache updates
    const updateFunction = (old = []) =>
      old.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a));

    // Update global appointments list
    queryClient.setQueryData(["appointments"], updateFunction);

    // Update today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (updatedAppointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], updateFunction);
    }

    // Update per-date queries
    queryClient.setQueryData(
      ["appointments", "date", updatedAppointment.date],
      updateFunction
    );

    // CRITICAL FIX: Update all therapist dashboard queries using the helper method
    const affectedTherapistCount = this.updateTherapistDashboardCaches(
      updatedAppointment,
      updateFunction,
      "Appointment Update"
    );

    // Update driver dashboard queries
    if (updatedAppointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", updatedAppointment.driver_id],
        updateFunction
      );

      // Also invalidate driver cache
      queryClient.invalidateQueries({
        queryKey: ["appointments", "driver", updatedAppointment.driver_id],
        refetchType: "active",
      });
    }

    // CRITICAL: Force invalidation to ensure TherapistDashboard refetches
    // Use the comprehensive cache invalidation helper
    handleWebSocketUpdate(queryClient, {
      type: "appointment_updated",
      appointment: updatedAppointment
    });

    // Use comprehensive cache invalidation that includes operator-specific queries
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator", // Invalidate operator-specific caches
      invalidateAll: true, // Comprehensive invalidation for WebSocket updates
    }).catch((error) => {
      console.error("❌ WebSocket cache invalidation failed:", error);
    });

    console.log(
      `✅ WebSocket appointment update applied to all affected caches (${affectedTherapistCount} therapists affected)`
    );

    // Dispatch event for listeners
    this.dispatchEvent("appointment_updated", {
      appointment: updatedAppointment,
      type: "appointment_updated",
    });
  }

  /**
   * Handle appointment deletion - update TanStack Query cache
   */
  handleAppointmentDelete(deletedAppointment) {
    console.log("🗑️ WebSocket appointment deletion received:", {
      id: deletedAppointment.id,
      therapist_id: deletedAppointment.therapist_id,
      driver_id: deletedAppointment.driver_id,
      therapists: deletedAppointment.therapists,
    });

    // Create remove function for cache updates
    const removeFunction = (old = []) =>
      old.filter((a) => a.id !== deletedAppointment.id);

    // Remove from global appointments list
    queryClient.setQueryData(["appointments"], removeFunction);

    // Remove from today's appointments if applicable
    const today = new Date().toISOString().split("T")[0];
    if (deletedAppointment.date === today) {
      queryClient.setQueryData(["appointments", "today"], removeFunction);
    }

    // Remove from per-date queries
    queryClient.setQueryData(
      ["appointments", "date", deletedAppointment.date],
      removeFunction
    );

    // CRITICAL FIX: Update all therapist dashboard queries using the helper method
    const affectedTherapistCount = this.updateTherapistDashboardCaches(
      deletedAppointment,
      removeFunction,
      "Appointment Deletion"
    );

    // Remove from driver dashboard queries
    if (deletedAppointment.driver_id) {
      queryClient.setQueryData(
        ["appointments", "driver", deletedAppointment.driver_id],
        removeFunction
      );
    }

    // Use comprehensive cache invalidation that includes operator-specific queries
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator", // Invalidate operator-specific caches
      invalidateAll: true, // Comprehensive invalidation for WebSocket updates
    }).catch((error) => {
      console.error("❌ WebSocket cache invalidation failed:", error);
    });

    console.log(
      `✅ WebSocket appointment deletion applied to all affected caches (${affectedTherapistCount} therapists affected)`
    );

    // Dispatch event for listeners
    this.dispatchEvent("appointment_deleted", {
      appointment: deletedAppointment,
      type: "appointment_deleted",
    });
  }

  /**
   * Handle availability updates
   */
  handleAvailabilityUpdate() {
    // Invalidate all availability queries to trigger fresh data
    queryClient.invalidateQueries({ queryKey: ["availability"] });
    queryClient.invalidateQueries({ queryKey: ["therapists", "available"] });
    queryClient.invalidateQueries({ queryKey: ["drivers", "available"] });

    console.log("✅ Availability updated - cache invalidated");
  }

  /**
   * Handle driver assignment
   */
  handleDriverAssigned(data) {
    console.log("🚗 WebSocket driver assignment received:", {
      appointment_id: data.appointment_id,
      driver_id: data.driver_id,
      status: data.status,
    });

    // Update the specific appointment with driver assignment
    const updateWithDriver = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              driver_id: data.driver_id,
              driver_name: data.driver_name,
              status: data.status,
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithDriver);
    queryClient.setQueryData(["appointments", "today"], updateWithDriver);
    queryClient.setQueryData(["appointments", "upcoming"], updateWithDriver);

    // CRITICAL FIX: Update therapist dashboard cache if we have appointment data
    // Get the appointment to find affected therapists
    const appointments = queryClient.getQueryData(["appointments"]) || [];
    const affectedAppointment = appointments.find(
      (apt) => apt.id === data.appointment_id
    );

    if (affectedAppointment) {
      const affectedTherapistIds = new Set();

      // Add all possible therapist IDs
      if (affectedAppointment.therapist_id) {
        affectedTherapistIds.add(affectedAppointment.therapist_id);
      }
      if (affectedAppointment.therapist) {
        affectedTherapistIds.add(affectedAppointment.therapist);
      }
      if (
        affectedAppointment.therapists &&
        Array.isArray(affectedAppointment.therapists)
      ) {
        affectedAppointment.therapists.forEach((therapistId) => {
          if (therapistId) affectedTherapistIds.add(therapistId);
        });
      }

      // Update each therapist's cache
      affectedTherapistIds.forEach((therapistId) => {
        console.log(
          `🩺 Updating TherapistDashboard cache for driver assignment - therapist ${therapistId}`
        );

        queryClient.setQueryData(
          ["appointments", "therapist", therapistId],
          updateWithDriver
        );

        // Also invalidate to trigger fresh fetch
        queryClient.invalidateQueries({
          queryKey: ["appointments", "therapist", therapistId],
          refetchType: "active",
        });
      });
    }

    console.log("✅ Driver assigned - cache updated");

    // Dispatch event for listeners
    this.dispatchEvent("driver_response", { data, type: "driver_response" });
  }

  /**
   * Handle therapist acceptance
   */
  handleTherapistAcceptance(data) {
    console.log("👩‍⚕️ WebSocket therapist acceptance received:", {
      appointment_id: data.appointment_id,
      therapist_accepted: data.therapist_accepted,
      driver_accepted: data.driver_accepted,
      both_accepted: data.both_accepted,
      status: data.status,
    });

    // Update appointment with acceptance status
    const updateWithAcceptance = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              therapist_accepted: data.therapist_accepted,
              driver_accepted: data.driver_accepted,
              both_accepted: data.both_accepted,
              status: data.status || appointment.status,
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithAcceptance);
    queryClient.setQueryData(["appointments", "today"], updateWithAcceptance);
    queryClient.setQueryData(
      ["appointments", "upcoming"],
      updateWithAcceptance
    );

    // CRITICAL FIX: Update therapist dashboard queries for affected appointment
    // Get appointment to find therapist IDs
    const appointments = queryClient.getQueryData(["appointments"]) || [];
    const targetAppointment = appointments.find(
      (apt) => apt.id === data.appointment_id
    );

    if (targetAppointment) {
      const affectedTherapistCount = this.updateTherapistDashboardCaches(
        targetAppointment,
        updateWithAcceptance,
        "Therapist Acceptance"
      );
      console.log(
        `✅ Therapist acceptance updated - cache updated (${affectedTherapistCount} therapists affected)`
      );
    } else {
      console.log("✅ Therapist acceptance updated - cache updated");
    }

    // Dispatch event for listeners
    this.dispatchEvent("therapist_response", {
      data,
      type: "therapist_response",
    });
  }

  /**
   * Handle session started
   */
  handleSessionStarted(data) {
    console.log("🎬 WebSocket session started received:", {
      appointment_id: data.appointment_id,
      session_started_at: data.session_started_at,
      status: "session_in_progress",
    });

    // Update appointment with session started status
    const updateWithSessionStart = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              status: "session_in_progress",
              session_started_at:
                data.session_started_at || new Date().toISOString(),
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithSessionStart);
    queryClient.setQueryData(["appointments", "today"], updateWithSessionStart);
    queryClient.setQueryData(
      ["appointments", "upcoming"],
      updateWithSessionStart
    );

    // CRITICAL FIX: Update therapist dashboard queries for affected appointment
    // Get appointment to find therapist IDs
    const appointments = queryClient.getQueryData(["appointments"]) || [];
    const targetAppointment = appointments.find(
      (apt) => apt.id === data.appointment_id
    );

    if (targetAppointment) {
      const affectedTherapistCount = this.updateTherapistDashboardCaches(
        targetAppointment,
        updateWithSessionStart,
        "Session Started"
      );
      console.log(
        `✅ Session started updated - cache updated (${affectedTherapistCount} therapists affected)`
      );
    } else {
      console.log("✅ Session started updated - cache updated");
    }

    // Use comprehensive cache invalidation for real-time dashboard sync
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator",
      invalidateAll: true,
    }).catch((error) => {
      console.error(
        "❌ WebSocket session start cache invalidation failed:",
        error
      );
    });

    // Dispatch event for listeners
    this.dispatchEvent("session_started", {
      data,
      type: "session_started",
    });
  }

  /**
   * Handle awaiting payment
   */
  handleAwaitingPayment(data) {
    // Update appointment with awaiting payment status
    const updateWithPaymentStatus = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              status: "awaiting_payment",
              session_completed_at:
                data.session_completed_at || new Date().toISOString(),
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithPaymentStatus);
    queryClient.setQueryData(
      ["appointments", "today"],
      updateWithPaymentStatus
    );
    queryClient.setQueryData(
      ["appointments", "upcoming"],
      updateWithPaymentStatus
    );

    // Use comprehensive cache invalidation for real-time dashboard sync
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator",
      invalidateAll: true,
    }).catch((error) => {
      console.error(
        "❌ WebSocket awaiting payment cache invalidation failed:",
        error
      );
    });

    console.log("✅ Awaiting payment status - cache updated");

    // Dispatch event for listeners
    this.dispatchEvent("awaiting_payment", {
      data,
      type: "awaiting_payment",
    });
  }

  /**
   * Handle appointment started by operator
   */
  handleAppointmentStarted(data) {
    console.log("🎬 WebSocket appointment started received:", {
      appointment_id: data.appointment_id,
      started_at: data.started_at,
    });

    // Update appointment with started status
    const updateWithStartStatus = (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((appointment) =>
        appointment.id === data.appointment_id
          ? {
              ...appointment,
              status: "in_progress",
              started_at: data.started_at || new Date().toISOString(),
            }
          : appointment
      );
    };

    // Update all relevant queries
    queryClient.setQueryData(["appointments"], updateWithStartStatus);
    queryClient.setQueryData(["appointments", "today"], updateWithStartStatus);
    queryClient.setQueryData(
      ["appointments", "upcoming"],
      updateWithStartStatus
    );

    // CRITICAL FIX: Update therapist dashboard cache
    // Get the appointment to find affected therapists
    const appointments = queryClient.getQueryData(["appointments"]) || [];
    const affectedAppointment = appointments.find(
      (apt) => apt.id === data.appointment_id
    );

    if (affectedAppointment) {
      const affectedTherapistIds = new Set();

      // Add all possible therapist IDs
      if (affectedAppointment.therapist_id) {
        affectedTherapistIds.add(affectedAppointment.therapist_id);
      }
      if (affectedAppointment.therapist) {
        affectedTherapistIds.add(affectedAppointment.therapist);
      }
      if (
        affectedAppointment.therapists &&
        Array.isArray(affectedAppointment.therapists)
      ) {
        affectedAppointment.therapists.forEach((therapistId) => {
          if (therapistId) affectedTherapistIds.add(therapistId);
        });
      }

      // Update each therapist's cache
      affectedTherapistIds.forEach((therapistId) => {
        console.log(
          `🩺 Updating TherapistDashboard cache for appointment start - therapist ${therapistId}`
        );

        queryClient.setQueryData(
          ["appointments", "therapist", therapistId],
          updateWithStartStatus
        );

        // Force invalidation to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: ["appointments", "therapist", therapistId],
          refetchType: "active",
        });
      });
    }

    // Use comprehensive cache invalidation for real-time dashboard sync
    invalidateAppointmentCaches(queryClient, {
      userRole: "operator",
      invalidateAll: true,
    }).catch((error) => {
      console.error(
        "❌ WebSocket appointment start cache invalidation failed:",
        error
      );
    });

    console.log("✅ Appointment started - cache updated");

    // Dispatch event for listeners
    this.dispatchEvent("appointment_started", {
      data,
      type: "appointment_started",
    });
  }

  /**
   * Handle initial data from WebSocket connection
   */
  handleInitialData(data) {
    console.log("📋 WebSocket initial data received:", {
      appointmentCount: data.appointments?.length || 0,
      connectionId: data.connection_id,
      timestamp: data.timestamp,
    });

    // If appointments are provided in initial data, update the cache
    if (data.appointments && Array.isArray(data.appointments)) {
      // Update global appointments list with initial data
      queryClient.setQueryData(["appointments"], (old = []) => {
        // Merge with existing data, preventing duplicates
        const existingIds = new Set(old.map((a) => a.id));
        const newAppointments = data.appointments.filter(
          (a) => !existingIds.has(a.id)
        );
        return [...old, ...newAppointments];
      });

      // Update today's appointments if applicable
      const today = new Date().toISOString().split("T")[0];
      const todaysAppointments = data.appointments.filter(
        (apt) => apt.date === today
      );

      if (todaysAppointments.length > 0) {
        queryClient.setQueryData(["appointments", "today"], (old = []) => {
          const existingIds = new Set(old.map((a) => a.id));
          const newTodayAppointments = todaysAppointments.filter(
            (a) => !existingIds.has(a.id)
          );
          return [...old, ...newTodayAppointments];
        });
      }

      console.log("✅ Initial appointment data synchronized with cache");
    }

    // Dispatch event for listeners
    this.dispatchEvent("initial_data", {
      appointments: data.appointments,
      connectionId: data.connection_id,
      type: "initial_data",
    });
  }

  /**
   * Handle heartbeat messages
   */
  handleHeartbeat(message) {
    // Handle heartbeat from server - respond to keep connection alive
    if (message && message.type === "heartbeat") {
      this.send({ type: "heartbeat_response", timestamp: Date.now() });
      console.log("💓 Heartbeat received - sent response");
    } else {
      // Handle heartbeat_response from server
      console.log("💓 Heartbeat response received from server");
    }
  }

  /**
   * Handle WebSocket connection closed
   */
  handleClose(event) {
    console.log("🔌 WebSocket disconnected:", event.code, event.reason);
    this.connectionStatus = "disconnected";
    this.isConnecting = false;

    this.stopHeartbeat();
    this.notifyStatusChange("disconnected");

    // Attempt reconnection if not intentionally closed
    if (event.code !== 1000 && this.persistentConnection) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    console.error("❌ WebSocket error:", error);
    this.connectionStatus = "error";
    this.notifyStatusChange("error");
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("❌ Max reconnection attempts reached");
      this.notifyStatusChange("error");
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    console.log(
      `🔄 Scheduling reconnection attempt ${
        this.reconnectAttempts + 1
      } in ${delay}ms`
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Send message to WebSocket server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      console.log("📤 Message queued (WebSocket not connected):", message);
    }
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: "heartbeat", timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.persistentConnection = false;

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }

    this.stopHeartbeat();
    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");

    console.log("🔌 WebSocket disconnected by client");
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Notify status changes to components
   */
  notifyStatusChange(status) {
    this.connectionStatus = status;
    window.dispatchEvent(
      new CustomEvent("websocket-status", {
        detail: { status },
      })
    );
  }

  /**
   * Enable persistent connection across pages
   */
  enablePersistentConnection() {
    this.persistentConnection = true;
  }

  /**
   * Disable persistent connection
   */
  disablePersistentConnection() {
    this.persistentConnection = false;
  }
}

// Create singleton instance
const webSocketService = new WebSocketTanStackService();

// Export service and utility functions
export default webSocketService;

/**
 * Hook to get WebSocket connection status
 */
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState(webSocketService.getConnectionStatus());

  useEffect(() => {
    const handleStatusChange = (event) => {
      setStatus(event.detail.status);
    };

    window.addEventListener("websocket-status", handleStatusChange);
    return () =>
      window.removeEventListener("websocket-status", handleStatusChange);
  }, []);

  return status;
};

/**
 * Hook to initialize WebSocket connection in components
 */
export const useWebSocket = (autoConnect = true) => {
  useEffect(() => {
    if (autoConnect && !webSocketService.isConnected()) {
      webSocketService.connect();
    }

    // Cleanup on unmount (but keep connection alive for other components)
    return () => {
      // Don't disconnect - let other components use the connection
    };
  }, [autoConnect]);

  return {
    connect: webSocketService.connect,
    disconnect: webSocketService.disconnect,
    send: webSocketService.send,
    isConnected: webSocketService.isConnected(),
    status: webSocketService.getConnectionStatus(),
  };
};
