/**
 * TanStack Query hooks for availability checking
 * Replaces complex debounced logic in AppointmentForm
 */

import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  fetchAvailableDrivers,
  fetchAvailableTherapists,
} from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";
import { isValidToken } from "../utils/authUtils";

// Utility function to format date to yyyy-MM-dd
const formatDateForAPI = (dateValue) => {
  if (!dateValue) return "";
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split("T")[0];
  }
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    return dateValue.split("T")[0];
  }
  if (typeof dateValue === "string" && dateValue.includes("GMT")) {
    // Handle date strings like "Thu Jun 26 2025 00:00:00 GMT+0800"
    return new Date(dateValue).toISOString().split("T")[0];
  }
  return dateValue;
};

/**
 * Hook for fetching available therapists
 * Replaces: Complex useEffect with debouncing in AppointmentForm
 */
export const useAvailableTherapists = (
  date,
  startTime,
  serviceId,
  endTime = null
) => {
  const dispatch = useDispatch();

  // Calculate endTime if not provided - ensure HH:MM format only
  let computedEndTime = endTime;
  if (!computedEndTime && startTime && serviceId) {
    // Ensure startTime is in HH:MM format (remove seconds if present)
    const cleanStartTime = startTime.slice(0, 5);
    const [h, m] = cleanStartTime.split(":").map(Number);
    const start = new Date(0, 0, 0, h, m);
    start.setMinutes(start.getMinutes() + 60); // +60 min
    // Format as HH:MM only (not HH:MM:SS)
    const hours = start.getHours().toString().padStart(2, '0');
    const minutes = start.getMinutes().toString().padStart(2, '0');
    computedEndTime = `${hours}:${minutes}`;
  }
  
  // Ensure all times are in HH:MM format
  const cleanStartTime = startTime ? startTime.slice(0, 5) : startTime;
  const cleanEndTime = computedEndTime ? computedEndTime.slice(0, 5) : computedEndTime;

  return useQuery({
    queryKey: queryKeys.availability.therapists(date, startTime, serviceId),
    queryFn: async () => {
      // Enhanced debugging for availability issues
      console.log("🔍 AVAILABILITY DEBUG - useAvailableTherapists:");
      console.log("  Token exists:", !!isValidToken());
      console.log("  Parameters:", {
        date: formatDateForAPI(date),
        startTime: cleanStartTime,
        serviceId,
        endTime: cleanEndTime,
      });

      const params = {
        date: formatDateForAPI(date),
        start_time: cleanStartTime,
        service_id: serviceId,
        end_time: cleanEndTime,
      };

      try {
        const result = await dispatch(fetchAvailableTherapists(params)).unwrap();
        console.log("✅ AVAILABILITY SUCCESS - therapists:", result.length);
        return result;
      } catch (error) {
        console.error("❌ AVAILABILITY ERROR - therapists:", error);
        // Provide more helpful error message for authentication issues
        if (
          error?.error === "Authentication required" ||
          error?.detail?.includes("Authentication")
        ) {
          throw new Error("Please log in again - your session may have expired");
        }
        throw error;
      }
    },
    enabled: !!(
      date &&
      startTime &&
      serviceId &&
      computedEndTime &&
      isValidToken()
    ),
    staleTime: 2 * 60 * 1000, // 2 minutes (your current therapist TTL)
    retry: 1,
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

/**
 * Hook for fetching available drivers
 * Replaces: Parallel fetching logic in AppointmentForm
 */
export const useAvailableDrivers = (date, startTime, endTime = null) => {
  const dispatch = useDispatch();

  // Calculate endTime if not provided - ensure HH:MM format only
  let computedEndTime = endTime;
  if (!computedEndTime && startTime) {
    // Ensure startTime is in HH:MM format (remove seconds if present)
    const cleanStartTime = startTime.slice(0, 5);
    const [h, m] = cleanStartTime.split(":").map(Number);
    const start = new Date(0, 0, 0, h, m);
    start.setMinutes(start.getMinutes() + 60);
    // Format as HH:MM only (not HH:MM:SS)
    const hours = start.getHours().toString().padStart(2, '0');
    const minutes = start.getMinutes().toString().padStart(2, '0');
    computedEndTime = `${hours}:${minutes}`;
  }
  
  // Ensure all times are in HH:MM format
  const cleanStartTime = startTime ? startTime.slice(0, 5) : startTime;
  const cleanEndTime = computedEndTime ? computedEndTime.slice(0, 5) : computedEndTime;

  return useQuery({
    queryKey: queryKeys.availability.drivers(date, startTime),
    queryFn: async () => {
      // Enhanced debugging for availability issues
      console.log("🔍 AVAILABILITY DEBUG - useAvailableDrivers:");
      console.log("  Token exists:", !!isValidToken());
      console.log("  Parameters:", {
        date: formatDateForAPI(date),
        startTime: cleanStartTime,
        endTime: cleanEndTime,
      });

      const params = {
        date: formatDateForAPI(date),
        start_time: cleanStartTime,
        end_time: cleanEndTime,
      };

      try {
        const result = await dispatch(fetchAvailableDrivers(params)).unwrap();
        console.log("✅ AVAILABILITY SUCCESS - drivers:", result.length);
        return result;
      } catch (error) {
        console.error("❌ AVAILABILITY ERROR - drivers:", error);
        // Provide more helpful error message for authentication issues
        if (
          error?.error === "Authentication required" ||
          error?.detail?.includes("Authentication")
        ) {
          throw new Error("Please log in again - your session may have expired");
        }
        throw error;
      }
    },
    enabled: !!(date && startTime && computedEndTime && isValidToken()),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

/**
 * Combined hook for form availability
 * Replaces: Complex availability management in AppointmentForm
 *
 * 🔥 BEFORE: 200+ lines of complex useEffect logic with debouncing
 * 🎉 AFTER: 15 lines of clean, declarative code
 */
export const useFormAvailability = (formData) => {
  const { date, start_time, services, end_time } = formData;

  const therapistsQuery = useAvailableTherapists(
    date,
    start_time,
    services,
    end_time
  );

  const driversQuery = useAvailableDrivers(date, start_time, end_time);

  return {
    // Available staff
    availableTherapists: therapistsQuery.data || [],
    availableDrivers: driversQuery.data || [],

    // Loading states
    isLoadingTherapists: therapistsQuery.isLoading,
    isLoadingDrivers: driversQuery.isLoading,
    isLoadingAvailability: therapistsQuery.isLoading || driversQuery.isLoading,

    // Error states
    therapistError: therapistsQuery.error,
    driverError: driversQuery.error,
    hasAvailabilityError: !!(therapistsQuery.error || driversQuery.error),

    // Query states
    canFetchAvailability: !!(date && start_time && services),

    // Refetch functions (for manual refresh)
    refetchTherapists: therapistsQuery.refetch,
    refetchDrivers: driversQuery.refetch,
    refetchAll: () => {
      therapistsQuery.refetch();
      driversQuery.refetch();
    },
  };
};

/**
 * Hook with automatic refetching based on form changes
 * Replaces: useEffect with dependency array in AppointmentForm
 */
export const useFormAvailabilityWithRefetch = (formData, options = {}) => {
  const { autoRefetch = true, refetchInterval = null } = options;

  const availability = useFormAvailability(formData);

  // Auto-refetch when form changes and we have required data
  const shouldAutoRefetch =
    autoRefetch &&
    availability.canFetchAvailability &&
    !availability.isLoadingAvailability;

  return {
    ...availability,
    shouldAutoRefetch,
    refetchInterval,
  };
};

/**
 * Optimized hook for real-time availability updates
 * Integrates with your WebSocket updates
 */
export const useRealtimeAvailability = (date, startTime, serviceId) => {
  const therapists = useAvailableTherapists(date, startTime, serviceId);
  const drivers = useAvailableDrivers(date, startTime);

  // This would integrate with your WebSocket service
  // For now, just return the basic queries
  return {
    therapists: therapists.data || [],
    drivers: drivers.data || [],
    isLoading: therapists.isLoading || drivers.isLoading,
    error: therapists.error || drivers.error,
    refetch: () => {
      therapists.refetch();
      drivers.refetch();
    },
  };
};
