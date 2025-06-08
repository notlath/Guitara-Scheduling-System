import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../../../src/styles/Placeholders.css";
import { fetchStaffMembers } from "../../features/scheduling/schedulingSlice";
import "./AttendancePage.css";

const AttendancePage = () => {
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const { staffMembers, loading } = useSelector((state) => state.scheduling);

  useEffect(() => {
    document.title = "Attendance | Royal Care";
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
      <span className={`status-badge ${config.class}`}>
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

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <h1>Staff Attendance Tracking</h1>
        <div className="date-selector">
          <label htmlFor="attendance-date">Select Date:</label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="attendance-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Staff</div>
        </div>
        <div className="stat-card present">
          <div className="stat-number">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-number">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
        <div className="stat-card late">
          <div className="stat-number">{stats.late}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card leave">
          <div className="stat-number">{stats.onLeave}</div>
          <div className="stat-label">On Leave</div>
        </div>
      </div>

      <div className="attendance-filters">
        <button
          className={`filter-btn ${attendanceFilter === "all" ? "active" : ""}`}
          onClick={() => setAttendanceFilter("all")}
        >
          All ({attendanceData.length})
        </button>
        <button
          className={`filter-btn ${
            attendanceFilter === "present" ? "active" : ""
          }`}
          onClick={() => setAttendanceFilter("present")}
        >
          Present ({stats.present})
        </button>
        <button
          className={`filter-btn ${
            attendanceFilter === "absent" ? "active" : ""
          }`}
          onClick={() => setAttendanceFilter("absent")}
        >
          Absent ({stats.absent})
        </button>
        <button
          className={`filter-btn ${
            attendanceFilter === "late" ? "active" : ""
          }`}
          onClick={() => setAttendanceFilter("late")}
        >
          Late ({stats.late})
        </button>
        <button
          className={`filter-btn ${
            attendanceFilter === "on_leave" ? "active" : ""
          }`}
          onClick={() => setAttendanceFilter("on_leave")}
        >
          On Leave ({stats.onLeave})
        </button>
      </div>

      <div className="attendance-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="empty-state">
            <h3>No attendance records found</h3>
            <p>
              No staff members match the selected filter for{" "}
              {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours Worked</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((record) => (
                  <tr
                    key={record.id}
                    className={`attendance-row ${record.status}`}
                  >
                    <td className="staff-info">
                      <div className="staff-name">
                        {record.staffMember.first_name}{" "}
                        {record.staffMember.last_name}
                      </div>
                      <div className="staff-email">
                        {record.staffMember.email}
                      </div>
                    </td>
                    <td className="role">
                      <span
                        className={`role-badge role-${record.staffMember.role}`}
                      >
                        {record.staffMember.role}
                      </span>
                    </td>
                    <td className="status">{getStatusBadge(record.status)}</td>
                    <td className="check-in">{record.checkInTime || "-"}</td>
                    <td className="check-out">{record.checkOutTime || "-"}</td>
                    <td className="hours">
                      {record.hoursWorked > 0 ? `${record.hoursWorked}h` : "-"}
                    </td>
                    <td className="notes">{record.notes || "-"}</td>
                    <td className="actions">
                      <button className="edit-btn" title="Edit attendance">
                        ✏️
                      </button>
                      <button className="note-btn" title="Add note">
                        📝
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="attendance-summary">
        <div className="summary-section">
          <h3>
            Attendance Summary for {new Date(selectedDate).toLocaleDateString()}
          </h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Attendance Rate:</span>
              <span className="summary-value">
                {stats.total > 0
                  ? Math.round((stats.present / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Hours:</span>
              <span className="summary-value">
                {attendanceData.reduce(
                  (total, record) => total + record.hoursWorked,
                  0
                )}
                h
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Hours:</span>
              <span className="summary-value">
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

        <div className="demo-notice">
          <h4>📊 Demo Data Notice</h4>
          <p>
            This page demonstrates the attendance tracking interface with
            simulated data. In a production environment, this would connect to:
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
  );
};

export default AttendancePage;
