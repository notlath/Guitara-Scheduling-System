/**
 * REAL-TIME SYNC SERVICE
 *
 * This service ensures that ALL dashboards (Operator, Therapist, Driver)
 * are synchronized in real-time without requiring hard reloads.
 *
 * Key Features:
 * - Immediate optimistic updates
 * - WebSocket-based real-time sync
 * - Fallback polling for missed updates
 * - Cross-dashboard synchronization
 */

import { queryClient, queryKeys } from "../lib/queryClient";
import webSocketService from "./webSocketTanStackService";

class RealTimeSyncService {
  constructor() {
    this.lastSyncTimestamp = Date.now();
    this.syncQueue = new Map(); // appointmentId -> pendingUpdate
    this.isEnabled = true;
    this.pollInterval = null;

    // Bind methods
    this.handleMutationSuccess = this.handleMutationSuccess.bind(this);
    this.handleWebSocketUpdate = this.handleWebSocketUpdate.bind(this);
    this.pollForUpdates = this.pollForUpdates.bind(this);
    this.syncAppointmentAcrossAllDashboards =
      this.syncAppointmentAcrossAllDashboards.bind(this);

    this.initializeService();
  }

  initializeService() {
    console.log("🚀 Initializing Real-Time Sync Service");

    // Start fallback polling
    this.startFallbackPolling();

    // Set up WebSocket event listeners
    this.setupWebSocketSync();
  }

  /**
   * Handle mutation success - immediately sync across all dashboards
   */
  handleMutationSuccess(
    mutationType,
    appointmentId,
    backendData,
    userRole = null
  ) {
    console.log(
      `🔄 Real-time sync: ${mutationType} for appointment ${appointmentId}`
    );

    // Apply optimistic update immediately
    this.syncAppointmentAcrossAllDashboards(
      appointmentId,
      backendData,
      mutationType
    );

    // Add to sync queue for verification
    this.syncQueue.set(appointmentId, {
      type: mutationType,
      data: backendData,
      timestamp: Date.now(),
      userRole,
    });

    // Force refresh all dashboard caches
    this.invalidateAllDashboardCaches();
  }

  /**
   * Sync appointment data across ALL dashboard types
   */
  syncAppointmentAcrossAllDashboards(appointmentId, updateData, operationType) {
    console.log(
      `🌐 Syncing appointment ${appointmentId} across all dashboards:`,
      updateData
    );

    const updateFunction = (oldData) => {
      if (!Array.isArray(oldData)) return oldData;

      if (operationType === "delete") {
        return oldData.filter((apt) => apt.id !== appointmentId);
      }

      return oldData.map((apt) =>
        apt.id === appointmentId ? { ...apt, ...updateData } : apt
      );
    };

    // Update ALL possible cache keys for ALL dashboard types
    const cacheKeys = [
      // Global keys
      ["appointments"],
      ["appointments", "list"],
      ["appointments", "today"],
      ["appointments", "upcoming"],

      // Operator dashboard keys
      ["operator", "appointments"],
      ["operator", "pending"],
      ["operator", "rejected"],
      ["operator", "payment"],
      ["operator", "all"],
      ["operator", "timeout"],
      ["operator", "sessions"],
      ["operator", "notifications"],

      // Therapist dashboard keys - for ALL therapists
      ...this.getAllTherapistCacheKeys(updateData),

      // Driver dashboard keys - for ALL drivers
      ...this.getAllDriverCacheKeys(updateData),
    ];

    // Apply update to all cache keys
    cacheKeys.forEach((key) => {
      try {
        queryClient.setQueryData(key, updateFunction);
      } catch {
        // Ignore errors for non-existent cache keys
      }
    });

    console.log(`✅ Applied sync update to ${cacheKeys.length} cache keys`);
  }

  /**
   * Get all possible therapist cache keys for an appointment
   */
  getAllTherapistCacheKeys(appointmentData) {
    const keys = [];
    const therapistIds = new Set();

    // Extract all possible therapist IDs
    if (appointmentData?.therapist_id)
      therapistIds.add(appointmentData.therapist_id);
    if (appointmentData?.therapist) therapistIds.add(appointmentData.therapist);
    if (Array.isArray(appointmentData?.therapists)) {
      appointmentData.therapists.forEach((id) => therapistIds.add(id));
    }

    // Generate cache keys for each therapist using proper queryKeys structure
    therapistIds.forEach((therapistId) => {
      keys.push(queryKeys.appointments.byTherapist(therapistId, "all"));
      keys.push(["dashboard", "therapist", therapistId]);
    });

    return keys;
  }

  /**
   * Get all possible driver cache keys for an appointment
   */
  getAllDriverCacheKeys(appointmentData) {
    const keys = [];

    if (appointmentData?.driver_id) {
      keys.push(["appointments", "driver", appointmentData.driver_id]);
      keys.push(["dashboard", "driver", appointmentData.driver_id]);
    }

    return keys;
  }

  /**
   * Invalidate all dashboard caches
   */
  invalidateAllDashboardCaches() {
    console.log("🔄 Invalidating all dashboard caches");

    const invalidationPromises = [
      // Global appointment queries
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),

      // Operator dashboard
      queryClient.invalidateQueries({ queryKey: ["operator"] }),

      // All therapist dashboards
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.length >= 3 &&
            key[0] === "appointments" &&
            key[1] === "byTherapist"
          );
        },
      }),

      // All driver dashboards
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.includes("appointments") &&
            key.includes("driver")
          );
        },
      }),
    ];

    Promise.all(invalidationPromises).catch((error) => {
      console.error("❌ Failed to invalidate dashboard caches:", error);
    });
  }

  /**
   * Set up WebSocket synchronization
   */
  setupWebSocketSync() {
    const handleWebSocketEvent = (data) => {
      this.handleWebSocketUpdate(data);
    };

    // Listen to all appointment-related WebSocket events
    const eventTypes = [
      "appointment_created",
      "appointment_updated",
      "appointment_deleted",
      "appointment_status_changed",
      "therapist_response",
      "driver_response",
      "session_started",
      "awaiting_payment",
      "appointment_started",
    ];

    eventTypes.forEach((eventType) => {
      webSocketService.addEventListener(eventType, handleWebSocketEvent);
    });

    console.log("✅ WebSocket sync events configured");
  }

  /**
   * Handle WebSocket updates
   */
  handleWebSocketUpdate(wsData) {
    console.log("📡 Real-time sync: WebSocket update received", wsData);

    const { type, appointment } = wsData;

    if (!appointment?.id) {
      console.warn("⚠️ WebSocket update missing appointment data");
      return;
    }

    // Remove from sync queue if this update confirms a pending mutation
    if (this.syncQueue.has(appointment.id)) {
      console.log(
        `✅ WebSocket confirmed pending sync for appointment ${appointment.id}`
      );
      this.syncQueue.delete(appointment.id);
    }

    // Sync across all dashboards
    const operationType = type.includes("delete") ? "delete" : "update";
    this.syncAppointmentAcrossAllDashboards(
      appointment.id,
      appointment,
      operationType
    );

    // Update last sync timestamp
    this.lastSyncTimestamp = Date.now();
  }

  /**
   * Start fallback polling to catch missed updates
   */
  startFallbackPolling() {
    // Poll every 15 seconds to catch any missed updates
    this.pollInterval = setInterval(() => {
      this.pollForUpdates();
    }, 15000);

    console.log("✅ Fallback polling started (15s interval)");
  }

  /**
   * Poll for updates that might have been missed
   */
  async pollForUpdates() {
    if (!this.isEnabled || this.syncQueue.size === 0) return;

    console.log("🔍 Polling for missed updates...");

    // Check if any queued syncs are older than 30 seconds
    const now = Date.now();
    const staleUpdates = Array.from(this.syncQueue.entries()).filter(
      ([, sync]) => now - sync.timestamp > 30000
    );

    if (staleUpdates.length > 0) {
      console.log(
        `⚠️ Found ${staleUpdates.length} stale syncs, forcing refresh`
      );

      // Force refresh all dashboard caches
      this.invalidateAllDashboardCaches();

      // Clear stale syncs
      staleUpdates.forEach(([appointmentId]) => {
        this.syncQueue.delete(appointmentId);
      });
    }
  }

  /**
   * Stop the service
   */
  stop() {
    this.isEnabled = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log("🛑 Real-Time Sync Service stopped");
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(
      `${enabled ? "✅" : "❌"} Real-Time Sync Service ${
        enabled ? "enabled" : "disabled"
      }`
    );
  }
}

// Create singleton instance
const realTimeSyncService = new RealTimeSyncService();

export default realTimeSyncService;

// Helper function to use in mutations
export const syncMutationSuccess = (
  mutationType,
  appointmentId,
  backendData,
  userRole
) => {
  realTimeSyncService.handleMutationSuccess(
    mutationType,
    appointmentId,
    backendData,
    userRole
  );
};
