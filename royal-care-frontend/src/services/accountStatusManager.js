/**
 * Centralized Account Status Manager
 * Eliminates redundant account status polling across disabled account alerts
 */

import { checkAccountStatus } from "./auth";

class AccountStatusManager {
  constructor() {
    this.activePolls = new Map(); // Track active polling sessions
    this.pollIntervals = new Map(); // Track poll intervals
    this.subscribers = new Map(); // Track components listening to account status
  }

  /**
   * Start polling for account status
   * @param {string} username - Username to check
   * @param {Function} onStatusChange - Callback for status updates
   * @param {number} maxAttempts - Maximum polling attempts (default: 60)
   * @param {number} intervalMs - Polling interval in ms (default: 5000)
   * @returns {Promise} - Resolves when account becomes active or polling ends
   */
  startPolling(username, onStatusChange, maxAttempts = 60, intervalMs = 5000) {
    // Prevent duplicate polling for the same username
    if (this.activePolls.has(username)) {
      console.log(`⚠️ AccountStatusManager: Already polling for ${username}`);
      return this.activePolls.get(username);
    }

    console.log(`🔄 AccountStatusManager: Starting polling for ${username}`);

    const pollPromise = new Promise((resolve, reject) => {
      let attempts = 0;

      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const status = await checkAccountStatus(username);

          // Notify all subscribers for this username
          if (onStatusChange) {
            onStatusChange({
              attempt: attempts,
              maxAttempts,
              status: status.isActive ? "active" : "disabled",
              message: status.message,
            });
          }

          // If account is now active, resolve and cleanup
          if (status.success && status.isActive) {
            console.log(
              `✅ AccountStatusManager: ${username} account is now active`
            );
            this.stopPolling(username);
            resolve({
              success: true,
              attempts,
              message: "Account has been re-enabled",
            });
            return;
          }

          // If max attempts reached, stop polling
          if (attempts >= maxAttempts) {
            console.log(
              `⏰ AccountStatusManager: Max attempts reached for ${username}`
            );
            this.stopPolling(username);
            resolve({
              success: false,
              attempts,
              message:
                "Account is still disabled after maximum polling attempts",
            });
            return;
          }
        } catch (error) {
          console.error(
            `❌ AccountStatusManager: Error polling ${username}:`,
            error
          );

          // On error, continue polling unless it's a critical error
          if (onStatusChange) {
            onStatusChange({
              attempt: attempts,
              maxAttempts,
              status: "error",
              message: "Unable to check account status",
            });
          }

          // Stop polling if we've hit max attempts
          if (attempts >= maxAttempts) {
            this.stopPolling(username);
            reject(
              new Error(
                `Failed to check account status after ${maxAttempts} attempts`
              )
            );
            return;
          }
        }
      }, intervalMs);

      // Store the interval for cleanup
      this.pollIntervals.set(username, pollInterval);
    });

    // Store the active poll promise
    this.activePolls.set(username, pollPromise);

    return pollPromise;
  }

  /**
   * Stop polling for a specific username
   * @param {string} username - Username to stop polling for
   */
  stopPolling(username) {
    console.log(`⏹️ AccountStatusManager: Stopping polling for ${username}`);

    // Clear the interval
    const interval = this.pollIntervals.get(username);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(username);
    }

    // Remove the active poll
    this.activePolls.delete(username);

    // Remove subscribers for this username
    this.subscribers.delete(username);
  }

  /**
   * Stop all active polling
   */
  stopAllPolling() {
    console.log("⏹️ AccountStatusManager: Stopping all active polling");

    // Clear all intervals
    this.pollIntervals.forEach((interval, username) => {
      clearInterval(interval);
      console.log(`⏹️ AccountStatusManager: Stopped polling for ${username}`);
    });

    // Clear all maps
    this.pollIntervals.clear();
    this.activePolls.clear();
    this.subscribers.clear();
  }

  /**
   * Check if currently polling for a username
   * @param {string} username - Username to check
   * @returns {boolean} - Whether polling is active
   */
  isPolling(username) {
    return this.activePolls.has(username);
  }

  /**
   * Get current polling status
   * @returns {Object} - Current polling status
   */
  getPollingStatus() {
    return {
      activePolls: Array.from(this.activePolls.keys()),
      pollCount: this.activePolls.size,
    };
  }

  /**
   * Subscribe to account status updates for a specific username
   * @param {string} username - Username to subscribe to
   * @param {Function} callback - Callback function for status updates
   * @returns {Function} - Unsubscribe function
   */
  subscribe(username, callback) {
    if (!this.subscribers.has(username)) {
      this.subscribers.set(username, new Set());
    }

    this.subscribers.get(username).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(username);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(username);
        }
      }
    };
  }

  /**
   * Check account status once without polling
   * @param {string} username - Username to check
   * @returns {Promise} - Account status result
   */
  async checkOnce(username) {
    try {
      return await checkAccountStatus(username);
    } catch (error) {
      console.error(
        `❌ AccountStatusManager: Single check failed for ${username}:`,
        error
      );
      throw error;
    }
  }
}

// Create singleton instance
const accountStatusManager = new AccountStatusManager();

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  accountStatusManager.stopAllPolling();
});

export default accountStatusManager;
