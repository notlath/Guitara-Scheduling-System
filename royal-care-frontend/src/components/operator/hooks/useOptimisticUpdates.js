/**
 * Optimistic Updates Hook
 * Provides optimistic UI updates for better user experience
 */
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();
  const rollbackRef = useRef(new Map());

  // Perform optimistic update
  const performOptimisticUpdate = useCallback(async ({
    queryKey,
    updateFn,
    mutationPromise
  }) => {
    // Store rollback data
    const rollbackId = `${queryKey.join('_')}_${Date.now()}`;
    const previousData = queryClient.getQueryData(queryKey);
    rollbackRef.current.set(rollbackId, previousData);

    try {
      // Apply optimistic update
      queryClient.setQueryData(queryKey, updateFn);

      // Execute actual mutation
      const result = await mutationPromise;

      // Update with real data from server
      queryClient.setQueryData(queryKey, (currentData) => {
        if (typeof result === 'function') {
          return result(currentData);
        }
        return result;
      });

      // Clean up rollback data
      rollbackRef.current.delete(rollbackId);

      return result;
    } catch (error) {
      // Rollback on error
      const rollbackData = rollbackRef.current.get(rollbackId);
      if (rollbackData !== undefined) {
        queryClient.setQueryData(queryKey, rollbackData);
      }
      rollbackRef.current.delete(rollbackId);
      throw error;
    }
  }, [queryClient]);

  // Update appointment optimistically
  const updateAppointmentOptimistically = useCallback(async (
    appointmentId,
    updateData,
    mutationPromise
  ) => {
    return performOptimisticUpdate({
      queryKey: ['appointments'],
      updateFn: (currentData = []) => 
        currentData.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, ...updateData }
            : apt
        ),
      mutationPromise
    });
  }, [performOptimisticUpdate]);

  // Update driver optimistically
  const updateDriverOptimistically = useCallback(async (
    driverId,
    updateData,
    mutationPromise
  ) => {
    return performOptimisticUpdate({
      queryKey: ['drivers'],
      updateFn: (currentData = []) =>
        currentData.map(driver =>
          driver.id === driverId
            ? { ...driver, ...updateData }
            : driver
        ),
      mutationPromise
    });
  }, [performOptimisticUpdate]);

  // Bulk update appointments optimistically
  const bulkUpdateAppointmentsOptimistically = useCallback(async (
    appointmentIds,
    updateData,
    mutationPromise
  ) => {
    return performOptimisticUpdate({
      queryKey: ['appointments'],
      updateFn: (currentData = []) =>
        currentData.map(apt =>
          appointmentIds.includes(apt.id)
            ? { ...apt, ...updateData }
            : apt
        ),
      mutationPromise
    });
  }, [performOptimisticUpdate]);

  return {
    performOptimisticUpdate,
    updateAppointmentOptimistically,
    updateDriverOptimistically,
    bulkUpdateAppointmentsOptimistically
  };
};

export default useOptimisticUpdates;
