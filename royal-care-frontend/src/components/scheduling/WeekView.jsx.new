import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppointmentsByWeek } from "../../features/scheduling/schedulingSlice";
import "../../styles/WeekView.css";

const WeekView = ({ selectedDate = new Date(), onAppointmentSelect }) => {
  const [weekDays, setWeekDays] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const dispatch = useDispatch();
  const { weekAppointments, loading } = useSelector((state) => state.scheduling);
  
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
      const startDate = formatDate(days[0]);
      const endDate = formatDate(days[6]);
      dispatch(fetchAppointmentsByWeek({ startDate, endDate }));
    }
  }, [selectedDate, dispatch]);
  
  // Generate time slots from 7 AM to 10 PM in 30-minute intervals
  useEffect(() => {
    const slots = [];
    const startHour = 7; // 7 AM
    const endHour = 22; // 10 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    
    setTimeSlots(slots);
  }, []);
  
  // Format date as YYYY-MM-DD for comparison
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };
  
  // Helper function to check if an appointment is at a specific day and time
  const getAppointmentAtSlot = (day, timeSlot) => {
    const formattedDay = formatDate(day);
    
    return weekAppointments.find(appointment => {
      return (
        formatDate(new Date(appointment.date)) === formattedDay &&
        appointment.start_time.substring(0, 5) <= timeSlot &&
        appointment.end_time.substring(0, 5) > timeSlot
      );
    });
  };
  
  // Navigate to previous week
  const previousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    // We don't have onDateSelected prop, but we could dispatch an action to update the week
    // or pass a callback function from parent component
  };
  
  // Navigate to next week
  const nextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
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
          {weekDays.length > 0 && `${weekDays[0].toLocaleDateString()} - ${weekDays[6].toLocaleDateString()}`}
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
              <div className={`day-header ${formatDate(day) === formatDate(new Date()) ? 'today' : ''}`}>
                <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="day-date">{day.getDate()}</div>
              </div>
              
              {timeSlots.map((time, timeIndex) => {
                const appointment = getAppointmentAtSlot(day, time);
                
                return (
                  <div
                    key={timeIndex}
                    className={`time-slot ${appointment ? 'has-appointment' : ''}`}
                  >
                    {appointment && (
                      <div 
                        className={`appointment-item ${getAppointmentStatusClass(appointment.status)}`}
                        onClick={() => onAppointmentSelect && onAppointmentSelect(appointment)}
                      >
                        <div className="appointment-time">
                          {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                        </div>
                        <div className="appointment-client">
                          {appointment.client_details?.first_name} {appointment.client_details?.last_name}
                        </div>
                        <div className="appointment-service">
                          {appointment.services_details?.map(s => s.name).join(", ")}
                        </div>
                      </div>
                    )}
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
