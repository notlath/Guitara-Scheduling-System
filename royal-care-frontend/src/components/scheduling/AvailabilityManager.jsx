import { useEffect, useState } from "react";
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
  const [newAvailabilityForm, setNewAvailabilityForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "17:00",
    isAvailable: true,
  });

  // Fetch staff members and availabilities on component mount
  useEffect(() => {
    dispatch(fetchStaffMembers());

    // If user is a therapist or driver, set them as selected staff
    if (user.role === "therapist" || user.role === "driver") {
      setSelectedStaff(user.id);
      loadAvailability(user.id, selectedDate);
    }
  }, [dispatch, user]);

  // Load availability whenever selected staff or date changes
  useEffect(() => {
    if (selectedStaff) {
      loadAvailability(selectedStaff, selectedDate);
    }
  }, [selectedStaff, selectedDate]);

  const loadAvailability = (staffId, date) => {
    const formattedDate = date.toISOString().split("T")[0];
    dispatch(fetchAvailability({ staffId, date: formattedDate }));
  };

  const handleStaffChange = (e) => {
    setSelectedStaff(e.target.value);
  };

  const handleDateChange = (e) => {
    setSelectedDate(new Date(e.target.value));
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
    );

    // Reset form
    setNewAvailabilityForm({
      date: new Date().toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "17:00",
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
    // Generate time slots from 7 AM to 10 PM in 30-minute intervals
    const slots = [];
    for (let hour = 7; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, []);

  // Filter staff members based on user role
  const filteredStaffMembers =
    user.role === "operator"
      ? staffMembers
      : staffMembers.filter((staff) => staff.id === user.id);

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
              {staffMembers
                .filter(
                  (staff) =>
                    staff.role === "therapist" || staff.role === "driver"
                )
                .map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name} ({staff.role})
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="date">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate.toISOString().split("T")[0]}
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
                  <td>{availability.end_time}</td>
                  <td>
                    {availability.is_available ? "Available" : "Unavailable"}
                  </td>
                  <td>
                    <button
                      className="toggle-button"
                      onClick={() => handleToggleAvailability(availability)}
                    >
                      Toggle Status
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
