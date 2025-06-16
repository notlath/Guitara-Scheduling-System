/**
 * Optimistic UI Updates Hook with Rollback
 * Implements Solution #2: Optimistic updates with automatic rollback
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook for optimistic UI updates with automatic rollback on failure
 * @param {string} dataType - Type of data being updated
 * @param {Function} updateFunction - Function to perform the actual update
 * @param {Object} options - Configuration options
 * @returns {Object} Optimistic update utilities
 */
export const useOptimisticUpdates = (
  dataType,
  updateFunction,
  options = {}
) => {
  const {
    rollbackDelay = 5000, // How long to wait before rolling back on error
    showRollbackMessage = true,
    onOptimisticStart,
    onOptimisticSuccess,
    onOptimisticFailure,
    onRollback,
  } = options;

  const [optimisticData, setOptimisticData] = useState(null);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [rollbackState, setRollbackState] = useState({
    isRollingBack: false,
    rollbackMessage: null,
    originalData: null,
  });

  const rollbackTimerRef = useRef(null);
  const operationIdRef = useRef(0);

  /**
   * Perform rollback to original state
   */
  const performRollback = useCallback(
    (operationId) => {
      console.log(
        `🔄 OptimisticUpdate: Rolling back operation ${operationId} for ${dataType}`
      );

      // Restore original data
      if (rollbackState.originalData) {
        setOptimisticData(rollbackState.originalData);
      } else {
        setOptimisticData(null);
      }

      // Clear optimistic state
      setIsOptimistic(false);

      // Update rollback state
      setRollbackState({
        isRollingBack: false,
        rollbackMessage: showRollbackMessage
          ? `Changes rolled back for ${dataType}`
          : null,
        originalData: null,
      });

      // Trigger rollback callback
      if (onRollback) {
        onRollback({ dataType, operationId });
      }

      // Clear rollback message after a short delay
      setTimeout(() => {
        setRollbackState((prev) => ({
          ...prev,
          rollbackMessage: null,
        }));
      }, 3000);
    },
    [dataType, rollbackState.originalData, showRollbackMessage, onRollback]
  );

  /**
   * Perform optimistic update with automatic rollback on failure
   */
  const performOptimisticUpdate = useCallback(
    async (newData, updatePayload, originalData = null) => {
      const operationId = ++operationIdRef.current;

      // Clear any existing rollback timer
      if (rollbackTimerRef.current) {
        clearTimeout(rollbackTimerRef.current);
        rollbackTimerRef.current = null;
      }

      // Store original data for potential rollback
      setRollbackState((prev) => ({
        ...prev,
        originalData: originalData || prev.originalData,
        isRollingBack: false,
        rollbackMessage: null,
      }));

      // Immediately update UI optimistically
      setOptimisticData(newData);
      setIsOptimistic(true);

      // Trigger optimistic start callback
      if (onOptimisticStart) {
        onOptimisticStart({ dataType, newData, operationId });
      }

      console.log(
        `⚡ OptimisticUpdate: Starting optimistic update for ${dataType}`,
        {
          operationId,
          dataType,
          hasNewData: !!newData,
        }
      );

      try {
        // Perform actual update
        const result = await updateFunction(updatePayload);

        // Verify this is still the current operation
        if (operationId !== operationIdRef.current) {
          console.warn(
            `⚠️ OptimisticUpdate: Operation ${operationId} superseded, ignoring result`
          );
          return result;
        }

        // Success - clear optimistic state
        setOptimisticData(null);
        setIsOptimistic(false);
        setRollbackState({
          isRollingBack: false,
          rollbackMessage: null,
          originalData: null,
        });

        // Trigger success callback
        if (onOptimisticSuccess) {
          onOptimisticSuccess({ dataType, result, operationId });
        }

        console.log(
          `✅ OptimisticUpdate: Successfully completed for ${dataType}`,
          {
            operationId,
            result,
          }
        );

        return result;
      } catch (error) {
        // Verify this is still the current operation
        if (operationId !== operationIdRef.current) {
          console.warn(
            `⚠️ OptimisticUpdate: Operation ${operationId} superseded, ignoring error`
          );
          throw error;
        }

        console.warn(
          `❌ OptimisticUpdate: Failed for ${dataType}, preparing rollback`,
          {
            operationId,
            error: error.message,
          }
        );

        // Trigger failure callback
        if (onOptimisticFailure) {
          onOptimisticFailure({ dataType, error, operationId });
        }

        // Start rollback process
        setRollbackState((prev) => ({
          ...prev,
          isRollingBack: true,
          rollbackMessage: showRollbackMessage
            ? `Update failed for ${dataType}. Rolling back changes...`
            : null,
        }));

        // Schedule rollback after delay
        rollbackTimerRef.current = setTimeout(() => {
          performRollback(operationId);
        }, rollbackDelay);

        throw error;
      }
    },
    [
      dataType,
      updateFunction,
      rollbackDelay,
      showRollbackMessage,
      onOptimisticStart,
      onOptimisticSuccess,
      onOptimisticFailure,
      performRollback,
    ]
  );

  /**
   * Force immediate rollback
   */
  const forceRollback = useCallback(() => {
    if (rollbackTimerRef.current) {
      clearTimeout(rollbackTimerRef.current);
      rollbackTimerRef.current = null;
    }

    performRollback(operationIdRef.current);
  }, [performRollback]);

  /**
   * Cancel pending rollback
   */
  const cancelRollback = useCallback(() => {
    if (rollbackTimerRef.current) {
      clearTimeout(rollbackTimerRef.current);
      rollbackTimerRef.current = null;
    }

    setRollbackState((prev) => ({
      ...prev,
      isRollingBack: false,
      rollbackMessage: null,
    }));

    console.log(`❌ OptimisticUpdate: Cancelled rollback for ${dataType}`);
  }, [dataType]);

  /**
   * Clear all optimistic state
   */
  const clearOptimisticState = useCallback(() => {
    if (rollbackTimerRef.current) {
      clearTimeout(rollbackTimerRef.current);
      rollbackTimerRef.current = null;
    }

    setOptimisticData(null);
    setIsOptimistic(false);
    setRollbackState({
      isRollingBack: false,
      rollbackMessage: null,
      originalData: null,
    });

    console.log(`🧹 OptimisticUpdate: Cleared all state for ${dataType}`);
  }, [dataType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rollbackTimerRef.current) {
        clearTimeout(rollbackTimerRef.current);
      }
    };
  }, []);

  return {
    // Data state
    optimisticData,
    isOptimistic,
    isRollingBack: rollbackState.isRollingBack,
    rollbackMessage: rollbackState.rollbackMessage,

    // Actions
    performOptimisticUpdate,
    forceRollback,
    cancelRollback,
    clearOptimisticState,

    // Status
    hasOptimisticChanges: isOptimistic || rollbackState.isRollingBack,
    operationId: operationIdRef.current,
  };
};

/**
 * Multi-item optimistic updates for list operations
 */
export const useOptimisticList = (
  dataType,
  listUpdateFunction,
  options = {}
) => {
  const [optimisticItems, setOptimisticItems] = useState(new Map());

  const { itemIdField = "id" } = options;

  /**
   * Add optimistic item to list
   */
  const addOptimisticItem = useCallback(
    async (item, updatePayload) => {
      const itemId = item[itemIdField];
      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add to optimistic items with temporary ID
      setOptimisticItems((prev) =>
        new Map(prev).set(tempId, {
          ...item,
          [itemIdField]: tempId,
          isOptimistic: true,
          originalId: itemId,
        })
      );

      try {
        const result = await listUpdateFunction("add", updatePayload);

        // Replace optimistic item with real result
        setOptimisticItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });

        return result;
      } catch (error) {
        // Remove failed optimistic item
        setOptimisticItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });

        throw error;
      }
    },
    [itemIdField, listUpdateFunction]
  );

  /**
   * Update optimistic item in list
   */
  const updateOptimisticItem = useCallback(
    async (itemId, updates, updatePayload) => {
      // Store original for rollback
      const originalItem = optimisticItems.get(itemId);

      // Update optimistically
      setOptimisticItems((prev) => {
        const newMap = new Map(prev);
        const currentItem = newMap.get(itemId) || {};
        newMap.set(itemId, {
          ...currentItem,
          ...updates,
          isOptimistic: true,
        });
        return newMap;
      });

      try {
        const result = await listUpdateFunction("update", updatePayload);

        // Clear optimistic state
        setOptimisticItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });

        return result;
      } catch (error) {
        // Rollback to original
        if (originalItem) {
          setOptimisticItems((prev) => new Map(prev).set(itemId, originalItem));
        } else {
          setOptimisticItems((prev) => {
            const newMap = new Map(prev);
            newMap.delete(itemId);
            return newMap;
          });
        }

        throw error;
      }
    },
    [optimisticItems, listUpdateFunction]
  );

  /**
   * Remove optimistic item from list
   */
  const removeOptimisticItem = useCallback(
    async (itemId, updatePayload) => {
      // Store original for potential rollback
      const originalItem = optimisticItems.get(itemId);

      // Mark as optimistically deleted
      setOptimisticItems((prev) =>
        new Map(prev).set(itemId, {
          ...originalItem,
          isOptimisticDeleted: true,
        })
      );

      try {
        const result = await listUpdateFunction("remove", updatePayload);

        // Permanently remove
        setOptimisticItems((prev) => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });

        return result;
      } catch (error) {
        // Restore item
        if (originalItem) {
          setOptimisticItems((prev) =>
            new Map(prev).set(itemId, {
              ...originalItem,
              isOptimisticDeleted: false,
            })
          );
        }

        throw error;
      }
    },
    [optimisticItems, listUpdateFunction]
  );

  return {
    optimisticItems: Array.from(optimisticItems.values()),
    addOptimisticItem,
    updateOptimisticItem,
    removeOptimisticItem,
    clearOptimisticItems: () => setOptimisticItems(new Map()),
    hasOptimisticChanges: optimisticItems.size > 0,
  };
};

export default useOptimisticUpdates;
