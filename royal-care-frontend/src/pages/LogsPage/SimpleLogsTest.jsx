import axios from "axios";
import { useEffect, useState } from "react";
import { getToken } from "../../utils/tokenManager";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const SimpleLogsTest = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("🚀 SimpleLogsTest component mounted!");

    const fetchLogs = async () => {
      try {
        console.log("📞 Making direct API call to logs...");
        const token = getToken();
        console.log("🔑 Token found:", !!token);
        console.log(
          "🔑 Token preview:",
          token ? token.substring(0, 20) + "..." : "NO TOKEN"
        );

        if (!token) {
          throw new Error("No authentication token found. Please log in.");
        }

        const response = await axios.get(
          "http://localhost:8000/api/system-logs/?log_type=authentication",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("✅ LOGS RESPONSE:", response.data);
        setLogs(response.data.results || response.data);
        setLoading(false);
      } catch (err) {
        console.error("❌ LOGS ERROR:", err);

        // Try with Token format if Bearer fails
        if (err.response?.status === 401) {
          try {
            const token = getToken();
            const response = await axios.get(
              "http://localhost:8000/api/system-logs/?log_type=authentication",
              {
                headers: {
                  Authorization: `Token ${token}`,
                },
              }
            );

            console.log("✅ LOGS RESPONSE (Token format):", response.data);
            setLogs(response.data.results || response.data);
            setLoading(false);
            return;
          } catch (retryErr) {
            console.error("❌ RETRY LOGS ERROR:", retryErr);
          }
        }

        setError(err.message);
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading)
    return (
      <div style={{ padding: "20px", fontSize: "18px" }}>Loading logs...</div>
    );
  if (error)
    return (
      <div style={{ padding: "20px", fontSize: "18px", color: "red" }}>
        Error: {error}
      </div>
    );

  return (
    <div style={{ padding: "20px" }}>
      <h1>Simple Logs Test</h1>
      <p>Found {logs.length} logs</p>
      <div>
        {logs.map((log, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #ccc",
              margin: "10px 0",
              padding: "10px",
            }}
          >
            <strong>Time:</strong> {log.timestamp}
            <br />
            <strong>Description:</strong> {log.description}
            <br />
            <strong>Type:</strong> {log.log_type}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleLogsTest;
