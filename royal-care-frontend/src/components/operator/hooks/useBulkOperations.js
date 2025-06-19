/**
 * Advanced Bulk Operations Hook
 * Handles complex bulk operations with progress tracking and error handling
 */
import { useCallback, useState } from "react";
import { useOptimisticUpdates } from "./useOptimisticUpdates";

export const useBulkOperations = () => {
  const [bulkProgress, setBulkProgress] = useState({});
  const [bulkErrors, setBulkErrors] = useState({});
  const { bulkUpdateAppointmentsOptimistically } = useOptimisticUpdates();

  // Execute bulk operation with progress tracking
  const executeBulkOperation = useCallback(
    async ({
      items = [],
      operation,
      optimisticUpdate = null,
      batchSize = 10,
      progressKey = "default",
    }) => {
      if (items.length === 0) return { success: [], errors: [] };

      // Initialize progress
      setBulkProgress((prev) => ({
        ...prev,
        [progressKey]: { total: items.length, completed: 0, percentage: 0 },
      }));
      setBulkErrors((prev) => ({ ...prev, [progressKey]: [] }));

      const results = { success: [], errors: [] };
      const itemIds = items.map((item) =>
        typeof item === "object" ? item.id : item
      );

      try {
        // Apply optimistic update if provided
        if (optimisticUpdate) {
          await bulkUpdateAppointmentsOptimistically(
            itemIds,
            optimisticUpdate,
            Promise.resolve() // Dummy promise for optimistic update
          );
        }

        // Process items in batches
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchPromises = batch.map(async (item) => {
            try {
              const result = await operation(item);
              results.success.push({ item, result });
              return { success: true, item, result };
            } catch (error) {
              const errorInfo = {
                item,
                error: error.message || "Unknown error",
              };
              results.errors.push(errorInfo);
              setBulkErrors((prev) => ({
                ...prev,
                [progressKey]: [...(prev[progressKey] || []), errorInfo],
              }));
              return { success: false, item, error };
            }
          });

          // Wait for batch to complete
          await Promise.allSettled(batchPromises);

          // Update progress
          const completed = Math.min(i + batchSize, items.length);
          const percentage = Math.round((completed / items.length) * 100);
          setBulkProgress((prev) => ({
            ...prev,
            [progressKey]: { total: items.length, completed, percentage },
          }));
        }

        return results;
      } catch (error) {
        setBulkErrors((prev) => ({
          ...prev,
          [progressKey]: [
            ...(prev[progressKey] || []),
            { error: error.message },
          ],
        }));
        throw error;
      } finally {
        // Clear progress after a delay
        setTimeout(() => {
          setBulkProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[progressKey];
            return newProgress;
          });
        }, 3000);
      }
    },
    [bulkUpdateAppointmentsOptimistically]
  );

  // Bulk approve appointments
  const bulkApproveAppointments = useCallback(
    async (appointmentIds) => {
      return executeBulkOperation({
        items: appointmentIds,
        operation: async (appointmentId) => {
          const response = await fetch(
            `/api/appointments/${appointmentId}/approve/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!response.ok)
            throw new Error(`Approval failed: ${response.statusText}`);
          return response.json();
        },
        optimisticUpdate: { status: "confirmed" },
        progressKey: "bulk_approve",
      });
    },
    [executeBulkOperation]
  );

  // Bulk assign drivers
  const bulkAssignDrivers = useCallback(
    async (assignments) => {
      return executeBulkOperation({
        items: assignments,
        operation: async ({ appointmentId, driverId }) => {
          const response = await fetch(
            `/api/appointments/${appointmentId}/assign_driver/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ driver_id: driverId }),
            }
          );
          if (!response.ok)
            throw new Error(`Driver assignment failed: ${response.statusText}`);
          return response.json();
        },
        optimisticUpdate: null, // Don't optimistically update as driver assignment is complex
        progressKey: "bulk_assign_drivers",
      });
    },
    [executeBulkOperation]
  );

  // Bulk mark as paid
  const bulkMarkAsPaid = useCallback(
    async (appointmentIds, paymentData = {}) => {
      return executeBulkOperation({
        items: appointmentIds,
        operation: async (appointmentId) => {
          const response = await fetch(
            `/api/appointments/${appointmentId}/mark_paid/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(paymentData),
            }
          );
          if (!response.ok)
            throw new Error(`Payment marking failed: ${response.statusText}`);
          return response.json();
        },
        optimisticUpdate: { status: "payment_completed" },
        progressKey: "bulk_mark_paid",
      });
    },
    [executeBulkOperation]
  );

  // Bulk cancel appointments
  const bulkCancelAppointments = useCallback(
    async (appointmentIds, reason = "") => {
      return executeBulkOperation({
        items: appointmentIds,
        operation: async (appointmentId) => {
          const response = await fetch(
            `/api/appointments/${appointmentId}/cancel/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            }
          );
          if (!response.ok)
            throw new Error(`Cancellation failed: ${response.statusText}`);
          return response.json();
        },
        optimisticUpdate: { status: "cancelled", cancellation_reason: reason },
        progressKey: "bulk_cancel",
      });
    },
    [executeBulkOperation]
  );

  // Get progress for a specific operation
  const getProgress = useCallback(
    (progressKey) => {
      return bulkProgress[progressKey] || null;
    },
    [bulkProgress]
  );

  // Get errors for a specific operation
  const getErrors = useCallback(
    (progressKey) => {
      return bulkErrors[progressKey] || [];
    },
    [bulkErrors]
  );

  // Clear errors for a specific operation
  const clearErrors = useCallback((progressKey) => {
    setBulkErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[progressKey];
      return newErrors;
    });
  }, []);

  return {
    // Core bulk operations
    executeBulkOperation,
    bulkApproveAppointments,
    bulkAssignDrivers,
    bulkMarkAsPaid,
    bulkCancelAppointments,

    // Progress and error management
    getProgress,
    getErrors,
    clearErrors,
    bulkProgress,
    bulkErrors,

    // Utility functions
    isOperationInProgress: (progressKey) => !!bulkProgress[progressKey],
    hasErrors: (progressKey) => (bulkErrors[progressKey] || []).length > 0,
  };
};

export default useBulkOperations;
