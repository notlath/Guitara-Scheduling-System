import { createContext, useMemo, useState } from "react";
import { useAttendanceData } from "../../hooks/useDashboardQueries";

const AttendanceContext = createContext();

export const AttendanceMemoProvider = ({ children }) => {
  // Manage selected date at context level
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const attendanceData = useAttendanceData(selectedDate);

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

export default AttendanceContext;
