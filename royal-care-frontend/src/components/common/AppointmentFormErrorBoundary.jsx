/**
 * Error Boundary for AppointmentForm with TanStack Query Integration
 * Provides graceful error handling and recovery mechanisms
 */

import React from "react";

class AppointmentFormErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error(
      "AppointmentForm Error Boundary caught an error:",
      error,
      errorInfo
    );

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    if (window.gtag) {
      window.gtag("event", "exception", {
        description: error.toString(),
        fatal: false,
      });
    }
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleClearCache = () => {
    // Clear TanStack Query cache to force fresh data
    if (this.props.queryClient) {
      this.props.queryClient.clear();
    }
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="appointment-form-error-boundary">
          <div className="error-container">
            <h2>⚠️ Something went wrong</h2>
            <p className="error-message">
              The appointment form encountered an unexpected error. This might
              be due to a network issue or temporary system problem.
            </p>

            <div className="error-actions">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
                type="button"
              >
                🔄 Try Again
              </button>

              <button
                onClick={this.handleClearCache}
                className="btn btn-secondary"
                type="button"
              >
                🧹 Clear Cache & Retry
              </button>

              {this.props.onCancel && (
                <button
                  onClick={this.props.onCancel}
                  className="btn btn-link"
                  type="button"
                >
                  ← Go Back
                </button>
              )}
            </div>

            {import.meta.env && import.meta.env.MODE === "development" && (
              <details className="error-details">
                <summary>Technical Details (Development Only)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>

                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>

                  <h4>Retry Count:</h4>
                  <p>{this.state.retryCount}</p>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppointmentFormErrorBoundary;
