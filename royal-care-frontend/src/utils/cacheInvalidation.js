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
      console.warn("⚠️ Using fallback literal query keys");
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

        // ✅ CRITICAL FIX: More aggressive therapist cache invalidation
        invalidationPromises.push(
          // Main TherapistDashboard query key with aggressive refetch
          queryClient.invalidateQueries({
            queryKey: ["appointments", "therapist", userId],
            refetchType: "all", // Force refetch even for inactive queries
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
          })
        );

        // Also invalidate queryKeys versions if available
        if (queryKeys?.appointments) {
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byTherapist(userId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byTherapist(userId, "today"),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byTherapist(userId, "upcoming"),
            })
          );
        }
      } else if (userRole === "driver") {
        // ✅ DRIVER CACHE FIX: Include direct driver cache patterns
        invalidationPromises.push(
          // Main DriverDashboard query key
          queryClient.invalidateQueries({
            queryKey: ["appointments", "driver", userId],
            refetchType: "active",
          })
        );

        // Also invalidate queryKeys versions if available
        if (queryKeys?.appointments) {
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byDriver(userId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byDriver(userId, "today"),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byDriver(userId, "upcoming"),
            })
          );
        }
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

  // ✅ CRITICAL: Immediate cache invalidation for ALL dashboards
  const performCacheUpdate = async () => {
    try {
      console.log(
        `🚀 INSTANT CACHE INVALIDATION - Starting comprehensive update for ${type}`
      );

      // 1. ✅ THERAPIST DASHBOARD: Force immediate update
      console.log("🩺 Invalidating Therapist Dashboard caches...");
      await Promise.all([
        // Invalidate ALL therapist query patterns
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key.includes("appointments") &&
              key.includes("therapist")
            );
          },
        }),
        // Force refetch active therapist queries
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key.includes("appointments") &&
              key.includes("therapist")
            );
          },
          type: "active",
        }),
      ]);

      // 2. ✅ DRIVER DASHBOARD: Force immediate update
      console.log("� Invalidating Driver Dashboard caches...");
      await Promise.all([
        // Invalidate ALL driver query patterns
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key.includes("appointments") &&
              key.includes("driver")
            );
          },
        }),
        // Force refetch active driver queries
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key.includes("appointments") &&
              key.includes("driver")
            );
          },
          type: "active",
        }),
      ]);

      // 3. ✅ OPERATOR DASHBOARD: Force immediate update
      console.log("🏥 Invalidating Operator Dashboard caches...");
      await Promise.all([
        // Invalidate ALL operator query patterns
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key.includes("operator");
          },
        }),
        // Invalidate general appointment queries
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments", "today"] }),
        queryClient.invalidateQueries({
          queryKey: ["appointments", "upcoming"],
        }),
        // Force refetch active operator queries
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              (key.includes("operator") || key.includes("appointments"))
            );
          },
          type: "active",
        }),
      ]);

      // 4. ✅ SPECIFIC USER CACHE INVALIDATION: Target affected users
      if (appointment) {
        const affectedUsers = new Set();

        // Add therapist IDs
        if (appointment.therapist_id)
          affectedUsers.add(`therapist_${appointment.therapist_id}`);
        if (appointment.therapist)
          affectedUsers.add(`therapist_${appointment.therapist}`);
        if (appointment.therapists && Array.isArray(appointment.therapists)) {
          appointment.therapists.forEach((tId) =>
            affectedUsers.add(`therapist_${tId}`)
          );
        }

        // Add driver IDs
        if (appointment.driver_id)
          affectedUsers.add(`driver_${appointment.driver_id}`);
        if (appointment.driver)
          affectedUsers.add(`driver_${appointment.driver}`);

        // Force refetch for each affected user
        for (const userKey of affectedUsers) {
          const [role, userId] = userKey.split("_");
          console.log(`🔄 Force refreshing ${role} ${userId} cache`);

          await queryClient.refetchQueries({
            queryKey: ["appointments", role, userId],
            type: "all",
          });
        }
      }

      console.log(
        "✅ ROBUST WebSocket cache invalidation completed successfully"
      );
    } catch (error) {
      console.error("❌ WebSocket cache invalidation failed:", error);
      // Don't throw, just log and continue
    }
  };

  return performCacheUpdate();
};

export default {
  invalidateAppointmentCaches,
  invalidateAvailabilityCaches,
  optimisticUpdate,
  rollbackOptimisticUpdate,
  invalidateByStatus,
  handleWebSocketUpdate,
};
