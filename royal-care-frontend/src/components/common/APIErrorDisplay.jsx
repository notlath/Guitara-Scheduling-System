import { MdError, MdRefresh, MdShield, MdWifi } from "react-icons/md";

const APIErrorDisplay = ({ error, onRetry }) => {
  // Determine error type and appropriate message
  const getErrorInfo = () => {
    const errorMessage =
      error?.message || error || "An unexpected error occurred";

    if (
      errorMessage.includes("blocked by client") ||
      errorMessage.includes("blocked by your browser")
    ) {
      return {
        type: "blocked",
        icon: <MdShield size={48} color="#ff6b35" />,
        title: "Request Blocked",
        message: "Your browser or an extension is blocking this request.",
        suggestions: [
          "Check your ad blocker settings (Brave Shields, uBlock Origin, etc.)",
          "Try disabling extensions temporarily",
          "Add this site to your allowlist",
          "Try using a different browser",
        ],
        canRetry: true,
      };
    }

    if (
      errorMessage.includes("Network Error") ||
      errorMessage.includes("connection")
    ) {
      return {
        type: "network",
        icon: <MdWifi size={48} color="#ff6b35" />,
        title: "Connection Problem",
        message: "Unable to connect to the server.",
        suggestions: [
          "Check your internet connection",
          "The server might be temporarily unavailable",
          "Try refreshing the page",
        ],
        canRetry: true,
      };
    }

    if (
      errorMessage.includes("session has expired") ||
      errorMessage.includes("Authentication")
    ) {
      return {
        type: "auth",
        icon: <MdError size={48} color="#dc3545" />,
        title: "Session Expired",
        message: "Your session has expired. Please log in again.",
        suggestions: [
          "Click the refresh button to try logging in again",
          "Close and reopen your browser if the problem persists",
        ],
        canRetry: false,
      };
    }

    // Default error
    return {
      type: "general",
      icon: <MdError size={48} color="#dc3545" />,
      title: "Error Loading Data",
      message: errorMessage,
      suggestions: [
        "Try refreshing the page",
        "If the problem persists, please contact support",
      ],
      canRetry: true,
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: "#f8f9fa",
        border: "1px solid #dee2e6",
        borderRadius: "8px",
        margin: "1rem 0",
        minHeight: "300px",
      }}
    >
      <div style={{ marginBottom: "1rem" }}>{errorInfo.icon}</div>

      <h3
        style={{
          color: "#495057",
          marginBottom: "0.5rem",
          fontSize: "1.25rem",
        }}
      >
        {errorInfo.title}
      </h3>

      <p
        style={{
          color: "#6c757d",
          marginBottom: "1rem",
          fontSize: "1rem",
          maxWidth: "400px",
        }}
      >
        {errorInfo.message}
      </p>

      {errorInfo.suggestions && errorInfo.suggestions.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            maxWidth: "500px",
          }}
        >
          <h4
            style={{
              color: "#495057",
              marginBottom: "0.5rem",
              fontSize: "1rem",
            }}
          >
            How to fix this:
          </h4>
          <ul
            style={{
              textAlign: "left",
              color: "#6c757d",
              fontSize: "0.9rem",
              paddingLeft: "1.5rem",
            }}
          >
            {errorInfo.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: "0.25rem" }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorInfo.canRetry && onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            transition: "background-color 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0056b3")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#007bff")}
        >
          <MdRefresh size={20} />
          Try Again
        </button>
      )}

      {errorInfo.type === "blocked" && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "#856404",
            maxWidth: "500px",
          }}
        >
          <strong>Brave Browser users:</strong> Click the Brave Shields icon in
          the address bar and disable "Block scripts" for this site.
        </div>
      )}
    </div>
  );
};

export default APIErrorDisplay;
