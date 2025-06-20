/**
 * Cross-Tab Data Sharing System
 * Implements Solution #4: Micro-frontend data sharing between tabs
 */

import optimizedDataManager from "./optimizedDataManager.js";

class CrossTabSync {
  constructor() {
    this.channelName = "guitara_data_sync";
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.isLeaderTab = false;
    this.otherTabs = new Map();
    this.syncQueue = new Map();
    this.lastHeartbeat = Date.now();

    this.messageHandlers = new Map();
    this.broadcastChannel = null;
    this.storageListenerActive = false;
    this.heartbeatInterval = null;

    this.initializeCrossTabSync();
  }

  /**
   * Initialize cross-tab synchronization
   */
  initialize() {
    this.initializeCrossTabSync();
  }

  /**
   * Initialize cross-tab synchronization
   */
  initializeCrossTabSync() {
    // Try BroadcastChannel first (modern browsers)
    if (typeof BroadcastChannel !== "undefined") {
      this.setupBroadcastChannel();
    } else {
      // Fallback to localStorage events
      this.setupStorageSync();
    }

    // Set up tab leadership election
    this.electLeaderTab();

    // Start heartbeat
    this.startHeartbeat();

    console.log(`🔗 CrossTabSync: Initialized for tab ${this.tabId}`);
  }

  /**
   * Setup BroadcastChannel for modern browsers
   */
  setupBroadcastChannel() {
    try {
      this.broadcastChannel = new BroadcastChannel(this.channelName);

      this.broadcastChannel.addEventListener("message", (event) => {
        this.handleCrossTabMessage(event.data);
      });

      console.log("🔗 CrossTabSync: Using BroadcastChannel API");
    } catch (err) {
      console.warn(
        "🔗 CrossTabSync: BroadcastChannel not supported, falling back to localStorage",
        err.message
      );
      this.setupStorageSync();
    }
  }

  /**
   * Setup localStorage-based sync for older browsers
   */
  setupStorageSync() {
    if (this.storageListenerActive) return;

    const handleStorageChange = (event) => {
      if (event.key?.startsWith("guitara_sync_")) {
        try {
          const data = JSON.parse(event.newValue || "{}");
          this.handleCrossTabMessage(data);
        } catch (error) {
          console.warn(
            "🔗 CrossTabSync: Failed to parse storage sync message:",
            error
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    this.storageListenerActive = true;

    console.log("🔗 CrossTabSync: Using localStorage events");
  }

  /**
   * Elect leader tab for coordination
   */
  electLeaderTab() {
    const leaderKey = "guitara_leader_tab";
    const currentLeader = localStorage.getItem(leaderKey);
    const leaderData = currentLeader ? JSON.parse(currentLeader) : null;

    // Check if current leader is still alive
    if (leaderData && Date.now() - leaderData.lastHeartbeat < 10000) {
      this.isLeaderTab = leaderData.tabId === this.tabId;
    } else {
      // Become leader
      this.isLeaderTab = true;
      localStorage.setItem(
        leaderKey,
        JSON.stringify({
          tabId: this.tabId,
          lastHeartbeat: Date.now(),
        })
      );
    }

    console.log(
      `🔗 CrossTabSync: Tab ${this.tabId} is ${
        this.isLeaderTab ? "LEADER" : "follower"
      }`
    );
  }

  /**
   * Start heartbeat to maintain leadership
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.checkLeaderStatus();
    }, 5000); // Every 5 seconds
  }

  /**
   * Send heartbeat to other tabs
   */
  sendHeartbeat() {
    this.lastHeartbeat = Date.now();

    if (this.isLeaderTab) {
      // Update leader status
      localStorage.setItem(
        "guitara_leader_tab",
        JSON.stringify({
          tabId: this.tabId,
          lastHeartbeat: this.lastHeartbeat,
        })
      );
    }

    // Send heartbeat to other tabs
    this.broadcastMessage({
      type: "heartbeat",
      tabId: this.tabId,
      isLeader: this.isLeaderTab,
      timestamp: this.lastHeartbeat,
    });
  }

  /**
   * Check and update leader status
   */
  checkLeaderStatus() {
    const leaderKey = "guitara_leader_tab";
    const currentLeader = localStorage.getItem(leaderKey);
    const leaderData = currentLeader ? JSON.parse(currentLeader) : null;

    if (!leaderData || Date.now() - leaderData.lastHeartbeat > 15000) {
      // Leader is dead, elect new one
      this.electLeaderTab();
    }
  }

  /**
   * Handle messages from other tabs
   */
  handleCrossTabMessage(data) {
    if (data.tabId === this.tabId) return; // Ignore own messages

    const { type, tabId, timestamp, payload } = data;

    switch (type) {
      case "heartbeat":
        this.handleHeartbeat(tabId, data);
        break;

      case "data_update":
        this.handleDataUpdate(payload);
        break;

      case "cache_sync":
        this.handleCacheSync(payload);
        break;

      case "invalidate_cache":
        this.handleCacheInvalidation(payload);
        break;

      case "request_data":
        this.handleDataRequest(tabId, payload);
        break;

      default:
        console.warn(`🔗 CrossTabSync: Unknown message type: ${type}`);
    }

    // Call any registered subscribers
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(
            `🔗 CrossTabSync: Error in subscriber for ${type}:`,
            error
          );
        }
      });
    }

    // Update tab registry
    this.otherTabs.set(tabId, {
      lastSeen: timestamp || Date.now(),
      isLeader: data.isLeader || false,
    });
  }

  /**
   * Handle heartbeat from other tabs
   */
  handleHeartbeat(tabId, data) {
    this.otherTabs.set(tabId, {
      lastSeen: data.timestamp,
      isLeader: data.isLeader || false,
    });

    // Clean up dead tabs
    const now = Date.now();
    for (const [id, info] of this.otherTabs.entries()) {
      if (now - info.lastSeen > 20000) {
        // 20 seconds timeout
        this.otherTabs.delete(id);
        console.log(`🔗 CrossTabSync: Removed dead tab ${id}`);
      }
    }
  }

  /**
   * Handle data updates from other tabs
   */
  handleDataUpdate(payload) {
    const { dataType, data, timestamp } = payload;

    // Check if we should update our cache
    const currentCache = optimizedDataManager.cache?.get(dataType);
    if (!currentCache || timestamp > currentCache.timestamp) {
      console.log(
        `🔗 CrossTabSync: Received fresh ${dataType} data from other tab`
      );

      // Update our cache
      if (optimizedDataManager.cache) {
        optimizedDataManager.cache.set(dataType, {
          data,
          timestamp,
          fromCrossTab: true,
          accessCount: 1,
        });
      }
    }
  }

  handleCacheSync(payload) {
    const { dataType, requestingTab } = payload;

    // If we have fresh data, share it
    const cached = optimizedDataManager.cache?.get(dataType);
    if (cached && !cached.fromCrossTab) {
      this.shareCacheData(
        dataType,
        cached.data,
        cached.timestamp,
        requestingTab
      );
    }
  }

  handleCacheInvalidation(payload) {
    const { dataType, reason } = payload;

    console.log(
      `🔗 CrossTabSync: Cache invalidation for ${dataType}: ${reason}`
    );

    // Remove from our cache
    if (optimizedDataManager.cache) {
      optimizedDataManager.cache.delete(dataType);
    }
  }

  handleDataRequest(requestingTab, payload) {
    const { dataType } = payload;

    // Only leader tab should respond to avoid conflicts
    if (!this.isLeaderTab) return;

    const cached = optimizedDataManager.cache?.get(dataType);
    if (cached) {
      this.shareCacheData(
        dataType,
        cached.data,
        cached.timestamp,
        requestingTab
      );
    }
  }

  shareCacheData(dataType, data, timestamp, targetTab = null) {
    const message = {
      type: "data_update",
      payload: {
        dataType,
        data,
        timestamp,
      },
    };

    if (targetTab) {
      // Send to specific tab
      console.log(`🔗 CrossTabSync: Sharing ${dataType} with tab ${targetTab}`);
    } else {
      // Broadcast to all tabs
      console.log(`🔗 CrossTabSync: Broadcasting ${dataType} to all tabs`);
    }

    this.broadcastMessage(message);
  }

  invalidateCache(dataType, reason = "manual") {
    this.broadcastMessage({
      type: "invalidate_cache",
      payload: {
        dataType,
        reason,
      },
    });
  }

  /**
   * Request data from other tabs
   */
  requestData(dataType) {
    this.broadcastMessage({
      type: "request_data",
      payload: {
        dataType,
      },
    });
  }

  syncDataToOtherTabs(dataType, data, timestamp = Date.now()) {
    // Don't sync data that came from other tabs
    const cached = optimizedDataManager.cache?.get(dataType);
    if (cached?.fromCrossTab) return;

    console.log(`🔗 CrossTabSync: Syncing fresh ${dataType} to other tabs`);

    this.shareCacheData(dataType, data, timestamp);
  }

  /**
   * Request cache sync for specific data type
   */
  requestCacheSync(dataType) {
    this.broadcastMessage({
      type: "cache_sync",
      payload: { dataType, requestingTab: this.tabId },
    });
  }

  /**
   * Broadcast message to other tabs
   */
  broadcastMessage(message) {
    const fullMessage = {
      ...message,
      tabId: this.tabId,
      timestamp: Date.now(),
    };

    if (this.broadcastChannel) {
      // Use BroadcastChannel
      this.broadcastChannel.postMessage(fullMessage);
    } else {
      // Use localStorage
      const storageKey = `guitara_sync_${Date.now()}_${Math.random()}`;
      localStorage.setItem(storageKey, JSON.stringify(fullMessage));

      // Clean up after short time
      setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 5000);
    }
  }

  /**
   * Get cross-tab synchronization status
   */
  getSyncStatus() {
    return {
      tabId: this.tabId,
      isLeader: this.isLeaderTab,
      connectedTabs: this.otherTabs.size,
      lastHeartbeat: this.lastHeartbeat,
      method: this.broadcastChannel ? "BroadcastChannel" : "localStorage",
      otherTabs: Object.fromEntries(this.otherTabs),
    };
  }

  /**
   * Manual sync trigger
   */
  forceSyncWithOtherTabs() {
    console.log("🔗 CrossTabSync: Force syncing with other tabs");

    // Request all important data types from other tabs
    const importantTypes = [
      "appointments",
      "todayAppointments",
      "notifications",
    ];

    importantTypes.forEach((dataType) => {
      this.requestCacheSync(dataType);
    });
  }

  /**
   * Broadcast cache update to other tabs - alias for compatibility
   */
  broadcastCacheUpdate(dataType, data) {
    this.syncDataToOtherTabs(dataType, data);
  }

  /**
   * Clean up cross-tab sync
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Remove from leader if we were leader
    if (this.isLeaderTab) {
      localStorage.removeItem("guitara_leader_tab");
    }

    console.log(`🔗 CrossTabSync: Cleaned up for tab ${this.tabId}`);
  }

  /**
   * Subscribe to cross-tab messages
   */
  subscribe(messageType, callback) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType).add(callback);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * Check if current tab is the leader
   */
  isLeader() {
    return this.isLeaderTab;
  }

  /**
   * Callback for cache invalidation events
   */
  onCacheInvalidation(callback) {
    return this.subscribe("invalidate_cache", callback);
  }
}

// Create singleton instance
const crossTabSync = new CrossTabSync();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  crossTabSync.cleanup();
});

export default crossTabSync;
