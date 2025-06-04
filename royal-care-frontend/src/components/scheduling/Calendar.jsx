import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
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

  const dispatch = useDispatch();
  const { availableTherapists, availableDrivers, appointments } = useSelector(
    (state) => state.scheduling
  );

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

      console.log("Calendar: Fetching availabilities for date click:", params);
      dispatch(fetchAvailableTherapists(params));
      dispatch(fetchAvailableDrivers(params));
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
          <h2>
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button onClick={prevMonth}>
            <FaChevronLeft />
          </button>
          <button onClick={nextMonth}>
            <FaChevronRight />
          </button>
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
            {availableTherapists && availableTherapists.length > 0 ? (
              <ul>
                {availableTherapists.map((therapist) => (
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
            )}
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
