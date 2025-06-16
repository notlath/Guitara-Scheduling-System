/**
 * Enhanced Therapist Dashboard with Performance Optimizations
 * Demonstrates integration of all performance optimization features
 */

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";

// Import performance optimization hooks
import { useOptimisticUpdates } from "../hooks/useOptimisticUpdates";
import { useProgressiveData } from "../hooks/useProgressiveData";
import { useSmartUX } from "../hooks/useSmartUX";

// Import services
import cachePreloader from "../services/cachePreloader";
import memoryManager from "../services/memoryManager";

// Import enhanced components
import AdaptiveLoadingIndicator from "./SmartLoadingStates";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";

// Import standard components
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useTherapistDashboardData } from "../hooks/useDashboardIntegration";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import { LoadingButton } from "./common/LoadingComponents";

// Import Redux actions
import { logout } from "../features/auth/authSlice";
import {
  rejectAppointment,
  startSession,
  therapistConfirm,
} from "../features/scheduling/schedulingSlice";

import "../styles/TherapistDashboard.css";

const EnhancedTherapistDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // Set up sync event handlers
  useSyncEventHandlers();

  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "today";

  // Local state
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    appointmentId: null,
  });
  const [buttonLoading, setButtonLoading] = useState({});

  // Smart UX detection for adaptive behavior
  const {
    uxState,
    performanceMetrics,
    shouldShowSkeletons,
    shouldPreloadAggressively,
    trackOperationPerformance,
  } = useSmartUX();

  // Enhanced data access with immediate display capabilities
  const {
    myAppointments,
    loading,
    isRefreshing,
    hasAnyData,
    isStaleData,
    error,
    refreshAppointments,
    refreshIfStale,
  } = useTherapistDashboardData();

  // Optimistic updates for appointment actions
  const {
    optimisticData: optimisticAppointments,
    updateOptimistic,
    rollbackOptimistic,
    commitOptimistic,
    isOptimistic,
  } = useOptimisticUpdates(myAppointments, "id");

  // Progressive data loading for detailed appointment info
  const {
    data: progressiveAppointments,
    isLoading: progressiveLoading,
    hasEssentialData,
    hasCompleteData,
    loadEssential,
    loadComplete,
  } = useProgressiveData("therapistAppointments", {
    essentialFields: ["id", "client_name", "date", "time", "status"],
    standardFields: ["services", "location", "notes"],
    completeFields: ["client_history", "therapist_notes", "payment_status"],
  });

  // Auto-refresh stale data in background
  useEffect(() => {
    if (isStaleData && hasAnyData) {
      console.log("🔄 Enhanced TherapistDashboard: Auto-refreshing stale data");
      refreshIfStale();
    }
  }, [isStaleData, hasAnyData, refreshIfStale]);

  // Preload data based on user behavior
  useEffect(() => {
    if (shouldPreloadAggressively && user?.role) {
      // Preload likely next routes
      cachePreloader.preloadRouteData("/dashboard/scheduling");
      cachePreloader.preloadRouteData("/dashboard/profile");
    }
  }, [shouldPreloadAggressively, user?.role]);

  // Memory management
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = memoryManager.getMemoryStats();
      if (stats.isHighUsage) {
        console.log("🧹 High memory usage detected, optimizing...");
        memoryManager.optimizeMemory();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper function to update view in URL
  const setView = useCallback(
    (newView) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("view", newView);
      setSearchParams(newSearchParams);

      // Preload data for the new view
      if (newView === "upcoming") {
        loadComplete(); // Load complete data for upcoming view
      } else {
        loadEssential(); // Load essential data for other views
      }
    },
    [searchParams, setSearchParams, loadComplete, loadEssential]
  );

  // Enhanced action handlers with optimistic updates
  const handleAcceptAppointment = useCallback(
    async (appointmentId) => {
      const actionKey = `accept_${appointmentId}`;
      const startTime = Date.now();

      try {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: true }));

        // Find the appointment to update
        const appointment = optimisticAppointments.find(
          (apt) => apt.id === appointmentId
        );
        if (!appointment) return;

        // Update optimistically
        const updatedAppointment = {
          ...appointment,
          status: "therapist_confirmed",
          confirmed_at: new Date().toISOString(),
        };

        updateOptimistic(appointmentId, updatedAppointment, "confirm");

        // Make the actual API call
        await dispatch(therapistConfirm(appointmentId)).unwrap();

        // Commit the optimistic update
        commitOptimistic(appointmentId);

        console.log(`✅ Appointment ${appointmentId} accepted successfully`);
      } catch (error) {
        console.error("Failed to accept appointment:", error);
        // Rollback optimistic update on failure
        rollbackOptimistic(appointmentId);
      } finally {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: false }));
        trackOperationPerformance(Date.now() - startTime);
      }
    },
    [
      optimisticAppointments,
      updateOptimistic,
      commitOptimistic,
      rollbackOptimistic,
      dispatch,
      trackOperationPerformance,
    ]
  );

  const handleRejectAppointment = useCallback(
    async (appointmentId, reason) => {
      const actionKey = `reject_${appointmentId}`;
      const startTime = Date.now();

      try {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: true }));

        // Find the appointment to update
        const appointment = optimisticAppointments.find(
          (apt) => apt.id === appointmentId
        );
        if (!appointment) return;

        // Update optimistically
        const updatedAppointment = {
          ...appointment,
          status: "rejected_by_therapist",
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
        };

        updateOptimistic(appointmentId, updatedAppointment, "reject");

        // Make the actual API call
        await dispatch(rejectAppointment({ appointmentId, reason })).unwrap();

        // Commit the optimistic update
        commitOptimistic(appointmentId);

        // Close modal
        setRejectionModal({ isOpen: false, appointmentId: null });

        console.log(`✅ Appointment ${appointmentId} rejected successfully`);
      } catch (error) {
        console.error("Failed to reject appointment:", error);
        // Rollback optimistic update on failure
        rollbackOptimistic(appointmentId);
      } finally {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: false }));
        trackOperationPerformance(Date.now() - startTime);
      }
    },
    [
      optimisticAppointments,
      updateOptimistic,
      commitOptimistic,
      rollbackOptimistic,
      dispatch,
      trackOperationPerformance,
    ]
  );

  const handleStartSession = useCallback(
    async (appointmentId) => {
      const actionKey = `start_${appointmentId}`;
      const startTime = Date.now();

      try {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: true }));

        const appointment = optimisticAppointments.find(
          (apt) => apt.id === appointmentId
        );
        if (!appointment) return;

        const updatedAppointment = {
          ...appointment,
          status: "in_session",
          session_start_time: new Date().toISOString(),
        };

        updateOptimistic(appointmentId, updatedAppointment, "start");

        await dispatch(startSession(appointmentId)).unwrap();
        commitOptimistic(appointmentId);
      } catch (error) {
        console.error("Failed to start session:", error);
        rollbackOptimistic(appointmentId);
      } finally {
        setButtonLoading((prev) => ({ ...prev, [actionKey]: false }));
        trackOperationPerformance(Date.now() - startTime);
      }
    },
    [
      optimisticAppointments,
      updateOptimistic,
      commitOptimistic,
      rollbackOptimistic,
      dispatch,
      trackOperationPerformance,
    ]
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }, [dispatch, navigate]);

  // Filter appointments based on view with progressive data
  const getFilteredAppointments = useCallback(() => {
    const appointments =
      progressiveAppointments.length > 0
        ? progressiveAppointments
        : optimisticAppointments;

    switch (currentView) {
      case "today":
        return appointments.filter((apt) => {
          const today = new Date().toDateString();
          const aptDate = new Date(apt.date).toDateString();
          return aptDate === today;
        });
      case "upcoming":
        return appointments.filter((apt) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return new Date(apt.date) >= tomorrow;
        });
      case "pending":
        return appointments.filter((apt) => apt.status === "pending");
      case "completed":
        return appointments.filter((apt) => apt.status === "completed");
      default:
        return appointments;
    }
  }, [currentView, progressiveAppointments, optimisticAppointments]);

  // Render appointment card with optimistic state indicators
  const renderAppointmentCard = useCallback(
    (appointment) => {
      const isOptimisticState = isOptimistic(appointment.id);
      const showCompleteData =
        hasCompleteData && progressiveAppointments.length > 0;

      return (
        <div
          key={appointment.id}
          className={`appointment-card ${
            isOptimisticState ? "optimistic-update" : ""
          }`}
        >
          {/* Essential data - always shown */}
          <div className="appointment-header">
            <h3>{appointment.client_name}</h3>
            <span className={`status-badge status-${appointment.status}`}>
              {appointment.status.replace("_", " ")}
            </span>
            {isOptimisticState && (
              <span className="optimistic-badge">Updating...</span>
            )}
          </div>

          <div className="appointment-details">
            <p>
              <strong>Date:</strong>{" "}
              {new Date(appointment.date).toLocaleDateString()}
            </p>
            <p>
              <strong>Time:</strong> {appointment.time}
            </p>

            {/* Standard data - shown when available */}
            {appointment.services && (
              <p>
                <strong>Services:</strong> {appointment.services}
              </p>
            )}
            {appointment.location && (
              <p>
                <strong>Location:</strong> {appointment.location}
              </p>
            )}

            {/* Complete data - shown when fully loaded */}
            {showCompleteData && appointment.client_history && (
              <div className="complete-data">
                <p>
                  <strong>Client History:</strong> {appointment.client_history}
                </p>
                {appointment.therapist_notes && (
                  <p>
                    <strong>Notes:</strong> {appointment.therapist_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="appointment-actions">
            {appointment.status === "pending" && (
              <>
                <LoadingButton
                  onClick={() => handleAcceptAppointment(appointment.id)}
                  loading={buttonLoading[`accept_${appointment.id}`]}
                  disabled={isOptimisticState}
                  className="btn-accept"
                >
                  Accept
                </LoadingButton>
                <LoadingButton
                  onClick={() =>
                    setRejectionModal({
                      isOpen: true,
                      appointmentId: appointment.id,
                    })
                  }
                  loading={buttonLoading[`reject_${appointment.id}`]}
                  disabled={isOptimisticState}
                  className="btn-reject"
                >
                  Reject
                </LoadingButton>
              </>
            )}

            {appointment.status === "therapist_confirmed" && (
              <LoadingButton
                onClick={() => handleStartSession(appointment.id)}
                loading={buttonLoading[`start_${appointment.id}`]}
                disabled={isOptimisticState}
                className="btn-start"
              >
                Start Session
              </LoadingButton>
            )}
          </div>
        </div>
      );
    },
    [
      isOptimistic,
      hasCompleteData,
      progressiveAppointments,
      buttonLoading,
      handleAcceptAppointment,
      handleStartSession,
    ]
  );

  const filteredAppointments = getFilteredAppointments();

  return (
    <PageLayout>
      {/* Adaptive loading indicator */}
      <AdaptiveLoadingIndicator
        show={loading && !hasAnyData}
        hasData={hasAnyData}
        isRefreshing={isRefreshing}
        context="dashboard"
        operation="Loading therapist dashboard"
        priority="high"
        userActivity={uxState.userActivity}
        connectionQuality={uxState.connectionQuality}
        devicePerformance={uxState.devicePerformance}
        onTimeout={() => console.log("Loading timeout detected")}
      />

      <div className="enhanced-therapist-dashboard">
        <LayoutRow title="Enhanced Therapist Dashboard">
          <div className="action-buttons">
            <p style={{ margin: 0 }}>
              Welcome, {user?.first_name} {user?.last_name}!
            </p>

            {/* Performance insights for development */}
            {typeof window !== "undefined" &&
              window.location.hostname === "localhost" && (
                <div className="performance-insights">
                  <small>
                    Conn: {uxState.connectionQuality} | Perf:{" "}
                    {uxState.devicePerformance} | Avg:{" "}
                    {Math.round(performanceMetrics.averageLoadTime)}ms
                  </small>
                </div>
              )}

            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>

        {/* Enhanced error handling */}
        {error && !hasAnyData && (
          <div className="error-message">
            <div>
              {typeof error === "object"
                ? error.message || error.error || "An error occurred"
                : error}
            </div>
            <button
              onClick={() => refreshAppointments(false)}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        )}

        {/* View tabs with preloading */}
        <TabSwitcher
          tabs={[
            { label: "Today", value: "today" },
            { label: "Upcoming", value: "upcoming" },
            { label: "Pending", value: "pending" },
            { label: "Completed", value: "completed" },
            { label: "All", value: "all" },
          ]}
          activeTab={currentView}
          onTabChange={setView}
        />

        {/* Progressive loading indicator */}
        {progressiveLoading && (
          <div className="progressive-loading">
            <MinimalLoadingIndicator
              show={true}
              hasData={hasEssentialData}
              isRefreshing={progressiveLoading}
              position="top-right"
              size="small"
              variant="subtle"
              tooltip="Loading complete appointment data..."
            />
          </div>
        )}

        {/* Data progress indicator */}
        {hasEssentialData && !hasCompleteData && (
          <div className="data-progress">
            <button
              onClick={loadComplete}
              className="load-complete-btn"
              disabled={progressiveLoading}
            >
              Load Complete Data
            </button>
          </div>
        )}

        {/* Appointments list */}
        <div className="appointments-section">
          {shouldShowSkeletons && loading && !hasAnyData ? (
            // Show skeletons on poor connections
            <div className="skeleton-appointments">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="appointment-skeleton">
                  <div className="skeleton-line skeleton-title"></div>
                  <div className="skeleton-line skeleton-text"></div>
                  <div className="skeleton-line skeleton-text"></div>
                </div>
              ))}
            </div>
          ) : filteredAppointments.length > 0 ? (
            <>
              <h3>
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}{" "}
                Appointments ({filteredAppointments.length})
              </h3>
              <div className="appointments-grid">
                {filteredAppointments.map(renderAppointmentCard)}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No {currentView} appointments</h3>
              <p>You have no appointments in this category.</p>
            </div>
          )}
        </div>

        {/* Background refresh indicator */}
        {isRefreshing && hasAnyData && (
          <MinimalLoadingIndicator
            show={true}
            hasData={true}
            isRefreshing={true}
            position="bottom-right"
            size="micro"
            variant={isStaleData ? "warning" : "ghost"}
            tooltip={
              isStaleData
                ? "Data may be outdated, refreshing..."
                : "Refreshing appointments in background..."
            }
          />
        )}
      </div>

      {/* Rejection Modal */}
      {rejectionModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject Appointment</h3>
            <p>Please provide a reason for rejecting this appointment:</p>
            <textarea
              placeholder="Enter rejection reason..."
              rows={3}
              className="rejection-textarea"
            />
            <div className="modal-actions">
              <button
                onClick={() =>
                  setRejectionModal({ isOpen: false, appointmentId: null })
                }
                className="btn-cancel"
              >
                Cancel
              </button>
              <LoadingButton
                onClick={() =>
                  handleRejectAppointment(
                    rejectionModal.appointmentId,
                    "User rejection"
                  )
                }
                loading={
                  buttonLoading[`reject_${rejectionModal.appointmentId}`]
                }
                className="btn-reject"
              >
                Reject Appointment
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default EnhancedTherapistDashboard;
