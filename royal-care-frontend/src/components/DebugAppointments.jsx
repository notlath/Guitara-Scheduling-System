import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAppointments } from "../features/scheduling/schedulingSlice";

const DebugAppointments = () => {
  const dispatch = useDispatch();
  const [manualTestResult, setManualTestResult] = useState(null);
  const [apiTestResult, setApiTestResult] = useState(null);

  const reduxState = useSelector((state) => state.scheduling);

  console.log("🐛 Redux scheduling state:", reduxState);

  // Manual API test
  const testApiDirectly = async () => {
    const token = localStorage.getItem("knoxToken");
    const API_URL =
      import.meta.env.MODE === "production"
        ? "/api/scheduling/"
        : "http://localhost:8000/api/scheduling/";

    try {
      const response = await fetch(`${API_URL}appointments/`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setApiTestResult({
        status: response.status,
        ok: response.ok,
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: data?.length || data?.results?.length || 0,
        hasResults: !!data?.results,
        firstItem: data?.[0] || data?.results?.[0] || null,
        rawData: data,
      });
    } catch (error) {
      setApiTestResult({
        error: error.message,
      });
    }
  };

  // Manual Redux test
  const testReduxDispatch = async () => {
    try {
      console.log("🧪 Testing Redux dispatch...");
      const result = await dispatch(fetchAppointments()).unwrap();
      setManualTestResult({
        success: true,
        data: result,
        length: result?.length || result?.results?.length || 0,
      });
    } catch (error) {
      setManualTestResult({
        success: false,
        error: error,
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        background: "black",
        color: "white",
        padding: "10px",
        fontSize: "12px",
        maxWidth: "300px",
        zIndex: 9999,
        maxHeight: "400px",
        overflow: "auto",
      }}
    >
      <h4>🐛 Appointments Debug</h4>
      <p>
        Raw Appointments:{" "}
        {JSON.stringify(reduxState?.appointments).substring(0, 50)}...
      </p>
      <p>
        Appointments Array:{" "}
        {Array.isArray(reduxState?.appointments?.results)
          ? reduxState.appointments.results.length
          : Array.isArray(reduxState?.appointments)
          ? reduxState.appointments.length
          : 0}
      </p>
      <p>Loading: {reduxState?.loading ? "Yes" : "No"}</p>
      <p>Error: {reduxState?.error ? "Yes" : "No"}</p>
      <p>Today: {reduxState?.todayAppointments?.length || 0}</p>
      <p>Upcoming: {reduxState?.upcomingAppointments?.length || 0}</p>
      <p>Notifications: {reduxState?.notifications?.length || 0}</p>

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={testApiDirectly}
          style={{ padding: "4px", marginRight: "5px", fontSize: "10px" }}
        >
          Test API
        </button>
        <button
          onClick={testReduxDispatch}
          style={{ padding: "4px", fontSize: "10px" }}
        >
          Test Redux
        </button>
      </div>

      {apiTestResult && (
        <div
          style={{
            marginTop: "10px",
            borderTop: "1px solid white",
            paddingTop: "5px",
          }}
        >
          <strong>API Test:</strong>
          <div>Status: {apiTestResult.status}</div>
          <div>Length: {apiTestResult.length}</div>
          <div>Has Results: {apiTestResult.hasResults ? "Yes" : "No"}</div>
          {apiTestResult.error && (
            <div style={{ color: "red" }}>Error: {apiTestResult.error}</div>
          )}
        </div>
      )}

      {manualTestResult && (
        <div
          style={{
            marginTop: "10px",
            borderTop: "1px solid white",
            paddingTop: "5px",
          }}
        >
          <strong>Redux Test:</strong>
          <div>Success: {manualTestResult.success ? "Yes" : "No"}</div>
          <div>Length: {manualTestResult.length}</div>
          {manualTestResult.error && (
            <div style={{ color: "red" }}>
              Error: {JSON.stringify(manualTestResult.error)}
            </div>
          )}
        </div>
      )}

      {reduxState?.error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          <strong>Error:</strong> {reduxState.error}
        </div>
      )}
      <details style={{ marginTop: "10px" }}>
        <summary>Full State</summary>
        <pre style={{ fontSize: "10px", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(reduxState, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default DebugAppointments;
