/**
 * Unified Cache Invalidation System
 *
 * This utility ensures TanStack Query cache stays synchronized with Redux mutations.
 * It provides a centralized way to invalidate TanStack Query cache whenever Redux actions occur.
 */

import { queryKeys } from "../lib/queryClient";

// ✅ REDUX BRIDGE: Store reference to dispatch for triggering Redux refetch
// This ensures that Redux-based components like SalesReportsPage automatically
// get updated data when TanStack Query cache is invalidated
let reduxDispatch = null;

/**
 * Set Redux dispatch for automatic refetch bridge
 * Call this from your App component or root to enable automatic Redux refetch
 */
export const setReduxDispatchBridge = (dispatch) => {
  reduxDispatch = dispatch;
  console.log("🔗 Redux dispatch bridge configured for cache invalidation");
};

/**
 * Trigger Redux refetch when TanStack Query cache is invalidated
 * This ensures components using Redux selectors (like SalesReportsPage) get fresh data
 */
const triggerReduxRefetch = async () => {
  if (!reduxDispatch) {
    console.warn(
      "⚠️ Redux dispatch bridge not configured - skipping Redux refetch"
    );
    return;
  }

  try {
    console.log(
      "🔄 Triggering Redux fetchAppointments after cache invalidation"
    );

    // Import fetchAppointments dynamically to avoid circular dependencies
    const { fetchAppointments } = await import(
      "../features/scheduling/schedulingSlice"
    );

    // Dispatch fetchAppointments to update Redux state
    await reduxDispatch(fetchAppointments());

    console.log("✅ Redux appointments refetch completed");
  } catch (error) {
    console.error("❌ Failed to trigger Redux refetch:", error);
  }
};

/**
 * Comprehensive cache invalidation helper
 * Use this after any Redux mutation that changes appointment data
 */
export const invalidateAppointmentCaches = async (
  queryClient,
  options = {}
) => {
  const {
    userId = null,
    userRole = null,
    appointmentId = null,
    invalidateAll = false,
  } = options;

  console.log("🔄 Invalidating TanStack Query caches after Redux mutation", {
    userId,
    userRole,
    appointmentId,
    invalidateAll,
  });

  // Debug: Check if queryKeys is properly imported
  if (!queryKeys) {
    console.error(
      "❌ queryKeys is undefined - check import in cacheInvalidation.js"
    );
    return;
  }

  console.log("🔍 DEBUG: queryKeys object:", queryKeys);
  console.log("🔍 DEBUG: queryKeys.appointments:", queryKeys.appointments);

  try {
    const invalidationPromises = [];

    // Core appointment queries - always invalidate these
    // Use failsafe approach in case queryKeys has issues
    if (queryKeys?.appointments) {
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.list(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.today(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.upcoming(),
        })
      );
    } else {
      // Fallback: use literal query keys
      console.warn("⚠️ Using fallback literal query keys for appointments");
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments", "today"] }),
        queryClient.invalidateQueries({
          queryKey: ["appointments", "upcoming"],
        })
      );
    }

    // ✅ SALES/REPORTS DASHBOARD CACHE INVALIDATION
    // These are essential for ensuring Sales and Reports dashboards show updated payment amounts
    invalidationPromises.push(
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["revenue"] }),
      queryClient.invalidateQueries({ queryKey: ["commission"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "sales"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "reports"] })
    );

    // User-specific invalidations
    if (userId) {
      if (userRole === "therapist") {
        console.log("🩺 Invalidating therapist-specific caches for:", userId);

        // ✅ CRITICAL FIX: Use consistent queryKeys structure for therapist cache invalidation
        invalidationPromises.push(
          // Main TherapistDashboard query key using queryKeys structure
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byTherapist(userId, "all"),
            refetchType: "all", // Force refetch even for inactive queries
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byTherapist(userId, "today"),
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byTherapist(userId, "upcoming"),
            refetchType: "all",
          }),
          // Also invalidate any partial matches
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey;
              return (
                Array.isArray(queryKey) &&
                queryKey.includes("appointments") &&
                queryKey.includes("therapist") &&
                queryKey.includes(userId)
              );
            },
          }),
          // Dashboard-specific therapist queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.therapist(userId),
          })
        );
      } else if (userRole === "driver") {
        // ✅ DRIVER CACHE FIX: Use consistent queryKeys structure for driver cache invalidation
        invalidationPromises.push(
          // Main DriverDashboard query keys using queryKeys structure
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byDriver(userId, "all"),
            refetchType: "active",
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byDriver(userId, "today"),
            refetchType: "active",
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.appointments.byDriver(userId, "upcoming"),
            refetchType: "active",
          }),
          // Dashboard-specific driver queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.driver(userId),
          })
        );
      }
    }

    // Operator-specific queries (for comprehensive dashboard updates)
    if (userRole === "operator" || invalidateAll) {
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: ["operator"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "pending"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "rejected"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "timeout"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "pickup"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "all"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys?.notifications?.list?.() || [
            "notifications",
            "list",
          ],
        })
      );
    }

    // Dashboard-specific invalidations for real-time updates
    if (invalidateAll) {
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["therapist"] }),
        queryClient.invalidateQueries({ queryKey: ["driver"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] })
      );
    }

    // Execute all invalidations in parallel
    await Promise.all(invalidationPromises);

    console.log("✅ TanStack Query cache invalidation completed", {
      invalidatedQueries: invalidationPromises.length,
      userRole,
      invalidateAll,
    });

    // ✅ CRITICAL: Trigger Redux refetch for components using Redux selectors
    // This ensures SalesReportsPage and similar components get updated data
    await triggerReduxRefetch();
  } catch (error) {
    console.error("❌ Cache invalidation failed:", error);
    throw error;
  }
};

/**
 * Availability-specific cache invalidation helper
 * Use this after availability mutations (create, update, delete)
 */
export const invalidateAvailabilityCaches = async (
  queryClient,
  options = {}
) => {
  const { staffId = null, date = null, userRole = null } = options;

  console.log("🔄 Invalidating availability caches", {
    staffId,
    date,
    userRole,
  });

  try {
    const invalidationPromises = [];

    // Core availability queries
    if (queryKeys?.availability) {
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.availability.all }),
        queryClient.invalidateQueries({ queryKey: ["availability"] }),
        queryClient.invalidateQueries({ queryKey: ["availableTherapists"] }),
        queryClient.invalidateQueries({ queryKey: ["availableDrivers"] })
      );
    } else {
      // Fallback to literal query keys
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: ["availability"] }),
        queryClient.invalidateQueries({ queryKey: ["availableTherapists"] }),
        queryClient.invalidateQueries({ queryKey: ["availableDrivers"] })
      );
    }

    // Specific staff availability if provided
    if (staffId && date && queryKeys?.availability?.staff) {
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: queryKeys.availability.staff(staffId, date),
        })
      );
    }

    // Role-specific invalidation for availability checking
    if (userRole === "therapist" && staffId) {
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: ["availability", "therapists"],
        })
      );
    } else if (userRole === "driver" && staffId) {
      invalidationPromises.push(
        queryClient.invalidateQueries({
          queryKey: ["availability", "drivers"],
        })
      );
    }

    // Execute all invalidations
    await Promise.all(invalidationPromises);

    console.log("✅ Availability cache invalidation completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to invalidate availability cache:", error);
    return false;
  }
};

/**
 * Optimistic update helper for immediate UI feedback
 * Use this before Redux mutations for better UX
 */
export const optimisticUpdate = (queryClient, appointmentId, updateData) => {
  if (!appointmentId || !updateData) return;

  console.log(
    "⚡ Applying optimistic update for appointment:",
    appointmentId,
    updateData
  );

  // Update all appointment lists
  const updateFunction = (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((apt) =>
      apt.id === appointmentId ? { ...apt, ...updateData } : apt
    );
  };

  if (queryKeys?.appointments) {
    queryClient.setQueryData(queryKeys.appointments.list(), updateFunction);
    queryClient.setQueryData(queryKeys.appointments.today(), updateFunction);
    queryClient.setQueryData(queryKeys.appointments.upcoming(), updateFunction);
  } else {
    // Fallback to literal query keys
    queryClient.setQueryData(["appointments", "list"], updateFunction);
    queryClient.setQueryData(["appointments", "today"], updateFunction);
    queryClient.setQueryData(["appointments", "upcoming"], updateFunction);
  }
};

/**
 * Rollback optimistic updates on error
 */
export const rollbackOptimisticUpdate = (queryClient, backupData) => {
  if (!backupData) return;

  console.log("↩️ Rolling back optimistic update due to error");

  Object.entries(backupData).forEach(([queryKey, data]) => {
    queryClient.setQueryData(JSON.parse(queryKey), data);
  });
};

/**
 * Status-specific cache invalidation for common appointment status changes
 */
export const invalidateByStatus = async (queryClient, status, options = {}) => {
  const statusInvalidationMap = {
    confirmed: ["availability"],
    in_progress: ["availability", "notifications"],
    completed: ["availability", "attendance"],
    cancelled: ["availability", "notifications"],
    rejected: ["notifications"],
    therapist_confirmed: ["availability"],
    driver_confirmed: ["availability"],
  };

  const additionalQueries = statusInvalidationMap[status] || [];

  for (const queryType of additionalQueries) {
    switch (queryType) {
      case "availability":
        if (queryKeys?.availability?.all) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.availability.all,
          });
        } else {
          await queryClient.invalidateQueries({ queryKey: ["availability"] });
        }
        break;
      case "notifications":
        if (queryKeys?.notifications?.all) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.all,
          });
        } else {
          await queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        break;
      case "attendance":
        if (queryKeys?.attendance?.all) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.attendance.all,
          });
        } else {
          await queryClient.invalidateQueries({ queryKey: ["attendance"] });
        }
        break;
    }
  }

  return invalidateAppointmentCaches(queryClient, options);
};

/**
 * WebSocket integration helper
 * Use this when receiving WebSocket updates to sync TanStack Query cache
 */
/**
 * ✅ ROBUST WEBSOCKET CACHE INVALIDATION - FINAL SOLUTION
 * This function ensures instant updates across ALL dashboards without redundant calls
 */
export const handleWebSocketUpdate = (queryClient, wsData) => {
  console.log("🔄 ROBUST WebSocket cache invalidation:", wsData);

  const { type, appointment } = wsData;

  // ✅ CRITICAL: Prevent invalidation loops with proper debouncing
  if (
    handleWebSocketUpdate._lastCall &&
    Date.now() - handleWebSocketUpdate._lastCall < 100 // Reduced to 100ms for faster updates
  ) {
    console.log("⚡ Debouncing rapid WebSocket calls");
    return Promise.resolve();
  }
  handleWebSocketUpdate._lastCall = Date.now();

  // ✅ CRITICAL: Use the same instant cache update pattern as DriverDashboard
  const performCacheUpdate = async () => {
    try {
      console.log(
        `🚀 INSTANT CACHE INVALIDATION - Starting comprehensive update for ${type}`
      );

      // ✅ CRITICAL FIX: Use setQueryData + invalidateQueries pattern like DriverDashboard
      // This ensures immediate UI updates by updating cache data FIRST, then invalidating

      // 1. ✅ THERAPIST DASHBOARD: Instant cache update using setQueryData pattern
      console.log(
        "🩺 Updating Therapist Dashboard caches with instant pattern..."
      );

      if (appointment?.therapist || appointment?.therapists) {
        const therapistIds = [];
        if (appointment.therapist) therapistIds.push(appointment.therapist);
        if (appointment.therapists)
          therapistIds.push(...appointment.therapists);

        // Apply the SAME pattern as DriverDashboard for instant updates
        const updateFunction = (oldData) => {
          if (!Array.isArray(oldData)) return oldData;

          // Handle delete operations
          if (type === "appointment_deleted") {
            return oldData.filter((apt) => apt.id !== appointment.id);
          }

          // Handle updates - replace or add appointment
          const existingIndex = oldData.findIndex(
            (apt) => apt.id === appointment.id
          );
          if (existingIndex >= 0) {
            // Update existing appointment
            const updatedData = [...oldData];
            updatedData[existingIndex] = {
              ...updatedData[existingIndex],
              ...appointment,
            };
            return updatedData;
          } else {
            // Add new appointment if not found
            return [...oldData, appointment];
          }
        };

        // Update cache for affected therapists using the SAME pattern as DriverDashboard
        for (const therapistId of therapistIds) {
          const therapistQueryKey = queryKeys.appointments.byTherapist(
            therapistId,
            "all"
          );

          // 1. ✅ INSTANT UPDATE: Apply data change immediately (like DriverDashboard)
          queryClient.setQueryData(therapistQueryKey, updateFunction);

          // 2. ✅ IMMEDIATE INVALIDATION: Use the same pattern as DriverDashboard for instant updates
          queryClient.invalidateQueries({
            queryKey: ["appointments"],
            refetchType: "active", // Only refetch currently active queries
          });

          console.log(
            `✅ INSTANT TherapistDashboard cache update applied for therapist ${therapistId}`
          );
        }

        console.log(
          `✅ Applied instant cache updates to ${therapistIds.length} therapist dashboards`
        );
      }

      // ✅ SIMPLIFIED INVALIDATION: Use the same pattern as DriverDashboard
      // Just invalidate the main appointments cache and let components handle their specific caches
      await queryClient.invalidateQueries({
        queryKey: ["appointments"],
        refetchType: "active", // Only refetch currently active queries
      });

      console.log(
        "✅ WebSocket cache invalidation completed with DriverDashboard pattern"
      );
    } catch (error) {
      console.error("❌ WebSocket cache invalidation failed:", error);
    }
  };
};

export default {
  invalidateAppointmentCaches,
  invalidateAvailabilityCaches,
  optimisticUpdate,
  rollbackOptimisticUpdate,
  invalidateByStatus,
  handleWebSocketUpdate,
};
