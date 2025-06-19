/**
 * Optimistic Updates Hook
 * Custom implementation without external dependencies
 * Provides optimistic UI updates for better user experience
 */
import { useCallback, useRef, useState } from "react";

// Simple state manager for optimistic updates
class OptimisticStateManager {
  constructor() {
    this.state = new Map();
    this.rollbackData = new Map();
    this.subscribers = new Map();
  }

  // Get current state
  getState(key) {
    return this.state.get(key);
  }

  // Set state and notify subscribers
  setState(key, data) {
    this.state.set(key, data);
    this.notifySubscribers(key, data);
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      const keySubscribers = this.subscribers.get(key);
      if (keySubscribers) {
        keySubscribers.delete(callback);
        if (keySubscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  // Notify subscribers of state changes
  notifySubscribers(key, data) {
    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach((callback) => callback(data));
    }
  }

  // Store rollback data
  storeRollback(rollbackId, data) {
    this.rollbackData.set(rollbackId, data);
  }

  // Get rollback data
  getRollback(rollbackId) {
    return this.rollbackData.get(rollbackId);
  }

  // Clear rollback data
  clearRollback(rollbackId) {
    this.rollbackData.delete(rollbackId);
  }
}

// Global state manager instance
const globalStateManager = new OptimisticStateManager();

export const useOptimisticUpdates = () => {
  const [, forceUpdate] = useState({});
  const rollbackRef = useRef(new Map());

  // Force component re-render
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Perform optimistic update
  const performOptimisticUpdate = useCallback(
    async ({ queryKey, updateFn, mutationPromise }) => {
      // Create unique rollback ID
      const rollbackId = `${queryKey.join("_")}_${Date.now()}`;
      const keyString = queryKey.join("_");

      // Store current data for rollback
      const previousData = globalStateManager.getState(keyString);
      globalStateManager.storeRollback(rollbackId, previousData);

      try {
        // Apply optimistic update
        const optimisticData = updateFn(previousData);
        globalStateManager.setState(keyString, optimisticData);
        triggerUpdate();

        // Execute actual mutation
        const result = await mutationPromise;

        // Update with real data from server
        const finalData =
          typeof result === "function"
            ? result(globalStateManager.getState(keyString))
            : result;

        globalStateManager.setState(keyString, finalData);
        triggerUpdate();

        // Clean up rollback data
        globalStateManager.clearRollback(rollbackId);

        return result;
      } catch (error) {
        // Rollback on error
        const rollbackData = globalStateManager.getRollback(rollbackId);
        if (rollbackData !== undefined) {
          globalStateManager.setState(keyString, rollbackData);
          triggerUpdate();
        }
        globalStateManager.clearRollback(rollbackId);
        throw error;
      }
    },
    [triggerUpdate]
  );

  // Update appointment optimistically
  const updateAppointmentOptimistically = useCallback(
    async (appointmentId, updateData, mutationPromise) => {
      return performOptimisticUpdate({
        queryKey: ["appointments"],
        updateFn: (currentData = []) =>
          currentData.map((apt) =>
            apt.id === appointmentId ? { ...apt, ...updateData } : apt
          ),
        mutationPromise,
      });
    },
    [performOptimisticUpdate]
  );

  // Update driver optimistically
  const updateDriverOptimistically = useCallback(
    async (driverId, updateData, mutationPromise) => {
      return performOptimisticUpdate({
        queryKey: ["drivers"],
        updateFn: (currentData = []) =>
          currentData.map((driver) =>
            driver.id === driverId ? { ...driver, ...updateData } : driver
          ),
        mutationPromise,
      });
    },
    [performOptimisticUpdate]
  );

  // Bulk update appointments optimistically
  const bulkUpdateAppointmentsOptimistically = useCallback(
    async (appointmentIds, updateData, mutationPromise) => {
      return performOptimisticUpdate({
        queryKey: ["appointments"],
        updateFn: (currentData = []) =>
          currentData.map((apt) =>
            appointmentIds.includes(apt.id) ? { ...apt, ...updateData } : apt
          ),
        mutationPromise,
      });
    },
    [performOptimisticUpdate]
  );

  // Get current optimistic state
  const getOptimisticState = useCallback((queryKey) => {
    const keyString = queryKey.join("_");
    return globalStateManager.getState(keyString);
  }, []);

  // Set initial state
  const setInitialState = useCallback((queryKey, data) => {
    const keyString = queryKey.join("_");
    globalStateManager.setState(keyString, data);
  }, []);

  // Subscribe to state changes
  const subscribeToState = useCallback((queryKey, callback) => {
    const keyString = queryKey.join("_");
    return globalStateManager.subscribe(keyString, callback);
  }, []);

  return {
    performOptimisticUpdate,
    updateAppointmentOptimistically,
    updateDriverOptimistically,
    bulkUpdateAppointmentsOptimistically,
    getOptimisticState,
    setInitialState,
    subscribeToState,
  };
};

export default useOptimisticUpdates;
