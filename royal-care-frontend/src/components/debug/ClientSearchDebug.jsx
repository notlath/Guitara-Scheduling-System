import axios from "axios";
import { useEffect, useState } from "react";
import { getBaseURL, getToken } from "../../utils/authUtils";

/**
 * Debug component to test client search functionality
 * Add this temporarily to help diagnose the search issue
 */
const ClientSearchDebug = () => {
  const [debugInfo, setDebugInfo] = useState({
    tokenStatus: null,
    apiResponse: null,
    error: null,
    searchTest: null,
  });

  useEffect(() => {
    const testClientSearch = async () => {
      console.log("🔧 ClientSearchDebug - Starting diagnostic test");

      // Check token
      const token = getToken();
      const tokenStatus = {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token?.substring(0, 10) + "...",
      };

      setDebugInfo((prev) => ({ ...prev, tokenStatus }));
      console.log("🔧 Token status:", tokenStatus);

      if (!token) {
        setDebugInfo((prev) => ({
          ...prev,
          error: "No authentication token found",
        }));
        return;
      }

      try {
        // Test API call
        const apiUrl = `${getBaseURL()}/registration/register/client/`;
        console.log("🔧 Making API call to:", apiUrl);

        const response = await axios.get(apiUrl, {
          headers: { Authorization: `Token ${token}` },
        });

        const apiResponse = {
          status: response.status,
          dataType: typeof response.data,
          totalClients:
            response.data?.results?.length ||
            (Array.isArray(response.data) ? response.data.length : 0),
          hasResults: !!response.data?.results,
          sampleClient:
            response.data?.results?.[0] || response.data?.[0] || null,
        };

        setDebugInfo((prev) => ({ ...prev, apiResponse }));
        console.log("🔧 API response:", apiResponse);

        // Test search for "jess"
        const clients = response.data?.results || response.data || [];
        const jessClients = clients.filter((client) => {
          const firstName = (client.first_name || "").toLowerCase();
          const lastName = (client.last_name || "").toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          return (
            fullName.includes("jess") ||
            firstName.includes("jess") ||
            lastName.includes("jess")
          );
        });

        const searchTest = {
          totalClients: clients.length,
          jessMatches: jessClients.length,
          jessClients: jessClients.map((c) => ({
            name: `${c.first_name || ""} ${c.last_name || ""}`,
            phone: c.phone_number,
            id: c.id,
          })),
        };

        setDebugInfo((prev) => ({ ...prev, searchTest }));
        console.log("🔧 Search test results:", searchTest);
      } catch (error) {
        console.error("🔧 API error:", error);
        setDebugInfo((prev) => ({
          ...prev,
          error: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          },
        }));
      }
    };

    testClientSearch();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "white",
        border: "2px solid #007bff",
        padding: "15px",
        borderRadius: "8px",
        zIndex: 9999,
        maxWidth: "400px",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      <h4 style={{ margin: "0 0 10px 0", color: "#007bff" }}>
        🔧 Client Search Debug
      </h4>

      <div>
        <strong>Token Status:</strong>
      </div>
      <pre>{JSON.stringify(debugInfo.tokenStatus, null, 2)}</pre>

      <div>
        <strong>API Response:</strong>
      </div>
      <pre>{JSON.stringify(debugInfo.apiResponse, null, 2)}</pre>

      <div>
        <strong>Search Test (Jess):</strong>
      </div>
      <pre>{JSON.stringify(debugInfo.searchTest, null, 2)}</pre>

      {debugInfo.error && (
        <>
          <div>
            <strong>Error:</strong>
          </div>
          <pre style={{ color: "red" }}>
            {JSON.stringify(debugInfo.error, null, 2)}
          </pre>
        </>
      )}

      <button
        onClick={() =>
          setDebugInfo({
            tokenStatus: null,
            apiResponse: null,
            error: null,
            searchTest: null,
          })
        }
        style={{ marginTop: "10px", padding: "5px 10px" }}
      >
        Clear Debug
      </button>
    </div>
  );
};

export default ClientSearchDebug;
