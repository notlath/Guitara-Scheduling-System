import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppointmentsByWeek } from "../../features/scheduling/schedulingSlice";
import "../../styles/WeekView.css";
import "../../styles/WeekViewEnhanced.css"; // Enhanced styles for multiple appointments

const WeekView = ({ selectedDate, onAppointmentSelect }) => {
  const [weekDays, setWeekDays] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const dispatch = useDispatch();
  const { weekAppointments, loading } = useSelector(
    (state) => state.scheduling
  );

  // Generate week days based on selectedDate
  useEffect(() => {
    const startOfWeek = new Date(selectedDate);
    // Set to the beginning of the current week (Sunday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    setWeekDays(days);

    // Fetch appointments for this week
    if (days.length > 0) {
      const startDate = formatDateToString(days[0]);
      dispatch(fetchAppointmentsByWeek(startDate));
    }
  }, [selectedDate, dispatch]);

  useEffect(() => {
    // Fetch appointments for the selected week
    if (weekDays.length > 0) {
      const startDate = formatDateToString(weekDays[0]);
      dispatch(fetchAppointmentsByWeek(startDate));
    }
  }, [weekDays, dispatch]);

  // Generate time slots from 1:00 AM to 11:00 PM in 30-minute intervals
  useEffect(() => {
    const slots = [];
    const startHour = 1; // 1 AM
    const endHour = 24; // End at 11:30 PM (midnight - 30min)
    for (let hour = startHour; hour < endHour; hour++) {
      // Format the time to be more user-friendly (e.g., "1:00 AM" instead of "01:00")
      const formattedHour = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? "PM" : "AM";
      slots.push(`${formattedHour}:00 ${ampm}`);
      slots.push(`${formattedHour}:30 ${ampm}`);
    }
    setTimeSlots(slots);
  }, []);

  // Format date as YYYY-MM-DD string, ensuring timezone consistency
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get all appointments at a specific day and time slot
  const getAppointmentsAtSlot = (day, timeSlot) => {
    const formattedDay = formatDateToString(day);

    // Convert display time (e.g., "1:00 AM") to 24-hour format for comparison (e.g., "01:00")
    const convertDisplayTimeToCompare = (displayTime) => {
      const timeParts = displayTime.match(/(\d+):(\d+) (AM|PM)/);
      if (!timeParts) return "00:00";

      let hours = parseInt(timeParts[1], 10);
      const minutes = timeParts[2];
      const period = timeParts[3];

      // Convert to 24-hour format
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    };

    // Get the time slot in 24-hour format for comparison
    const timeSlot24hr = convertDisplayTimeToCompare(timeSlot);

    return weekAppointments.filter((appointment) => {
      const isSameDay =
        formatDateToString(new Date(appointment.date)) === formattedDay;

      // Compare with the formatted time (checking if appointment spans this slot)
      const appointmentStart = appointment.start_time.substring(0, 5);
      const appointmentEnd = appointment.end_time.substring(0, 5);

      // Check if this time slot falls within the appointment's time range
      const inSlot =
        appointmentStart <= timeSlot24hr && appointmentEnd > timeSlot24hr;

      return isSameDay && inSlot;
    });
  };

  // Navigate to previous week
  const previousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setWeekDays((prev) => {
      return prev.map((day) => {
        const newDay = new Date(day);
        newDay.setDate(newDay.getDate() - 7);
        return newDay;
      });
    });
    // We don't have onDateSelected prop, but we could dispatch an action to update the week
    // or pass a callback function from parent component
  };

  // Navigate to next week
  const nextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setWeekDays((prev) => {
      return prev.map((day) => {
        const newDay = new Date(day);
        newDay.setDate(newDay.getDate() + 7);
        return newDay;
      });
    });
    // We don't have onDateSelected prop, but we could dispatch an action to update the week
    // or pass a callback function from parent component
  };

  // Get appointment status class
  const getAppointmentStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "appointment-pending";
      case "confirmed":
        return "appointment-confirmed";
      case "in_progress":
        return "appointment-in-progress";
      case "completed":
        return "appointment-completed";
      case "cancelled":
        return "appointment-cancelled";
      default:
        return "";
    }
  };

  return (
    <div className="week-view">
      <div className="week-navigation">
        <button onClick={previousWeek}>Previous Week</button>
        <h2>
          {weekDays.length > 0 &&
            `${weekDays[0].toLocaleDateString()} - ${weekDays[6].toLocaleDateString()}`}
        </h2>
        <button onClick={nextWeek}>Next Week</button>
      </div>

      {loading ? (
        <div className="loading">Loading week view...</div>
      ) : (
        <div className="week-calendar">
          <div className="time-column">
            <div className="day-header"></div>
            {timeSlots.map((time, index) => (
              <div key={index} className="time-slot time-label">
                {time}
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="day-column">
              <div
                className={`day-header ${
                  formatDateToString(day) === formatDateToString(new Date())
                    ? "today"
                    : ""
                }`}
              >
                <div className="day-name">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="day-date">{day.getDate()}</div>
              </div>

              {timeSlots.map((time, timeIndex) => {
                const appointments = getAppointmentsAtSlot(day, time);
                return (
                  <div
                    key={timeIndex + time}
                    className={`time-slot ${
                      appointments.length > 0 ? "has-appointment" : ""
                    }`}
                    style={{
                      // Dynamically set min-height based on the number of appointments
                      minHeight:
                        appointments.length > 0
                          ? `${Math.max(60, appointments.length * 40)}px`
                          : undefined,
                      height: appointments.length > 0 ? "auto" : undefined,
                    }}
                  >
                    <div
                      className="appointments-container"
                      data-count={appointments.length} // Add data attribute for styling based on count
                      style={{
                        minHeight:
                          appointments.length > 0
                            ? `${Math.max(60, appointments.length * 40)}px`
                            : undefined,
                      }}
                    >
                      {appointments.map((appointment, idx) => (
                        <div
                          key={appointment.id || idx}
                          className={`appointment-item ${getAppointmentStatusClass(
                            appointment.status
                          )}`}
                          onClick={() =>
                            onAppointmentSelect &&
                            onAppointmentSelect(appointment)
                          }
                          style={{
                            width:
                              appointments.length > 1
                                ? `${100 / appointments.length - 2}%`
                                : undefined,
                          }}
                        >
                          <div className="appointment-time">
                            {appointment.start_time.substring(0, 5)} -{" "}
                            {appointment.end_time.substring(0, 5)}
                          </div>
                          <div
                            className="appointment-client"
                            title={`${appointment.client_details?.first_name} ${appointment.client_details?.last_name}`}
                          >
                            {appointment.client_details?.first_name}{" "}
                            {appointment.client_details?.last_name}
                          </div>
                          <div
                            className="appointment-service"
                            title={appointment.services_details
                              ?.map((s) => s.name)
                              .join(", ")}
                          >
                            {appointment.services_details
                              ?.map((s) => s.name)
                              .join(", ")}
                          </div>
                          {appointment.therapist_details && (
                            <div
                              className="appointment-therapist"
                              title={`Therapist: ${appointment.therapist_details.first_name} ${appointment.therapist_details.last_name}`}
                            >
                              🧖 {appointment.therapist_details.first_name}{" "}
                              {appointment.therapist_details.last_name}
                            </div>
                          )}
                          {appointment.driver_details && (
                            <div
                              className="appointment-driver"
                              title={`Driver: ${appointment.driver_details.first_name} ${appointment.driver_details.last_name}`}
                            >
                              🚗 {appointment.driver_details.first_name}{" "}
                              {appointment.driver_details.last_name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeekView;
