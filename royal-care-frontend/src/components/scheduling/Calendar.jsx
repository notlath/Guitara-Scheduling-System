import { useEffect, useState } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAppointmentsByDate,
  fetchAvailableDrivers,
  fetchAvailableTherapists,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/Calendar.css";

const Calendar = ({ onDateSelected, onTimeSelected, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [view, setView] = useState("month"); // 'month' or 'day'

  const dispatch = useDispatch();
  const {
    availableTherapists,
    availableDrivers,
    appointments,
    appointmentsByDate,
  } = useSelector((state) => state.scheduling);

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        console.warn("Invalid date provided to formatDate");
        return "";
      }
      return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    } catch (err) {
      console.error("Error formatting date:", err);
      return "";
    }
  };

  // Check if a time slot is in the past
  const isPastTimeSlot = (timeSlot, date) => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(":").map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hours, minutes, 0, 0);
    return slotDateTime < now;
  };

  // Get availability status for a time slot
  const getTimeSlotStatus = (timeSlot, date) => {
    if (isPastTimeSlot(timeSlot, date)) {
      return { status: "past", color: "#6b7280", emoji: "⚫" }; // Gray
    }

    // Check if there are appointments at this time
    let bookedTherapists = [];

    if (appointmentsByDate && Array.isArray(appointmentsByDate)) {
      appointmentsByDate.forEach((appointment) => {
        if (
          appointment.start_time <= timeSlot &&
          appointment.end_time > timeSlot
        ) {
          if (appointment.therapist_details?.id) {
            bookedTherapists.push(appointment.therapist_details.id);
          }
        }
      });
    }

    // Filter available therapists to exclude those currently in session
    const actuallyAvailableTherapists =
      availableTherapists?.filter(
        (therapist) => !bookedTherapists.includes(therapist.id)
      ) || [];

    const totalTherapists = availableTherapists?.length || 0;
    const availableCount = actuallyAvailableTherapists.length;

    // If no therapists have set availability for this time
    if (totalTherapists === 0) {
      return { status: "no-availability", color: "#4b3b06", emoji: "🟡" }; // Orange-brown
    }

    // All slots are booked
    if (availableCount === 0) {
      return { status: "fully-booked", color: "#dc2626", emoji: "🔴" }; // Red
    }

    // Some availability remaining
    if (availableCount < totalTherapists) {
      return { status: "limited", color: "#f59e0b", emoji: "🟡" }; // Orange
    }

    // Full availability
    return { status: "available", color: "#16a34a", emoji: "🟢" }; // Green
  };

  // Check if a date is in the past (before today)
  const isPastDate = (date) => {
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const checkDateMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    return checkDateMidnight < todayMidnight;
  };

  // Generate time slots from 1 PM to 1 AM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];

    // 1 PM to 11:30 PM (same day)
    for (let hour = 13; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }

    // 12 AM to 1 AM (next day)
    for (let hour = 0; hour <= 1; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 1) {
        // Don't add :30 for 1 AM to avoid ending at 1:30 AM
        slots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }

    return slots;
  };

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Handle month navigation
  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Handle returning to month view
  const handleBackToMonth = () => {
    setView("month");
    onDateSelected(null); // Clear the selected date when returning to month view
  };

  // Handle date selection
  const handleDateClick = (day) => {
    if (day) {
      const selectedDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      onDateSelected(selectedDate);
      setView("day");

      // Fetch bookings for the selected date
      const formattedDate = formatDate(selectedDate);
      if (formattedDate) {
        dispatch(fetchAppointmentsByDate(formattedDate));
      }

      // Only fetch availability if it's not a past date
      if (!isPastDate(selectedDate)) {
        if (!formattedDate) {
          console.error("Invalid date selected, cannot fetch availabilities");
          return;
        }

        // Use more realistic time slots instead of broad range
        // Fetch availability for common appointment hours (1-hour window)
        const params = {
          date: formattedDate,
          start_time: "09:00", // More realistic start time
          end_time: "10:00", // 1-hour window instead of broader range
        };

        console.log(
          "Calendar: Fetching availabilities for date click:",
          params
        );
        dispatch(fetchAvailableTherapists(params));
        dispatch(fetchAvailableDrivers(params));
      }
    }
  };

  useEffect(() => {
    console.log(availableTherapists);
  }, [availableTherapists]);

  // Handle time selection
  const handleTimeClick = (time) => {
    setSelectedTime(time);
    onTimeSelected(time);

    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);

      // Calculate end time (assuming 1-hour appointments)
      const [hours, minutes] = time.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 60, 0); // Add 1 hour
      const endTime = `${endDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

      const params = {
        date: formattedDate,
        start_time: time,
        end_time: endTime,
      };

      console.log(
        "Calendar: Fetching availabilities for time selection:",
        params
      );
      dispatch(fetchAvailableTherapists(params));
      dispatch(fetchAvailableDrivers(params));
    }
  };

  // Generate calendar UI for month view
  const renderMonthCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Create array of day numbers (1-31) with empty slots for days before the first of month
    const days = Array(firstDayOfMonth)
      .fill(null)
      .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    // Create week rows, each with 7 days
    const weeks = [];
    let week = [];

    days.forEach((day, index) => {
      if (index % 7 === 0 && index > 0) {
        weeks.push(week);
        week = [];
      }
      week.push(day);
    });

    // Add remaining days to the last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-nav-buttons">
            <button onClick={prevMonth}>
              <MdChevronLeft />
            </button>
            <button onClick={nextMonth}>
              <MdChevronRight />
            </button>
          </div>
          <h2>
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="calendar-days">
          <div className="day-header">Sun</div>
          <div className="day-header">Mon</div>
          <div className="day-header">Tue</div>
          <div className="day-header">Wed</div>
          <div className="day-header">Thu</div>
          <div className="day-header">Fri</div>
          <div className="day-header">Sat</div>

          {weeks.flatMap((week, weekIndex) =>
            week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="calendar-day empty-day"
                  ></div>
                );
              }

              const cellDate = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              );
              const formattedDate = formatDate(cellDate);

              // Get today's date at midnight for accurate comparison
              const today = new Date();
              const todayMidnight = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              );
              const cellDateMidnight = new Date(
                cellDate.getFullYear(),
                cellDate.getMonth(),
                cellDate.getDate()
              );
              const todayFormatted = formatDate(today);

              // Check if this day is today
              const isToday = formattedDate === todayFormatted;

              // Check if this day is in the past
              const isPastDay = cellDateMidnight < todayMidnight;

              const appointment = appointments.find((appointment) => {
                return appointment.date === formattedDate;
              });

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`calendar-day day ${
                    selectedDate &&
                    day === selectedDate.getDate() &&
                    currentMonth.getMonth() === selectedDate.getMonth() &&
                    currentMonth.getFullYear() === selectedDate.getFullYear()
                      ? "selected-day"
                      : ""
                  } ${appointment ? "appointment-day" : ""} ${
                    isToday ? "today" : ""
                  } ${isPastDay ? "past-day" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  <span className="day-number">{day}</span>
                  {isToday && <span className="today-label">Today</span>}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Render bookings for the selected day
  const renderDayBookings = () => {
    // Ensure appointmentsByDate is always an array - handle null, undefined, or non-array values
    let bookings = [];
    if (appointmentsByDate && Array.isArray(appointmentsByDate)) {
      bookings = appointmentsByDate;
    } else if (appointmentsByDate && typeof appointmentsByDate === "object") {
      // Handle case where it might be an object with array inside
      bookings =
        appointmentsByDate.appointments || appointmentsByDate.data || [];
    }

    if (!Array.isArray(bookings)) {
      bookings = [];
    }

    if (bookings.length === 0) {
      return (
        <div className="day-bookings">
          <h3>Bookings for {selectedDate.toLocaleDateString()}</h3>
          <p className="no-bookings">No bookings found for this date.</p>
        </div>
      );
    }

    return (
      <div className="day-bookings">
        <h3>Bookings for {selectedDate.toLocaleDateString()}</h3>
        <div className="bookings-list">
          {bookings.map((appointment, index) => (
            <div key={appointment.id || index} className="booking-card">
              <div className="booking-header">
                <h4>
                  {appointment.client_details?.first_name || "N/A"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h4>
                <span
                  className={`status-badge status-${
                    appointment.status || "pending"
                  }`}
                >
                  {appointment.status
                    ? appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)
                    : "Pending"}
                </span>
              </div>
              <div className="booking-details">
                <p>
                  <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                  {appointment.end_time || "N/A"}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {appointment.services_details
                    ?.map((s) => s.name)
                    .join(", ") || "N/A"}
                </p>
                {appointment.therapist_details && (
                  <p>
                    <strong>Therapist:</strong>{" "}
                    {appointment.therapist_details.first_name}{" "}
                    {appointment.therapist_details.last_name}
                  </p>
                )}
                {appointment.driver_details && (
                  <p>
                    <strong>Driver:</strong>{" "}
                    {appointment.driver_details.first_name}{" "}
                    {appointment.driver_details.last_name}
                  </p>
                )}
                <p>
                  <strong>Location:</strong> {appointment.location || "N/A"}
                </p>
                {appointment.notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate calendar UI for day view
  const renderDayCalendar = () => {
    const timeSlots = generateTimeSlots();
    const isDateInPast = isPastDate(selectedDate);

    return (
      <div className="day-view-container">
        <div className="day-header">
          <button className="back-button" onClick={handleBackToMonth}>
            ← Back to Month
          </button>
          <h2>{selectedDate.toLocaleDateString()}</h2>
          {isDateInPast && (
            <span className="past-date-indicator">Past Date</span>
          )}
        </div>

        {/* Only show time slots for current/future dates */}
        {!isDateInPast && (
          <div className="time-slots">
            <h3>Available Time Slots</h3>
            <div className="time-slots-grid">
              {timeSlots.map((time, index) => {
                const slotStatus = getTimeSlotStatus(time, selectedDate);
                return (
                  <div
                    key={index}
                    className={`time-slot ${
                      selectedTime === time ? "selected-time" : ""
                    } ${slotStatus.status}`}
                    onClick={() =>
                      slotStatus.status !== "past" && handleTimeClick(time)
                    }
                    style={{
                      backgroundColor:
                        selectedTime === time
                          ? slotStatus.color
                          : "transparent",
                      borderColor: slotStatus.color,
                      color: selectedTime === time ? "white" : slotStatus.color,
                      cursor:
                        slotStatus.status === "past"
                          ? "not-allowed"
                          : "pointer",
                      opacity: slotStatus.status === "past" ? 0.5 : 1,
                    }}
                  >
                    <span className="time-slot-emoji">{slotStatus.emoji}</span>
                    <span className="time-slot-time">{time}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend for time slot colors */}
            <div className="time-slot-legend">
              <div className="legend-item">
                <span>🟢</span> Available
              </div>
              <div className="legend-item">
                <span>🟡</span> Limited availability
              </div>
              <div className="legend-item">
                <span>🔴</span> Fully booked
              </div>
              <div className="legend-item">
                <span style={{ color: "#4b3b06" }}>🟡</span> No availability set
              </div>
              <div className="legend-item">
                <span>⚫</span> Past time
              </div>
            </div>
          </div>
        )}

        {/* Show bookings after time slots selection but before availability info */}
        {renderDayBookings()}
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      {view === "month" ? renderMonthCalendar() : renderDayCalendar()}

      {/* Only show availability info for current/future dates - moved below bookings */}
      {view === "day" && !isPastDate(selectedDate) && (
        <div className="availability-info">
          <div className="therapists-section">
            <h3>Available Therapists</h3>
            {(() => {
              // Filter out therapists who are currently in session during the selected time
              let filteredTherapists = availableTherapists || [];

              if (
                selectedTime &&
                appointmentsByDate &&
                Array.isArray(appointmentsByDate)
              ) {
                const bookedTherapistIds = [];
                appointmentsByDate.forEach((appointment) => {
                  if (
                    appointment.start_time <= selectedTime &&
                    appointment.end_time > selectedTime
                  ) {
                    if (appointment.therapist_details?.id) {
                      bookedTherapistIds.push(appointment.therapist_details.id);
                    }
                  }
                });

                filteredTherapists = availableTherapists.filter(
                  (therapist) => !bookedTherapistIds.includes(therapist.id)
                );
              }

              return filteredTherapists && filteredTherapists.length > 0 ? (
                <ul>
                  {filteredTherapists.map((therapist) => (
                    <li key={therapist.id || Math.random()}>
                      <b>
                        {therapist.first_name || ""} {therapist.last_name || ""}
                      </b>{" "}
                      {therapist.specialization
                        ? `- Specialization: ${therapist.specialization}`
                        : ""}{" "}
                      {therapist.start_time && therapist.end_time
                        ? ` - Available: ${therapist.start_time} to ${therapist.end_time}`
                        : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  No therapists available for selected time. Try selecting a
                  different time slot.
                </p>
              );
            })()}
          </div>

          <div className="drivers-section">
            <h3>Available Drivers</h3>
            {availableDrivers && availableDrivers.length > 0 ? (
              <ul>
                {availableDrivers.map((driver) => (
                  <li key={driver.id || Math.random()}>
                    <b>
                      {driver.first_name || ""} {driver.last_name || ""}
                    </b>{" "}
                    {driver.motorcycle_plate
                      ? `- Plate: ${driver.motorcycle_plate}`
                      : ""}{" "}
                    {driver.start_time && driver.end_time
                      ? ` - Available: ${driver.start_time} to ${driver.end_time}`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No drivers available for selected time. Try selecting a
                different time slot or proceed without a driver.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
