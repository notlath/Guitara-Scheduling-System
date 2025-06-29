import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  MdAccessTime,
  MdCancel,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdLogout,
  MdNoteAdd,
  MdRefresh,
  MdSave,
} from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  addAttendanceNote,
  checkIn,
  checkOut,
  clearAttendanceError,
  getTodayAttendanceStatus,
  updateAttendanceRecord,
} from "../features/attendance/attendanceSlice";
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import "./AttendanceComponent.css";
import { LoadingButton } from "./common/LoadingComponents";

const AttendanceComponent = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
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
    updateLoading,
    noteLoading,
  } = useSelector((state) => state.attendance);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

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

  // Initialize edit form when todayStatus changes
  useEffect(() => {
    if (todayStatus) {
      setEditForm({
        checkInTime: formatTimeForInput(checkInTime),
        checkOutTime: formatTimeForInput(checkOutTime),
        notes: todayStatus.notes || "",
      });
      setNoteText(todayStatus.notes || "");
    }
  }, [todayStatus, checkInTime, checkOutTime]);

  const handleCheckIn = () => {
    dispatch(checkIn()).then(() => {
      // ✅ TANSTACK QUERY: Invalidate attendance queries after check-in
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
    });
  };

  const handleCheckOut = () => {
    dispatch(checkOut()).then(() => {
      // ✅ TANSTACK QUERY: Invalidate attendance queries after check-out
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance", "today"] });
    });
  };

  const handleRefresh = () => {
    dispatch(getTodayAttendanceStatus());
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    setEditForm({
      checkInTime: formatTimeForInput(checkInTime),
      checkOutTime: formatTimeForInput(checkOutTime),
      notes: todayStatus?.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!todayStatus?.id) return;

    try {
      const updateData = {
        notes: editForm.notes,
      };

      // Only include time updates if they've changed and are valid
      if (
        editForm.checkInTime &&
        editForm.checkInTime !== formatTimeForInput(checkInTime)
      ) {
        updateData.check_in_time = editForm.checkInTime;
      }
      if (
        editForm.checkOutTime &&
        editForm.checkOutTime !== formatTimeForInput(checkOutTime)
      ) {
        updateData.check_out_time = editForm.checkOutTime;
      }

      await dispatch(
        updateAttendanceRecord({
          attendanceId: todayStatus.id,
          updateData,
        })
      ).unwrap();

      setIsEditing(false);

      // ✅ TANSTACK QUERY: Invalidate attendance queries after update
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "today"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "records"] }),
      ]);

      // Refresh the data
      dispatch(getTodayAttendanceStatus());
    } catch (error) {
      console.error("Failed to update attendance:", error);
    }
  };

  const handleOpenNoteModal = () => {
    setShowNoteModal(true);
    setNoteText(todayStatus?.notes || "");
  };

  const handleCloseNoteModal = () => {
    setShowNoteModal(false);
    setNoteText(todayStatus?.notes || "");
  };

  const handleSaveNote = async () => {
    if (!todayStatus?.id) return;

    try {
      await dispatch(
        addAttendanceNote({
          attendanceId: todayStatus.id,
          notes: noteText,
        })
      ).unwrap();

      setShowNoteModal(false);

      // ✅ TANSTACK QUERY: Invalidate attendance queries after note update
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "today"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "records"] }),
      ]);

      // Refresh the data
      dispatch(getTodayAttendanceStatus());
    } catch (error) {
      console.error("Failed to add note:", error);
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

  const formatTimeForInput = (timeString) => {
    if (!timeString) return "";

    // If it's already a full datetime string, parse it directly
    if (timeString.includes("T") || timeString.includes(" ")) {
      const dateTime = new Date(timeString);
      return dateTime.toTimeString().slice(0, 5); // HH:MM format
    }

    // If it's just a time string (HH:MM:SS), return HH:MM
    try {
      const [hours, minutes] = timeString.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return "";
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } catch {
      return "";
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

  const hasCheckedInToday = () => {
    // Check multiple sources to determine if user has checked in today
    return !!(
      isCheckedIn ||
      checkInTime ||
      todayStatus?.check_in_time ||
      todayStatus?.is_checked_in
    );
  };

  const canCheckOutToday = () => {
    // Must be checked in first
    if (!hasCheckedInToday()) return false;

    // If already checked out, need to verify it's not for today
    if ((checkOutTime || todayStatus?.check_out_time) && todayStatus?.date) {
      const now = new Date();
      const today = now.toDateString();
      const statusDate = new Date(todayStatus.date).toDateString();

      // If the status date is today and there's a check-out time, can't check out again
      if (today === statusDate) {
        return false; // Already checked out today
      }
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
            {todayStatus && (
              <div className="edit-actions">
                {!isEditing ? (
                  <>
                    <LoadingButton
                      onClick={handleStartEdit}
                      loading={updateLoading?.[todayStatus.id]}
                      className="edit-btn"
                      title="Edit Attendance"
                    >
                      <MdEdit />
                    </LoadingButton>
                    <LoadingButton
                      onClick={handleOpenNoteModal}
                      loading={noteLoading?.[todayStatus.id]}
                      className="note-btn"
                      title="Add Note"
                    >
                      <MdNoteAdd />
                    </LoadingButton>
                  </>
                ) : (
                  <>
                    <LoadingButton
                      onClick={handleSaveEdit}
                      loading={updateLoading?.[todayStatus.id]}
                      className="save-btn"
                      title="Save Changes"
                    >
                      <MdSave />
                    </LoadingButton>
                    <LoadingButton
                      onClick={handleCancelEdit}
                      className="cancel-btn"
                      title="Cancel Edit"
                    >
                      <MdCancel />
                    </LoadingButton>
                  </>
                )}
              </div>
            )}
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
                {isEditing ? (
                  <input
                    type="time"
                    value={editForm.checkInTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkInTime: e.target.value })
                    }
                    className="time-input"
                  />
                ) : (
                  <span className="value">
                    {checkInTime ? formatTime(checkInTime) : "Not checked in"}
                  </span>
                )}
              </div>
              <div className="detail-row">
                <span className="label">Check-out Time:</span>
                {isEditing ? (
                  <input
                    type="time"
                    value={editForm.checkOutTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, checkOutTime: e.target.value })
                    }
                    className="time-input"
                  />
                ) : (
                  <span className="value">
                    {checkOutTime
                      ? formatTime(checkOutTime)
                      : "Not checked out"}
                  </span>
                )}
              </div>
              {todayStatus?.approved_at && (
                <div className="detail-row">
                  <span className="label">Approved at:</span>
                  <span className="value">
                    {new Date(todayStatus.approved_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="detail-row">
                <span className="label">Notes:</span>
                {isEditing ? (
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    className="notes-textarea"
                    placeholder="Add notes..."
                  />
                ) : (
                  <span className="value">
                    {todayStatus?.notes || "No notes"}
                  </span>
                )}
              </div>
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
                  loading={checkInLoading}
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
                loading={checkOutLoading}
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
                <li>Your attendance requires approval from the operator</li>
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
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Note</h3>
              <button
                onClick={handleCloseNoteModal}
                className="modal-close-btn"
              >
                <MdClose />
              </button>
            </div>
            <div className="modal-body">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                className="note-textarea"
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <LoadingButton
                onClick={handleSaveNote}
                loading={noteLoading?.[todayStatus?.id]}
                className="save-note-btn"
              >
                Save Note
              </LoadingButton>
              <button
                onClick={handleCloseNoteModal}
                className="cancel-note-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AttendanceComponent;
