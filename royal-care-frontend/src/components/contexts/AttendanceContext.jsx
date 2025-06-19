import { createContext, useContext, useMemo, useState } from "react";
import { useOptimizedAttendance } from "../../hooks/useOptimizedData";

const AttendanceContext = createContext();

export const AttendanceMemoProvider = ({ children }) => {
  // Manage selected date at context level
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const attendanceData = useOptimizedAttendance(selectedDate);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      ...attendanceData,
      selectedDate,
      setSelectedDate, // Provide date setter to child components
    }),
    [attendanceData, selectedDate]
    // setSelectedDate is stable as a setState function
  );

  return (
    <AttendanceContext.Provider value={contextValue}>
      {children}
    </AttendanceContext.Provider>
  );
};

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
  const { attendanceRecords, loading, error } = useAttendanceContext();
  return { attendanceRecords, loading, error };
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
