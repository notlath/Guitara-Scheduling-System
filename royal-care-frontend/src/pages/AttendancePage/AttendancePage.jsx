import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../../../src/styles/Placeholders.css";
import { fetchStaffMembers } from "../../features/scheduling/schedulingSlice";
import styles from "./AttendancePage.module.css";
import pageTitles from "../../constants/pageTitles";
import DataTable from "../../globals/DataTable";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import TabSwitcher from "../../globals/TabSwitcher";

const AttendancePage = () => {
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const { staffMembers, loading } = useSelector((state) => state.scheduling);

  useEffect(() => {
    document.title = pageTitles.attendance;
    dispatch(fetchStaffMembers());
  }, [dispatch]);

  // Mock attendance data - in real app, this would come from API
  const generateMockAttendance = (staffMember) => {
    const today = new Date();
    const selectedDay = new Date(selectedDate);
    const isToday = selectedDay.toDateString() === today.toDateString();
    const isPastDate = selectedDay < today;

    // Generate realistic attendance data
    const statuses = ["present", "absent", "late", "on_leave"];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      id: staffMember.id,
      staffMember: staffMember,
      date: selectedDate,
      status: isPastDate ? randomStatus : isToday ? "present" : "scheduled",
      checkInTime: isPastDate && randomStatus === "present" ? "08:30" : null,
      checkOutTime: isPastDate && randomStatus === "present" ? "17:00" : null,
      hoursWorked: isPastDate && randomStatus === "present" ? 8.5 : 0,
      notes:
        randomStatus === "late"
          ? "Traffic delay"
          : randomStatus === "absent"
          ? "Sick leave"
          : "",
    };
  };

  const attendanceData = (staffMembers || []).map(generateMockAttendance);

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
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return (
      <span className={`${styles["status-badge"]} ${styles[config.class]}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter((r) => r.status === "present").length;
    const absent = attendanceData.filter((r) => r.status === "absent").length;
    const late = attendanceData.filter((r) => r.status === "late").length;
    const onLeave = attendanceData.filter(
      (r) => r.status === "on_leave"
    ).length;

    return { total, present, absent, late, onLeave };
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
        <div className={styles["staff-email"]}>{record.staffMember.email}</div>
      </div>
    ),
    role: (
      <span
        className={
          styles["stat-label"] + " " + (styles[record.staffMember.role] || "")
        }
      >
        {record.staffMember.role}
      </span>
    ),
    status: getStatusBadge(record.status),
    checkIn: record.checkInTime || "-",
    checkOut: record.checkOutTime || "-",
    hours: record.hoursWorked > 0 ? `${record.hoursWorked}h` : "-",
    notes: record.notes || "-",
    actions: (
      <div className={styles["actions"]}>
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
  ];

  return (
    <PageLayout>
      <div className={styles["attendance-page"]}>
        <LayoutRow title="Staff Attendance Tracking">
          <div className={styles["date-selector"]}>
            <label htmlFor="attendance-date">Select Date:</label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={styles["date-input"]}
            />
          </div>
        </LayoutRow>

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
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
              noDataText="No attendance records found."
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
                  {stats.total > 0
                    ? Math.round((stats.present / stats.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className={styles["summary-item"]}>
                <span className={styles["summary-label"]}>Total Hours:</span>
                <span className={styles["summary-value"]}>
                  {attendanceData.reduce(
                    (total, record) => total + record.hoursWorked,
                    0
                  )}
                  h
                </span>
              </div>
              <div className={styles["summary-item"]}>
                <span className={styles["summary-label"]}>Average Hours:</span>
                <span className={styles["summary-value"]}>
                  {stats.present > 0
                    ? Math.round(
                        (attendanceData.reduce(
                          (total, record) => total + record.hoursWorked,
                          0
                        ) /
                          stats.present) *
                          10
                      ) / 10
                    : 0}
                  h
                </span>
              </div>
            </div>
          </div>
          <div className={styles["demo-notice"]}>
            <h4>📊 Demo Data Notice</h4>
            <p>
              This page demonstrates the attendance tracking interface with
              simulated data. In a production environment, this would connect
              to:
            </p>
            <ul>
              <li>Time clock systems for automatic check-in/out</li>
              <li>Leave management system for vacation/sick time</li>
              <li>Integration with payroll systems</li>
              <li>Real-time attendance notifications</li>
              <li>Historical attendance reports and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AttendancePage;
