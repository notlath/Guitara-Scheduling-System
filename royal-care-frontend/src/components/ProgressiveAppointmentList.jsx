/**
 * Example component demonstrating progressive loading patterns
 * Shows how to implement skeleton loading while displaying cached data immediately
 */

import { useOptimisticLoading } from "../hooks/useImmediateData";
import { SkeletonLoader } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";

/**
 * Progressive appointment list component
 * Shows cached data immediately, then loads complete data
 */
const ProgressiveAppointmentList = ({
  componentName = "progressiveList",
  minimumFields = ["id", "client_name", "date", "time", "status"],
  showSkeletonRows = 3,
}) => {
  const {
    partialData,
    isPartialData,
    missingFields,
    isRefreshing,
    hasData,
    showLoading,
    isStale,
    error,
    refresh,
  } = useOptimisticLoading(componentName, "appointments", {
    minimumFields,
  });

  // Show skeleton only if no data available at all
  if (showLoading) {
    return (
      <div className="progressive-loading-container">
        <h3>Appointments</h3>
        <SkeletonLoader rows={showSkeletonRows} />
      </div>
    );
  }

  // Show error state only if no cached data available
  if (error && !hasData) {
    return (
      <div className="error-container">
        <h3>Appointments</h3>
        <div className="error-message">
          Failed to load appointments: {error.message}
          <button onClick={() => refresh()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="progressive-appointment-list">
      {/* Header with refresh indicator */}
      <div className="list-header">
        <h3>Appointments</h3>

        {/* Non-intrusive loading indicator */}
        <MinimalLoadingIndicator
          show={isRefreshing}
          hasData={hasData}
          isRefreshing={isRefreshing}
          position="inline"
          size="micro"
          variant={isStale ? "warning" : "ghost"}
          tooltip={
            isStale
              ? "Data may be outdated, refreshing..."
              : "Updating appointments..."
          }
          pulse={true}
          fadeIn={true}
        />

        {/* Show partial data indicator */}
        {isPartialData && missingFields.length > 0 && (
          <span
            className="partial-data-indicator"
            title={`Missing: ${missingFields.join(", ")}`}
          >
            📊 Partial data
          </span>
        )}
      </div>

      {/* Appointment list */}
      <div className="appointment-items">
        {Array.isArray(partialData) &&
          partialData.map((appointment) => (
            <div
              key={appointment.id}
              className={`appointment-item ${
                isPartialData ? "partial-data" : "complete-data"
              }`}
            >
              <div className="appointment-basic-info">
                <h4>{appointment.client_name || "Loading..."}</h4>
                <p>
                  {appointment.date} at {appointment.time}
                </p>
                <span className={`status ${appointment.status}`}>
                  {appointment.status}
                </span>
              </div>

              {/* Show additional details if available */}
              {!isPartialData && (
                <div className="appointment-details">
                  {appointment.therapist_name && (
                    <p>Therapist: {appointment.therapist_name}</p>
                  )}
                  {appointment.driver_name && (
                    <p>Driver: {appointment.driver_name}</p>
                  )}
                  {appointment.services && (
                    <p>Services: {appointment.services.join(", ")}</p>
                  )}
                </div>
              )}

              {/* Loading placeholder for missing data */}
              {isPartialData &&
                missingFields.some((field) =>
                  ["therapist_name", "driver_name", "services"].includes(field)
                ) && (
                  <div className="loading-details">
                    <SkeletonLoader lines={2} height="12px" />
                  </div>
                )}
            </div>
          ))}
      </div>

      {/* Empty state */}
      {hasData && partialData.length === 0 && (
        <div className="empty-state">
          <p>No appointments found</p>
        </div>
      )}

      {/* Debug info (only in development) */}
      {window.location.hostname === "localhost" && (
        <div
          className="debug-info"
          style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}
        >
          <details>
            <summary>Debug Info</summary>
            <p>Has Data: {hasData ? "Yes" : "No"}</p>
            <p>Is Partial: {isPartialData ? "Yes" : "No"}</p>
            <p>Missing Fields: {missingFields.join(", ") || "None"}</p>
            <p>Is Refreshing: {isRefreshing ? "Yes" : "No"}</p>
            <p>Is Stale: {isStale ? "Yes" : "No"}</p>
          </details>
        </div>
      )}
    </div>
  );
};

/**
 * Example usage in a dashboard component
 */
export const ExampleDashboardWithProgressiveLoading = () => {
  return (
    <div className="dashboard">
      <h1>My Dashboard</h1>

      {/* Progressive loading list */}
      <ProgressiveAppointmentList
        componentName="dashboardAppointments"
        minimumFields={["id", "client_name", "date", "time", "status"]}
        showSkeletonRows={5}
      />

      {/* Other dashboard components... */}
    </div>
  );
};

export default ProgressiveAppointmentList;
