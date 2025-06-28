/**
 * TanStack Query hooks for availability mutations (create, update, delete)
 *
 * This file provides hooks that automatically invalidate the availability cache
 * when adding, updating, or deleting availability records to ensure the UI
 * shows updated availability immediately.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  createAvailability,
  deleteAvailability,
  fetchAvailability,
  updateAvailability,
} from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";
import { invalidateAvailabilityCaches } from "../utils/cacheInvalidation";

/**
 * Hook for creating availability with automatic cache invalidation
 *
 * Usage:
 * const createMutation = useCreateAvailability();
 * createMutation.mutate({
 *   user: staffId,
 *   date: "2025-06-29",
 *   start_time: "13:00",
 *   end_time: "14:00",
 *   is_available: true
 * });
 */
export const useCreateAvailability = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availabilityData) => {
      const result = await dispatch(
        createAvailability(availabilityData)
      ).unwrap();
      return result;
    },

    onMutate: async (newAvailability) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: queryKeys.availability.staff(
          newAvailability.user,
          newAvailability.date
        ),
      });

      // Snapshot the previous value
      const previousAvailabilities = queryClient.getQueryData(
        queryKeys.availability.staff(newAvailability.user, newAvailability.date)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.availability.staff(
          newAvailability.user,
          newAvailability.date
        ),
        (old) =>
          old
            ? [
                ...old,
                {
                  ...newAvailability,
                  id: `temp-${Date.now()}`,
                  created_at: new Date().toISOString(),
                },
              ]
            : [newAvailability]
      );

      // Return a context object with the snapshotted value
      return { previousAvailabilities };
    },

    onError: (err, newAvailability, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(
        queryKeys.availability.staff(
          newAvailability.user,
          newAvailability.date
        ),
        context.previousAvailabilities
      );
    },

    onSuccess: (result, variables) => {
      // Use the specialized availability cache invalidation helper
      invalidateAvailabilityCaches(queryClient, {
        staffId: variables.user,
        date: variables.date,
        userRole: result.user_role || (variables.user ? "therapist" : null), // Detect role if available
      });

      console.log("✅ Availability created successfully - cache invalidated");
    },
  });
};

/**
 * Hook for updating availability with automatic cache invalidation
 *
 * Usage:
 * const updateMutation = useUpdateAvailability();
 * updateMutation.mutate({
 *   id: availabilityId,
 *   data: { is_available: !currentAvailability.is_available }
 * });
 */
export const useUpdateAvailability = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await dispatch(
        updateAvailability({ id, ...data })
      ).unwrap();
      return result;
    },

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.availability.all });

      // Snapshot the previous value
      const previousAvailabilities = queryClient.getQueryData(
        queryKeys.availability.all
      );

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: queryKeys.availability.all },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((avail) =>
            avail.id === id ? { ...avail, ...data } : avail
          );
        }
      );

      // Also update specific staff/date queries
      queryClient.setQueriesData(
        { queryKey: ["availability", "staff"] },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((avail) =>
            avail.id === id ? { ...avail, ...data } : avail
          );
        }
      );

      return { previousAvailabilities };
    },

    onError: (err, variables, context) => {
      // Rollback optimistic updates
      queryClient.setQueryData(
        queryKeys.availability.all,
        context.previousAvailabilities
      );
    },

    onSuccess: (result) => {
      // Use the specialized availability cache invalidation helper
      invalidateAvailabilityCaches(queryClient, {
        staffId: result.user,
        date: result.date,
        userRole: result.user_role,
      });

      console.log("✅ Availability updated successfully - cache invalidated");
    },
  });
};

/**
 * Hook for deleting availability with automatic cache invalidation
 *
 * Usage:
 * const deleteMutation = useDeleteAvailability();
 * deleteMutation.mutate(availabilityId);
 */
export const useDeleteAvailability = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availabilityId) => {
      const result = await dispatch(
        deleteAvailability(availabilityId)
      ).unwrap();
      return result;
    },

    onMutate: async (availabilityId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.availability.all });

      // Snapshot the previous value
      const previousAvailabilities = queryClient.getQueryData(
        queryKeys.availability.all
      );

      // Optimistically remove the deleted availability
      queryClient.setQueriesData(
        { queryKey: queryKeys.availability.all },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((avail) => avail.id !== availabilityId);
        }
      );

      // Also update specific staff/date queries
      queryClient.setQueriesData(
        { queryKey: ["availability", "staff"] },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.filter((avail) => avail.id !== availabilityId);
        }
      );

      return { previousAvailabilities };
    },

    onError: (err, availabilityId, context) => {
      // Rollback optimistic updates
      queryClient.setQueryData(
        queryKeys.availability.all,
        context.previousAvailabilities
      );
    },

    onSuccess: () => {
      // Use the specialized availability cache invalidation helper
      invalidateAvailabilityCaches(queryClient);

      console.log("✅ Availability deleted successfully - cache invalidated");
    },
  });
};

/**
 * Hook for fetching availability for a specific staff member and date
 *
 * Usage:
 * const { data: availabilities, isLoading, error } = useStaffAvailability(staffId, date);
 */
export const useStaffAvailability = (staffId, date) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.availability.staff(staffId, date),
    queryFn: async () => {
      const result = await dispatch(
        fetchAvailability({ staffId, date, forceRefresh: true })
      ).unwrap();
      return result.data || [];
    },
    enabled: !!(staffId && date),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
};

export default {
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  useStaffAvailability,
};
