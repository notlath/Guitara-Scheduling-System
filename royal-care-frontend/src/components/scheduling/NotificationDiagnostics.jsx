import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications } from "../../features/scheduling/schedulingSlice";

const NotificationDiagnostics = () => {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { notifications, error, loading } = useSelector(
    (state) => state.scheduling
  );

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestResults(null);

    const results = {
      timestamp: new Date().toISOString(),
      user: {
        isAuthenticated: !!user,
        id: user?.id,
        username: user?.username,
        role: user?.role,
      },
      authentication: {
        hasKnoxToken: !!localStorage.getItem("knoxToken"),
        tokenLength: localStorage.getItem("knoxToken")?.length || 0,
      },
      tests: [],
    };

    // Test 1: Redux fetchNotifications
    try {
      console.log("🧪 Test 1: Redux fetchNotifications");
      const result = await dispatch(fetchNotifications()).unwrap();
      results.tests.push({
        name: "Redux fetchNotifications",
        success: true,
        data: result,
        message: `Fetched ${result.notifications?.length || 0} notifications`,
      });
    } catch (error) {
      results.tests.push({
        name: "Redux fetchNotifications",
        success: false,
        error: error,
        message: `Error: ${error.message || error}`,
      });
    }

    // Test 2: Direct API call
    try {
      console.log("🧪 Test 2: Direct API call");
      const token = localStorage.getItem("knoxToken");
      const response = await fetch("/api/scheduling/notifications/", {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      results.tests.push({
        name: "Direct API call",
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data,
        message: response.ok
          ? `API responded with ${response.status}`
          : `API error ${response.status}: ${response.statusText}`,
      });
    } catch (error) {
      results.tests.push({
        name: "Direct API call",
        success: false,
        error: error.message,
        message: `Network error: ${error.message}`,
      });
    }

    // Test 3: Backend health check
    try {
      console.log("🧪 Test 3: Backend health check");
      const response = await fetch("/api/scheduling/", {
        method: "GET",
      });

      results.tests.push({
        name: "Backend health check",
        success: response.ok,
        status: response.status,
        message: response.ok
          ? "Backend is reachable"
          : `Backend returned ${response.status}`,
      });
    } catch (error) {
      results.tests.push({
        name: "Backend health check",
        success: false,
        error: error.message,
        message: `Backend unreachable: ${error.message}`,
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <div
      style={{
        padding: "20px",
        margin: "20px",
        border: "2px solid #007bff",
        borderRadius: "8px",
        backgroundColor: "#f8f9fa",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      <h3 style={{ color: "#007bff", marginTop: 0 }}>
        🔧 Notification System Diagnostics
      </h3>

      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          style={{
            padding: "10px 20px",
            backgroundColor: isRunning ? "#6c757d" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          {isRunning ? "Running Diagnostics..." : "Run Diagnostics"}
        </button>
      </div>

      {/* Current Redux State */}
      <div style={{ marginBottom: "20px" }}>
        <h4>📊 Current State</h4>
        <div
          style={{
            backgroundColor: "white",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <div>
            <strong>Loading:</strong> {loading ? "Yes" : "No"}
          </div>
          <div>
            <strong>Error:</strong> {error || "None"}
          </div>
          <div>
            <strong>Notifications:</strong> {notifications?.length || 0}
          </div>
          <div>
            <strong>User:</strong> {user?.username || "Not logged in"} (
            {user?.role || "No role"})
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div>
          <h4>🧪 Test Results ({testResults.timestamp})</h4>

          {testResults.tests.map((test, index) => (
            <div
              key={index}
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: test.success ? "#d4edda" : "#f8d7da",
                borderRadius: "4px",
                border: `1px solid ${test.success ? "#c3e6cb" : "#f5c6cb"}`,
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                {test.success ? "✅" : "❌"} {test.name}
              </div>
              <div style={{ marginBottom: "5px" }}>{test.message}</div>

              {test.status && (
                <div>
                  <strong>Status:</strong> {test.status}
                </div>
              )}
              {test.error && (
                <div>
                  <strong>Error:</strong> {JSON.stringify(test.error, null, 2)}
                </div>
              )}
              {test.data && (
                <details style={{ marginTop: "5px" }}>
                  <summary style={{ cursor: "pointer" }}>View Data</summary>
                  <pre
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: "10px",
                      borderRadius: "4px",
                      marginTop: "5px",
                      maxHeight: "200px",
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(test.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}

          {/* Summary */}
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#e9ecef",
              borderRadius: "4px",
            }}
          >
            <h4>📋 Diagnosis Summary</h4>
            <ul style={{ marginBottom: 0 }}>
              {!testResults.user.isAuthenticated && (
                <li style={{ color: "red" }}>❌ User not authenticated</li>
              )}
              {!testResults.authentication.hasKnoxToken && (
                <li style={{ color: "red" }}>❌ No Knox token found</li>
              )}
              {testResults.tests.find(
                (t) => t.name === "Backend health check" && !t.success
              ) && (
                <li style={{ color: "red" }}>❌ Backend connectivity issues</li>
              )}
              {testResults.tests.find(
                (t) => t.name === "Direct API call" && t.status === 500
              ) && (
                <li style={{ color: "red" }}>
                  ❌ Backend 500 error - check server logs
                </li>
              )}
              {testResults.tests.find(
                (t) => t.name === "Direct API call" && t.status === 404
              ) && (
                <li style={{ color: "orange" }}>
                  ⚠️ Notifications endpoint not found
                </li>
              )}
              {testResults.tests.every((t) => t.success) && (
                <li style={{ color: "green" }}>✅ All tests passed!</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDiagnostics;
