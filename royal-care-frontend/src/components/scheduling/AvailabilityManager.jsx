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
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

// Helper function to safely evaluate is_active field
// Fixed syntax and improved availability fetching
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
  ); // Ensure availabilities is always an array to prevent undefined errors
  const safeAvailabilities = useMemo(
    () => availabilities || [],
    [availabilities]
  );
  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();

  // Initialize selectedDate to current date using the same method as getTodayString to avoid timezone issues
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    return new Date(year, month, day); // Create date using local timezone
  });
  const [selectedStaff, setSelectedStaff] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedStaffData, setSelectedStaffData] = useState(null);
  // Loading states for MinimalLoadingIndicator
  const [formLoading, setFormLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [accountToggleLoading, setAccountToggleLoading] = useState(false);
  // Helper function to get today's date in YYYY-MM-DD format without timezone issues
  const getTodayString = () => {
    const today = new Date();
    // Use local timezone to avoid date shifting issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to format any date object to YYYY-MM-DD format without timezone issues
  const formatDateToString = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [newAvailabilityForm, setNewAvailabilityForm] = useState({
    date: getTodayString(),
    startTime: "13:00",
    endTime: "14:00", // Changed from "1:00" to "14:00" for better UX
    isAvailable: true,
  }); // Ensure the date in newAvailabilityForm is always current on mount
  useEffect(() => {
    const currentDate = getTodayString();
    setNewAvailabilityForm((prev) => ({
      ...prev,
      date: currentDate,
    }));
  }, []); // Run once on mount
  // Fetch staff members and availabilities on component mount
  useEffect(() => {
    dispatch(fetchStaffMembers());

    // If user is a therapist or driver, set them as selected staff
    if (user.role === "therapist" || user.role === "driver") {
      setSelectedStaff(user.id);
      const formattedDate = formatDateToString(selectedDate);
      dispatch(
        fetchAvailability({
          staffId: user.id,
          date: formattedDate,
          forceRefresh: true, // Force refresh on initial load to get current data
        })
      );
    }
  }, [dispatch, user, selectedDate]);

  // Load availability whenever selected staff or date changes
  useEffect(() => {
    if (selectedStaff) {
      const formattedDate = formatDateToString(selectedDate);
      console.log("🔄 Loading availability for:", {
        selectedStaff: selectedStaff,
        formattedDate: formattedDate,
        selectedDate: selectedDate,
        requestTimestamp: new Date().toISOString(),
      });
      // Force refresh to always get current data when staff/date changes
      dispatch(
        fetchAvailability({
          staffId: selectedStaff,
          date: formattedDate,
          forceRefresh: true, // Always get fresh data when selection changes
        })
      ).then((result) => {
        console.log("🔍 fetchAvailability result:", result);
        if (fetchAvailability.fulfilled.match(result)) {
          console.log("✅ Availability fetched successfully:", result.payload);
        } else if (fetchAvailability.rejected.match(result)) {
          console.error("❌ Availability fetch failed:", result.payload);
        }
      });
    } else {
      // Clear availability when no staff is selected
      console.log("🧹 Clearing availability data - no staff selected");
      // We could dispatch a clear action here if needed
    }
  }, [selectedStaff, selectedDate, dispatch]);
  // Update form date when selected date changes
  useEffect(() => {
    // Use getTodayString format to ensure consistency
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    setNewAvailabilityForm((prev) => ({
      ...prev,
      date: formattedDate,
    }));
  }, [selectedDate]); // Debug effect to track availability data changes
  useEffect(() => {
    const selectedDateFormatted = selectedDate
      ? selectedDate.toLocaleDateString()
      : "undefined";
    // Use consistent local date formatting instead of ISO string to avoid timezone issues
    const selectedDateISO = selectedDate
      ? formatDateToString(selectedDate)
      : "undefined";

    console.log("🔍 AvailabilityManager Debug:", {
      selectedStaff,
      selectedDateFormatted,
      selectedDateISO,
      availabilitiesCount: availabilities ? availabilities.length : 0,
      availabilities,
      safeAvailabilitiesCount: safeAvailabilities.length,
      safeAvailabilities,
      loading,
      error,
    });
  }, [
    selectedStaff,
    selectedDate,
    availabilities,
    safeAvailabilities,
    loading,
    error,
  ]);

  // Real-time sync is handled entirely by Redux sync reducers and useSyncEventHandlers
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
    }    // Validate time range
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
    }    // Additional validation for cross-day availability
    const isCrossDay = timeToMinutes(endTime) < timeToMinutes(startTime);
    if (isCrossDay) {
      // Validate that cross-day availability makes sense
      const endHour = parseInt(endTime.split(":")[0]);
      
      // Prevent creating availability that spans too many hours (e.g., 13:00 to 23:00 next day)
      if (endHour > 12 && endHour < 18) {
        alert(
          `Cross-day availability ending at ${endTime} is unusual. ` +
          `Cross-day shifts typically end in early morning hours (01:00-06:00). ` +
          `Please verify this is correct or use separate availability slots.`
        );
        return;
      }

      // Warn about very long shifts
      if (diffMinutes > 18 * 60) { // More than 18 hours
        const proceed = window.confirm(
          `This creates a ${Math.round(diffMinutes / 60)} hour shift. ` +
          `Very long shifts may cause scheduling issues. Continue?`
        );
        if (!proceed) {
          return;
        }
      }
    }

    // Check for overlapping or duplicate availability before creating
    const existingOverlaps = safeAvailabilities.filter((availability) => {
      if (availability.date !== newAvailabilityForm.date) return false;

      const existingStart = timeToMinutes(availability.start_time);
      const existingEnd = timeToMinutes(availability.end_time);
      const newStart = timeToMinutes(startTime);
      const newEnd = timeToMinutes(endTime);

      // Check for exact match
      if (existingStart === newStart && existingEnd === newEnd) {
        return true;
      }

      // Check for overlap (simplified - doesn't handle complex cross-day scenarios)
      if (newStart < existingEnd && newEnd > existingStart) {
        return true;
      }

      return false;
    });

    if (existingOverlaps.length > 0) {
      const overlapDetails = existingOverlaps
        .map(
          (overlap) =>
            `${overlap.start_time}-${overlap.end_time} (${
              overlap.is_available ? "Available" : "Unavailable"
            })`
        )
        .join(", ");

      const action = window.confirm(
        `This time slot overlaps with existing availability:\n${overlapDetails}\n\n` +
          "Click OK to proceed anyway (may result in an error), or Cancel to modify the times."
      );

      if (!action) {
        return;
      }
    }    // Warn user about cross-day availability and validate end time
    if (timeToMinutes(endTime) < timeToMinutes(startTime)) {
      // For cross-day availability, ensure the end time makes sense
      if (timeToMinutes(endTime) > 240) { // After 4:00 AM is unusual
        const continueAnyway = window.confirm(
          `Cross-day availability ending at ${endTime} seems unusual. ` +
          `Most cross-day shifts end before 4:00 AM. Continue anyway?`
        );
        if (!continueAnyway) {
          alert(
            "Consider using an end time like 01:00, 02:00, or 03:00 for overnight shifts. " +
            "If you need longer hours, create separate availability slots."
          );
          return;
        }
      }
      
      const isConfirmed = window.confirm(
        `This creates a cross-day availability from ${startTime} to ${endTime} next day. ` +
        `This means you'll be available overnight. Continue?`
      );
      if (!isConfirmed) {
        return;
      }
    }

    setFormLoading(true);
    dispatch(
      createAvailability({
        user: staffId,
        date: newAvailabilityForm.date,
        start_time: newAvailabilityForm.startTime,
        end_time: newAvailabilityForm.endTime,
        is_available: newAvailabilityForm.isAvailable,
      })
    ).then((result) => {
      setFormLoading(false);
      if (createAvailability.fulfilled.match(result)) {
        console.log("✅ Availability created successfully:", result.payload); // Success - reset form to selected date (not today)
        const currentFormDate = formatDateToString(selectedDate);
        setNewAvailabilityForm({
          date: currentFormDate,
          startTime: "13:00",
          endTime: "14:00", // Changed from "1:00" to "14:00" for better UX
          isAvailable: true,
        }); // Force refresh availability to show the new data immediately
        if (selectedStaff) {
          const formattedDate = formatDateToString(selectedDate);
          console.log("🔄 Force refreshing availability after creation...");
          dispatch(
            fetchAvailability({
              staffId: selectedStaff,
              date: formattedDate,
              forceRefresh: true, // Force fresh data after creation
            })
          );
        }
        alert("Availability created successfully!");
      } else if (createAvailability.rejected.match(result)) {
        // Enhanced error handling with specific messages
        let errorMsg = "Failed to create availability";
        const errorData = result.payload;

        if (errorData) {
          if (errorData.non_field_errors) {
            // Handle unique constraint violations
            if (
              errorData.non_field_errors.some((err) => err.includes("unique"))
            ) {
              errorMsg =
                "This exact time slot already exists. Please choose different times or modify the existing slot.";
            } else {
              errorMsg = errorData.non_field_errors.join(", ");
            }
          } else if (typeof errorData === "string") {
            errorMsg = errorData;
          } else if (errorData.error) {
            errorMsg = errorData.error;
          } else if (errorData.detail) {
            errorMsg = errorData.detail;
          } else {
            // Format validation errors
            const errors = Object.entries(errorData)
              .map(([field, msgs]) => {
                const messages = Array.isArray(msgs) ? msgs : [msgs];
                return `${field}: ${messages.join(", ")}`;
              })
              .join("\n");

            if (errors) {
              errorMsg = `Validation errors:\n${errors}`;
            }
          }
        }

        console.error("❌ Availability creation failed:", errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    });
  };

  const handleDeleteAvailability = (availabilityId) => {
    if (window.confirm("Are you sure you want to delete this availability?")) {
      dispatch(deleteAvailability(availabilityId)).then((result) => {
        if (deleteAvailability.fulfilled.match(result)) {
          console.log("✅ Availability deleted successfully"); // Force refresh availability to show updated data immediately
          if (selectedStaff) {
            const formattedDate = formatDateToString(selectedDate);
            console.log("🔄 Force refreshing availability after deletion...");
            dispatch(
              fetchAvailability({
                staffId: selectedStaff,
                date: formattedDate,
                forceRefresh: true, // Force fresh data after deletion
              })
            );
          }
        }
      });
    }
  };
  const handleToggleAvailability = (availability) => {
    setToggleLoading(true);
    dispatch(
      updateAvailability({
        id: availability.id,
        data: {
          ...availability,
          is_available: !availability.is_available,
        },
      })
    ).then((result) => {
      setToggleLoading(false);
      if (updateAvailability.fulfilled.match(result)) {
        console.log("✅ Availability updated successfully"); // Force refresh availability to show updated data immediately
        if (selectedStaff) {
          const formattedDate = formatDateToString(selectedDate);
          console.log("🔄 Force refreshing availability after update...");
          dispatch(
            fetchAvailability({
              staffId: selectedStaff,
              date: formattedDate,
              forceRefresh: true, // Force fresh data after update
            })
          );
        }
      }
    });
  };
  const handleToggleAccountStatus = async () => {
    if (!selectedStaffData) return;

    setAccountToggleLoading(true);
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
    } finally {
      setAccountToggleLoading(false);
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
  }, []);

  // Filter staff members based on user role
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
              })}{" "}
            </select>

            {/* Selected Staff Summary */}
            {selectedStaffData && (
              <div className="selected-staff-summary">
                <h4>
                  Selected Staff: {selectedStaffData.first_name}{" "}
                  {selectedStaffData.last_name}
                </h4>
                <div className="staff-info">
                  <span className="staff-role">
                    Role: {selectedStaffData.role}
                  </span>
                  <span
                    className={`staff-status ${
                      isStaffActive(selectedStaffData) ? "active" : "inactive"
                    }`}
                  >
                    Status:{" "}
                    {isStaffActive(selectedStaffData) ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="availability-instruction">
                  📅 Use the date picker below to view availability for specific
                  dates
                </p>
              </div>
            )}

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
        )}{" "}
        <div className="filter-group">
          <label htmlFor="date">
            Viewing Availability for Date:
            <span className="current-date-display">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </label>
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
          />{" "}
          <small className="date-helper-text">
            📅 Change the date above to view availability for different days
          </small>
        </div>
      </div>
      {(user.role === "operator" ||
        user.role === "therapist" ||
        user.role === "driver") &&
        !(selectedStaffData && !isStaffActive(selectedStaffData)) && (
          <div className="add-availability-form">
            <h3>Add New Availability</h3>

            {/* Info section about availability constraints */}
            <div
              className="availability-info"
              style={{
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "15px",
                fontSize: "14px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <strong>ℹ️ Important Notes:</strong>
              </div>
              <ul style={{ margin: "0", paddingLeft: "20px" }}>
                <li>
                  You cannot create duplicate time slots (same start and end
                  time) for the same date
                </li>
                <li>
                  Overlapping time slots may cause conflicts during appointment
                  booking
                </li>
                <li>
                  To modify existing availability, use the toggle/delete buttons
                  in the table below
                </li>
                <li>
                  Cross-day availability (e.g., 11PM-2AM) will appear on both
                  days
                </li>
              </ul>
            </div>

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
                  </button>{" "}
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
                <div className="cross-day-info">
                  <small>
                    ℹ️ <strong>Cross-day scheduling:</strong> When end time is
                    earlier than start time, the availability spans midnight
                    (e.g., 1PM-1AM means 1PM today to 1AM tomorrow). Cross-day
                    availability will appear on both days.
                  </small>
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
                />{" "}
              </div>{" "}
              <div className="form-group">
                <button
                  className="add-button"
                  onClick={handleAddAvailability}
                  disabled={!selectedStaff || formLoading}
                >
                  Add Availability
                </button>
                <MinimalLoadingIndicator
                  show={formLoading}
                  position="center-right"
                  size="small"
                  variant="subtle"
                />
              </div>
            </div>
          </div>
        )}{" "}
      <div className="availability-list">
        <h3>Current Availability</h3>
        <MinimalLoadingIndicator
          show={loading}
          position="top-right"
          size="micro"
          variant="ghost"
        />
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
              </div>{" "}
              <button
                className={`toggle-account-button ${
                  isStaffActive(selectedStaffData)
                    ? "disable-btn"
                    : "enable-btn"
                }`}
                onClick={handleToggleAccountStatus}
                disabled={accountToggleLoading}
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
              <MinimalLoadingIndicator
                show={accountToggleLoading}
                position="center-right"
                size="micro"
                variant="subtle"
              />
            </div>
            {!isStaffActive(selectedStaffData) && (
              <div className="account-disabled-note">
                <strong>Note:</strong> This account is disabled. The staff
                member cannot log in or receive new appointments. Click "Enable
                Account" to reactivate.
              </div>
            )}
          </div>
        )}

        {!selectedStaff ? (
          <div className="no-staff-selected">
            <div className="select-staff-prompt">
              <p>
                <strong>
                  👆 Please select a staff member above to view their
                  availability.
                </strong>
              </p>
              <p className="hint-text">
                {user.role === "operator"
                  ? "Choose any therapist or driver to manage their schedule."
                  : "Your personal availability will be displayed here."}
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="loading-availability">
            <div className="loading-message">
              <span>
                Loading availability for {selectedDate.toLocaleDateString()}...
              </span>
            </div>
          </div>
        ) : safeAvailabilities.length === 0 ? (
          <div className="no-availability-message">
            <p>
              <strong>
                No availability set for {selectedDate.toLocaleDateString()}.
              </strong>
            </p>
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              {" "}
              <strong>Debug Info:</strong>
              <br />
              Selected Staff ID: {selectedStaff}
              <br />
              Selected Date: {formatDateToString(selectedDate)}
              <br />
              Formatted Date (API request): {formatDateToString(selectedDate)}
              <br />
              Availabilities in Redux: {safeAvailabilities.length} items
              <br />
              Loading: {loading ? "Yes" : "No"}
              <br />
              Error: {error ? JSON.stringify(error) : "None"}
              <br />
              User Role: {user?.role || "Unknown"}
              <br />
              Current Date: {formatDateToString(new Date())}
              <br />
              {safeAvailabilities.length > 0 && (
                <>
                  Raw Availability Data:
                  <br />
                  {JSON.stringify(safeAvailabilities, null, 2)}
                </>
              )}
            </div>
            {selectedStaff && (
              <p className="hint-text">
                📅 Try selecting a different date above, or add new availability
                using the form.
                {user.role === "operator" && (
                  <span>
                    {" "}
                    You can navigate through dates to view all availability for
                    this staff member.
                  </span>
                )}
              </p>
            )}
          </div>
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
              {safeAvailabilities.map((availability) => {
                // Check if this is a cross-day availability
                const isCrossDay =
                  availability.start_time > availability.end_time ||
                  availability.is_cross_day;

                return (
                  <tr
                    key={availability.id}
                    className={`${
                      availability.is_available ? "available" : "unavailable"
                    } ${isCrossDay ? "cross-day" : ""}`}
                  >
                    <td>
                      {new Date(availability.date).toLocaleDateString()}
                      {isCrossDay && (
                        <div className="cross-day-indicator">
                          <small>📅 Cross-day</small>
                        </div>
                      )}
                    </td>
                    <td>{availability.start_time}</td>
                    <td>
                      {availability.end_time}
                      {isCrossDay && (
                        <div className="next-day-indicator">
                          <small>+1 day</small>
                        </div>
                      )}
                    </td>
                    <td>
                      {availability.is_available ? "Available" : "Unavailable"}
                      {isCrossDay && availability.cross_day_note && (
                        <div className="cross-day-note">
                          <small>{availability.cross_day_note}</small>
                        </div>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          className={`toggle-button ${
                            availability.is_available
                              ? "available-status"
                              : "unavailable-status"
                          }`}
                          onClick={() => handleToggleAvailability(availability)}
                          disabled={toggleLoading}
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
                        <MinimalLoadingIndicator
                          show={toggleLoading}
                          position="center-right"
                          size="micro"
                          variant="ghost"
                        />
                      </div>
                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDeleteAvailability(availability.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AvailabilityManager;
