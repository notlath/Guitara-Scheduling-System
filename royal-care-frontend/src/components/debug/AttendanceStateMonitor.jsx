/**
 * Quick test utility to verify attendance state after check-out
 * This can be temporarily added to AttendancePage to monitor state changes
 */

import { useEffect } from "react";

const AttendanceStateMonitor = ({ todayStatus, checkInTime, checkOutTime }) => {
  useEffect(() => {
    console.group("🔍 AttendanceStateMonitor - State Change Detected");
    console.log("todayStatus:", todayStatus);
    console.log("checkInTime:", checkInTime);
    console.log("checkOutTime:", checkOutTime);
    console.log("is_checked_in:", todayStatus?.is_checked_in);
    console.log("check_in_time from todayStatus:", todayStatus?.check_in_time);
    console.log(
      "check_out_time from todayStatus:",
      todayStatus?.check_out_time
    );

    // Test the helper function logic
    const hasCheckedInToday = !!(checkInTime || todayStatus?.check_in_time);
    const canCheckOutToday =
      hasCheckedInToday && !(checkOutTime || todayStatus?.check_out_time);
    const hasCheckedOutToday = !!(checkOutTime || todayStatus?.check_out_time);

    console.log("🧮 Computed states:");
    console.log("  hasCheckedInToday:", hasCheckedInToday);
    console.log("  canCheckOutToday:", canCheckOutToday);
    console.log("  hasCheckedOutToday:", hasCheckedOutToday);

    // Determine expected UI state
    let expectedUIState = "unknown";
    if (hasCheckedOutToday) {
      expectedUIState = "show-already-checked-out";
    } else if (hasCheckedInToday && canCheckOutToday) {
      expectedUIState = "show-check-out-button";
    } else if (hasCheckedInToday && !canCheckOutToday) {
      expectedUIState = "show-already-checked-in";
    } else {
      expectedUIState = "show-check-in-or-other";
    }

    console.log("🎯 Expected UI State:", expectedUIState);
    console.groupEnd();
  }, [todayStatus, checkInTime, checkOutTime]);

  // This component doesn't render anything
  return null;
};

export default AttendanceStateMonitor;
