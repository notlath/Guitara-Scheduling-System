/**
 * Shared appointment status utilities
 * Eliminates duplication of status badge and display text logic across dashboards
 */

/**
 * Get consistent CSS class for appointment status badges
 * Uses BEM naming convention for better maintainability
 */
export const getStatusBadgeClass = (status) => {
  const statusMap = {
    pending: "status-badge--pending",
    confirmed: "status-badge--confirmed",
    therapist_confirmed: "status-badge--therapist-confirmed", 
    driver_confirmed: "status-badge--driver-confirmed",
    rejected: "status-badge--rejected",
    cancelled: "status-badge--cancelled",
    auto_cancelled: "status-badge--overdue",
    completed: "status-badge--completed",
    in_progress: "status-badge--in-progress",
    awaiting_payment: "status-badge--warning",
    payment_requested: "status-badge--payment-requested",
    payment_completed: "status-badge--payment-completed",
    pickup_requested: "status-badge--pickup-requested",
    overdue: "status-badge--overdue",
    timeout: "status-badge--timeout",
    journey_started: "status-badge--journey-started",
    journey: "status-badge--journey-started", // Alias for journey_started
    arrived: "status-badge--arrived",
    dropped_off: "status-badge--dropped-off",
    session_started: "status-badge--session-started",
    session_in_progress: "status-badge--session-started", // Alias for session_started
    transport_completed: "status-badge--completed",
    driver_transport_completed: "status-badge--completed",
    driver_assigned_pickup: "status-badge--pickup-requested",
    return_journey: "status-badge--journey-started",
    driving_to_location: "status-badge--journey-started",
    driving_to_pickup: "status-badge--journey-started",
  };

  return statusMap[status] || "status-badge--pending";
};

/**
 * Get user-friendly display text for appointment statuses
 */
export const getStatusDisplayText = (status) => {
  const statusTextMap = {
    pending: "Pending",
    confirmed: "Confirmed", 
    therapist_confirmed: "Therapist Confirmed",
    driver_confirmed: "Driver Confirmed",
    rejected: "Rejected",
    cancelled: "Cancelled",
    auto_cancelled: "Auto Cancelled",
    completed: "Completed",
    in_progress: "In Progress",
    awaiting_payment: "Awaiting Payment",
    payment_requested: "Payment Requested",
    payment_completed: "Payment Completed",
    pickup_requested: "Pickup Requested",
    overdue: "Overdue",
    timeout: "Timeout",
    journey_started: "En Route",
    journey: "En Route",
    arrived: "Arrived",
    dropped_off: "Dropped Off",
    session_started: "Session in Progress",
    session_in_progress: "Session in Progress", 
    transport_completed: "Transport Completed",
    driver_transport_completed: "Transport Completed",
    driver_assigned_pickup: "Driver Assigned for Pickup",
    return_journey: "Return Journey",
    driving_to_location: "Driving to Location",
    driving_to_pickup: "Driving to Pickup",
  };

  // Return mapped text or create from status string
  return statusTextMap[status] || 
    status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, " ") || 
    "Unknown Status";
};

/**
 * Check if an appointment is in a completed transport state
 */
export const isTransportCompleted = (appointment) => {
  return ["transport_completed", "completed", "driver_transport_completed"].includes(
    appointment?.status
  );
};

/**
 * Get urgency level for pending appointments based on time until appointment
 * Only applies to "pending" status appointments
 */
export const getUrgencyLevel = (appointment) => {
  // Only "pending" status appointments get urgency indicators
  if (appointment?.status !== "pending") {
    return null;
  }

  if (!appointment.date || !appointment.start_time) {
    return "normal";
  }

  const now = new Date();
  const appointmentDateTime = new Date(`${appointment.date}T${appointment.start_time}`);
  const timeDiff = appointmentDateTime - now;
  const minutesUntilAppointment = timeDiff / (1000 * 60);

  // Time-based urgency calculation for pending appointments only
  if (minutesUntilAppointment <= 30) {
    return "critical";
  } else if (minutesUntilAppointment <= 80) { // 1 hour 20 minutes
    return "high";
  } else if (minutesUntilAppointment <= 140) { // 2 hours 20 minutes
    return "medium";
  } else {
    return "normal";
  }
};

/**
 * Get urgency badge configuration
 */
export const getUrgencyBadge = (urgencyLevel) => {
  const badges = {
    critical: {
      icon: "🚨",
      label: "Critical",
      className: "urgency-critical",
    },
    high: { 
      icon: "🔥", 
      label: "High", 
      className: "urgency-high" 
    },
    medium: { 
      icon: "⚠️", 
      label: "Medium", 
      className: "urgency-medium" 
    },
    normal: { 
      icon: "⚪", 
      label: "Normal", 
      className: "urgency-normal" 
    },
  };
  return badges[urgencyLevel] || badges.normal;
};
