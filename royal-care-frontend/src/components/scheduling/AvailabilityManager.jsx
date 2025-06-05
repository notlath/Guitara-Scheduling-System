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
    startTime: "01:00",
    endTime: "01:00",
    isAvailable: true,
  }); // Fetch staff members and availabilities on component mount
  useEffect(() => {
    dispatch(fetchStaffMembers());

    // If user is a therapist or driver, set them as selected staff
    if (user.role === "therapist" || user.role === "driver") {
      setSelectedStaff(user.id);
      const formattedDate = selectedDate.toISOString().split("T")[0];
      dispatch(fetchAvailability({ staffId: user.id, date: formattedDate }));
    }
  }, [dispatch, user, selectedDate]);

  // Load availability whenever selected staff or date changes
  useEffect(() => {
    if (selectedStaff) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      dispatch(
        fetchAvailability({ staffId: selectedStaff, date: formattedDate })
      );
    }
  }, [selectedStaff, selectedDate, dispatch]);

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

    dispatch(
      createAvailability({
        user: selectedStaff,
        date: newAvailabilityForm.date,
        start_time: newAvailabilityForm.startTime,
        end_time: newAvailabilityForm.endTime,
        is_available: newAvailabilityForm.isAvailable,
      })
    ); // Reset form
    setNewAvailabilityForm({
      date: getTodayString(),
      startTime: "01:00",
      endTime: "01:00",
      isAvailable: true,
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
