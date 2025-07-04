/**
 * TanStack Query Client Configuration
 * Optimized for real-time scheduling system
 */

import { QueryClient } from "@tanstack/react-query";

// Create query client with optimized defaults for real-time scheduling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // More aggressive stale time for real-time inventory data
      staleTime: 0, // Always consider data stale for immediate freshness

      // Shorter cache time for inventory data
      gcTime: 2 * 60 * 1000, // 2 minutes (was 10 minutes)

      // Enable background refetching for real-time updates
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true, // Always refetch on mount

      // Retry configuration for robust network handling
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on network error
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Appointments - hierarchical structure for better cache control
  appointments: {
    all: ["appointments"],
    list: () => ["appointments", "list"],
    today: () => ["appointments", "today"],
    upcoming: () => ["appointments", "upcoming"],
    byWeek: (date) => ["appointments", "week", date],
    byMonth: (year, month) => ["appointments", "month", year, month],
    byId: (id) => ["appointments", id],
    byTherapist: (therapistId, type) => [
      "appointments",
      "therapist",
      therapistId,
      type,
    ],
    byDriver: (driverId, type) => ["appointments", "driver", driverId, type],
  },

  // Availability
  availability: {
    all: ["availability"],
    therapists: (date, startTime, serviceId) => [
      "availability",
      "therapists",
      date,
      startTime,
      serviceId,
    ],
    drivers: (date, startTime) => ["availability", "drivers", date, startTime],
    staff: (staffId, date) => ["availability", "staff", staffId, date],
  },

  // Static data (longer cache times)
  clients: {
    all: ["clients"],
    list: () => ["clients", "list"],
    search: (query) => ["clients", "search", query],
    byId: (id) => ["clients", id],
  },

  services: {
    all: ["services"],
    list: () => ["services", "list"],
  },

  staff: {
    all: ["staff"],
    list: () => ["staff", "list"],
    therapists: () => ["staff", "therapists"],
    drivers: () => ["staff", "drivers"],
    byId: (id) => ["staff", id],
  },

  // Notifications
  notifications: {
    all: ["notifications"],
    list: () => ["notifications", "list"],
    unread: () => ["notifications", "unread"],
  },

  // Inventory Items
  inventoryItems: {
    all: ["inventory-items"],
    list: () => ["inventory-items", "list"],
    byId: (id) => ["inventory-items", id],
  },

  // Attendance
  attendance: {
    all: ["attendance"],
    list: () => ["attendance", "list"],
    byDate: (date) => ["attendance", date],
    byId: (id) => ["attendance", id],
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"],
    operator: ["dashboard", "operator"],
    therapist: (therapistId) => ["dashboard", "therapist", therapistId],
    driver: (driverId) => ["dashboard", "driver", driverId],
  },

  // Settings/Registration data
  registration: {
    all: ["registration"],
    therapists: {
      all: ["registration", "therapists"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "therapists",
        "list",
        page,
        pageSize,
      ],
    },
    drivers: {
      all: ["registration", "drivers"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "drivers",
        "list",
        page,
        pageSize,
      ],
    },
    operators: {
      all: ["registration", "operators"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "operators",
        "list",
        page,
        pageSize,
      ],
    },
    clients: {
      all: ["registration", "clients"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "clients",
        "list",
        page,
        pageSize,
      ],
    },
    services: {
      all: ["registration", "services"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "services",
        "list",
        page,
        pageSize,
      ],
    },
    materials: {
      all: ["registration", "materials"],
      list: (page = 1, pageSize = 12) => [
        "registration",
        "materials",
        "list",
        page,
        pageSize,
      ],
    },
  },
};

// Stale time constants for different data types
export const queryUtils = {
  staleTime: {
    SHORT: 3 * 60 * 1000, // 3 minutes - for frequently changing data
    MEDIUM: 10 * 60 * 1000, // 10 minutes - for moderate update frequency
    LONG: 30 * 60 * 1000, // 30 minutes - for relatively static data
  },
};

// Custom query client methods for real-time updates
export const queryClientUtils = {
  // Invalidate appointment-related queries
  invalidateAppointments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today() });
    queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.upcoming(),
    });
    // Also invalidate inventory when appointments change (material deduction/return)
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems.all });
  },

  // Update appointment optimistically
  // Update appointment optimistically
  updateAppointmentOptimistically: (appointmentId, updates) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.appointments.all },
      (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((apt) =>
          apt.id === appointmentId ? { ...apt, ...updates } : apt
        );
      }
    );
  },

  // Invalidate availability queries
  invalidateAvailability: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.availability.all });
  },

  // PHASE 1 - STEP 2A: Smart availability invalidation
  invalidateAvailabilityForDate: (date) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.availability.all,
      predicate: (query) => {
        // Invalidate availability queries that match the date
        const queryKey = query.queryKey;
        return queryKey.includes(date);
      },
    });
  },

  // PHASE 1 - STEP 2B: Invalidate availability when appointments change
  invalidateAvailabilityAfterAppointment: (appointmentData) => {
    const { date } = appointmentData;

    // Invalidate all availability for the date
    if (date) {
      queryClientUtils.invalidateAvailabilityForDate(date);
    }

    // Invalidate general availability
    queryClient.invalidateQueries({ queryKey: queryKeys.availability.all });
  },

  // Prefetch today's appointments
  prefetchTodayAppointments: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.appointments.today(),
      staleTime: 2 * 60 * 1000,
    });
  },

  // PHASE 1 - STEP 2C: Prefetch availability for common time slots
  prefetchAvailability: (date) => {
    const commonTimeSlots = [
      { start: "09:00", end: "10:00" },
      { start: "10:00", end: "11:00" },
      { start: "14:00", end: "15:00" },
      { start: "15:00", end: "16:00" },
    ];

    commonTimeSlots.forEach((slot) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.availability.therapists(date, slot.start, 1), // Service ID 1 as default
        staleTime: 2 * 60 * 1000,
      });
    });
  },
};

export default queryClient;
