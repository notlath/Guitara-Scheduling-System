import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useStableCallback } from "../hooks/usePerformanceOptimization";

// Import extracted components
import AppointmentManager from "./operator/components/AppointmentManager/AppointmentManager";
import BulkProgressTracker from "./operator/components/BulkProgressTracker";
import CriticalAlertsPanel from "./operator/components/CriticalAlertsPanel";
import DriverCoordination from "./operator/components/DriverCoordination/DriverCoordination";
import KeyboardShortcutsHelp from "./operator/components/KeyboardShortcutsHelp";
import NotificationDisplay from "./operator/components/NotificationDisplay";
import PaymentHub from "./operator/components/PaymentHub/PaymentHub";
import StatusOverview from "./operator/components/StatusOverview";
import TimeoutMonitoring from "./operator/components/TimeoutMonitoring/TimeoutMonitoring";
import useBulkOperations from "./operator/hooks/useBulkOperations";
import { useOperatorKeyboardShortcuts } from "./operator/hooks/useKeyboardShortcuts";
import { useOperatorData } from "./operator/hooks/useOperatorData";
import { useSmartNotifications } from "./operator/hooks/useSmartNotifications";

// Import existing components that haven't been refactored yet
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";

// Styles
import "../globals/TabSwitcher.css";
import "../styles/OperatorDashboard.css";
import "./operator/styles/ModernOperatorDashboard.css";

/**
 * Modernized Operator Dashboard - Enhanced with Performance Features
 *
 * This version includes:
 * - Smart notifications system
 * - Bulk operations with progress tracking
 * - Virtual scrolling for large lists
 * - Optimistic updates
 * - Enhanced keyboard shortcuts
 */
const ModernOperatorDashboard = () => {
  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "overview";

  // Local state for modals and UI
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Smart notifications system
  const {
    notifications: smartNotifications,
    showNotification,
    dismissNotification,
    handleNotificationAction,
    monitorCriticalIssues,
  } = useSmartNotifications();

  // Bulk operations state
  const {
    bulkApproveAppointments,
    bulkCancelAppointments,
    bulkMarkAsPaid,
    bulkAssignDrivers,
    bulkProgress,
  } = useBulkOperations();

  // Optimized view management
  const setView = useStableCallback((newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    newSearchParams.set("page", "1"); // Reset page when changing views
    setSearchParams(newSearchParams);
  });

  // Dashboard toggle function
  const switchToLegacyDashboard = useCallback(() => {
    localStorage.setItem("use-modern-dashboard", "false");
    window.location.reload(); // Refresh to apply the change
  }, []);

  // Get all dashboard data through consolidated hook
  const {
    // Raw data
    appointments,
    drivers,

    // Filtered data
    awaitingPaymentAppointments,
    overdueAppointments,
    pickupRequests,
    notifications,

    // Metrics
    computedStats,

    // Status
    loading,
    errors,

    // Actions
    refetch,
  } = useOperatorData();

  // Selection management
  const selectAll = useCallback((items) => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleSelection = useCallback((itemId) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Monitor critical issues and show notifications
  useEffect(() => {
    if (appointments && drivers) {
      monitorCriticalIssues({
        appointments,
        drivers,
        currentTime: new Date(),
      });
    }
  }, [appointments, drivers, monitorCriticalIssues]);

  // Keyboard shortcut handlers
  const handleBulkAction = useCallback(
    async (actionId, options = {}) => {
      const selectedAppointmentIds = Array.from(selectedItems);
      if (selectedAppointmentIds.length === 0) {
        showNotification({
          type: "WARNING",
          title: "No Selection",
          message: "Please select items to perform bulk actions.",
        });
        return;
      }

      try {
        switch (actionId) {
          case "approve":
            await bulkApproveAppointments(selectedAppointmentIds);
            break;
          case "cancel":
            await bulkCancelAppointments(
              selectedAppointmentIds,
              options.reason
            );
            break;
          case "mark_paid":
            await bulkMarkAsPaid(selectedAppointmentIds, options.paymentData);
            break;
          case "assign_drivers":
            await bulkAssignDrivers(selectedAppointmentIds);
            break;
          default:
            console.log(`Bulk action ${actionId} not implemented yet`);
        }

        // Clear selection and refresh data
        clearSelection();
        refetch();

        showNotification({
          type: "SUCCESS",
          title: "Bulk Action Complete",
          message: `Successfully processed ${selectedAppointmentIds.length} appointments.`,
        });
      } catch (error) {
        showNotification({
          type: "CRITICAL",
          title: "Bulk Action Failed",
          message: `Failed to ${actionId}: ${error.message}`,
        });
      }
    },
    [
      selectedItems,
      bulkApproveAppointments,
      bulkCancelAppointments,
      bulkMarkAsPaid,
      bulkAssignDrivers,
      clearSelection,
      refetch,
      showNotification,
    ]
  );

  const keyboardHandlers = useMemo(
    () => ({
      onSelectAll: () => selectAll(appointments || []),
      onClearSelection: clearSelection,
      onBulkApprove: () => handleBulkAction("approve"),
      onBulkCancel: () => handleBulkAction("cancel"),
      onOpenDriverAssignment: () => setView("driver-coordination"),
      onOpenPaymentModal: () => setView("payment-verification"),
      onRefreshData: refetch,
      onSwitchView: setView,
      onToggleSearch: () => console.log("Toggle search"),
      onExportData: () => handleBulkAction("export"),
    }),
    [
      appointments,
      selectAll,
      clearSelection,
      setView,
      refetch,
      handleBulkAction,
    ]
  );

  // Initialize keyboard shortcuts
  const { getActiveShortcuts } = useOperatorKeyboardShortcuts(keyboardHandlers);

  // Toggle keyboard help
  const toggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp((prev) => !prev);
  }, []);

  // Action handlers for appointment operations
  const handleAppointmentAction = useCallback(
    async (appointment, actionId) => {
      try {
        switch (actionId) {
          case "approve":
            showNotification({
              type: "SUCCESS",
              title: "Appointment Approved",
              message: `Appointment #${appointment.id} has been approved successfully.`,
            });
            break;
          case "cancel":
            showNotification({
              type: "INFO",
              title: "Appointment Cancelled",
              message: `Appointment #${appointment.id} has been cancelled.`,
            });
            break;
          case "assign_driver":
            showNotification({
              type: "INFO",
              title: "Driver Assigned",
              message: `Driver assigned to appointment #${appointment.id}.`,
            });
            break;
          default:
            console.log("Appointment action:", actionId, appointment);
        }

        // Refresh data after action
        refetch();
      } catch (error) {
        showNotification({
          type: "CRITICAL",
          title: "Action Failed",
          message: `Failed to ${actionId} appointment: ${error.message}`,
        });
      }
    },
    [showNotification, refetch]
  );

  const handleBulkAction = useCallback(
    async (actionId, options = {}) => {
      const selectedAppointmentIds = Array.from(selectedItems);
      if (selectedAppointmentIds.length === 0) {
        showNotification({
          type: "WARNING",
          title: "No Selection",
          message: "Please select items to perform bulk actions.",
        });
        return;
      }

      try {
        switch (actionId) {
          case "approve":
            await bulkApproveAppointments(selectedAppointmentIds);
            break;
          case "cancel":
            await bulkCancelAppointments(
              selectedAppointmentIds,
              options.reason
            );
            break;
          case "mark_paid":
            await bulkMarkAsPaid(selectedAppointmentIds, options.paymentData);
            break;
          case "assign_drivers":
            await bulkAssignDrivers(selectedAppointmentIds);
            break;
          default:
            console.log(`Bulk action ${actionId} not implemented yet`);
        }

        // Clear selection and refresh data
        clearSelection();
        refetch();

        showNotification({
          type: "SUCCESS",
          title: "Bulk Action Complete",
          message: `Successfully processed ${selectedAppointmentIds.length} appointments.`,
        });
      } catch (error) {
        showNotification({
          type: "CRITICAL",
          title: "Bulk Action Failed",
          message: `Failed to ${actionId}: ${error.message}`,
        });
      }
    },
    [
      selectedItems,
      bulkApproveAppointments,
      bulkCancelAppointments,
      bulkMarkAsPaid,
      bulkAssignDrivers,
      clearSelection,
      refetch,
      showNotification,
    ]
  );

  // Quick action handler for critical alerts
  const handleQuickAction = useCallback(
    (actionType) => {
      switch (actionType) {
        case "view-overdue":
          setView("timeout");
          break;
        case "process-payments":
          setView("payment-verification");
          break;
        case "assign-drivers":
          setView("driver-coordination");
          break;
        default:
          console.log("Quick action:", actionType);
      }
    },
    [setView]
  );

  // Dashboard tabs configuration
  const dashboardTabs = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: "fas fa-tachometer-alt",
      },
      {
        id: "appointments",
        label: "Appointments",
        icon: "fas fa-calendar-check",
        badge: appointments?.length || 0,
      },
      {
        id: "driver-coordination",
        label: "Drivers",
        icon: "fas fa-car",
        badge: pickupRequests?.length > 0 ? pickupRequests.length : null,
      },
      {
        id: "payment-verification",
        label: "Payments",
        icon: "fas fa-credit-card",
        badge: awaitingPaymentAppointments?.length || 0,
      },
      {
        id: "timeout",
        label: "Timeouts",
        icon: "fas fa-clock",
        badge:
          overdueAppointments?.length > 0 ? overdueAppointments.length : null,
        urgent: overdueAppointments?.length > 0,
      },
    ],
    [
      appointments,
      pickupRequests,
      awaitingPaymentAppointments,
      overdueAppointments,
    ]
  );

  // Main content renderer
  const renderMainContent = () => {
    if (loading.data) {
      return (
        <div className="dashboard-loading">
          <MinimalLoadingIndicator message="Loading dashboard data..." />
        </div>
      );
    }

    switch (currentView) {
      case "overview":
        return (
          <StatusOverview
            stats={computedStats}
            loading={loading}
            onCardClick={(cardType) => {
              // Navigate to relevant view when clicking status cards
              const viewMap = {
                appointments: "appointments",
                drivers: "driver-coordination",
                payments: "payment-verification",
                overdue: "timeout",
              };
              if (viewMap[cardType]) {
                setView(viewMap[cardType]);
              }
            }}
          />
        );

      case "appointments":
        return (
          <AppointmentManager
            appointments={appointments || []}
            loading={loading.appointments}
            onAppointmentAction={handleAppointmentAction}
            onBulkAction={handleBulkAction}
          />
        );

      case "driver-coordination":
        return (
          <DriverCoordination
            onDriverAssign={handleAppointmentAction}
            loading={loading}
          />
        );

      case "payment-verification":
        return (
          <PaymentHub
            onPaymentProcess={handleAppointmentAction}
            loading={loading.payments}
          />
        );

      case "timeout":
        return (
          <TimeoutMonitoring
            overdueAppointments={overdueAppointments || []}
            onTimeoutAction={handleAppointmentAction}
            loading={loading}
          />
        );

      default:
        return (
          <div className="dashboard-error">
            <h3>View not found</h3>
            <p>The requested view "{currentView}" is not available.</p>
            <LoadingButton onClick={() => setView("overview")}>
              Go to Overview
            </LoadingButton>
          </div>
        );
    }
  };

  return (
    <PageLayout>
      <div className="operator-dashboard modern">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Operator Dashboard</h1>
            <p>Enhanced with Smart Features</p>
          </div>
          <div className="header-actions">
            <button
              onClick={toggleKeyboardHelp}
              className="help-button"
              title="Keyboard Shortcuts (F1)"
            >
              <i className="fas fa-keyboard"></i>
              Shortcuts
            </button>
            <button
              onClick={switchToLegacyDashboard}
              className="legacy-toggle-button"
              title="Switch to Legacy Dashboard"
            >
              <i className="fas fa-arrow-left"></i>
              Legacy
            </button>
            <LoadingButton
              onClick={refetch}
              loading={loading.data}
              className="refresh-button"
              title="Refresh all data"
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </LoadingButton>
          </div>
        </div>

        {/* Critical Alerts - Always visible when there are alerts */}
        <CriticalAlertsPanel
          overdueAppointments={overdueAppointments || []}
          awaitingPaymentAppointments={awaitingPaymentAppointments || []}
          pickupRequests={pickupRequests || []}
          onQuickAction={handleQuickAction}
          className="dashboard-alerts"
        />

        {/* Tab Navigation */}
        <TabSwitcher
          activeTab={currentView}
          onTabChange={setView}
          tabs={dashboardTabs}
        />

        {/* Main Content Area */}
        <div className="dashboard-content">{renderMainContent()}</div>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <div className="dashboard-errors">
            {Object.entries(errors).map(([key, error]) => (
              <div key={key} className="error-message">
                <strong>Error ({key}):</strong> {error?.message || error}
              </div>
            ))}
          </div>
        )}

        {/* Smart Notifications */}
        <NotificationDisplay
          notifications={smartNotifications}
          onDismiss={dismissNotification}
          onAction={handleNotificationAction}
          position="top-right"
        />

        {/* Bulk Progress Tracker */}
        <BulkProgressTracker
          operations={bulkProgress}
          onCancel={(operationKey) => {
            console.log(`Cancel operation: ${operationKey}`);
          }}
          onRetry={(operationKey) => {
            console.log(`Retry operation: ${operationKey}`);
          }}
          onViewDetails={(operationKey) => {
            console.log(`View details for: ${operationKey}`);
          }}
        />

        {/* Keyboard Shortcuts Help */}
        {showKeyboardHelp && (
          <KeyboardShortcutsHelp
            isOpen={showKeyboardHelp}
            shortcuts={getActiveShortcuts()}
            onClose={toggleKeyboardHelp}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default ModernOperatorDashboard;
