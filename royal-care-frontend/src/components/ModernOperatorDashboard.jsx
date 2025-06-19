import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useStableCallback } from "../hooks/usePerformanceOptimization";

// Import extracted components
import AppointmentManager from "./operator/components/AppointmentManager/AppointmentManager";
import CriticalAlertsPanel from "./operator/components/CriticalAlertsPanel";
import DriverCoordination from "./operator/components/DriverCoordination/DriverCoordination";
import PaymentHub from "./operator/components/PaymentHub/PaymentHub";
import StatusOverview from "./operator/components/StatusOverview";
import TimeoutMonitoring from "./operator/components/TimeoutMonitoring/TimeoutMonitoring";
import KeyboardShortcutsHelp from "./operator/components/KeyboardShortcutsHelp";
import { useOperatorData } from "./operator/hooks/useOperatorData";
import { useOperatorKeyboardShortcuts, useBulkOperations } from "./operator/hooks/useKeyboardShortcuts";

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

  // Bulk operations state
  const {
    selectedItems,
    selectAll,
    clearSelection,
    toggleSelection,
    getSelectedItems,
    executeBulkAction,
    bulkActionLoading,
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

  // Keyboard shortcut handlers
  const keyboardHandlers = useMemo(() => ({
    onSelectAll: () => selectAll(appointments || []),
    onClearSelection: clearSelection,
    onBulkApprove: () => handleBulkAction("approve"),
    onBulkCancel: () => handleBulkAction("cancel"),
    onOpenDriverAssignment: () => setView("driver-coordination"),
    onOpenPaymentModal: () => setView("payment-verification"),
    onRefreshData: refetch,
    onSwitchView: setView,
    onToggleSearch: () => setSearchVisible(prev => !prev),
    onExportData: () => handleBulkAction("export"),
  }), [appointments, selectAll, clearSelection, setView, refetch]);

  // Initialize keyboard shortcuts
  const { getActiveShortcuts } = useOperatorKeyboardShortcuts(keyboardHandlers);

  // Action handlers for appointment operations
  const handleAppointmentAction = useCallback(async (appointment, actionId) => {
    console.log("Appointment action:", actionId, appointment);
    // TODO: Implement specific appointment actions
    // This will be implemented with the useDriverAssignment and usePaymentProcessing hooks
  }, []);

  const handleBulkAction = useCallback(async (actionId, options = {}) => {
    console.log("Bulk action:", actionId, options);
    
    const selectedAppointments = getSelectedItems(appointments || []);
    if (selectedAppointments.length === 0) {
      return;
    }

    // Execute bulk action with loading state
    await executeBulkAction(actionId, selectedAppointments, async (items) => {
      // TODO: Implement actual bulk action logic
      console.log(`Executing ${actionId} on ${items.length} items`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger data refresh
      refetch();
    });
  }, [appointments, getSelectedItems, executeBulkAction, refetch]);

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
          console.log("Unknown quick action:", actionType);
      }
    },
    [setView]
  );

  // Toggle keyboard shortcuts help
  const toggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(prev => !prev);
  }, []);

  // Add help shortcut
  useState(() => {
    const handleHelpShortcut = (e) => {
      if ((e.key === "?" || (e.ctrlKey && e.key === "/")) && 
          e.target.tagName !== "INPUT" && 
          e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        toggleKeyboardHelp();
      }
    };

    document.addEventListener("keydown", handleHelpShortcut);
    return () => document.removeEventListener("keydown", handleHelpShortcut);
  }, [toggleKeyboardHelp]);

  // Tab configuration - streamlined for new dashboard
  const dashboardTabs = useMemo(() => [
    {
      id: "overview",
      label: "Overview",
      icon: "fas fa-tachometer-alt",
      badge: notifications?.length > 0 ? notifications.length : null,
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
      badge: overdueAppointments?.length > 0 ? overdueAppointments.length : null,
      urgent: overdueAppointments?.length > 0,
    },
  ], [appointments, notifications, pickupRequests, awaitingPaymentAppointments, overdueAppointments]);

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
            selectedAppointments={selectedItems}
            onAppointmentSelect={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            bulkActionLoading={bulkActionLoading}
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
            appointments={awaitingPaymentAppointments || []}
            onPaymentProcess={handleAppointmentAction}
            loading={loading.payments}
            selectedPayments={selectedItems}
            onPaymentSelect={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
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
            <p>Modern Interface - Phase 1</p>
          </div>
          <div className="header-actions">
            <button
              onClick={switchToLegacyDashboard}
              className="legacy-toggle-button"
              title="Switch to Legacy Dashboard"
            >
              <i className="fas fa-arrow-left"></i>
              Legacy Dashboard
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

        {/* Keyboard Shortcuts Help */}
        {showKeyboardHelp && (
          <KeyboardShortcutsHelp
            shortcuts={getActiveShortcuts()}
            onClose={toggleKeyboardHelp}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default ModernOperatorDashboard;
