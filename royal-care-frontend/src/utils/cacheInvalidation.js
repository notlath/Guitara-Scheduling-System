/**
 * Unified Cache Invalidation System
 *
 * This utility ensures TanStack Query cache stays synchronized with Redux mutations.
 * It provides a centralized way to invalidate TanStack Query cache whenever Redux actions occur.
 */

import { queryKeys } from "../lib/queryClient";

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

  try {
    const invalidationPromises = [];

    // Core appointment queries - always invalidate these
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
      }),
      // Add legacy query keys for backward compatibility
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "today"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "upcoming"] }),
      queryClient.invalidateQueries({ queryKey: ["appointments", "date"] })
    );

    // Role-specific invalidation with comprehensive coverage
    if (userRole && userId) {
      switch (userRole) {
        case "therapist":
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byTherapist(userId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.therapist(userId),
            }),
            // Legacy query keys
            queryClient.invalidateQueries({
              queryKey: ["appointments", "therapist", userId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["appointments", "therapist"],
            }),
            // Dashboard-specific keys
            queryClient.invalidateQueries({
              queryKey: ["dashboard", "therapist", userId],
            })
          );
          break;
        case "driver":
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.appointments.byDriver(userId),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.driver(userId),
            }),
            // Legacy query keys
            queryClient.invalidateQueries({
              queryKey: ["appointments", "driver", userId],
            }),
            queryClient.invalidateQueries({
              queryKey: ["appointments", "driver"],
            }),
            // Dashboard-specific keys
            queryClient.invalidateQueries({
              queryKey: ["dashboard", "driver", userId],
            })
          );
          break;
        case "operator":
          invalidationPromises.push(
            queryClient.invalidateQueries({
              queryKey: queryKeys.dashboard.operator,
            }),
            // Operator sees all data, so invalidate comprehensive set
            queryClient.invalidateQueries({
              queryKey: ["dashboard", "operator"],
            }),
            queryClient.invalidateQueries({ queryKey: ["operator"] }),
            // Operator-specific views
            queryClient.invalidateQueries({
              queryKey: ["rejected", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["pending", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["timeout", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["payment", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["workflow", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["sessions", "appointments"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["pickup", "appointments"],
            }),
            // OperatorDashboard specific query patterns
            queryClient.invalidateQueries({
              queryKey: ["operator", "rejected"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["operator", "pending"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["operator", "timeout"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["operator", "payment"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["operator", "rejection-stats"],
            })
          );
          break;
      }
    }

    // Comprehensive invalidation for all user roles affected by appointment changes
    if (invalidateAll || userRole === "operator") {
      // Invalidate all role-specific queries since appointment changes affect everyone
      invalidationPromises.push(
        // All therapist queries
        queryClient.invalidateQueries({
          queryKey: ["appointments", "therapist"],
        }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "therapist"] }),
        // All driver queries
        queryClient.invalidateQueries({ queryKey: ["appointments", "driver"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", "driver"] }),
        // All operator queries
        queryClient.invalidateQueries({ queryKey: ["dashboard", "operator"] }),
        queryClient.invalidateQueries({ queryKey: ["operator"] }),
        // OperatorDashboard specific queries
        queryClient.invalidateQueries({ queryKey: ["operator", "rejected"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "pending"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "timeout"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "payment"] }),
        queryClient.invalidateQueries({
          queryKey: ["operator", "rejection-stats"],
        })
      );
    }

    // Availability queries (status changes might affect availability)
    invalidationPromises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.all }),
      queryClient.invalidateQueries({ queryKey: ["availableTherapists"] }),
      queryClient.invalidateQueries({ queryKey: ["availableDrivers"] }),
      queryClient.invalidateQueries({ queryKey: ["availability"] })
    );

    // Notifications (appointment changes often trigger notifications)
    invalidationPromises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unread(),
      }),
      // Legacy notification keys
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] })
    );

    // Driver coordination queries (for pickup assignments, etc.)
    invalidationPromises.push(
      queryClient.invalidateQueries({ queryKey: ["driver", "coordination"] }),
      queryClient.invalidateQueries({ queryKey: ["driver", "assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["pickup", "requests"] }),
      queryClient.invalidateQueries({ queryKey: ["driver", "availability"] })
    );

    // If invalidateAll is true, invalidate everything
    if (invalidateAll) {
      invalidationPromises.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.services.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.staff.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all }),
        // Legacy keys
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["services"] }),
        queryClient.invalidateQueries({ queryKey: ["staff"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] })
      );
    }

    // Execute all invalidations
    await Promise.all(invalidationPromises);

    console.log("✅ TanStack Query cache invalidation completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to invalidate TanStack Query cache:", error);
    return false;
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
    invalidationPromises.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.availability.all }),
      queryClient.invalidateQueries({ queryKey: ["availability"] }),
      queryClient.invalidateQueries({ queryKey: ["availableTherapists"] }),
      queryClient.invalidateQueries({ queryKey: ["availableDrivers"] })
    );

    // Specific staff availability if provided
    if (staffId && date) {
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

  queryClient.setQueryData(queryKeys.appointments.list(), updateFunction);
  queryClient.setQueryData(queryKeys.appointments.today(), updateFunction);
  queryClient.setQueryData(queryKeys.appointments.upcoming(), updateFunction);
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
        await queryClient.invalidateQueries({
          queryKey: queryKeys.availability.all,
        });
        break;
      case "notifications":
        await queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
        break;
      case "attendance":
        await queryClient.invalidateQueries({
          queryKey: queryKeys.attendance.all,
        });
        break;
    }
  }

  return invalidateAppointmentCaches(queryClient, options);
};

/**
 * WebSocket integration helper
 * Use this when receiving WebSocket updates to sync TanStack Query cache
 */
export const handleWebSocketUpdate = (queryClient, wsData) => {
  const { type, appointment, user_id, role } = wsData;

  switch (type) {
    case "appointment_created":
    case "appointment_updated":
    case "appointment_deleted":
      return invalidateAppointmentCaches(queryClient, {
        userId: user_id,
        userRole: role,
        appointmentId: appointment?.id,
      });

    case "therapist_response":
    case "driver_response":
      return invalidateByStatus(queryClient, appointment?.status, {
        userId: user_id,
        userRole: role,
      });

    default:
      // Fallback: invalidate core appointment data
      return invalidateAppointmentCaches(queryClient);
  }
};

export default {
  invalidateAppointmentCaches,
  invalidateAvailabilityCaches,
  optimisticUpdate,
  rollbackOptimisticUpdate,
  invalidateByStatus,
  handleWebSocketUpdate,
};
