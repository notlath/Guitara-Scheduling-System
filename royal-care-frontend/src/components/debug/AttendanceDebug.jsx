/**
 * Debug component to verify real-time attendance updates
 * This component displays the current state of attendance data and cache
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { queryKeys } from "../../lib/queryClient";

const AttendanceDebug = () => {
  const queryClient = useQueryClient();
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const today = new Date().toISOString().split("T")[0];

      // Get all relevant cache data
      const todayStatus = queryClient.getQueryData(
        queryKeys.attendance.byDate(today)
      );
      const attendanceRecords = queryClient.getQueryData([
        ...queryKeys.attendance.list(),
        today,
      ]);

      setDebugInfo({
        timestamp: new Date().toLocaleTimeString(),
        todayStatus,
        attendanceRecordsCount: Array.isArray(attendanceRecords)
          ? attendanceRecords.length
          : 0,
        attendanceRecords: attendanceRecords?.slice(0, 3), // Show first 3 records
        cacheKeys: queryClient
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey)
          .filter((key) => Array.isArray(key) && key.includes("attendance")),
      });
    };

    // Update immediately
    updateDebugInfo();

    // Update every second
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "5px",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 9999,
      }}
    >
      <h4>🔍 Attendance Cache Debug</h4>
      <div>
        <strong>Last Update:</strong> {debugInfo.timestamp}
      </div>
      <div>
        <strong>Today Status:</strong> {debugInfo.todayStatus?.status || "None"}
      </div>
      <div>
        <strong>Records Count:</strong> {debugInfo.attendanceRecordsCount}
      </div>
      <div>
        <strong>Check-in Status:</strong>{" "}
        {debugInfo.todayStatus?.is_checked_in ? "✅" : "❌"}
      </div>
      <div>
        <strong>Check-in Time:</strong>{" "}
        {debugInfo.todayStatus?.check_in_time || "N/A"}
      </div>
      <div>
        <strong>Check-out Time:</strong>{" "}
        {debugInfo.todayStatus?.check_out_time || "N/A"}
      </div>

      <div style={{ marginTop: "5px", fontSize: "11px", color: "#ccc" }}>
        <div>
          <strong>UI Logic Debug:</strong>
        </div>
        <div>
          hasCheckedIn: {debugInfo.todayStatus?.check_in_time ? "✅" : "❌"}
        </div>
        <div>
          canCheckOut:{" "}
          {debugInfo.todayStatus?.check_in_time &&
          !debugInfo.todayStatus?.check_out_time
            ? "✅"
            : "❌"}
        </div>
        <div>
          hasCheckedOut: {debugInfo.todayStatus?.check_out_time ? "✅" : "❌"}
        </div>
      </div>

      <details style={{ marginTop: "5px" }}>
        <summary>Cache Keys ({debugInfo.cacheKeys?.length || 0})</summary>
        <pre style={{ fontSize: "10px", overflow: "auto", maxHeight: "100px" }}>
          {JSON.stringify(debugInfo.cacheKeys, null, 2)}
        </pre>
      </details>

      <details style={{ marginTop: "5px" }}>
        <summary>Sample Records</summary>
        <pre style={{ fontSize: "10px", overflow: "auto", maxHeight: "100px" }}>
          {JSON.stringify(debugInfo.attendanceRecords, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default AttendanceDebug;
