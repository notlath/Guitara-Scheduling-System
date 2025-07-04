import { useEffect, useState } from "react";
import { MdCheckCircle, MdLogout } from "react-icons/md";
import "../../../src/styles/Placeholders.css";
// Import the shared attendance CSS for the unified dashboard components
import "../../components/AttendanceComponent.css";
import { LoadingButton } from "../../components/common/LoadingComponents";
import pageTitles from "../../constants/pageTitles";
// Import TanStack Query hooks for attendance
import DataTable from "../../globals/DataTable";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import {
  useApproveAttendance,
  useAttendanceRecords,
  useAttendanceSummary,
  useCheckIn,
  useCheckOut,
  useTodayAttendanceStatus,
} from "../../hooks/useAttendanceQueries";
import styles from "./AttendancePage.module.css";

const AttendancePage = () => {
  // Initialize with current date in Asia/Manila Time (UTC+08:00)
  const getCurrentDate = () => {
    const now = new Date();
    // Convert to Asia/Manila Time (UTC+08:00)
    const manilaTime = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return manilaTime; // Returns YYYY-MM-DD format
  };

  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  // ✅ TANSTACK QUERY: Replace Redux state with TanStack Query hooks
  const {
    data: attendanceRecords = [],
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useAttendanceRecords(selectedDate);

  const { data: attendanceSummary, isLoading: summaryLoading } =
    useAttendanceSummary(selectedDate);

  // ✅ TANSTACK QUERY: Use the TanStack Query hook for today's status
  const { data: todayStatus, isLoading: todayStatusLoading } =
    useTodayAttendanceStatus();

  // Extract attendance data from TanStack Query response
  const isCheckedIn = todayStatus?.is_checked_in || false;
  const checkInTime = todayStatus?.check_in_time || null;
  const checkOutTime = todayStatus?.check_out_time || null;

  // ✅ TANSTACK QUERY: Use mutations for check-in/check-out
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const approveAttendanceMutation = useApproveAttendance();

  // Combined loading state
  const loading = attendanceLoading || summaryLoading || todayStatusLoading;

  useEffect(() => {
    document.title = pageTitles.attendance;
    // ✅ REMOVED: No longer need to manually fetch data - TanStack Query handles this
  }, []);

  // ✅ REMOVED: No longer need to refetch on date change - TanStack Query handles this automatically

  // Add debugging for attendance records
  console.log("AttendancePage - Raw attendance records:", attendanceRecords);
  console.log(
    "AttendancePage - Attendance records count:",
    attendanceRecords?.length || 0
  );

  // Combine real attendance records with staff information
  const attendanceData = (attendanceRecords || []).map((record) => {
    console.log("AttendancePage - Processing attendance record:", record);
    console.log("AttendancePage - Staff member data:", record.staff_member);

    // Check if we have any attendance records at all
    if (!attendanceRecords || attendanceRecords.length === 0) {
      console.log(
        "AttendancePage - No attendance records found for selected date"
      );
    }

    // The staff_member field contains the full staff information from the backend
    const staffMember = record.staff_member
      ? {
          id: record.staff_member.id || "unknown",
          first_name: record.staff_member.first_name || "Unknown",
          last_name: record.staff_member.last_name || "Staff",
          email:
            record.staff_member.email ||
            record.staff_member.username ||
            "unknown@example.com",
          role: record.staff_member.role || "unknown",
        }
      : {
          id: "unknown",
          first_name: "Unknown",
          last_name: "Staff",
          email: "unknown@example.com",
          role: "unknown",
        };

    console.log("AttendancePage - Processed staff member:", staffMember);

    // Helper function to format time from backend
    const formatTime = (timeString) => {
      if (!timeString) return null;

      console.log(
        "AttendancePage - Formatting time:",
        timeString,
        "Type:",
        typeof timeString
      );

      // If it's already a full datetime string, parse it directly
      if (timeString.includes("T") || timeString.includes(" ")) {
        const dateTime = new Date(timeString);
        console.log("AttendancePage - Parsed datetime:", dateTime);
        return dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's just a time string (HH:MM:SS), create a proper date
      try {
        const [hours, minutes, seconds] = timeString.split(":").map(Number);

        // Validate the time components
        if (
          isNaN(hours) ||
          isNaN(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          console.error("AttendancePage - Invalid time format:", timeString);
          return timeString; // Return original string if invalid
        }

        console.log(
          "AttendancePage - Parsed time components - Hours:",
          hours,
          "Minutes:",
          minutes,
          "Seconds:",
          seconds
        );

        const today = new Date();
        const dateTime = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          seconds || 0
        );

        console.log("AttendancePage - Created datetime:", dateTime);

        const formatted = dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        console.log("AttendancePage - Formatted result:", formatted);

        return formatted;
      } catch (error) {
        console.error(
          "AttendancePage - Error formatting time:",
          timeString,
          error
        );
        return timeString; // Return original string on error
      }
    };

    return {
      id: record.id,
      staffMember: staffMember,
      date: record.date,
      status: record.status,
      checkInTime: formatTime(record.check_in_time),
      checkOutTime: formatTime(record.check_out_time),
      hoursWorked: record.hours_worked || 0,
      notes: record.notes || "",
      needsApproval: record.status === "pending_approval",
      approvedBy: record.approved_by,
      createdAt: record.created_at,
    };
  });

  const filteredAttendance = attendanceData.filter((record) => {
    if (attendanceFilter === "all") return true;
    return record.status === attendanceFilter;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      present: { class: "status-present", label: "Present", icon: "✅" },
      absent: { class: "status-absent", label: "Absent", icon: "❌" },
      late: { class: "status-late", label: "Late", icon: "⏰" },
      on_leave: { class: "status-leave", label: "On Leave", icon: "🏖️" },
      scheduled: { class: "status-scheduled", label: "Scheduled", icon: "📅" },
      pending_approval: {
        class: "status-pending",
        label: "Pending Approval",
        icon: "⏳",
      },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return (
      <span className={`${styles["status-badge"]} ${styles[config.class]}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  // Handle attendance approval
  const handleApproveAttendance = async (attendanceId) => {
    try {
      await approveAttendanceMutation.mutateAsync(attendanceId);
      // Cache invalidation is handled by the mutation hook
    } catch (error) {
      console.error("Failed to approve attendance:", error);
    }
  };

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    const onLeave = attendanceData.filter(
      (r) => r.status === "on_leave"
    ).length;
    const pendingApproval = attendanceData.filter(
      (r) => r.status === "pending_approval"
    ).length;

    return { total, present, absent, late, onLeave, pendingApproval };
  };

  const stats = getAttendanceStats();

  // Helper functions for operator's personal attendance
  const formatTime = (timeString) => {
    if (!timeString) return "--:--";

    // If it's already a full datetime string, parse it directly
    if (timeString.includes("T") || timeString.includes(" ")) {
      const dateTime = new Date(timeString);
      return dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // If it's just a time string (HH:MM:SS), create a proper date with today's date
    try {
      const [hours, minutes, seconds] = timeString.split(":").map(Number);

      // Validate the time components
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return timeString; // Return original string if invalid
      }

      // Create a date object with today's date and the specified time
      const today = new Date();
      const dateTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes,
        seconds || 0
      );

      return dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timeString; // Return original string on error
    }
  };

  const getAttendanceStatus = () => {
    if (!todayStatus) return "Not Checked In";

    const cutoffTime = new Date();
    cutoffTime.setHours(13, 15, 0, 0); // 1:15 PM

    if (todayStatus.status === "present") {
      return "Present";
    } else if (todayStatus.status === "late") {
      return "Late";
    } else if (todayStatus.status === "absent") {
      return "Absent";
    } else if (todayStatus.status === "pending_approval") {
      return "Pending Approval";
    }

    // If checked in but not yet approved
    if (isCheckedIn && !todayStatus.approved_at) {
      const checkInDateTime = new Date(
        `${new Date().toDateString()} ${checkInTime}`
      );
      return checkInDateTime > cutoffTime
        ? "Late (Pending Approval)"
        : "Present (Pending Approval)";
    }

    return "Not Checked In";
  };

  const getStatusColor = () => {
    const status = getAttendanceStatus();
    if (status.includes("Present")) return "#28a745";
    if (status.includes("Late")) return "#ffc107";
    if (status.includes("Absent")) return "#dc3545";
    if (status.includes("Pending")) return "#007bff";
    return "#6c757d";
  };

  const hasCheckedInToday = () => {
    return !!(checkInTime || todayStatus?.check_in_time);
  };

  const canCheckOutToday = () => {
    // Can't check out if not checked in
    if (!hasCheckedInToday()) return false;

    // Check if already checked out
    if (checkOutTime || todayStatus?.check_out_time) {
      return false; // Already checked out today
    }

    // Check if it's still the same day as check-in
    if ((checkInTime || todayStatus?.check_in_time) && todayStatus?.date) {
      const now = new Date();
      const today = now.toDateString();
      const checkInDate = new Date(todayStatus.date).toDateString();

      // Can only check out on the same day as check-in
      return today === checkInDate;
    }

    return true;
  };

  const isWithinCheckInWindow = () => {
    const now = new Date();
    const absenceDeadline = new Date();
    absenceDeadline.setHours(1, 30, 0, 0); // 1:30 AM next day
    absenceDeadline.setDate(absenceDeadline.getDate() + 1);

    return now < absenceDeadline;
  };

  const isLateCheckIn = () => {
    const now = new Date();
    const lateDeadline = new Date();
    lateDeadline.setHours(13, 15, 0, 0); // 1:15 PM

    return now > lateDeadline;
  };

  // Operator's check-in/check-out handlers
  const handleCheckIn = () => {
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate();
  };

  // ✅ REMOVED: No longer need to fetch today's status - TanStack Query handles this automatically

  // Prepare columns for DataTable
  const columns = [
    { key: "staff", label: "Staff Member" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "checkIn", label: "Check In" },
    { key: "checkOut", label: "Check Out" },
    { key: "hours", label: "Hours Worked" },
  ];

  const tableData = filteredAttendance.map((record) => ({
    staff: (
      <div>
        <div className={styles["staff-name"]}>
          {record.staffMember.first_name} {record.staffMember.last_name}
        </div>
      </div>
    ),
    role: (
      <span
        className={
          styles["stat-label"] + " " + (styles[record.staffMember.role] || "")
        }
      >
        {record.staffMember.role && record.staffMember.role !== "unknown"
          ? record.staffMember.role.charAt(0).toUpperCase() +
            record.staffMember.role.slice(1)
          : "Unknown"}
      </span>
    ),
    status: getStatusBadge(record.status),
    checkIn: record.checkInTime || "-",
    checkOut: record.checkOutTime || "-",
    hours: record.hoursWorked > 0 ? `${record.hoursWorked}h` : "-",
    actions: (
      <div className={styles["actions"]}>
        {record.needsApproval && (
          <button
            className={styles["approve-btn"]}
            title="Approve attendance"
            onClick={() => handleApproveAttendance(record.id)}
            disabled={approveAttendanceMutation.isPending}
          >
            {approveAttendanceMutation.isPending ? "⏳" : "✅"}
          </button>
        )}
        <button className={styles["edit-btn"]} title="Edit attendance">
          ✏️
        </button>
        <button className={styles["note-btn"]} title="Add note">
          📝
        </button>
      </div>
    ),
  }));

  const ATTENDANCE_TABS = [
    { label: `All (${attendanceData.length})`, value: "all" },
    { label: `Present (${stats.present})`, value: "present" },
    { label: `Absent (${stats.absent})`, value: "absent" },
    { label: `Late (${stats.late})`, value: "late" },
    { label: `On Leave (${stats.onLeave})`, value: "on_leave" },
    ...(stats.pendingApproval > 0
      ? [
          {
            label: `Pending Approval (${stats.pendingApproval})`,
            value: "pending_approval",
          },
        ]
      : []),
  ];

  return (
    <PageLayout>
      <div className={styles["attendance-page"]}>
        {/* Staff Management Section */}
        <LayoutRow title="Staff Attendance Tracking">
          <div className={styles["date-selector"]}>
            <label htmlFor="attendance-date">Select Date: </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles["date-input"]}
            />
          </div>
        </LayoutRow>

        {/* Show connection error if API is not available */}
        {attendanceError && attendanceError.includes("Network Error") && (
          <div className={styles["error-banner"]}>
            <div className={styles["error-message"]}>
              ⚠️ <strong>Backend Server Not Available</strong>
              <p>
                The Django server is not running. Please start the server to see
                real attendance data.
              </p>
              <p>
                You can start it by running:{" "}
                <code>python manage.py runserver</code> in the guitara directory
              </p>
            </div>
          </div>
        )}

        {/* Show other errors */}
        {attendanceError && !attendanceError.includes("Network Error") && (
          <div className={styles["error-banner"]}>
            <div className={styles["error-message"]}>
              ❌ <strong>Error Loading Attendance Data</strong>
              <p>{attendanceError}</p>
            </div>
          </div>
        )}

        <div className={styles["attendance-stats"]}>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-number"]}>{stats.total}</div>
            <div className={styles["stat-label"]}>Total Staff</div>
          </div>
          <div className={styles["stat-card"] + " " + styles["present"]}>
            <div className={styles["stat-number"]}>{stats.present}</div>
            <div className={styles["stat-label"]}>Present</div>
          </div>
          <div className={styles["stat-card"] + " " + styles["absent"]}>
            <div className={styles["stat-number"]}>{stats.absent}</div>
            <div className={styles["stat-label"]}>Absent</div>
          </div>
          <div className={styles["stat-card"] + " " + styles["late"]}>
            <div className={styles["stat-number"]}>{stats.late}</div>
            <div className={styles["stat-label"]}>Late</div>
          </div>
          <div className={styles["stat-card"] + " " + styles["leave"]}>
            <div className={styles["stat-number"]}>{stats.onLeave}</div>
            <div className={styles["stat-label"]}>On Leave</div>
          </div>
        </div>

        {/* Shared Attendance Dashboard Components - Same structure as Therapist and Driver views */}
        <div className="attendance-dashboard">
          <div className="attendance-status-card">
            <div className="status-header">
              <h3>Your Attendance Status</h3>
              <div
                className="status-indicator"
                style={{ backgroundColor: getStatusColor() }}
              >
                {getAttendanceStatus()}
              </div>
            </div>

            <div className="attendance-details">
              <div className="detail-row">
                <span className="label">Check-in Time:</span>
                <span className="value">
                  {checkInTime ? formatTime(checkInTime) : "Not checked in"}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Check-out Time:</span>
                <span className="value">
                  {checkOutTime ? formatTime(checkOutTime) : "Not checked out"}
                </span>
              </div>
              {todayStatus?.approved_at && (
                <div className="detail-row">
                  <span className="label">Approved at:</span>
                  <span className="value">
                    {new Date(todayStatus.approved_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="attendance-actions-panel">
            {!hasCheckedInToday() && isWithinCheckInWindow() ? (
              <div className="check-in-section">
                {isLateCheckIn() && (
                  <div className="late-warning">
                    ⚠️ <strong>Late Check-In Warning:</strong>
                    You are checking in after 1:15 PM. This will be marked as
                    LATE attendance.
                  </div>
                )}
                <LoadingButton
                  onClick={handleCheckIn}
                  loading={checkInMutation.isPending}
                  className={`check-in-btn ${
                    isLateCheckIn() ? "late-checkin" : ""
                  }`}
                  disabled={!isWithinCheckInWindow() || hasCheckedInToday()}
                >
                  <MdCheckCircle />
                  {isLateCheckIn() ? "Check In (Late)" : "Check In"}
                </LoadingButton>
              </div>
            ) : hasCheckedInToday() && canCheckOutToday() ? (
              <LoadingButton
                onClick={handleCheckOut}
                loading={checkOutMutation.isPending}
                className="check-out-btn"
              >
                <MdLogout />
                Check Out
              </LoadingButton>
            ) : hasCheckedInToday() && !canCheckOutToday() ? (
              <div className="attendance-completed">
                <MdCheckCircle />
                <span>You have already checked in for today</span>
              </div>
            ) : checkOutTime || todayStatus?.check_out_time ? (
              <div className="attendance-completed">
                <MdCheckCircle />
                <span>You have already checked out for today</span>
              </div>
            ) : (
              <div className="attendance-completed">
                <MdCheckCircle />
                <span>Attendance recorded for today</span>
              </div>
            )}
          </div>

          <div className="attendance-info">
            <div className="info-card">
              <h4>Attendance Guidelines</h4>
              <ul>
                <li>
                  <strong>Present:</strong> Check in before 1:15 PM
                </li>
                <li>
                  <strong>Late:</strong> Check in after 1:15 PM but before 1:30
                  AM (next day)
                </li>
                <li>
                  <strong>Absent:</strong> No check-in recorded by 1:30 AM (next
                  day)
                </li>
                <li>Your attendance requires approval from another operator</li>
              </ul>
            </div>

            <div className="info-card">
              <h4>Important Notes</h4>
              <ul>
                <li>You can only check in once per day</li>
                <li>You can only check out once per day</li>
                <li>Make sure to check out when leaving</li>
                <li>Contact your supervisor if you have attendance issues</li>
                <li>Attendance affects your schedule assignments</li>
              </ul>
            </div>
          </div>
        </div>

        {/* TabSwitcher for attendance filters */}
        <TabSwitcher
          tabs={ATTENDANCE_TABS}
          activeTab={attendanceFilter}
          onTabChange={setAttendanceFilter}
        />

        <div className={styles["attendance-content"]}>
          {loading ? (
            <div className={styles["loading-spinner"]}></div>
          ) : attendanceError ? (
            <div className={styles["error-message"]}>
              <p>❌ Error loading attendance data: {attendanceError}</p>
              {attendanceError.includes("Connection refused") && (
                <p>
                  <em>
                    🔧 Make sure the Django server is running on localhost:8000
                  </em>
                </p>
              )}
              <button
                onClick={() => {
                  // ✅ TANSTACK QUERY: Trigger manual refetch
                  window.location.reload(); // Simple solution for now
                }}
                className={styles["retry-btn"]}
              >
                🔄 Retry
              </button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
              noDataText={
                attendanceRecords?.length === 0
                  ? `No attendance records found for ${new Date(
                      selectedDate
                    ).toLocaleDateString()}. Staff members need to check in first to appear here.`
                  : "No attendance records found for this date."
              }
            />
          )}
        </div>

        <div className={styles["attendance-summary"]}>
          <div className={styles["summary-section"]}>
            <h3>
              Attendance Summary for{" "}
              {new Date(selectedDate).toLocaleDateString()}
            </h3>
            <div className={styles["summary-grid"]}>
              <div className={styles["summary-item"]}>
                <span className={styles["summary-label"]}>
                  Attendance Rate:
                </span>
                <span className={styles["summary-value"]}>
                  {attendanceSummary?.attendance_rate
                    ? `${Math.round(attendanceSummary.attendance_rate)}%`
                    : stats.total > 0
                    ? `${Math.round((stats.present / stats.total) * 100)}%`
                    : "0%"}
                </span>
              </div>
              <div className={styles["summary-item"]}>
                <span className={styles["summary-label"]}>Total Hours:</span>
                <span className={styles["summary-value"]}>
                  {attendanceSummary?.total_hours
                    ? `${attendanceSummary.total_hours}h`
                    : `${attendanceData.reduce(
                        (total, record) => total + record.hoursWorked,
                        0
                      )}h`}
                </span>
              </div>
              <div className={styles["summary-item"]}>
                <span className={styles["summary-label"]}>Average Hours:</span>
                <span className={styles["summary-value"]}>
                  {attendanceSummary?.average_hours
                    ? `${
                        Math.round(attendanceSummary.average_hours * 10) / 10
                      }h`
                    : stats.present > 0
                    ? `${
                        Math.round(
                          (attendanceData.reduce(
                            (total, record) => total + record.hoursWorked,
                            0
                          ) /
                            stats.present) *
                            10
                        ) / 10
                      }h`
                    : "0h"}
                </span>
              </div>
              {attendanceSummary?.pending_approvals > 0 && (
                <div className={styles["summary-item"]}>
                  <span className={styles["summary-label"]}>
                    Pending Approvals:
                  </span>
                  <span
                    className={styles["summary-value"] + " " + styles["urgent"]}
                  >
                    {attendanceSummary.pending_approvals}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AttendancePage;
