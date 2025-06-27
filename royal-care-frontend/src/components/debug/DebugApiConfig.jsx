import { useEffect, useState } from "react";
import { api } from "../services/api";

const DebugApiConfig = () => {
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    // Get the current API configuration
    const baseURL = api.defaults.baseURL;
    const envVar = import.meta.env.VITE_API_BASE_URL;
    const mode = import.meta.env.MODE;

    setDebugInfo({
      baseURL,
      envVar,
      mode,
      isDev: import.meta.env.DEV,
      isProd: import.meta.env.PROD,
    });
  }, []);

  const testLoginEndpoint = async () => {
    try {
      console.log("Testing login endpoint...");
      const response = await api.post("/api/auth/login/", {
        username: "test",
        password: "test",
      });
      console.log("Response:", response);
    } catch (error) {
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        config: error.config,
        request: error.request?.responseURL,
        response: error.response,
      });
    }
  };

  if (!debugInfo) return <div>Loading debug info...</div>;

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "white",
        border: "1px solid #ccc",
        padding: "10px",
        maxWidth: "400px",
        fontSize: "12px",
        zIndex: 9999,
      }}
    >
      <h3>API Debug Info</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      <button onClick={testLoginEndpoint}>Test Login Endpoint</button>
    </div>
  );
};

export default DebugApiConfig;
