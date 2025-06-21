import { useEffect, useRef } from "react";

/**
 * Debug component to track what's causing rerenders
 * Add this to OperatorDashboard temporarily to debug infinite loops
 */
const RenderTracker = ({
  appointments,
  attendanceRecords,
  notifications,
  loading,
  currentView,
  currentFilter,
  rejectedAppointments,
  pendingAppointments,
  overdueAppointments,
}) => {
  const renderCount = useRef(0);
  const previousValues = useRef({});

  renderCount.current++;

  const currentValues = {
    appointmentsLength: appointments?.length || 0,
    attendanceRecordsLength: attendanceRecords?.length || 0,
    notificationsLength: notifications?.length || 0,
    loading,
    currentView,
    currentFilter,
    rejectedLength: rejectedAppointments?.length || 0,
    pendingLength: pendingAppointments?.length || 0,
    overdueLength: overdueAppointments?.length || 0,
  };

  useEffect(() => {
    console.log(`🔍 RenderTracker: Render #${renderCount.current}`);

    // Check what changed
    const changed = [];
    Object.keys(currentValues).forEach((key) => {
      if (previousValues.current[key] !== currentValues[key]) {
        changed.push(
          `${key}: ${previousValues.current[key]} → ${currentValues[key]}`
        );
      }
    });

    if (changed.length > 0) {
      console.log("📊 Changes detected:", changed);
    } else {
      console.log("⚠️ No changes detected - possible infinite loop!");
    }

    previousValues.current = { ...currentValues };

    // Alert if too many renders
    if (renderCount.current > 20) {
      console.error(
        "🚨 INFINITE LOOP DETECTED! More than 20 renders without changes"
      );
      console.error("Current values:", currentValues);
    }
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "rgba(255,0,0,0.1)",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        zIndex: 9999,
      }}
    >
      <div>🔍 Renders: {renderCount.current}</div>
      <div>📊 Appointments: {currentValues.appointmentsLength}</div>
      <div>👥 Attendance: {currentValues.attendanceRecordsLength}</div>
      <div>🛎️ Notifications: {currentValues.notificationsLength}</div>
      <div>⏳ Loading: {currentValues.loading ? "Yes" : "No"}</div>
    </div>
  );
};

export default RenderTracker;
