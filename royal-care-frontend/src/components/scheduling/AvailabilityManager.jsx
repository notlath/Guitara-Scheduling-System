import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAvailability,
  deleteAvailability,
  fetchAvailability,
  fetchStaffMembers,
  updateAvailability,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/AvailabilityManager.css";

const AvailabilityManager = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { staffMembers, availabilities, loading, error } = useSelector(
    (state) => state.scheduling
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);

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
    dispatch(fetchStaffMembers()); // If user is a therapist or driver, set them as selected staff
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
  }, [dispatch, user, selectedDate]); // Load availability whenever selected staff or date changes
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
  }, [selectedDate]);

  const handleStaffChange = (e) => {
    setSelectedStaff(e.target.value);
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
        // If the created availability is for the currently viewed date and staff,
        // refresh the availability data to ensure it shows up
        const createdAvailability = result.payload;
        const currentViewDate = selectedDate.toISOString().split("T")[0];

        console.log("🔍 Checking if refresh needed:", {
          selectedStaff: selectedStaff,
          createdAvailabilityUser: createdAvailability.user,
          staffMatch: createdAvailability.user === parseInt(selectedStaff, 10),
          currentViewDate: currentViewDate,
          createdDate: createdAvailability.date,
          dateMatch: createdAvailability.date === currentViewDate,
          formDate: newAvailabilityForm.date,
        });

        if (
          selectedStaff &&
          createdAvailability.user === parseInt(selectedStaff, 10) &&
          createdAvailability.date === currentViewDate
        ) {
          console.log(
            "🔄 Refreshing availability data - created availability matches current view"
          );
          // Force refresh to get latest data
          setTimeout(() => {
            dispatch(
              fetchAvailability({
                staffId: selectedStaff,
                date: currentViewDate,
                forceRefresh: true, // Force refresh to ensure we get the latest data
              })
            );
          }, 100);
        } else {
          console.log(
            "ℹ️ Created availability is not for current view, skipping refresh"
          );
          console.log(
            "   - Staff match:",
            createdAvailability.user === parseInt(selectedStaff, 10)
          );
          console.log(
            "   - Date match:",
            createdAvailability.date === currentViewDate
          );
        }

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
      dispatch(deleteAvailability(availabilityId));
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
    );
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

    return baseFilter.filter(
      (staff) => staff.role === "therapist" || staff.role === "driver"
    );
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
      )}

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
              {filteredStaffMembers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.first_name} {staff.last_name} ({staff.role})
                </option>
              ))}
            </select>
          </div>
        )}{" "}
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
      </div>

      {(user.role === "operator" ||
        user.role === "therapist" ||
        user.role === "driver") && (
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
            </div>{" "}
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
            </div>
            <button
              className="add-button"
              onClick={handleAddAvailability}
              disabled={!selectedStaff || loading}
            >
              Add Availability
            </button>
          </div>
        </div>
      )}

      <div className="availability-list">
        <h3>Current Availability</h3>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : availabilities.length === 0 ? (
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
              {availabilities.map((availability) => (
                <tr
                  key={availability.id}
                  className={
                    availability.is_available ? "available" : "unavailable"
                  }
                >
                  <td>{new Date(availability.date).toLocaleDateString()}</td>
                  <td>{availability.start_time}</td>
                  <td>{availability.end_time}</td>{" "}
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
