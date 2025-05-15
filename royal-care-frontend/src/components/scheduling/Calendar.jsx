import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAvailableDrivers,
  fetchAvailableTherapists,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/Calendar.css";

const Calendar = ({ onDateSelected, onTimeSelected, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [view, setView] = useState("month"); // 'month' or 'day'
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);

  const dispatch = useDispatch();
  const { availableTherapists, availableDrivers } = useSelector(
    (state) => state.scheduling
  );

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // Generate time slots from 7 AM to 10 PM in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 7; // 7 AM
    const endHour = 22; // 10 PM

    for (let hour = startHour; hour < endHour; hour++) {
      // Add :00 slot
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      // Add :30 slot
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
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

      // When date is selected, fetch available therapists and drivers
      const formattedDate = formatDate(selectedDate);
      dispatch(
        fetchAvailableTherapists({
          date: formattedDate,
          start_time: "08:00",
          end_time: "20:00",
        })
      );
      dispatch(
        fetchAvailableDrivers({
          date: formattedDate,
          start_time: "08:00",
          end_time: "20:00",
        })
      );
    }
  };

  // Handle time selection
  const handleTimeClick = (time) => {
    setSelectedTime(time);
    onTimeSelected(time);
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
          <button onClick={prevMonth}>Previous</button>
          <h2>
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button onClick={nextMonth}>Next</button>
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
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`calendar-day ${day ? "day" : "empty-day"} ${
                  selectedDate &&
                  day === selectedDate.getDate() &&
                  currentMonth.getMonth() === selectedDate.getMonth() &&
                  currentMonth.getFullYear() === selectedDate.getFullYear()
                    ? "selected-day"
                    : ""
                }`}
                onClick={() => day && handleDateClick(day)}
              >
                {day}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Generate calendar UI for day view
  const renderDayCalendar = () => {
    const timeSlots = generateTimeSlots();

    return (
      <div className="day-view-container">
        <div className="day-header">
          <button onClick={() => setView("month")}>Back to Month</button>
          <h2>{selectedDate.toLocaleDateString()}</h2>
        </div>

        <div className="time-slots">
          {timeSlots.map((time, index) => (
            <div
              key={index}
              className={`time-slot ${
                selectedTime === time ? "selected-time" : ""
              }`}
              onClick={() => handleTimeClick(time)}
            >
              {time}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      {view === "month" ? renderMonthCalendar() : renderDayCalendar()}

      {view === "day" && (
        <div className="availability-info">
          <div className="therapists-section">
            <h3>Available Therapists</h3>
            {availableTherapists.length > 0 ? (
              <ul>
                {availableTherapists.map((therapist) => (
                  <li key={therapist.id}>
                    {therapist.user_details.first_name}{" "}
                    {therapist.user_details.last_name} - Specialization:{" "}
                    {therapist.user_details.specialization || "N/A"} - Massage
                    Pressure: {therapist.user_details.massage_pressure || "N/A"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No therapists available for selected time.</p>
            )}
          </div>

          <div className="drivers-section">
            <h3>Available Drivers</h3>
            {availableDrivers.length > 0 ? (
              <ul>
                {availableDrivers.map((driver) => (
                  <li key={driver.id}>
                    {driver.user_details.first_name}{" "}
                    {driver.user_details.last_name} - Plate:{" "}
                    {driver.user_details.motorcycle_plate || "N/A"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No drivers available for selected time.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
