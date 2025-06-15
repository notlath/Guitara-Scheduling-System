import { useEffect, useState } from "react";
import {
  MdAccessTime,
  MdCheckCircle,
  MdLogout,
  MdRefresh,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  checkIn,
  checkOut,
  clearAttendanceError,
  getTodayAttendanceStatus,
} from "../features/attendance/attendanceSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import "./AttendanceComponent.css";
import { LoadingButton } from "./common/LoadingComponents";

const AttendanceComponent = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    todayStatus,
    isCheckedIn,
    checkInTime,
    checkOutTime,
    loading,
    checkInLoading,
    checkOutLoading,
    error,
    checkInError,
    checkOutError,
  } = useSelector((state) => state.attendance);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance status on component mount
  useEffect(() => {
    dispatch(getTodayAttendanceStatus());
  }, [dispatch]);

  // Clear errors after 5 seconds
  useEffect(() => {
    if (error || checkInError || checkOutError) {
      const timer = setTimeout(() => {
        dispatch(clearAttendanceError());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, checkInError, checkOutError, dispatch]);

  const handleCheckIn = () => {
    dispatch(checkIn());
  };

  const handleCheckOut = () => {
    dispatch(checkOut());
  };

  const handleRefresh = () => {
    dispatch(getTodayAttendanceStatus());
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

  const formatTime = (timeString) => {
    if (!timeString) return "--:--";

    console.log("Formatting time:", timeString, "Type:", typeof timeString);

    // If it's already a full datetime string, parse it directly
    if (timeString.includes("T") || timeString.includes(" ")) {
      const dateTime = new Date(timeString);
      console.log("Parsed datetime:", dateTime);
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
        console.error("Invalid time format:", timeString);
        return timeString; // Return original string if invalid
      }

      console.log(
        "Parsed time components - Hours:",
        hours,
        "Minutes:",
        minutes,
        "Seconds:",
        seconds
      );

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

      console.log("Created datetime:", dateTime);
      console.log(
        "Formatted result:",
        dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );

      return dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", timeString, error);
      return timeString; // Return original string on error
    }
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
    const cutoffTime = new Date();
    cutoffTime.setHours(13, 15, 0, 0); // 1:15 PM

    return now > cutoffTime;
  };

  return (
    <PageLayout>
      <div className="attendance-component">
        <LayoutRow title="Attendance">
          <div className="attendance-actions">
            <LoadingButton
              onClick={handleRefresh}
              loading={loading}
              className="refresh-btn"
              title="Refresh Status"
            >
              <MdRefresh />
            </LoadingButton>
          </div>
        </LayoutRow>

        {(error || checkInError || checkOutError) && (
          <div className="error-message">
            {error || checkInError || checkOutError}
          </div>
        )}

        <div className="attendance-dashboard">
          <div className="attendance-header">
            <div className="current-time">
              <MdAccessTime />
              <span>Current Time: {currentTime.toLocaleTimeString()}</span>
            </div>
            <div className="current-date">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <div className="attendance-status-card">
            <div className="status-header">
              <h3>Today's Attendance Status</h3>
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
            {!isCheckedIn && isWithinCheckInWindow() ? (
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
                  loading={checkInLoading}
                  className={`check-in-btn ${
                    isLateCheckIn() ? "late-checkin" : ""
                  }`}
                  disabled={!isWithinCheckInWindow()}
                >
                  <MdCheckCircle />
                  {isLateCheckIn() ? "Check In (Late)" : "Check In"}
                </LoadingButton>
              </div>
            ) : isCheckedIn && !checkOutTime ? (
              <LoadingButton
                onClick={handleCheckOut}
                loading={checkOutLoading}
                className="check-out-btn"
              >
                <MdLogout />
                Check Out
              </LoadingButton>
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
                <li>Your attendance requires approval from the operator</li>
              </ul>
            </div>

            <div className="info-card">
              <h4>Important Notes</h4>
              <ul>
                <li>You can only check in once per day</li>
                <li>Make sure to check out when leaving</li>
                <li>Contact your supervisor if you have attendance issues</li>
                <li>Attendance affects your schedule assignments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AttendanceComponent;
