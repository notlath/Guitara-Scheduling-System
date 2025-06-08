import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications } from "../../features/scheduling/schedulingSlice";

const NotificationDebugTool = () => {
  const dispatch = useDispatch();
  const [debugInfo, setDebugInfo] = useState(null);
  const [manualFetch, setManualFetch] = useState(null);

  // Get Redux state
  const { notifications, unreadCount, notificationStatus, error } = useSelector(
    (state) => state.scheduling
  );

  const {
    user,
    token: authToken,
    isAuthenticated,
  } = useSelector((state) => state.auth);

  useEffect(() => {
    // Collect debug information
    const knoxToken = localStorage.getItem("knoxToken");
    const regularToken = localStorage.getItem("token");

    const debug = {
      redux: {
        notifications: notifications?.length || 0,
        unreadCount,
        status: notificationStatus,
        error: error,
      },
      auth: {
        isAuthenticated,
        user: user
          ? {
              id: user.id,
              username: user.username,
              role: user.role,
              email: user.email,
            }
          : null,
        hasAuthToken: !!authToken,
        authTokenPreview: authToken ? authToken.substring(0, 20) + "..." : null,
        hasKnoxToken: !!knoxToken,
        knoxTokenPreview: knoxToken ? knoxToken.substring(0, 20) + "..." : null,
      },
      browser: {
        localStorage: {
          knoxToken: knoxToken ? "exists" : "missing",
          token: regularToken ? "exists" : "missing",
          user: localStorage.getItem("user") ? "exists" : "missing",
        },
        actualTokens: {
          knoxTokenLength: knoxToken ? knoxToken.length : 0,
          regularTokenLength: regularToken ? regularToken.length : 0,
        },
      },
    };

    setDebugInfo(debug);
  }, [
    notifications,
    unreadCount,
    notificationStatus,
    error,
    user,
    authToken,
    isAuthenticated,
  ]);

  const handleManualFetch = async () => {
    console.log("Manual fetch triggered...");

    try {
      // Try manual API call with the correct token key
      const knoxToken = localStorage.getItem("knoxToken");
      if (!knoxToken) {
        setManualFetch({ error: "No knoxToken found in localStorage" });
        return;
      }

      const response = await fetch("/api/notifications/", {
        method: "GET",
        headers: {
          Authorization: `Token ${knoxToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setManualFetch({
        status: response.status,
        ok: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Also dispatch Redux action
      dispatch(fetchNotifications());
    } catch (error) {
      setManualFetch({ error: error.message });
    }
  };

  const handleClearState = () => {
    setManualFetch(null);
    setDebugInfo(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        width: "400px",
        maxHeight: "600px",
        overflow: "auto",
        backgroundColor: "white",
        border: "2px solid #333",
        borderRadius: "8px",
        padding: "15px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 9999,
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>
        🔍 Notification Debug Tool
      </h3>

      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={handleManualFetch}
          style={{
            marginRight: "10px",
            padding: "5px 10px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Manual Fetch
        </button>

        <button
          onClick={handleClearState}
          style={{
            padding: "5px 10px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      </div>

      {debugInfo && (
        <div style={{ marginBottom: "15px" }}>
          <h4 style={{ margin: "0 0 5px 0", color: "#007bff" }}>
            Redux State:
          </h4>
          <pre
            style={{
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "4px",
              margin: 0,
            }}
          >
            {JSON.stringify(debugInfo.redux, null, 2)}
          </pre>

          <h4 style={{ margin: "10px 0 5px 0", color: "#007bff" }}>
            Auth State:
          </h4>
          <pre
            style={{
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "4px",
              margin: 0,
            }}
          >
            {JSON.stringify(debugInfo.auth, null, 2)}
          </pre>

          <h4 style={{ margin: "10px 0 5px 0", color: "#007bff" }}>
            Browser Storage:
          </h4>
          <pre
            style={{
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "4px",
              margin: 0,
            }}
          >
            {JSON.stringify(debugInfo.browser, null, 2)}
          </pre>
        </div>
      )}

      {manualFetch && (
        <div>
          <h4 style={{ margin: "10px 0 5px 0", color: "#28a745" }}>
            Manual Fetch Result:
          </h4>
          <pre
            style={{
              backgroundColor: manualFetch.error ? "#f8d7da" : "#d4edda",
              padding: "8px",
              borderRadius: "4px",
              margin: 0,
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            {JSON.stringify(manualFetch, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default NotificationDebugTool;
