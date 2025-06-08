// Enhanced Real-time Synchronization Service
// This service provides cross-dashboard communication and smart data synchronization

class SyncService {
  constructor() {
    this.listeners = new Map();
    this.lastUpdateTimes = new Map();
    this.optimisticUpdates = new Map(); // Track optimistic updates
    this.updateQueue = []; // Queue for batched updates
    this.flushTimeout = null;
    this.setupStorageListener();
  }

  // Setup localStorage event listener for cross-tab communication
  setupStorageListener() {
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("sync_")) {
        const eventType = e.key.replace("sync_", "");
        const data = e.newValue ? JSON.parse(e.newValue) : null;

        if (data && this.listeners.has(eventType)) {
          this.listeners.get(eventType).forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in sync listener for ${eventType}:`, error);
            }
          });
        }
      }
    });
  }

  // Track optimistic update for later reconciliation
  addOptimisticUpdate(id, data) {
    this.optimisticUpdates.set(id, {
      ...data,
      timestamp: Date.now(),
    });
  }

  // Remove optimistic update when real data arrives
  removeOptimisticUpdate(id) {
    this.optimisticUpdates.delete(id);
  }

  // Get all pending optimistic updates
  getOptimisticUpdates() {
    return Array.from(this.optimisticUpdates.values());
  }

  // Broadcast an event to all tabs/dashboards
  broadcast(eventType, data) {
    const syncData = {
      ...data,
      timestamp: Date.now(),
      source: window.location.pathname,
    };

    localStorage.setItem(`sync_${eventType}`, JSON.stringify(syncData));

    // Remove after a short delay to prevent storage bloat
    setTimeout(() => {
      localStorage.removeItem(`sync_${eventType}`);
    }, 5000);
  }

  // Enhanced broadcast with immediate local notification
  broadcastWithImmediate(eventType, data) {
    const syncData = {
      ...data,
      timestamp: Date.now(),
      source: window.location.pathname,
    };

    // First, notify local listeners immediately (same tab)
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach((callback) => {
        try {
          callback(syncData);
        } catch (error) {
          console.error(
            `Error in immediate sync listener for ${eventType}:`,
            error
          );
        }
      });
    }

    // Then broadcast to other tabs via localStorage
    localStorage.setItem(`sync_${eventType}`, JSON.stringify(syncData));

    // Remove after a short delay to prevent storage bloat
    setTimeout(() => {
      localStorage.removeItem(`sync_${eventType}`);
    }, 5000);
  }

  // Subscribe to sync events
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Cleanup method to unsubscribe all listeners (for safety/testing)
  unsubscribe(eventType, callback) {
    if (callback) {
      // Remove specific callback
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    } else if (eventType) {
      // Remove all listeners for this event type
      this.listeners.delete(eventType);
    } else {
      // Remove all listeners
      this.listeners.clear();
    }
  }

  // Check if data should be refreshed based on last update time
  shouldRefresh(dataType, maxAge = 30000) {
    // 30 seconds default
    const lastUpdate = this.lastUpdateTimes.get(dataType);
    if (!lastUpdate) return true;

    return Date.now() - lastUpdate > maxAge;
  }

  // Mark data as updated
  markUpdated(dataType) {
    this.lastUpdateTimes.set(dataType, Date.now());
  }

  // Get optimized polling interval based on user activity
  getPollingInterval(baseInterval = 20000) {
    // Check if user is active (mouse/keyboard activity in last 2 minutes)
    const lastActivity = parseInt(
      localStorage.getItem("last_user_activity") || "0"
    );
    const isUserActive = Date.now() - lastActivity < 120000; // 2 minutes

    // More frequent polling if user is active
    return isUserActive ? Math.max(baseInterval / 2, 10000) : baseInterval;
  }

  // Track user activity
  trackUserActivity() {
    localStorage.setItem("last_user_activity", Date.now().toString());
  }

  // Force immediate refresh across all dashboards for critical events
  forceRefresh(eventType, data) {
    this.broadcast(eventType, { ...data, forceRefresh: true });

    // Also trigger immediate polling for availability-related changes
    if (eventType.includes("availability")) {
      localStorage.setItem("force_availability_refresh", Date.now().toString());

      // Remove the flag after 5 seconds
      setTimeout(() => {
        localStorage.removeItem("force_availability_refresh");
      }, 5000);
    }
  }

  // Check if forced refresh is needed
  shouldForceRefresh() {
    const forceFlag = localStorage.getItem("force_availability_refresh");
    if (!forceFlag) return false;

    // Only force refresh if the flag was set within the last 5 seconds
    return Date.now() - parseInt(forceFlag) < 5000;
  }

  // Global availability refresh helper for cross-dashboard sync
  triggerAvailabilityRefresh(staffId, date) {
    const eventData = {
      eventType: "global_availability_refresh",
      staffId: parseInt(staffId, 10),
      date: date,
      timestamp: Date.now(),
    };

    // Store the refresh trigger in localStorage with a timestamp
    localStorage.setItem(
      "availability_refresh_trigger",
      JSON.stringify(eventData)
    );

    // Broadcast the refresh event
    this.broadcastWithImmediate("global_availability_refresh", eventData);

    // Remove the trigger after a short delay
    setTimeout(() => {
      localStorage.removeItem("availability_refresh_trigger");
    }, 3000);
  }

  // Check if there's a pending availability refresh for specific staff/date
  needsAvailabilityRefresh(staffId, date) {
    const trigger = localStorage.getItem("availability_refresh_trigger");
    if (!trigger) return false;

    try {
      const eventData = JSON.parse(trigger);
      // Check if the trigger is recent (within last 3 seconds) and matches
      const isRecent = Date.now() - eventData.timestamp < 3000;
      const matchesStaff = eventData.staffId === parseInt(staffId, 10);
      const matchesDate = eventData.date === date;

      return isRecent && matchesStaff && matchesDate;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const syncService = new SyncService();

// Track user activity
["mousedown", "mousemove", "keypress", "scroll", "touchstart"].forEach(
  (event) => {
    document.addEventListener(event, () => syncService.trackUserActivity(), {
      passive: true,
    });
  }
);

export default syncService;
