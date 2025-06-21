import axios from "axios";
import { useEffect, useState } from "react";

const ApiDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({
    token: null,
    apiUrl: null,
    backendReachable: null,
    appointmentsResponse: null,
    error: null,
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      const token = localStorage.getItem("knoxToken");
      const API_URL =
        import.meta.env.MODE === "production"
          ? "/api/scheduling/"
          : "http://localhost:8000/api/scheduling/";

      const newDiagnostics = {
        token: token ? "Present" : "Missing",
        apiUrl: API_URL,
        backendReachable: null,
        appointmentsResponse: null,
        error: null,
      };

      try {
        // Test if backend is reachable - use the root endpoint that returns "Welcome to the API"
        console.log("🔍 Testing backend connection...");
        await axios.get("http://localhost:8000/", { timeout: 5000 });
        newDiagnostics.backendReachable = "Yes";
        console.log("✅ Backend is reachable");

        // Test appointments endpoint
        if (token) {
          console.log("🔍 Testing appointments endpoint...");
          const response = await axios.get(`${API_URL}appointments/`, {
            headers: { Authorization: `Token ${token}` },
            timeout: 10000,
          });
          newDiagnostics.appointmentsResponse = {
            status: response.status,
            count: response.data?.results?.length || response.data?.length || 0,
            data:
              response.data?.results?.slice(0, 2) || response.data?.slice(0, 2), // First 2 appointments for preview
          };
          console.log(
            "✅ Appointments endpoint working:",
            newDiagnostics.appointmentsResponse.count,
            "appointments"
          );
        } else {
          newDiagnostics.appointmentsResponse = "No token to test with";
        }
      } catch (error) {
        console.error("❌ API Diagnostic error:", error);
        newDiagnostics.error = {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        };

        if (
          error.code === "ECONNREFUSED" ||
          error.message.includes("Network Error")
        ) {
          newDiagnostics.backendReachable = "No - Connection refused";
        } else if (error.response?.status === 401) {
          newDiagnostics.backendReachable = "Yes";
          newDiagnostics.appointmentsResponse = "Authentication failed";
        } else {
          newDiagnostics.backendReachable = "Yes";
          newDiagnostics.appointmentsResponse = `Error: ${
            error.response?.status || error.message
          }`;
        }
      }

      setDiagnostics(newDiagnostics);
    };

    runDiagnostics();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "50px",
        left: "10px",
        background: "darkblue",
        color: "white",
        padding: "15px",
        fontSize: "12px",
        maxWidth: "400px",
        zIndex: 9998,
        borderRadius: "5px",
        maxHeight: "500px",
        overflow: "auto",
      }}
    >
      <h4>🔍 API Diagnostics</h4>

      <div style={{ marginBottom: "10px" }}>
        <strong>Auth Token:</strong> {diagnostics.token}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>API URL:</strong> {diagnostics.apiUrl}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Backend Reachable:</strong>{" "}
        {diagnostics.backendReachable || "Testing..."}
      </div>

      <div style={{ marginBottom: "10px" }}>
        <strong>Appointments API:</strong>
        {typeof diagnostics.appointmentsResponse === "string"
          ? diagnostics.appointmentsResponse
          : diagnostics.appointmentsResponse
          ? `${diagnostics.appointmentsResponse.count} appointments found`
          : "Testing..."}
      </div>

      {diagnostics.error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          <strong>Error Details:</strong>
          <pre style={{ fontSize: "10px", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(diagnostics.error, null, 2)}
          </pre>
        </div>
      )}

      {diagnostics.appointmentsResponse?.data && (
        <details style={{ marginTop: "10px" }}>
          <summary>Sample Data</summary>
          <pre style={{ fontSize: "10px", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(diagnostics.appointmentsResponse.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ApiDiagnostic;
