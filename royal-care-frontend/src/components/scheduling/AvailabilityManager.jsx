import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAvailability,
  deleteAvailability,
  fetchAvailability,
  fetchStaffMembers,
  updateAvailability,
} from "../../features/scheduling/schedulingSlice";
import useSyncEventHandlers from "../../hooks/useSyncEventHandlers";
import "../../styles/AvailabilityManager.css";
import { LoadingButton, TableLoadingState } from "../common/LoadingComponents";

// Helper function to safely evaluate is_active field
const isStaffActive = (staff) => {
  if (!staff) return false;

  const isActive = staff.is_active;

  // Handle undefined/null - default to true for existing users (backward compatibility)
  if (isActive === undefined || isActive === null) {
    return true;
  }

  // Handle various data types that might come from the API
  if (typeof isActive === "boolean") {
    return isActive;
  }

  if (typeof isActive === "string") {
    const lowerValue = isActive.toLowerCase();
    return (
      lowerValue === "true" ||
      lowerValue === "1" ||
      lowerValue === "yes" ||
      lowerValue === "active"
    );
  }

  if (typeof isActive === "number") {
    return isActive === 1 || isActive > 0;
  }

  // If it's an object, try to extract a boolean value
  if (typeof isActive === "object" && isActive.value !== undefined) {
    return isStaffActive({ ...staff, is_active: isActive.value });
  }

  // Default to true if uncertain (assume active unless explicitly disabled)
  console.warn(
    `Warning: Unexpected is_active value for ${staff.first_name} ${staff.last_name}, defaulting to true:`,
    isActive,
    typeof isActive
  );
  return true;
};

const AvailabilityManager = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { staffMembers, availabilities, loading, error } = useSelector(
    (state) => state.scheduling
  );

  // Ensure availabilities is always an array to prevent undefined errors
  const safeAvailabilities = availabilities || [];

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedStaffData, setSelectedStaffData] = useState(null);

  // Helper function to get today's date in YYYY-MM-DD format without timezone issues
  const getTodayString = () => {
    const today = new Date();
    return (
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0")
    );
  };
  const [newAvailabilityForm, setNewAvailabilityForm] = useState({
    date: getTodayString(),
    startTime: "13:00",
    endTime: "14:00", // Changed from "1:00" to "14:00" for better UX
    isAvailable: true,
  }); // Fetch staff members and availabilities on component mount
  useEffect(() => {
    dispatch(fetchStaffMembers());

    // If user is a therapist or driver, set them as selected staff
    if (user.role === "therapist" || user.role === "driver") {
      setSelectedStaff(user.id);
      const formattedDate = selectedDate.toISOString().split("T")[0];
      dispatch(
        fetchAvailability({
          staffId: user.id,
          date: formattedDate,
          forceRefresh: false,
        })
      );
    }
  }, [dispatch, user, selectedDate]);

  // Load availability whenever selected staff or date changes
  useEffect(() => {
    if (selectedStaff) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      console.log("🔄 Loading availability for:", {
        selectedStaff: selectedStaff,
        formattedDate: formattedDate,
        selectedDate: selectedDate,
      });
      // Use optimized fetch with caching
      dispatch(
        fetchAvailability({
          staffId: selectedStaff,
          date: formattedDate,
          forceRefresh: false, // Use cache if available
        })
      );
    }
  }, [selectedStaff, selectedDate, dispatch]);

  // Update form date when selected date changes
  useEffect(() => {
    const formattedDate = selectedDate.toISOString().split("T")[0];
    setNewAvailabilityForm((prev) => ({
      ...prev,
      date: formattedDate,
    }));
  }, [selectedDate]); // Real-time sync is handled entirely by Redux sync reducers and useSyncEventHandlers
  // No need for component-level subscriptions since Redux state updates trigger re-renders automatically

  const handleStaffChange = (e) => {
    const staffId = e.target.value;
    setSelectedStaff(staffId);
    // Find and store the selected staff data
    if (staffId) {
      const staffData = staffMembers.find(
        (staff) => staff.id.toString() === staffId
      );
      if (staffData) {
        // Use the helper function to normalize is_active
        const normalizedStaffData = {
          ...staffData,
          is_active: isStaffActive(staffData),
        };
        setSelectedStaffData(normalizedStaffData);
        console.log("🧪 Debug: Selected staff data:", normalizedStaffData);
        console.log(
          "🧪 Debug: is_active evaluation:",
          isStaffActive(staffData)
        );
      }
    } else {
      setSelectedStaffData(null);
    }
  };
  const handleDateChange = (e) => {
    // Create date from the input value to avoid timezone issues
    const dateValue = e.target.value;
    const [year, month, day] = dateValue.split("-");
    const localDate = new Date(year, month - 1, day);
    setSelectedDate(localDate);
  };

  const handleNewAvailabilityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAvailabilityForm({
      ...newAvailabilityForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };
  const handleAddAvailability = () => {
    if (!selectedStaff) {
      alert("Please select a staff member");
      return;
    } // Check if the selected staff account is disabled
    if (selectedStaffData && !isStaffActive(selectedStaffData)) {
      alert(
        `Cannot add availability for ${selectedStaffData.first_name} ${selectedStaffData.last_name}. ` +
          "This staff account is currently disabled. Use the 'Enable Account' button below to reactivate the account first."
      );
      return;
    }

    // Parse and validate staff ID
    const staffId = parseInt(selectedStaff, 10);
    if (isNaN(staffId)) {
      alert("Invalid staff member selected");
      return;
    } // Validate time range
    const startTime = newAvailabilityForm.startTime;
    const endTime = newAvailabilityForm.endTime;

    // Support cross-day availability (e.g., 13:00 to 01:00 next day)
    const validateTimeRange = (start, end) => {
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);

      // If end time is earlier than start time, it's cross-day
      if (endMinutes < startMinutes) {
        // Cross-day: calculate as start to midnight + midnight to end
        return 24 * 60 - startMinutes + endMinutes;
      } else {
        // Same day: normal calculation
        return endMinutes - startMinutes;
      }
    };

    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const diffMinutes = validateTimeRange(startTime, endTime);

    if (diffMinutes <= 0) {
      alert("Invalid time range. Please check your start and end times.");
      return;
    }

    if (diffMinutes < 30) {
      alert("Availability period must be at least 30 minutes");
      return;
    }

    // Warn user about cross-day availability
    if (timeToMinutes(endTime) < timeToMinutes(startTime)) {
      const isConfirmed = window.confirm(
        `This creates a cross-day availability from ${startTime} to ${endTime} next day. Continue?`
      );
      if (!isConfirmed) {
        return;
      }
    }
    dispatch(
      createAvailability({
        user: staffId,
        date: newAvailabilityForm.date,
        start_time: newAvailabilityForm.startTime,
        end_time: newAvailabilityForm.endTime,
        is_available: newAvailabilityForm.isAvailable,
      })
    ).then((result) => {
      if (createAvailability.fulfilled.match(result)) {
        console.log("✅ Availability created successfully:", result.payload);

        // Success - reset form to selected date (not today)
        const currentFormDate = selectedDate.toISOString().split("T")[0];
        setNewAvailabilityForm({
          date: currentFormDate,
          startTime: "13:00",
          endTime: "14:00", // Changed from "1:00" to "14:00" for better UX
          isAvailable: true,
        });

        // Redux state will be updated automatically via sync events
        // No need for manual refresh - the useSyncEventHandlers hook handles this

        alert("Availability created successfully!");
      } else if (createAvailability.rejected.match(result)) {
        // Error - show user-friendly message
        const errorMsg = result.payload || "Failed to create availability";
        console.error("❌ Availability creation failed:", errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    });
  };
  const handleDeleteAvailability = (availabilityId) => {
    if (window.confirm("Are you sure you want to delete this availability?")) {
      dispatch(deleteAvailability(availabilityId)).then((result) => {
        if (deleteAvailability.fulfilled.match(result)) {
          console.log("✅ Availability deleted successfully");
          // Redux state will be updated automatically via sync events
          // No need for manual refresh - the useSyncEventHandlers hook handles this
        }
      });
    }
  };
  const handleToggleAvailability = (availability) => {
    dispatch(
      updateAvailability({
        id: availability.id,
        data: {
          ...availability,
          is_available: !availability.is_available,
        },
      })
    ).then((result) => {
      if (updateAvailability.fulfilled.match(result)) {
        console.log("✅ Availability updated successfully");
        // Redux state will be updated automatically via sync events
        // No need for manual refresh - the useSyncEventHandlers hook handles this
      }
    });
  };
  const handleToggleAccountStatus = async () => {
    if (!selectedStaffData) return;

    try {
      const knoxToken = localStorage.getItem("knoxToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/toggle-account-status/${
          selectedStaffData.id
        }/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${knoxToken}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        const updatedStaff = result.user;
        // Update the selected staff data
        setSelectedStaffData(updatedStaff);
        // Refresh staff members list
        dispatch(fetchStaffMembers());

        // Show success message
        alert(result.message);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to toggle account status");
      }
    } catch (error) {
      console.error("Error toggling account status:", error);
      alert(`Failed to update account status: ${error.message}`);
    }
  };
  const generateTimeSlots = () => {
    // Generate time slots from 1 AM to 11:30 PM (no duplicate 1 AM)
    const slots = [];

    // Start with 1 AM
    slots.push("01:00", "01:30");

    // Continue from 2 AM to 11 PM
    for (let hour = 2; hour <= 23; hour++) {
      const hourString = hour.toString().padStart(2, "0");
      slots.push(`${hourString}:00`);
      slots.push(`${hourString}:30`);
    }

    // Add midnight times (00:00 and 00:30)
    slots.push("00:00", "00:30");

    return slots;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []); // Filter staff members based on user role
  const filteredStaffMembers = useMemo(() => {
    const baseFilter =
      user.role === "operator"
        ? staffMembers
        : staffMembers.filter((staff) => staff.id === user.id);

    const filtered = baseFilter.filter(
      (staff) => staff.role === "therapist" || staff.role === "driver"
    );

    return filtered;
  }, [staffMembers, user.role, user.id]);

  return (
    <div className="availability-manager">
      <h2>Staff Availability Management</h2>
      {error && (
        <div className="error-message">
          {typeof error === "object"
            ? error.message || error.error || JSON.stringify(error)
            : error}
        </div>
      )}{" "}
      <div className="filters">
        {user.role === "operator" && (
          <div className="filter-group">
            <label htmlFor="staff">Select Staff Member:</label>
            <select
              id="staff"
              value={selectedStaff}
              onChange={handleStaffChange}
            >
              <option value="">-- Select a staff member --</option>
              {filteredStaffMembers.map((staff) => {
                // Use helper function to properly evaluate is_active
                const isActive = isStaffActive(staff);

                return (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} ({staff.role})
                    {!isActive ? " [DISABLED]" : ""}
                  </option>
                );
              })}
            </select>

            {/* Debug section for operators */}
            <div
              className="debug-section"
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <details>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  🔍 Debug Staff Status
                </summary>
                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => dispatch(fetchStaffMembers())}
                    style={{
                      marginBottom: "10px",
                      padding: "5px 10px",
                      backgroundColor: "#007cba",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Refresh Staff Data
                  </button>
                  <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
                    <strong>
                      Staff Members ({filteredStaffMembers.length} found):
                    </strong>
                    {filteredStaffMembers.map((staff) => (
                      <div
                        key={staff.id}
                        style={{
                          margin: "5px 0",
                          padding: "5px",
                          backgroundColor: "white",
                          border: "1px solid #ccc",
                        }}
                      >
                        <div>
                          <strong>
                            {staff.first_name} {staff.last_name}
                          </strong>{" "}
                          (ID: {staff.id})
                        </div>
                        <div>Role: {staff.role}</div>
                        <div>
                          Raw is_active: {String(staff.is_active)} (type:{" "}
                          {typeof staff.is_active})
                        </div>
                        <div>
                          Evaluated:{" "}
                          {isStaffActive(staff) ? "ACTIVE" : "DISABLED"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
        {/* Warning banner for disabled staff */}
        {selectedStaffData && !isStaffActive(selectedStaffData) && (
          <div className="disabled-staff-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Account Disabled:</strong>
              {selectedStaffData.first_name} {selectedStaffData.last_name}'s
              account is currently disabled. You can view their current
              availability below, but cannot add new availability. Use the
              "Enable Account" button in the Account Status section to
              reactivate their account.
            </div>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={
              selectedDate.getFullYear() +
              "-" +
              String(selectedDate.getMonth() + 1).padStart(2, "0") +
              "-" +
              String(selectedDate.getDate()).padStart(2, "0")
            }
            onChange={handleDateChange}
          />
        </div>
      </div>{" "}
      {(user.role === "operator" ||
        user.role === "therapist" ||
        user.role === "driver") &&
        !(selectedStaffData && !isStaffActive(selectedStaffData)) && (
          <div className="add-availability-form">
            <h3>Add New Availability</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="new-date">Date:</label>
                <input
                  type="date"
                  id="new-date"
                  name="date"
                  value={newAvailabilityForm.date}
                  onChange={handleNewAvailabilityChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Start Time:</label>
                <select
                  id="startTime"
                  name="startTime"
                  value={newAvailabilityForm.startTime}
                  onChange={handleNewAvailabilityChange}
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="endTime">End Time:</label>
                <select
                  id="endTime"
                  name="endTime"
                  value={newAvailabilityForm.endTime}
                  onChange={handleNewAvailabilityChange}
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Common Time Presets:</label>
                <div className="time-presets">
                  <button
                    type="button"
                    className="preset-button"
                    onClick={() =>
                      setNewAvailabilityForm({
                        ...newAvailabilityForm,
                        startTime: "13:00",
                        endTime: "14:00",
                      })
                    }
                  >
                    1-2 PM
                  </button>
                  <button
                    type="button"
                    className="preset-button"
                    onClick={() =>
                      setNewAvailabilityForm({
                        ...newAvailabilityForm,
                        startTime: "13:00",
                        endTime: "17:00",
                      })
                    }
                  >
                    1-5 PM
                  </button>
                  <button
                    type="button"
                    className="preset-button"
                    onClick={() =>
                      setNewAvailabilityForm({
                        ...newAvailabilityForm,
                        startTime: "17:00",
                        endTime: "21:00",
                      })
                    }
                  >
                    5-9 PM
                  </button>
                  <button
                    type="button"
                    className="preset-button"
                    onClick={() =>
                      setNewAvailabilityForm({
                        ...newAvailabilityForm,
                        startTime: "13:00",
                        endTime: "01:00",
                      })
                    }
                  >
                    1PM-1AM (Cross-day)
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="isAvailable">Available:</label>
                <input
                  type="checkbox"
                  id="isAvailable"
                  name="isAvailable"
                  checked={newAvailabilityForm.isAvailable}
                  onChange={handleNewAvailabilityChange}
                />
              </div>{" "}
              <LoadingButton
                className="add-button"
                onClick={handleAddAvailability}
                disabled={!selectedStaff}
                loading={loading}
              >
                Add Availability
              </LoadingButton>
            </div>
          </div>
        )}{" "}
      <div className="availability-list">
        <h3>Current Availability</h3>
        {/* Account Status Section - Only show for operators when staff is selected */}
        {user.role === "operator" && selectedStaffData && (
          <div className="account-status-section">
            <h4>
              Account Status for {selectedStaffData.first_name}{" "}
              {selectedStaffData.last_name}
            </h4>{" "}
            <div className="account-status-info">
              <div className="status-indicator">
                <span
                  className={`status-badge ${
                    isStaffActive(selectedStaffData) ? "active" : "inactive"
                  }`}
                >
                  {isStaffActive(selectedStaffData)
                    ? "✅ Active"
                    : "❌ Disabled"}
                </span>
                <span className="role-info">({selectedStaffData.role})</span>
              </div>

              <button
                className={`toggle-account-button ${
                  isStaffActive(selectedStaffData)
                    ? "disable-btn"
                    : "enable-btn"
                }`}
                onClick={handleToggleAccountStatus}
                title={
                  isStaffActive(selectedStaffData)
                    ? "Disable this account"
                    : "Enable this account"
                }
              >
                {isStaffActive(selectedStaffData)
                  ? "Disable Account"
                  : "Enable Account"}
              </button>
            </div>
            {!isStaffActive(selectedStaffData) && (
              <div className="account-disabled-note">
                <strong>Note:</strong> This account is disabled. The staff
                member cannot log in or receive new appointments. Click "Enable
                Account" to reactivate.
              </div>
            )}
          </div>
        )}{" "}
        {loading ? (
          <TableLoadingState
            columns={["Date", "Start Time", "End Time", "Status", "Actions"]}
            rows={3}
          />
        ) : safeAvailabilities.length === 0 ? (
          <p>No availability set for this date.</p>
        ) : (
          <table className="availability-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeAvailabilities.map((availability) => (
                <tr
                  key={availability.id}
                  className={
                    availability.is_available ? "available" : "unavailable"
                  }
                >
                  <td>{new Date(availability.date).toLocaleDateString()}</td>
                  <td>{availability.start_time}</td>
                  <td>{availability.end_time}</td>
                  <td>
                    {availability.is_available ? "Available" : "Unavailable"}
                  </td>
                  <td>
                    <button
                      className={`toggle-button ${
                        availability.is_available
                          ? "available-status"
                          : "unavailable-status"
                      }`}
                      onClick={() => handleToggleAvailability(availability)}
                      title={
                        availability.is_available
                          ? "Click to make unavailable"
                          : "Click to make available"
                      }
                    >
                      <span className="toggle-icon">
                        {availability.is_available ? "🟢" : "🔴"}
                      </span>
                      <span className="toggle-text">
                        {availability.is_available ? "Disable" : "Enable"}
                      </span>
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteAvailability(availability.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManager;
