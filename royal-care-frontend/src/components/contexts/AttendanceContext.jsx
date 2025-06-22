import { createContext, useContext, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAttendanceData } from "../../hooks/useDashboardQueries";

const AttendanceContext = createContext();

export const AttendanceMemoProvider = ({ children }) => {
  // Multi-layer authentication check before fetching data
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem("knoxToken");

  // More robust authentication validation
  const isAuthenticated = useMemo(() => {
    // Check if we have valid user object with required fields
    const hasValidUser = !!(user && user.id && user.role);
    // Check if we have a valid token (basic length check)
    const hasValidToken = !!(token && token.length > 10);
    // Check if we're not on the login page
    const isNotOnLoginPage =
      !window.location.pathname.includes("/login") &&
      !window.location.pathname.includes("/register") &&
      !window.location.pathname.includes("/forgot-password");

    return hasValidUser && hasValidToken && isNotOnLoginPage;
  }, [user, token]);

  // Manage selected date at context level
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Only fetch attendance data if user is properly authenticated
  const attendanceData = useAttendanceData(
    isAuthenticated ? selectedDate : null
  );

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

export default AttendanceContext;
