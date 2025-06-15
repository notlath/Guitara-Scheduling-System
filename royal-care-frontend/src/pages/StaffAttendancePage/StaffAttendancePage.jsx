import { useEffect } from "react";
import AttendanceComponent from "../../components/AttendanceComponent";
import pageTitles from "../../constants/pageTitles";

/**
 * Staff Attendance Page - For individual therapists and drivers
 * This page provides personal attendance tracking (check-in/check-out) functionality
 * Different from AttendancePage which is for operators to manage all staff attendance
 */
const StaffAttendancePage = () => {
  useEffect(() => {
    document.title = pageTitles.attendance || "My Attendance";
  }, []);

  return <AttendanceComponent />;
};

export default StaffAttendancePage;
