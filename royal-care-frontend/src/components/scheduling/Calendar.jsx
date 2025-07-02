import { useEffect, useState } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import {
  useCalendarData,
  useCalendarRefetch,
} from "../../hooks/useCalendarQueries";
import "../../styles/Calendar.css";
import MinimalLoadingIndicator from "../common/MinimalLoadingIndicator";

const Calendar = ({
  onDateSelected,
  onTimeSelected,
  selectedDate,
  showClientLabels = true,
  context = "operator",
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [view, setView] = useState("month"); // 'month' or 'day'

  // TanStack Query for calendar data - replaces Redux
  const {
    appointmentsByDate,
    appointments,
    availableTherapists,
    availableDrivers,
    loading,
  } = useCalendarData(selectedDate);

  // Manual refetch functions for date/time changes
  const { refetchForDate, refetchAvailabilityForTimeSlot } =
    useCalendarRefetch();

  // TanStack Query handles initial data loading automatically
  // No need for manual useEffect - data is fetched when selectedDate changes

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

  // Helper function to check if a driver is available for a specific time slot
  const isDriverAvailableForTimeSlot = (driver, timeSlot) => {
    if (!driver.start_time || !driver.end_time) {
      return false; // No availability data
    }

    // Convert time slot and driver times to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(timeSlot);
    const driverStartMinutes = timeToMinutes(driver.start_time);
    const driverEndMinutes = timeToMinutes(driver.end_time);

    // Handle cross-day availability (e.g., 10 PM to 2 AM)
    if (driverEndMinutes < driverStartMinutes) {
      // Cross-day: available if slot is after start OR before end
      return (
        slotMinutes >= driverStartMinutes || slotMinutes < driverEndMinutes
      );
    } else {
      // Same-day: available if slot is between start and end
      return (
        slotMinutes >= driverStartMinutes && slotMinutes < driverEndMinutes
      );
    }
  };

  // Helper function to check if a therapist is available for a specific time slot
  const isTherapistAvailableForTimeSlot = (therapist, timeSlot) => {
    if (!therapist.start_time || !therapist.end_time) {
      return false; // No availability data
    }

    // Convert time slot and therapist times to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const slotMinutes = timeToMinutes(timeSlot);
    const therapistStartMinutes = timeToMinutes(therapist.start_time);
    const therapistEndMinutes = timeToMinutes(therapist.end_time);

    // Handle cross-day availability (e.g., 10 PM to 2 AM)
    if (therapistEndMinutes < therapistStartMinutes) {
      // Cross-day: available if slot is after start OR before end
      return (
        slotMinutes >= therapistStartMinutes ||
        slotMinutes < therapistEndMinutes
      );
    } else {
      // Same-day: available if slot is between start and end
      return (
        slotMinutes >= therapistStartMinutes &&
        slotMinutes < therapistEndMinutes
      );
    }
  };

  // Get availability status for a time slot
  const getTimeSlotStatus = (timeSlot, date) => {
    if (isPastTimeSlot(timeSlot, date)) {
      return { status: "past", color: "#6b7280" }; // Gray
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

    // CRITICAL FIX: Only use availableTherapists data if it was fetched for the current date
    // This prevents showing incorrect availability when the data was fetched for a different date/time
    const currentDateStr = formatDate(date);
    const isCurrentlySelected =
      selectedDate && formatDate(selectedDate) === currentDateStr;

    // Only rely on fetched availability data if:
    // 1. We have therapists data AND
    // 2. The data was fetched for the currently selected date OR today's date
    const hasFreshAvailabilityData =
      availableTherapists &&
      availableTherapists.length > 0 &&
      (isCurrentlySelected || currentDateStr === formatDate(new Date()));

    if (!hasFreshAvailabilityData) {
      // No fresh availability data for this date - show neutral status
      return { status: "no-availability", color: "#4b3b06" }; // Orange-brown
    }

    // Filter therapists who are actually available for this specific time slot
    const therapistsAvailableForThisSlot = availableTherapists.filter(
      (therapist) => isTherapistAvailableForTimeSlot(therapist, timeSlot)
    );

    // Further filter to exclude those currently in session
    const actuallyAvailableTherapists = therapistsAvailableForThisSlot.filter(
      (therapist) => !bookedTherapists.includes(therapist.id)
    );

    const totalAvailableForSlot = therapistsAvailableForThisSlot.length;
    const availableCount = actuallyAvailableTherapists.length;

    // If no therapists have set availability for this specific time slot
    if (totalAvailableForSlot === 0) {
      return { status: "no-availability", color: "#4b3b06" }; // Orange-brown
    }

    // All available slots are booked
    if (availableCount === 0) {
      return { status: "fully-booked", color: "#dc2626" }; // Red
    }

    // Some availability remaining
    if (availableCount < totalAvailableForSlot) {
      return { status: "limited", color: "#f59e0b" }; // Orange
    }

    // Full availability
    return { status: "available", color: "#16a34a" }; // Green
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
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    setCurrentMonth(newMonth);

    // Fetch availability for the first day of the new month
    const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    const formattedDate = formatDate(firstDay);

    if (formattedDate && !isPastDate(firstDay)) {
      console.log("Calendar: Fetching availability for previous month");
      refetchAvailabilityForTimeSlot(firstDay, "13:00", "01:00");
    }
  };

  const nextMonth = () => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    setCurrentMonth(newMonth);

    // Fetch availability for the first day of the new month
    const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
    const formattedDate = formatDate(firstDay);

    if (formattedDate && !isPastDate(firstDay)) {
      console.log("Calendar: Fetching availability for next month");
      refetchAvailabilityForTimeSlot(firstDay, "13:00", "01:00");
    }
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
        refetchForDate(selectedDate);
      }

      // Only fetch availability if it's not a past date
      if (!isPastDate(selectedDate)) {
        if (!formattedDate) {
          console.error("Invalid date selected, cannot fetch availabilities");
          return;
        }

        console.log(
          "Calendar: Fetching availabilities for date click:",
          formattedDate
        );
        // refetchForDate already handles both appointments and availability
      }
    }
  };

  useEffect(() => {
    console.log("=== CALENDAR DEBUG ===");
    console.log("availableTherapists:", availableTherapists);
    console.log("appointmentsByDate:", appointmentsByDate);
    console.log("appointments:", appointments);
    console.log("appointments type:", typeof appointments);
    console.log("appointments isArray:", Array.isArray(appointments));
    console.log("selectedDate:", selectedDate);
    console.log("loading:", loading);
  }, [
    availableTherapists,
    appointmentsByDate,
    selectedDate,
    loading,
    appointments,
  ]);

  // Handle time selection
  const handleTimeClick = (time) => {
    setSelectedTime(time);
    onTimeSelected(time);

    if (selectedDate) {
      // Calculate end time (assuming 1-hour appointments)
      const [hours, minutes] = time.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 60, 0); // Add 1 hour
      const endTime = `${endDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

      console.log(
        "Calendar: Fetching availabilities for time selection:",
        time
      );
      refetchAvailabilityForTimeSlot(selectedDate, time, endTime);
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

              // Get all appointments for this day - ensure appointments is an array
              const safeAppointments = Array.isArray(appointments)
                ? appointments
                : [];
              const dayAppointments = safeAppointments.filter((appointment) => {
                return appointment && appointment.date === formattedDate;
              });

              const hasAppointments = dayAppointments.length > 0;

              // DEBUG: Log appointment data for the current day being rendered
              if (dayAppointments.length > 0) {
                console.log(
                  `DEBUG Calendar: Found ${dayAppointments.length} appointments for ${formattedDate}:`,
                  dayAppointments.map((apt) => ({
                    id: apt.id,
                    status: apt.status,
                    client:
                      apt.client_details?.first_name +
                      " " +
                      apt.client_details?.last_name,
                    hasClientDetails: !!apt.client_details,
                  }))
                );
              }

              // Extract client names and status info for the day
              const clientInfo = dayAppointments
                .filter((appointment) => {
                  // More defensive filtering - ensure appointment has required fields
                  if (!appointment || !appointment.status) return false;

                  // Include all active/visible appointment statuses
                  return (
                    appointment.status === "pending" ||
                    appointment.status === "confirmed" ||
                    appointment.status === "therapist_confirmed" ||
                    appointment.status === "driver_confirmed" ||
                    appointment.status === "therapist_confirm" ||
                    appointment.status === "driver_confirm" ||
                    appointment.status === "in_progress" ||
                    appointment.status === "journey" ||
                    appointment.status === "journey_started" ||
                    appointment.status === "arrived" ||
                    appointment.status === "dropped_off" ||
                    appointment.status === "session_in_progress" ||
                    appointment.status === "driving_to_location" ||
                    appointment.status === "at_location" ||
                    appointment.status === "driver_assigned" ||
                    appointment.status === "pickup_requested" ||
                    appointment.status === "driver_assigned_pickup" ||
                    appointment.status === "return_journey" ||
                    appointment.status === "awaiting_payment"
                  );
                }) // Include all statuses that should show client labels
                .map((appointment) => {
                  // More robust name extraction with fallbacks
                  let clientName = "";

                  if (appointment.client_details) {
                    const firstName =
                      appointment.client_details.first_name || "";
                    const lastName = appointment.client_details.last_name || "";
                    clientName = `${firstName} ${lastName}`.trim();
                  }

                  // If no client details or name is empty, use appointment ID as fallback
                  if (!clientName) {
                    clientName = `Client ${appointment.id || "Unknown"}`;
                  }

                  return {
                    name: clientName,
                    status: appointment.status,
                    id: appointment.id,
                  };
                })
                .filter((info) => info.name && info.name !== ""); // Ensure we have a valid name

              // DEBUG: Log clientInfo generation for days with appointments
              if (dayAppointments.length > 0) {
                console.log(
                  `DEBUG Calendar: Generated clientInfo for ${formattedDate}:`,
                  clientInfo
                );
                console.log(
                  `DEBUG Calendar: isPastDay for ${formattedDate}:`,
                  isPastDay
                );
                console.log(
                  `DEBUG Calendar: showClientLabels:`,
                  showClientLabels
                );
                console.log(`DEBUG Calendar: context:`, context);
                console.log(
                  `DEBUG Calendar: Final display condition:`,
                  (showClientLabels || context === "operator") &&
                    clientInfo.length > 0 &&
                    !isPastDay
                );
              }

              // Helper function to get context-aware status color class
              const getStatusColorClass = (status) => {
                // Define comprehensive status groupings for each role-specific context
                const therapistStatuses = {
                  // Initial appointment states
                  pending: "status-pending",
                  confirmed: "status-confirmed",
                  therapist_confirmed: "status-confirmed",
                  therapist_confirm: "status-confirmed", // Legacy support
                  driver_confirmed: "status-confirmed",
                  driver_confirm: "status-confirmed", // Legacy support

                  // Active appointment workflow
                  in_progress: "status-active",
                  journey: "status-active",
                  journey_started: "status-active",
                  driving_to_location: "status-active",
                  at_location: "status-active",
                  driver_assigned: "status-active",
                  arrived: "status-active",
                  dropped_off: "status-session",
                  session_in_progress: "status-session",

                  // Post-session states
                  awaiting_payment: "status-session",
                  payment_requested: "status-session",
                  pickup_requested: "status-active",
                  driver_assigned_pickup: "status-active",
                  return_journey: "status-active",

                  // Final states
                  completed: "status-completed",
                  payment_completed: "status-completed",
                  transport_completed: "status-completed",
                  cancelled: "status-cancelled",
                  rejected: "status-cancelled",
                  auto_cancelled: "status-cancelled",
                  picking_up_therapists: "status-active",
                  transporting_group: "status-active",
                  therapist_dropped_off: "status-active",
                };

                const driverStatuses = {
                  // Initial states - driver assignment workflow
                  pending: "status-pending",
                  confirmed: "status-confirmed",
                  therapist_confirmed: "status-pending", // Waiting for driver confirmation
                  therapist_confirm: "status-pending", // Legacy support
                  driver_confirmed: "status-confirmed",
                  driver_confirm: "status-confirmed", // Legacy support

                  // Transport workflow states
                  in_progress: "status-active",
                  journey: "status-active",
                  journey_started: "status-active",
                  driving_to_location: "status-active",
                  at_location: "status-active",
                  driver_assigned: "status-active",
                  arrived: "status-active",
                  dropped_off: "status-active",
                  driver_transport_completed: "status-completed",

                  // Pickup workflow states (after session)
                  pickup_requested: "status-pending", // Available for pickup assignment
                  driver_assigned_pickup: "status-active", // Assigned for pickup
                  return_journey: "status-active",

                  // Multi-therapist group transport
                  picking_up_therapists: "status-active",
                  transporting_group: "status-active",
                  therapist_dropped_off: "status-active",

                  // Final states
                  transport_completed: "status-completed",
                  completed: "status-completed",
                  cancelled: "status-cancelled",
                  rejected: "status-cancelled",
                };

                const operatorStatuses = {
                  pending: "status-pending",
                  confirmed: "status-confirmed",
                  therapist_confirmed: "status-confirmed",
                  therapist_confirm: "status-confirmed", // Legacy support
                  driver_confirmed: "status-confirmed",
                  driver_confirm: "status-confirmed", // Legacy support
                  in_progress: "status-active",
                  journey: "status-active",
                  journey_started: "status-active",
                  driving_to_location: "status-active",
                  at_location: "status-active",
                  driver_assigned: "status-active",
                  arrived: "status-active",
                  dropped_off: "status-session",
                  session_in_progress: "status-session",
                  completed: "status-completed",
                  cancelled: "status-cancelled",
                  rejected: "status-cancelled",
                  awaiting_payment: "status-session",
                  payment_requested: "status-session",
                  pickup_requested: "status-active",
                  driver_assigned_pickup: "status-active",
                  return_journey: "status-active",
                  transport_completed: "status-completed",
                  picking_up_therapists: "status-active",
                  transporting_group: "status-active",
                  therapist_dropped_off: "status-active",
                };

                let statusMap;
                if (context === "driver") statusMap = driverStatuses;
                else if (context === "operator") statusMap = operatorStatuses;
                else statusMap = therapistStatuses;
                return statusMap[status] || "status-default";
              };

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
                  } ${hasAppointments && !isPastDay ? "appointment-day" : ""} ${
                    isToday ? "today" : ""
                  } ${isPastDay ? "past-day" : ""}`}
                  onClick={() => handleDateClick(day)}
                >
                  {/* Client labels - show only for therapist/driver dashboards */}
                  {(showClientLabels || context === "operator") &&
                    clientInfo.length > 0 && (
                      /* TEMPORARILY REMOVE !isPastDay CONDITION FOR DEBUGGING */ <div className="client-labels">
                        {clientInfo.slice(0, 2).map((info, index) => (
                          <span
                            key={index}
                            className={`client-label ${getStatusColorClass(
                              info.status
                            )}`}
                            title={`${
                              info.name
                            } - Status: ${info.status.replace(/_/g, " ")}`}
                          >
                            {info.name}
                          </span>
                        ))}
                        {clientInfo.length > 2 && (
                          <span className="client-label more-clients">
                            +{clientInfo.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  <span className="day-number">{day}</span>
                  {isToday && <span className="today-label">Today</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Context-aware status legend for client labels */}
        {(showClientLabels || context === "operator") && (
          <div className="calendar-status-legend">
            <h4>
              Client Label Colors (
              {context === "driver"
                ? "Driver"
                : context === "operator"
                ? "Operator"
                : "Therapist"}{" "}
              View):
            </h4>
            <div className="status-legend-grid">
              <div className="status-legend-item">
                <div
                  className="status-legend-color"
                  style={{ backgroundColor: "#f59e0b" }}
                ></div>
                <span>
                  Pending
                  {context === "driver"
                    ? "/Awaiting Assignment"
                    : context === "operator"
                    ? "/Awaiting Review"
                    : "/Awaiting Confirmation"}
                </span>
              </div>
              <div className="status-legend-item">
                <div
                  className="status-legend-color"
                  style={{ backgroundColor: "#3b82f6" }}
                ></div>
                <span>
                  Confirmed
                  {context === "driver"
                    ? "/Ready to Drive"
                    : context === "operator"
                    ? "/Ready to Assign"
                    : "/Ready to Proceed"}
                </span>
              </div>
              {context === "driver" ? (
                <div className="status-legend-item">
                  <div
                    className="status-legend-color"
                    style={{ backgroundColor: "#8b5cf6" }}
                  ></div>
                  <span>Active Transport/Pickup</span>
                </div>
              ) : context === "operator" ? (
                <div className="status-legend-item">
                  <div
                    className="status-legend-color"
                    style={{ backgroundColor: "#10b981" }}
                  ></div>
                  <span>Session/Treatment/Assignment</span>
                </div>
              ) : (
                <div className="status-legend-item">
                  <div
                    className="status-legend-color"
                    style={{ backgroundColor: "#10b981" }}
                  ></div>
                  <span>Session/Treatment</span>
                </div>
              )}
              <div className="status-legend-item">
                <div
                  className="status-legend-color"
                  style={{ backgroundColor: "#22c55e" }}
                ></div>
                <span>
                  {context === "driver"
                    ? "Transport Completed"
                    : context === "operator"
                    ? "Session/Assignment Completed"
                    : "Session Completed"}
                </span>
              </div>
              <div className="status-legend-item">
                <div
                  className="status-legend-color"
                  style={{ backgroundColor: "#ef4444" }}
                ></div>
                <span>Cancelled/Rejected</span>
              </div>
            </div>
          </div>
        )}

        {/* Time Slots Preview - Show immediately for today or selected date */}
        <div className="time-slots-preview">
          <h3>
            Time Slots Preview{" "}
            {selectedDate
              ? `for ${selectedDate.toLocaleDateString()}`
              : "for Today"}
          </h3>
          <div className="time-slots-grid-compact">
            {generateTimeSlots().map((time, index) => {
              const previewDate = selectedDate || new Date();
              const slotStatus = getTimeSlotStatus(time, previewDate);
              return (
                <div
                  key={index}
                  className={`time-slot-preview ${slotStatus.status}`}
                  style={{
                    backgroundColor: slotStatus.color,
                    opacity: 0.8,
                    cursor:
                      slotStatus.status === "past" ? "not-allowed" : "pointer",
                  }}
                  title={`${time} - ${slotStatus.status.replace("-", " ")}`}
                  onClick={() => {
                    if (slotStatus.status !== "past") {
                      setSelectedTime(time);
                      onTimeSelected?.(time);

                      // Fetch updated availability for the selected time
                      const targetDate = selectedDate || new Date();

                      if (targetDate) {
                        const [hours, minutes] = time.split(":").map(Number);
                        const endDate = new Date();
                        endDate.setHours(hours, minutes + 60, 0); // Add 1 hour
                        const endTime = `${endDate
                          .getHours()
                          .toString()
                          .padStart(2, "0")}:${endDate
                          .getMinutes()
                          .toString()
                          .padStart(2, "0")}`;

                        console.log(
                          "Calendar: Fetching availability for selected time slot:",
                          time
                        );
                        refetchAvailabilityForTimeSlot(
                          targetDate,
                          time,
                          endTime
                        );
                      }
                    }
                  }}
                >
                  <span className="time-preview">{time}</span>
                </div>
              );
            })}
          </div>

          {/* Legend for time slot colors */}
          <div className="time-slot-legend-compact">
            <div className="legend-item">
              <span
                className="legend-circle"
                style={{ backgroundColor: "#16a34a" }}
              ></span>{" "}
              Available
            </div>
            <div className="legend-item">
              <span
                className="legend-circle"
                style={{ backgroundColor: "#f59e0b" }}
              ></span>{" "}
              Limited
            </div>
            <div className="legend-item">
              <span
                className="legend-circle"
                style={{ backgroundColor: "#dc2626" }}
              ></span>{" "}
              Fully booked
            </div>
            <div className="legend-item">
              <span
                className="legend-circle"
                style={{ backgroundColor: "#4b3b06" }}
              ></span>{" "}
              No availability
            </div>
            <div className="legend-item">
              <span
                className="legend-circle"
                style={{ backgroundColor: "#6b7280" }}
              ></span>{" "}
              Past time
            </div>
          </div>
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
                    <span className="time-slot-time">{time}</span>
                  </div>
                );
              })}
            </div>
            {/* Legend for time slot colors */}
            <div className="time-slot-legend">
              <div className="legend-item">
                <span
                  className="legend-circle"
                  style={{ backgroundColor: "#16a34a" }}
                ></span>{" "}
                Available
              </div>
              <div className="legend-item">
                <span
                  className="legend-circle"
                  style={{ backgroundColor: "#f59e0b" }}
                ></span>{" "}
                Limited availability
              </div>
              <div className="legend-item">
                <span
                  className="legend-circle"
                  style={{ backgroundColor: "#dc2626" }}
                ></span>{" "}
                Fully booked
              </div>
              <div className="legend-item">
                <span
                  className="legend-circle"
                  style={{ backgroundColor: "#4b3b06" }}
                ></span>{" "}
                No availability set
              </div>
              <div className="legend-item">
                <span
                  className="legend-circle"
                  style={{ backgroundColor: "#6b7280" }}
                ></span>{" "}
                Past time
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      {view === "month" ? renderMonthCalendar() : renderDayCalendar()}

      {/* Only show availability info for current/future dates */}
      {view === "day" && !isPastDate(selectedDate) && (
        <div className="availability-info">
          <div className="therapists-section">
            <h3>Available Therapists</h3>
            {(() => {
              // Start with all available therapists
              let filteredTherapists = availableTherapists || [];

              // If a specific time is selected, filter by actual availability for that time
              if (selectedTime) {
                filteredTherapists = filteredTherapists.filter((therapist) =>
                  isTherapistAvailableForTimeSlot(therapist, selectedTime)
                );

                // Then filter out therapists who are currently in session during the selected time
                if (appointmentsByDate && Array.isArray(appointmentsByDate)) {
                  const bookedTherapistIds = [];
                  appointmentsByDate.forEach((appointment) => {
                    if (
                      appointment.start_time <= selectedTime &&
                      appointment.end_time > selectedTime
                    ) {
                      if (appointment.therapist_details?.id) {
                        bookedTherapistIds.push(
                          appointment.therapist_details.id
                        );
                      }
                    }
                  });

                  filteredTherapists = filteredTherapists.filter(
                    (therapist) => !bookedTherapistIds.includes(therapist.id)
                  );
                }
              }

              return filteredTherapists && filteredTherapists.length > 0 ? (
                <ul>
                  {filteredTherapists.map((therapist) => (
                    <li key={therapist.id || Math.random()}>
                      <div className="therapist-name">
                        <b>
                          {therapist.first_name || ""}{" "}
                          {therapist.last_name || ""}
                        </b>
                        {therapist.specialization && (
                          <span className="therapist-specialization">
                            {" "}
                            ({therapist.specialization})
                          </span>
                        )}
                      </div>
                      {therapist.start_time && therapist.end_time && (
                        <span className="availability-time">
                          Available: {therapist.start_time} to{" "}
                          {therapist.end_time}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {selectedTime
                    ? `No therapists available for ${selectedTime}. Try selecting a different time slot.`
                    : "No therapists have set availability for the current view. Try selecting a specific time slot or check the Availability Manager."}
                </p>
              );
            })()}
          </div>

          <div className="drivers-section">
            <h3>Available Drivers</h3>
            {(() => {
              // Start with all available drivers
              let filteredDrivers = availableDrivers || [];

              // If a specific time is selected, filter by actual availability for that time
              if (selectedTime) {
                filteredDrivers = filteredDrivers.filter((driver) =>
                  isDriverAvailableForTimeSlot(driver, selectedTime)
                );
              }

              // Check if we have valid availability data for drivers
              const hasFreshDriverData =
                availableDrivers && availableDrivers.length > 0 && selectedTime; // Only show driver info if a specific time is selected

              if (!hasFreshDriverData) {
                return (
                  <p>
                    Please select a specific time slot to see driver
                    availability.
                  </p>
                );
              }

              return filteredDrivers && filteredDrivers.length > 0 ? (
                <ul>
                  {filteredDrivers.map((driver) => (
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
                  {selectedTime
                    ? `No drivers available for ${selectedTime}. Try selecting a different time slot or proceed without a driver.`
                    : "No drivers have set availability for the current view. Try selecting a specific time slot or check the Availability Manager."}
                </p>
              );
            })()}
          </div>

          {/* Display bookings for the selected day */}
          <div className="day-bookings">
            {(() => {
              // Ensure appointmentsByDate is always an array - handle null, undefined, or non-array values
              let bookings = [];
              if (appointmentsByDate && Array.isArray(appointmentsByDate)) {
                bookings = appointmentsByDate;
              } else if (
                appointmentsByDate &&
                typeof appointmentsByDate === "object"
              ) {
                // Handle case where it might be an object with array inside
                bookings =
                  appointmentsByDate.appointments ||
                  appointmentsByDate.data ||
                  [];
              }

              if (!Array.isArray(bookings)) {
                bookings = [];
              }

              if (bookings.length === 0) {
                return (
                  <>
                    <h3>Bookings for {selectedDate.toLocaleDateString()}</h3>
                    <p className="no-bookings">
                      No bookings found for this date.
                    </p>
                  </>
                );
              }

              return (
                <>
                  <h3>Bookings for {selectedDate.toLocaleDateString()}</h3>
                  <div className="bookings-list">
                    {bookings.map((appointment, index) => (
                      <div
                        key={appointment.id || index}
                        className="appointment-card"
                      >
                        <div className="appointment-header">
                          <h3>
                            {appointment.client_details?.first_name || "N/A"}{" "}
                            {appointment.client_details?.last_name || ""}
                          </h3>
                          <span
                            className={`status-badge status-${
                              appointment.status || "pending"
                            }`}
                          >
                            {appointment.status
                              ? appointment.status.charAt(0).toUpperCase() +
                                appointment.status.slice(1).replace(/_/g, " ")
                              : "Pending"}
                          </span>
                        </div>
                        <div className="appointment-details">
                          <p>
                            <strong>Time:</strong>{" "}
                            {appointment.start_time || "N/A"} -{" "}
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
                              {appointment.therapist_details?.first_name ||
                                "Unknown"}{" "}
                              {appointment.therapist_details?.last_name ||
                                "Therapist"}
                            </p>
                          )}
                          {appointment.driver_details && (
                            <p>
                              <strong>Driver:</strong>{" "}
                              {appointment.driver_details?.first_name ||
                                "Unknown"}{" "}
                              {appointment.driver_details?.last_name ||
                                "Driver"}
                            </p>
                          )}
                          <p>
                            <strong>Location:</strong>{" "}
                            {appointment.location || "N/A"}
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
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Minimal loading indicator for frequent data fetching */}
      <MinimalLoadingIndicator
        show={loading}
        position="bottom-right"
        size="micro"
        variant="subtle"
        tooltip="Loading availability data..."
        pulse={true}
        fadeIn={true}
      />
    </div>
  );
};

export default Calendar;
