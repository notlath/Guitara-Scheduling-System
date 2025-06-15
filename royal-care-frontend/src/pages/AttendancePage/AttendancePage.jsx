import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../../../src/styles/Placeholders.css";
import pageTitles from "../../constants/pageTitles";
import {
  approveAttendance,
  fetchAttendanceRecords,
  generateAttendanceSummary,
} from "../../features/attendance/attendanceSlice";
import DataTable from "../../globals/DataTable";
import LayoutRow from "../../globals/LayoutRow";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import styles from "./AttendancePage.module.css";

const AttendancePage = () => {
  const dispatch = useDispatch();

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

  const {
    attendanceRecords,
    attendanceSummary,
    loading: attendanceLoading,
    approvalLoading,
    error: attendanceError,
  } = useSelector((state) => state.attendance);

  // Combined loading state
  const loading = attendanceLoading;

  useEffect(() => {
    document.title = pageTitles.attendance;
    // Fetch attendance records (which includes staff member information)
    dispatch(fetchAttendanceRecords({ date: selectedDate }));
    dispatch(generateAttendanceSummary(selectedDate));
  }, [dispatch, selectedDate]);

  // Refetch attendance data when date changes
  useEffect(() => {
    dispatch(fetchAttendanceRecords({ date: selectedDate }));
    dispatch(generateAttendanceSummary(selectedDate));
  }, [dispatch, selectedDate]);

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
      await dispatch(approveAttendance(attendanceId)).unwrap();
      // Refetch attendance records to get updated data
      dispatch(fetchAttendanceRecords({ date: selectedDate }));
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

  // Prepare columns for DataTable
  const columns = [
    { key: "staff", label: "Staff Member" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "checkIn", label: "Check In" },
    { key: "checkOut", label: "Check Out" },
    { key: "hours", label: "Hours Worked" },
    { key: "notes", label: "Notes" },
    { key: "actions", label: "Actions" },
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
    notes: record.notes || "-",
    actions: (
      <div className={styles["actions"]}>
        {record.needsApproval && (
          <button
            className={styles["approve-btn"]}
            title="Approve attendance"
            onClick={() => handleApproveAttendance(record.id)}
            disabled={approvalLoading[record.id]}
          >
            {approvalLoading[record.id] ? "⏳" : "✅"}
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
        <LayoutRow title="Staff Attendance Tracking">
          <div className={styles["date-selector"]}>
            <label htmlFor="attendance-date">
              Select Date <small>(Asia/Manila Time - UTC+08:00)</small>:
            </label>
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
                  dispatch(fetchAttendanceRecords({ date: selectedDate }));
                  dispatch(generateAttendanceSummary(selectedDate));
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
