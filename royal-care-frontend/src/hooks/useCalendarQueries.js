/**
 * TanStack Query hooks for Calendar component
 * Replaces Redux-based data fetching with declarative TanStack Query
 */

import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  fetchAppointmentsByDate,
  fetchAvailableDrivers,
  fetchAvailableTherapists,
} from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";

/**
 * Hook for fetching appointments by date
 * Replaces: dispatch(fetchAppointmentsByDate(date))
 */
export const useAppointmentsByDate = (date) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.appointments.byWeek(date),
    queryFn: async () => {
      console.log("useAppointmentsByDate: Fetching for date:", date);
      const result = await dispatch(fetchAppointmentsByDate(date));
      console.log("useAppointmentsByDate: Result:", result);
      console.log("useAppointmentsByDate: Payload:", result.payload);
      return result.payload || [];
    },
    enabled: !!date, // Only run when date is provided
    staleTime: 30 * 1000, // 30 seconds - appointments change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
};

/**
 * Hook for fetching available therapists
 * Replaces: dispatch(fetchAvailableTherapists(params))
 */
export const useAvailableTherapists = (params) => {
  const dispatch = useDispatch();
  const { date, start_time, end_time } = params || {};

  return useQuery({
    queryKey: queryKeys.availability.therapists(date, start_time, "calendar"),
    queryFn: async () => {
      const result = await dispatch(fetchAvailableTherapists(params));
      return result.payload || [];
    },
    enabled: !!(date && start_time && end_time),
    staleTime: 60 * 1000, // 1 minute - availability changes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook for fetching available drivers
 * Replaces: dispatch(fetchAvailableDrivers(params))
 */
export const useAvailableDrivers = (params) => {
  const dispatch = useDispatch();
  const { date, start_time, end_time } = params || {};

  return useQuery({
    queryKey: queryKeys.availability.drivers(date, start_time),
    queryFn: async () => {
      const result = await dispatch(fetchAvailableDrivers(params));
      return result.payload || [];
    },
    enabled: !!(date && start_time && end_time),
    staleTime: 60 * 1000, // 1 minute - availability changes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Combined hook for calendar data
 * Replaces multiple useSelector calls and provides unified loading state
 */
export const useCalendarData = (
  selectedDate,
  operatingHours = { start: "13:00", end: "01:00" }
) => {
  // Use today's date if no selectedDate is provided (for Time Slots Preview)
  const dateToUse = selectedDate || new Date();
  const formattedDate = formatDate(dateToUse);

  console.log("=== useCalendarData DEBUG ===");
  console.log("selectedDate:", selectedDate);
  console.log("dateToUse:", dateToUse);
  console.log("formattedDate:", formattedDate);

  const appointmentsQuery = useAppointmentsByDate(formattedDate);

  const availabilityParams = formattedDate
    ? {
        date: formattedDate,
        start_time: operatingHours.start,
        end_time: operatingHours.end,
      }
    : null;

  const therapistsQuery = useAvailableTherapists(availabilityParams);
  const driversQuery = useAvailableDrivers(availabilityParams);

  return {
    // Data (matches Redux structure) - ensure arrays are always returned
    appointmentsByDate: Array.isArray(appointmentsQuery.data)
      ? appointmentsQuery.data
      : [],
    appointments: Array.isArray(appointmentsQuery.data)
      ? appointmentsQuery.data
      : [], // Alias for month view compatibility
    availableTherapists: Array.isArray(therapistsQuery.data)
      ? therapistsQuery.data
      : [],
    availableDrivers: Array.isArray(driversQuery.data) ? driversQuery.data : [],

    // Loading states (matches Redux loading)
    loading:
      appointmentsQuery.isLoading ||
      therapistsQuery.isLoading ||
      driversQuery.isLoading,
    isFetching:
      appointmentsQuery.isFetching ||
      therapistsQuery.isFetching ||
      driversQuery.isFetching,

    // Error states
    error:
      appointmentsQuery.error || therapistsQuery.error || driversQuery.error,

    // Refetch functions for manual refresh
    refetchAll: () => {
      appointmentsQuery.refetch();
      therapistsQuery.refetch();
      driversQuery.refetch();
    },

    // Specific refetch functions (replaces dispatch calls)
    refetchAppointments: appointmentsQuery.refetch,
    refetchAvailability: () => {
      therapistsQuery.refetch();
      driversQuery.refetch();
    },

    // Individual queries for advanced usage
    queries: {
      appointments: appointmentsQuery,
      therapists: therapistsQuery,
      drivers: driversQuery,
    },
  };
};

/**
 * Hook for today's calendar data
 * Auto-fetches today's data on mount (replaces initial useEffect)
 */
export const useTodayCalendarData = () => {
  const today = new Date();
  return useCalendarData(today);
};

/**
 * Hook for manual data refetching when dates change
 * Replaces dispatch calls in handleDateClick and other functions
 */
export const useCalendarRefetch = () => {
  const dispatch = useDispatch();

  const refetchForDate = (date) => {
    // Format the date
    const formattedDate = formatDate(date);
    if (!formattedDate) return;

    // Create the availability params
    const params = {
      date: formattedDate,
      start_time: "13:00", // 1 PM
      end_time: "01:00", // 1 AM next day
    };

    // Return promises that can be awaited
    return Promise.all([
      dispatch(fetchAppointmentsByDate(formattedDate)),
      dispatch(fetchAvailableTherapists(params)),
      dispatch(fetchAvailableDrivers(params)),
    ]);
  };

  const refetchAvailabilityForTimeSlot = (date, startTime, endTime) => {
    const formattedDate = formatDate(date);
    if (!formattedDate) return;

    const params = {
      date: formattedDate,
      start_time: startTime,
      end_time: endTime,
    };

    return Promise.all([
      dispatch(fetchAvailableTherapists(params)),
      dispatch(fetchAvailableDrivers(params)),
    ]);
  };

  return {
    refetchForDate,
    refetchAvailabilityForTimeSlot,
  };
};

// Helper function to format date consistently
const formatDate = (date) => {
  try {
    if (!date || isNaN(date.getTime())) {
      console.warn("Invalid date provided to formatDate");
      return "";
    }
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  } catch (err) {
    console.error("Error formatting date:", err);
    return "";
  }
};
