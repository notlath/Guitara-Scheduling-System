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
        await axios.get("http://localhost:8000/", { timeout: 3000 });
        newDiagnostics.backendReachable = "Yes";
        console.log("✅ Backend is reachable");

        // Test appointments endpoint
        if (token) {
          console.log("🔍 Testing appointments endpoint...");
          const response = await axios.get(`${API_URL}appointments/`, {
            headers: { Authorization: `Token ${token}` },
            timeout: 5000,
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

        // Handle timeout errors specifically
        if (
          error.code === "ECONNABORTED" &&
          error.message.includes("timeout")
        ) {
          newDiagnostics.backendReachable =
            "No - Server timeout (not running?)";
          newDiagnostics.appointmentsResponse = "Server not responding";
          newDiagnostics.error = {
            message: "Backend server appears to be down or not responding",
            suggestion:
              "Start the Django server with: python manage.py runserver",
            originalError: error.message,
          };
        } else if (
          error.code === "ECONNREFUSED" ||
          error.message.includes("Network Error")
        ) {
          newDiagnostics.backendReachable = "No - Connection refused";
          newDiagnostics.appointmentsResponse = "Cannot connect to server";
          newDiagnostics.error = {
            message: "Backend server is not running",
            suggestion:
              "Start the Django server with: python manage.py runserver",
            originalError: error.message,
          };
        } else if (error.response?.status === 401) {
          newDiagnostics.backendReachable = "Yes";
          newDiagnostics.appointmentsResponse = "Authentication failed";
          newDiagnostics.error = {
            message: "Authentication token is invalid or expired",
            suggestion: "Please log in again",
            status: error.response.status,
          };
        } else {
          newDiagnostics.backendReachable = "Yes";
          newDiagnostics.appointmentsResponse = `Error: ${
            error.response?.status || error.message
          }`;
          newDiagnostics.error = {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          };
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
        <div
          style={{
            color: "yellow",
            marginTop: "10px",
            padding: "10px",
            background: "rgba(255,255,0,0.1)",
            borderRadius: "3px",
          }}
        >
          <strong>⚠️ Issue Detected:</strong>
          <div style={{ marginTop: "5px" }}>{diagnostics.error.message}</div>

          {diagnostics.error.suggestion && (
            <div style={{ marginTop: "5px", color: "lightgreen" }}>
              <strong>💡 Solution:</strong> {diagnostics.error.suggestion}
            </div>
          )}

          <details style={{ marginTop: "10px" }}>
            <summary>Technical Details</summary>
            <pre
              style={{
                fontSize: "10px",
                whiteSpace: "pre-wrap",
                color: "lightgray",
              }}
            >
              {JSON.stringify(diagnostics.error, null, 2)}
            </pre>
          </details>
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
