/**
 * Temporary debug component for AttendancePage UI state
 * Shows the exact logic that determines which UI state is displayed
 */

const AttendancePageDebug = ({
  todayStatus,
  checkInTime,
  checkOutTime,
  hasCheckedInToday,
  canCheckOutToday,
  isWithinCheckInWindow,
}) => {
  const debugInfo = {
    todayStatus: todayStatus,
    checkInTime: checkInTime,
    checkOutTime: checkOutTime,
    hasCheckedInToday: hasCheckedInToday(),
    canCheckOutToday: canCheckOutToday(),
    isWithinCheckInWindow: isWithinCheckInWindow(),

    // UI condition evaluations
    showCheckInButton: !hasCheckedInToday() && isWithinCheckInWindow(),
    showCheckOutButton: hasCheckedInToday() && canCheckOutToday(),
    showAlreadyCheckedIn: hasCheckedInToday() && !canCheckOutToday(),
    showAlreadyCheckedOut: !!(checkOutTime || todayStatus?.check_out_time),
  };

  // Determine which UI state should be active
  let activeState = "unknown";
  if (debugInfo.showCheckInButton) {
    activeState = "check-in-button";
  } else if (debugInfo.showCheckOutButton) {
    activeState = "check-out-button";
  } else if (debugInfo.showAlreadyCheckedOut) {
    activeState = "already-checked-out";
  } else if (debugInfo.showAlreadyCheckedIn) {
    activeState = "already-checked-in";
  } else {
    activeState = "attendance-recorded";
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        left: "10px",
        background: "rgba(0,0,0,0.9)",
        color: "white",
        padding: "15px",
        borderRadius: "8px",
        fontSize: "12px",
        maxWidth: "400px",
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#4CAF50" }}>
        🔍 AttendancePage UI Debug
      </h4>

      <div style={{ marginBottom: "10px" }}>
        <strong style={{ color: "#FFA726" }}>
          Active State: {activeState}
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          fontSize: "11px",
        }}
      >
        <div>
          <div>
            <strong>Raw Data:</strong>
          </div>
          <div>todayStatus: {todayStatus ? "✅" : "❌"}</div>
          <div>checkInTime: {checkInTime || "null"}</div>
          <div>checkOutTime: {checkOutTime || "null"}</div>
          <div>is_checked_in: {todayStatus?.is_checked_in ? "✅" : "❌"}</div>
        </div>

        <div>
          <div>
            <strong>Helper Functions:</strong>
          </div>
          <div>
            hasCheckedInToday(): {debugInfo.hasCheckedInToday ? "✅" : "❌"}
          </div>
          <div>
            canCheckOutToday(): {debugInfo.canCheckOutToday ? "✅" : "❌"}
          </div>
          <div>
            isWithinCheckInWindow():{" "}
            {debugInfo.isWithinCheckInWindow ? "✅" : "❌"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "10px", fontSize: "11px" }}>
        <div>
          <strong>UI Conditions:</strong>
        </div>
        <div
          style={{ color: debugInfo.showCheckInButton ? "#4CAF50" : "#666" }}
        >
          Show Check-In: {debugInfo.showCheckInButton ? "✅" : "❌"}
        </div>
        <div
          style={{ color: debugInfo.showCheckOutButton ? "#4CAF50" : "#666" }}
        >
          Show Check-Out: {debugInfo.showCheckOutButton ? "✅" : "❌"}
        </div>
        <div
          style={{ color: debugInfo.showAlreadyCheckedIn ? "#4CAF50" : "#666" }}
        >
          Show "Already Checked In":{" "}
          {debugInfo.showAlreadyCheckedIn ? "✅" : "❌"}
        </div>
        <div
          style={{
            color: debugInfo.showAlreadyCheckedOut ? "#4CAF50" : "#666",
          }}
        >
          Show "Already Checked Out":{" "}
          {debugInfo.showAlreadyCheckedOut ? "✅" : "❌"}
        </div>
      </div>

      <div style={{ marginTop: "10px", fontSize: "10px", opacity: 0.7 }}>
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default AttendancePageDebug;
