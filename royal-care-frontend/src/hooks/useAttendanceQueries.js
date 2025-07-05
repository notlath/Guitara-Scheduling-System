/**
 * Attendance TanStack Query Hooks
 *
 * This file provides TanStack Query hooks for attendance management
 * with automatic cache invalidation to ensure the UI updates instantly.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  addAttendanceNote,
  approveAttendance,
  checkIn,
  checkOut,
  fetchAttendanceRecords,
  generateAttendanceSummary,
  getTodayAttendanceStatus,
  updateAttendanceRecord,
} from "../features/attendance/attendanceSlice";
import { queryKeys } from "../lib/queryClient";
import { invalidateAttendanceCaches } from "../utils/cacheInvalidation";

/**
 * Helper function to calculate hours worked between check-in and check-out times
 */
const calculateHoursWorked = (checkInTime, checkOutTime) => {
  try {
    const today = new Date();
    const [checkInHours, checkInMinutes] = checkInTime.split(":").map(Number);
    const [checkOutHours, checkOutMinutes] = checkOutTime
      .split(":")
      .map(Number);

    const checkInDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      checkInHours,
      checkInMinutes
    );
    const checkOutDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      checkOutHours,
      checkOutMinutes
    );

    const diffMs = checkOutDate - checkInDate;
    const hours = diffMs / (1000 * 60 * 60);

    return Math.max(0, Math.round(hours * 10) / 10); // Round to 1 decimal place
  } catch (error) {
    console.error("Error calculating hours worked:", error);
    return 0;
  }
};

/**
 * Hook for retrieving today's attendance status with automatic refetching
 *
 * Use this hook in components that need to display the current check-in status
 */
export const useTodayAttendanceStatus = () => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.attendance.byDate(
      new Date().toISOString().split("T")[0]
    ),
    queryFn: async () => {
      const result = await dispatch(getTodayAttendanceStatus()).unwrap();
      return result;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: false, // Disable automatic refetching to prevent race conditions
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: true, // Only refetch when reconnecting
  });
};

/**
 * Hook for checking in with automatic cache invalidation and optimistic updates
 */
export const useCheckIn = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await dispatch(checkIn()).unwrap();
      return result;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      const today = new Date().toISOString().split("T")[0];
      const todayQueryKey = queryKeys.attendance.byDate(today);

      await queryClient.cancelQueries({ queryKey: todayQueryKey });

      // ✅ CRITICAL: Also cancel attendance records queries for DataTable updates
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.attendance.list(), today],
      });

      // Snapshot the previous value for rollback
      const previousTodayStatus = queryClient.getQueryData(todayQueryKey);
      const previousAttendanceRecords = queryClient.getQueryData([
        ...queryKeys.attendance.list(),
        today,
      ]);

      // Optimistically update the cache with check-in data
      queryClient.setQueryData(todayQueryKey, (old) => ({
        ...old,
        is_checked_in: true,
        check_in_time: new Date().toTimeString().slice(0, 8), // HH:MM:SS format
        status: "present",
      }));

      // ✅ CRITICAL: Optimistically update attendance records for DataTable
      queryClient.setQueryData(
        [...queryKeys.attendance.list(), today],
        (oldRecords) => {
          if (!Array.isArray(oldRecords)) return oldRecords;

          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const checkInTime = new Date().toTimeString().slice(0, 8);

          // Check if user already has a record for today
          const existingRecordIndex = oldRecords.findIndex(
            (record) => record.staff_member?.id === currentUser.id
          );

          if (existingRecordIndex >= 0) {
            // Update existing record
            const updatedRecords = [...oldRecords];
            updatedRecords[existingRecordIndex] = {
              ...updatedRecords[existingRecordIndex],
              check_in_time: checkInTime,
              status: "present",
              is_checked_in: true,
            };
            return updatedRecords;
          } else {
            // Add new record
            const newRecord = {
              id: `temp-${Date.now()}`,
              staff_member: currentUser,
              date: today,
              check_in_time: checkInTime,
              check_out_time: null,
              status: "present",
              is_checked_in: true,
              hours_worked: 0,
              notes: "",
            };
            return [...oldRecords, newRecord];
          }
        }
      );

      return { previousTodayStatus, previousAttendanceRecords, todayQueryKey };
    },
    onError: (err, variables, context) => {
      // Roll back optimistic update on error
      if (context?.previousTodayStatus) {
        queryClient.setQueryData(
          context.todayQueryKey,
          context.previousTodayStatus
        );
      }
      // ✅ CRITICAL: Roll back attendance records optimistic update
      if (context?.previousAttendanceRecords) {
        const today = new Date().toISOString().split("T")[0];
        queryClient.setQueryData(
          [...queryKeys.attendance.list(), today],
          context.previousAttendanceRecords
        );
      }
      console.error("❌ Check-in failed:", err);

      // Clear the error after a short delay to prevent persistent blank error divs
      setTimeout(() => {
        // The error will be automatically cleared by React Query
      }, 3000);
    },
    onSuccess: (serverData, variables, context) => {
      // ✅ CRITICAL: Update cache with actual server data FIRST
      if (serverData && context?.todayQueryKey) {
        queryClient.setQueryData(context.todayQueryKey, serverData);
        console.log(
          "✅ Check-in successful, cache updated with server data:",
          serverData
        );

        // ✅ DEBUG: Log the specific check-in time from server
        console.log("✅ Check-in time from server:", serverData.check_in_time);
        console.log("✅ Is checked in from server:", serverData.is_checked_in);
      }

      // ✅ CRITICAL: Also update attendance records cache with server data
      const today = new Date().toISOString().split("T")[0];
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      // Update attendance records with the actual server response
      if (serverData && currentUser.id) {
        queryClient.setQueryData(
          [...queryKeys.attendance.list(), today],
          (oldRecords) => {
            if (!Array.isArray(oldRecords)) return oldRecords;

            // Check if user already has a record
            const existingRecordIndex = oldRecords.findIndex(
              (record) => record.staff_member?.id === currentUser.id
            );

            if (existingRecordIndex >= 0) {
              // Update existing record with server data
              const updatedRecords = [...oldRecords];
              updatedRecords[existingRecordIndex] = {
                ...updatedRecords[existingRecordIndex],
                check_in_time: serverData.check_in_time,
                is_checked_in: serverData.is_checked_in || true,
                status: serverData.status || "present",
              };
              return updatedRecords;
            } else {
              // Add new record with server data
              const newRecord = {
                id: serverData.id || `temp-${Date.now()}`,
                staff_member: currentUser,
                date: today,
                check_in_time: serverData.check_in_time,
                check_out_time: null,
                status: serverData.status || "present",
                is_checked_in: serverData.is_checked_in || true,
                hours_worked: 0,
                notes: serverData.notes || "",
              };
              return [...oldRecords, newRecord];
            }
          }
        );
      }

      // Force immediate invalidation of attendance records for DataTable updates
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.attendance.list(), today],
        refetchType: "active",
      });

      // Also invalidate any attendance records queries without specific filters
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.includes("attendance") &&
            key.includes("list")
          );
        },
      });

      // Delay broader invalidation to prevent race conditions
      setTimeout(() => {
        invalidateAttendanceCaches(queryClient, { selective: true });
      }, 1000);
    },
  });
};

/**
 * Hook for checking out with automatic cache invalidation and optimistic updates
 */
export const useCheckOut = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await dispatch(checkOut()).unwrap();
      return result;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      const today = new Date().toISOString().split("T")[0];
      const todayQueryKey = queryKeys.attendance.byDate(today);

      await queryClient.cancelQueries({ queryKey: todayQueryKey });

      // ✅ CRITICAL: Also cancel attendance records queries for DataTable updates
      await queryClient.cancelQueries({
        queryKey: [...queryKeys.attendance.list(), today],
      });

      // Snapshot the previous value for rollback
      const previousTodayStatus = queryClient.getQueryData(todayQueryKey);
      const previousAttendanceRecords = queryClient.getQueryData([
        ...queryKeys.attendance.list(),
        today,
      ]);

      // Optimistically update the cache with check-out data
      queryClient.setQueryData(todayQueryKey, (old) => ({
        ...old,
        is_checked_in: false,
        check_out_time: new Date().toTimeString().slice(0, 8), // HH:MM:SS format
        status: "present",
      }));

      // ✅ CRITICAL: Optimistically update attendance records for DataTable
      queryClient.setQueryData(
        [...queryKeys.attendance.list(), today],
        (oldRecords) => {
          if (!Array.isArray(oldRecords)) return oldRecords;

          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const checkOutTime = new Date().toTimeString().slice(0, 8);

          // Find user's record and update check-out time
          return oldRecords.map((record) => {
            if (record.staff_member?.id === currentUser.id) {
              return {
                ...record,
                check_out_time: checkOutTime,
                is_checked_in: false,
                status: "present",
                // Calculate hours worked if check-in time exists
                hours_worked: record.check_in_time
                  ? calculateHoursWorked(record.check_in_time, checkOutTime)
                  : 0,
              };
            }
            return record;
          });
        }
      );

      return { previousTodayStatus, previousAttendanceRecords, todayQueryKey };
    },
    onError: (err, variables, context) => {
      // Roll back optimistic update on error
      if (context?.previousTodayStatus) {
        queryClient.setQueryData(
          context.todayQueryKey,
          context.previousTodayStatus
        );
      }
      // ✅ CRITICAL: Roll back attendance records optimistic update
      if (context?.previousAttendanceRecords) {
        const today = new Date().toISOString().split("T")[0];
        queryClient.setQueryData(
          [...queryKeys.attendance.list(), today],
          context.previousAttendanceRecords
        );
      }
      console.error("❌ Check-out failed:", err);

      // Clear the error after a short delay to prevent persistent blank error divs
      setTimeout(() => {
        // The error will be automatically cleared by React Query
      }, 3000);
    },
    onSuccess: (serverData, variables, context) => {
      // ✅ CRITICAL: Update cache with actual server data FIRST
      if (serverData && context?.todayQueryKey) {
        queryClient.setQueryData(context.todayQueryKey, serverData);
        console.log(
          "✅ Check-out successful, cache updated with server data:",
          serverData
        );

        // ✅ DEBUG: Log the specific check-out time from server
        console.log(
          "✅ Check-out time from server:",
          serverData.check_out_time
        );
        console.log("✅ Is checked in from server:", serverData.is_checked_in);
      }

      // ✅ CRITICAL: Also update attendance records cache with server data
      const today = new Date().toISOString().split("T")[0];
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

      // Update attendance records with the actual server response
      if (serverData && currentUser.id) {
        queryClient.setQueryData(
          [...queryKeys.attendance.list(), today],
          (oldRecords) => {
            if (!Array.isArray(oldRecords)) return oldRecords;

            return oldRecords.map((record) => {
              if (record.staff_member?.id === currentUser.id) {
                return {
                  ...record,
                  check_out_time: serverData.check_out_time,
                  is_checked_in: serverData.is_checked_in || false,
                  status: serverData.status || "present",
                  hours_worked: serverData.hours_worked || record.hours_worked,
                };
              }
              return record;
            });
          }
        );
      }

      // Force immediate invalidation of attendance records for DataTable updates
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.attendance.list(), today],
        refetchType: "active",
      });

      // Also invalidate any attendance records queries without specific filters
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key.includes("attendance") &&
            key.includes("list")
          );
        },
      });

      // Delay broader invalidation to prevent race conditions
      setTimeout(() => {
        invalidateAttendanceCaches(queryClient, { selective: true });
      }, 1000);
    },
  });
};

/**
 * Hook for fetching attendance records with filtering
 */
export const useAttendanceRecords = (date = null, staffId = null) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: [...queryKeys.attendance.list(), date, staffId],
    queryFn: async () => {
      const result = await dispatch(
        fetchAttendanceRecords({ date, staffId })
      ).unwrap();
      return result;
    },
    enabled: !!date, // Only fetch when date is provided
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};

/**
 * Hook for generating attendance summary
 */
export const useAttendanceSummary = (date) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: ["attendance", "summary", date],
    queryFn: async () => {
      const result = await dispatch(generateAttendanceSummary(date)).unwrap();
      return result;
    },
    enabled: !!date,
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};

/**
 * Hook for approving attendance with automatic cache invalidation and optimistic updates
 */
export const useApproveAttendance = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceId) => {
      const result = await dispatch(approveAttendance(attendanceId)).unwrap();
      return result;
    },
    onMutate: async (attendanceId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["attendance"] });

      // Snapshot the previous value for rollback
      const previousAttendanceRecords = queryClient.getQueryData([
        ...queryKeys.attendance.list(),
      ]);

      // Optimistically update attendance records
      if (
        previousAttendanceRecords &&
        Array.isArray(previousAttendanceRecords)
      ) {
        queryClient.setQueryData([...queryKeys.attendance.list()], (old) =>
          old.map((record) =>
            record.id === attendanceId
              ? {
                  ...record,
                  approved: true,
                  approved_at: new Date().toISOString(),
                }
              : record
          )
        );
      }

      return { previousAttendanceRecords };
    },
    onError: (err, attendanceId, context) => {
      // Roll back optimistic update on error
      if (context?.previousAttendanceRecords) {
        queryClient.setQueryData(
          [...queryKeys.attendance.list()],
          context.previousAttendanceRecords
        );
      }
    },
    onSuccess: () => {
      // Invalidate attendance caches after approval
      invalidateAttendanceCaches(queryClient);
    },
  });
};

/**
 * Hook for updating an attendance record with automatic cache invalidation
 */
export const useUpdateAttendanceRecord = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendanceId, updateData }) => {
      const result = await dispatch(
        updateAttendanceRecord({ attendanceId, updateData })
      ).unwrap();
      return result;
    },
    onSuccess: (data) => {
      // Use centralized invalidation helper for consistent cache updates
      invalidateAttendanceCaches(queryClient, {
        staffId: data.staff || data.user || data.staff_id || data.user_id,
        date: data.date,
      });
    },
  });
};

/**
 * Hook for adding a note to an attendance record with automatic cache invalidation
 */
export const useAddAttendanceNote = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attendanceId, notes }) => {
      const result = await dispatch(
        addAttendanceNote({ attendanceId, notes })
      ).unwrap();
      return result;
    },
    onSuccess: (data) => {
      // Use centralized invalidation helper for consistent cache updates
      invalidateAttendanceCaches(queryClient, {
        staffId: data.staff || data.user || data.staff_id || data.user_id,
        date: data.date,
      });
    },
  });
};
