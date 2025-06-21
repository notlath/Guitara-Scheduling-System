/**
 * TanStack Query Debug Component
 * Add this to your OperatorDashboard to test TanStack Query directly
 */

import { useQueryClient } from "@tanstack/react-query";
import { useOperatorDashboardData } from "../hooks/useDashboardQueries";

const TanStackQueryDebugger = () => {
  const queryClient = useQueryClient();
  const dashboardData = useOperatorDashboardData();

  const testDirectAPI = async () => {
    console.log("🧪 Testing direct API call...");

    try {
      const token = localStorage.getItem("knoxToken");
      console.log("Token exists:", !!token);

      const response = await fetch(
        "http://localhost:8000/api/scheduling/appointments/",
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (Array.isArray(data)) {
        console.log("✅ Got appointments array:", data.length);
      } else {
        console.log("❌ Response is not an array:", typeof data);
      }
    } catch (error) {
      console.error("❌ Direct API test failed:", error);
    }
  };

  const debugQueryCache = () => {
    console.log("🔍 TanStack Query Cache Debug:");
    const cache = queryClient.getQueryCache();
    console.log("Cache queries:", cache.getAll());

    const appointmentsCache = queryClient.getQueryData([
      "appointments",
      "list",
    ]);
    console.log("Appointments cache:", appointmentsCache);
  };

  const forceQueryRefetch = async () => {
    console.log("🔄 Force refetching queries...");
    await queryClient.refetchQueries({ queryKey: ["appointments", "list"] });
    await queryClient.refetchQueries({ queryKey: ["appointments", "today"] });
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "white",
        border: "2px solid #007bff",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        zIndex: 9999,
        maxWidth: "300px",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#007bff" }}>
        TanStack Query Debugger
      </h4>

      <div style={{ marginBottom: "8px", fontSize: "12px" }}>
        <strong>Data Counts:</strong>
        <br />
        Appointments: {dashboardData.appointments?.length || 0}
        <br />
        Today: {dashboardData.todayAppointments?.length || 0}
        <br />
        Notifications: {dashboardData.notifications?.length || 0}
      </div>

      <div style={{ marginBottom: "8px", fontSize: "12px" }}>
        <strong>States:</strong>
        <br />
        Loading: {dashboardData.loading ? "Yes" : "No"}
        <br />
        Error: {dashboardData.error ? "Yes" : "No"}
        <br />
        Has Data: {dashboardData.hasData ? "Yes" : "No"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          onClick={testDirectAPI}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Test Direct API
        </button>

        <button
          onClick={debugQueryCache}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            background: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Debug Cache
        </button>

        <button
          onClick={forceQueryRefetch}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Force Refetch
        </button>

        <button
          onClick={dashboardData.forceRefresh}
          style={{
            padding: "4px 8px",
            fontSize: "11px",
            background: "#6f42c1",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Dashboard Refresh
        </button>
      </div>
    </div>
  );
};

export default TanStackQueryDebugger;
