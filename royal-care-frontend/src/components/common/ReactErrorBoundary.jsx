/**
 * React Error Recovery Component
 * Handles React version conflicts and provides recovery options
 */

import React from "react";

class ReactErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReactConflict: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Detect React version conflicts
    const isReactConflict =
      error?.message?.includes("Invalid hook call") ||
      error?.message?.includes("Cannot read properties of null") ||
      error?.message?.includes("useMemo") ||
      error?.stack?.includes("usePerformanceOptimization");

    return {
      hasError: true,
      error,
      isReactConflict,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ReactErrorBoundary caught error:", error);
    console.error("Error info:", errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Report to error tracking service if available
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        extra: { errorInfo },
      });
    }
  }

  handleRestart = () => {
    // Clear React-related cache
    try {
      // Clear module cache if available (development)
      if (window.__webpack_require__ && window.__webpack_require__.cache) {
        Object.keys(window.__webpack_require__.cache).forEach((key) => {
          if (key.includes("react") || key.includes("hook")) {
            delete window.__webpack_require__.cache[key];
          }
        });
      }

      // Clear any stored React instances
      delete window.React;
      delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

      // Force page reload
      window.location.reload();
    } catch (err) {
      console.error("Error during restart:", err);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isReactConflict) {
        return (
          <div
            style={{
              padding: "20px",
              margin: "20px",
              backgroundColor: "#fee",
              border: "2px solid #fcc",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#c30", marginBottom: "15px" }}>
              React Version Conflict Detected
            </h2>
            <p style={{ marginBottom: "15px" }}>
              Multiple React instances are causing hook call issues. This
              usually happens during development when hot reloading fails.
            </p>
            <div style={{ marginBottom: "15px" }}>
              <strong>Error:</strong> {this.state.error?.message}
            </div>
            <button
              onClick={this.handleRestart}
              style={{
                padding: "10px 20px",
                backgroundColor: "#007cba",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Restart Application
            </button>
            <div style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
              <details>
                <summary>Technical Details</summary>
                <pre
                  style={{
                    textAlign: "left",
                    backgroundColor: "#f5f5f5",
                    padding: "10px",
                    margin: "10px 0",
                    overflow: "auto",
                    fontSize: "12px",
                  }}
                >
                  {this.state.error?.stack}
                </pre>
              </details>
            </div>
          </div>
        );
      }

      // Generic error fallback
      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            backgroundColor: "#fef",
            border: "1px solid #ddd",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h2>Something went wrong</h2>
          <p>The application encountered an unexpected error.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007cba",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ReactErrorBoundary;
