import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const NotificationDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const testNotificationAPI = async () => {
    try {
      const token = localStorage.getItem("knoxToken");

      // Test multiple endpoints
      const baseURL = import.meta.env.PROD
        ? "https://charismatic-appreciation-production.up.railway.app/api"
        : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

      const endpoints = [
        `${baseURL}/scheduling/notifications/`,
        `${baseURL}/scheduling/notifications/debug_all/`,
      ];

      const results = {};

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();

          results[endpoint] = {
            status: response.status,
            ok: response.ok,
            data: data,
            notificationCount: Array.isArray(data)
              ? data.length
              : data?.notifications?.length || 0,
            error: !response.ok ? "Request failed" : null,
          };
        } catch (error) {
          results[endpoint] = {
            status: "ERROR",
            ok: false,
            data: null,
            notificationCount: 0,
            error: error.message,
          };
        }
      }

      setDebugData({
        user: {
          id: user?.id,
          username: user?.username,
          role: user?.role,
        },
        endpoints: results,
        timestamp: new Date().toISOString(),
      });

      console.log("🔍 Notification Debug Data:", {
        user: user?.role,
        results: results,
      });
    } catch (error) {
      setDebugData({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    if (user && isVisible) {
      testNotificationAPI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isVisible]);

  const debugStyle = {
    position: "fixed",
    top: "10px",
    right: "10px",
    zIndex: 9999,
    background: "#f0f0f0",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    fontFamily: "monospace",
    fontSize: "12px",
    maxWidth: "400px",
    maxHeight: "600px",
    overflow: "auto",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  };

  const buttonStyle = {
    position: "fixed",
    top: "10px",
    right: "10px",
    zIndex: 10000,
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "12px",
  };

  if (!isVisible) {
    return (
      <button style={buttonStyle} onClick={() => setIsVisible(true)}>
        🔧 Debug Notifications
      </button>
    );
  }

  return (
    <div style={debugStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "14px" }}>
          🔧 Notification Debug Info
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      </div>

      {!debugData ? (
        <div>Loading debug data...</div>
      ) : (
        <div>
          <div style={{ marginBottom: "10px" }}>
            <strong>User:</strong> {debugData.user?.username} (
            {debugData.user?.role})
          </div>

          {debugData.error ? (
            <div style={{ color: "red" }}>
              <strong>Error:</strong> {debugData.error}
            </div>
          ) : (
            <div>
              <strong>API Test Results:</strong>
              {Object.entries(debugData.endpoints || {}).map(
                ([endpoint, result]) => (
                  <div
                    key={endpoint}
                    style={{
                      margin: "10px 0",
                      padding: "8px",
                      background: result.ok ? "#d4edda" : "#f8d7da",
                      borderRadius: "4px",
                    }}
                  >
                    <div>
                      <strong>Endpoint:</strong> {endpoint.split("/").pop()}
                    </div>
                    <div>
                      <strong>Status:</strong> {result.status}{" "}
                      {result.ok ? "✅" : "❌"}
                    </div>
                    <div>
                      <strong>Notifications:</strong> {result.notificationCount}
                    </div>
                    {result.error && (
                      <div style={{ color: "red" }}>
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                    {result.data?.debug && (
                      <div>
                        <strong>Debug Mode:</strong> Active
                      </div>
                    )}
                    {result.data?.total_count !== undefined && (
                      <div>
                        <strong>Total in DB:</strong> {result.data.total_count}
                      </div>
                    )}
                    {result.data?.unread_count !== undefined && (
                      <div>
                        <strong>Unread:</strong> {result.data.unread_count}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          <div style={{ marginTop: "10px", fontSize: "10px", color: "#666" }}>
            Last updated: {new Date(debugData.timestamp).toLocaleTimeString()}
          </div>

          <button
            onClick={testNotificationAPI}
            style={{
              marginTop: "10px",
              padding: "4px 8px",
              fontSize: "11px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            Refresh Debug Data
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDebugger;
