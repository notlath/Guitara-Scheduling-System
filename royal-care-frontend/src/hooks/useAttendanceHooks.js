/**
 * Attendance-specific hooks for TanStack Query
 * Extracted from AttendanceContext to fix Fast Refresh warnings
 */

import { useContext } from "react";
import AttendanceContext from "../components/contexts/AttendanceContext";

export const useAttendanceContext = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error(
      "useAttendanceContext must be used within AttendanceMemoProvider"
    );
  }
  return context;
};

// Custom hook for just the attendance records (most common use case)
export const useAttendanceRecords = () => {
  const { attendanceRecords, loading, error, selectedDate } =
    useAttendanceContext();
  return { attendanceRecords, loading, error, selectedDate };
};

// Custom hook for attendance actions (less common, prevents unnecessary re-renders)
export const useAttendanceActions = () => {
  const {
    fetchAttendanceForDate,
    forceRefreshAttendance,
    getCachedAttendanceForDate,
    setSelectedDate,
  } = useAttendanceContext();

  return {
    fetchAttendanceForDate,
    forceRefreshAttendance,
    getCachedAttendanceForDate,
    setSelectedDate,
  };
};
