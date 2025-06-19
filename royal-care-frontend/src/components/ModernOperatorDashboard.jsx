import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useStableCallback } from "../hooks/usePerformanceOptimization";

// Import extracted components
import AppointmentManager from "./operator/components/AppointmentManager/AppointmentManager";
import CriticalAlertsPanel from "./operator/components/CriticalAlertsPanel";
import DriverCoordination from "./operator/components/DriverCoordination/DriverCoordination";
import KeyboardShortcutsHelp from "./operator/components/KeyboardShortcutsHelp";
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
 * Modernized Operator Dashboard - Phase 1 of Refactoring
 *
 * This is a streamlined version that uses extracted components
 * and will gradually replace the monolithic OperatorDashboard.jsx
 */
const ModernOperatorDashboard = () => {
  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "overview";

  // Local state for modals and UI
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // Selection state for bulk operations
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
    executeBulkOperation,
    bulkApproveAppointments,
    bulkCancelAppointments,
    bulkMarkAsPaid,
    bulkAssignDrivers,
    bulkProgress,
    bulkErrors,
    getProgress,
    isOperationInProgress,
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

    // Filtered data
    filteredAppointments,

    // Computed stats
    computedStats,

    // Status
    loading,
    errors,

    // Actions
    refetch,
  } = useOperatorData();

  // Selection management functions
  const selectAll = useCallback((items = []) => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const toggleSelection = useCallback((itemId) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      return newSelection;
    });
  }, []);

  const selectItems = useCallback((itemIds) => {
    setSelectedItems(new Set(itemIds));
  }, []);

  // Keyboard shortcut handlers
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
      onToggleSearch: () => setSearchVisible((prev) => !prev),
      onExportData: () => handleBulkAction("export"),
    }),
    [appointments, selectAll, clearSelection, setView, refetch]
  );

  // Initialize keyboard shortcuts
  const { getActiveShortcuts } = useOperatorKeyboardShortcuts(keyboardHandlers);

  // Action handlers for appointment operations
  const handleAppointmentAction = useCallback(async (appointment, actionId) => {
    console.log("Appointment action:", actionId, appointment);
    // TODO: Implement specific appointment actions
    // This will be implemented with the useDriverAssignment and usePaymentProcessing hooks
  }, []);

  const handleBulkAction = useCallback(
    async (actionId, options = {}) => {
      const selectedIds = Array.from(selectedItems);

      if (selectedIds.length === 0) {
        showNotification({
          type: "WARNING",
          title: "No Items Selected",
          message: "Please select items before performing bulk actions.",
        });
        return;
      }

      const selectedAppointments = (appointments || []).filter((apt) =>
        selectedIds.includes(apt.id)
      );

      try {
        let result;
        switch (actionId) {
          case "approve":
            result = await bulkApproveAppointments(selectedAppointments);
            break;
          case "cancel":
            result = await bulkCancelAppointments(selectedAppointments);
            break;
          case "mark-paid":
            result = await bulkMarkAsPaid(selectedAppointments);
            break;
          case "assign-drivers":
            result = await bulkAssignDrivers(selectedAppointments, options);
            break;
          default:
            console.warn("Unknown bulk action:", actionId);
            return;
        }

        if (result.success.length > 0) {
          showNotification({
            type: "SUCCESS",
            title: "Bulk Operation Completed",
            message: `Successfully processed ${result.success.length} items.`,
          });
        }

        if (result.errors.length > 0) {
          showNotification({
            type: "WARNING",
            title: "Partial Success",
            message: `${result.errors.length} items failed to process.`,
          });
        }

        // Clear selection after successful operation
        clearSelection();

        // Refresh data
        refetch();
      } catch (error) {
        console.error("Bulk action failed:", error);
        showNotification({
          type: "CRITICAL",
          title: "Bulk Operation Failed",
          message: error.message || "An unexpected error occurred.",
        });
      }
    },
    [
      selectedItems,
      appointments,
      bulkApproveAppointments,
      bulkCancelAppointments,
      bulkMarkAsPaid,
      bulkAssignDrivers,
      showNotification,
      clearSelection,
      refetch,
    ]
  );

  // Tab configuration for different views
  const tabConfig = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: "fas fa-tachometer-alt",
        badge: computedStats?.criticalIssues || 0,
      },
      {
        id: "appointments",
        label: "Appointments",
        icon: "fas fa-calendar-check",
        badge: computedStats?.totalAppointments || 0,
      },
      {
        id: "payment-verification",
        label: "Payments",
        icon: "fas fa-credit-card",
        badge: computedStats?.awaitingPayment || 0,
      },
      {
        id: "driver-coordination",
        label: "Drivers",
        icon: "fas fa-car",
        badge: computedStats?.pendingPickups || 0,
      },
      {
        id: "timeout-monitoring",
        label: "Timeouts",
        icon: "fas fa-clock",
        badge: computedStats?.overdueCount || 0,
      },
    ],
    [computedStats]
  );

  // Helper function to render view content
  const renderViewContent = () => {
    const commonProps = {
      loading,
      onAction: handleAppointmentAction,
      selectedItems,
      onSelectionChange: setSelectedItems,
      onSelectAll: selectAll,
      onClearSelection: clearSelection,
      onItemSelect: toggleSelection,
    };

    switch (currentView) {
      case "overview":
        return (
          <>
            <StatusOverview
              stats={computedStats}
              loading={loading}
              onCardClick={(card) => setView(card.id)}
            />
            <CriticalAlertsPanel
              alerts={smartNotifications}
              onAlertClick={(alert) =>
                handleNotificationAction(alert.id, "view")
              }
              onQuickAction={(action) => handleBulkAction(action.id)}
            />
          </>
        );

      case "appointments":
        return (
          <AppointmentManager
            appointments={appointments || []}
            loading={loading}
            selectedAppointments={selectedItems}
            onAppointmentSelect={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onAppointmentAction={handleAppointmentAction}
            onBulkAction={handleBulkAction}
          />
        );

      case "payment-verification":
        return (
          <PaymentHub
            appointments={filteredAppointments?.awaitingPayment || []}
            loading={loading}
            selectedPayments={selectedItems}
            onPaymentSelect={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onPaymentAction={handleAppointmentAction}
            onBulkPaymentAction={handleBulkAction}
          />
        );

      case "driver-coordination":
        return (
          <DriverCoordination
            appointments={appointments || []}
            loading={loading}
            onDriverAction={handleAppointmentAction}
            onBulkDriverAction={handleBulkAction}
          />
        );

      case "timeout-monitoring":
        return (
          <TimeoutMonitoring
            appointments={filteredAppointments?.overdue || []}
            loading={loading}
            onTimeoutAction={handleAppointmentAction}
          />
        );

      default:
        return (
          <div className="error-state">
            <h3>Unknown View</h3>
            <p>The requested view "{currentView}" was not found.</p>
            <LoadingButton
              onClick={() => setView("overview")}
              className="btn-primary"
            >
              Return to Overview
            </LoadingButton>
          </div>
        );
    }
  };

  if (loading && !appointments) {
    return (
      <PageLayout title="Operator Dashboard" className="operator-dashboard">
        <MinimalLoadingIndicator message="Loading dashboard data..." />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Modern Operator Dashboard"
      className="operator-dashboard modern"
      headerActions={
        <div className="dashboard-header-actions">
          {/* Selection info */}
          {selectedItems.size > 0 && (
            <div className="selection-info">
              <span className="selection-count">
                {selectedItems.size} selected
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={clearSelection}
                title="Clear selection"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="quick-actions">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowKeyboardHelp(true)}
              title="Keyboard shortcuts (Press ? to open)"
            >
              <i className="fas fa-keyboard" />
            </button>

            <LoadingButton
              className="btn btn-sm btn-outline"
              onClick={refetch}
              loading={loading}
              title="Refresh data (Ctrl+R)"
            >
              <i className="fas fa-sync-alt" />
            </LoadingButton>

            <button
              className="btn btn-sm btn-secondary"
              onClick={switchToLegacyDashboard}
              title="Switch to legacy dashboard"
            >
              <i className="fas fa-arrow-left" />
              Legacy
            </button>
          </div>
        </div>
      }
    >
      {/* Tab Navigation */}
      <TabSwitcher
        tabs={tabConfig}
        activeTab={currentView}
        onTabChange={setView}
        className="operator-tabs"
      />

      {/* View Content */}
      <div className="dashboard-content">{renderViewContent()}</div>

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <KeyboardShortcutsHelp
          shortcuts={getActiveShortcuts()}
          onClose={() => setShowKeyboardHelp(false)}
        />
      )}
    </PageLayout>
  );
};

export default ModernOperatorDashboard;
