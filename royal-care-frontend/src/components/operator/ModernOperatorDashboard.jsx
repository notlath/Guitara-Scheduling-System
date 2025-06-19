/**
 * Modern Operator Dashboard - Main Component
 * Refactored from the monolithic OperatorDashboard component
 * Implements the new modular architecture with improved UX
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";

// Modern components
import AppointmentManager from "./components/AppointmentManager/AppointmentManager";
import BulkProgressTracker from "./components/BulkProgressTracker";
import CriticalAlertsPanel from "./components/CriticalAlertsPanel";
import DriverCoordination from "./components/DriverCoordination/DriverCoordination";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import NotificationDisplay from "./components/NotificationDisplay";
import PaymentHub from "./components/PaymentHub/PaymentHub";
import StatusOverview from "./components/StatusOverview";
import TimeoutMonitoring from "./components/TimeoutMonitoring/TimeoutMonitoring";

// Hooks
import useBulkOperations from "./hooks/useBulkOperations";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import useOperatorData from "./hooks/useOperatorData";
import useSmartNotifications from "./hooks/useSmartNotifications";

// Styles
import "./styles/ModernOperatorDashboard.css";

// Tab configuration
const DASHBOARD_TABS = [
  { id: "overview", label: "Overview", icon: "fas fa-tachometer-alt" },
  { id: "appointments", label: "Appointments", icon: "fas fa-calendar-alt" },
  { id: "drivers", label: "Drivers", icon: "fas fa-car" },
  { id: "payments", label: "Payments", icon: "fas fa-credit-card" },
  { id: "timeout", label: "Timeout Monitor", icon: "fas fa-clock" },
];

const ModernOperatorDashboard = () => {
  // Core data and state
  const {
    appointments,
    stats,
    criticalAlerts,
    loading,
    errors,
    refetchData,
    handleAppointmentAction,
    handleDriverAction,
    handlePaymentAction,
  } = useOperatorData();

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Notifications
  const { notifications, dismissNotification, handleNotificationAction } =
    useSmartNotifications();

  // Bulk operations
  const { bulkProgress, executeBulkOperation } = useBulkOperations();

  // Keyboard shortcuts
  const { registerShortcut, getActiveShortcuts } = useKeyboardShortcuts();

  // Setup keyboard shortcuts
  useEffect(() => {
    const shortcuts = [
      {
        key: "ctrl+1",
        action: () => setActiveTab("overview"),
        description: "Switch to Overview",
      },
      {
        key: "ctrl+2",
        action: () => setActiveTab("appointments"),
        description: "Switch to Appointments",
      },
      {
        key: "ctrl+3",
        action: () => setActiveTab("drivers"),
        description: "Switch to Drivers",
      },
      {
        key: "ctrl+4",
        action: () => setActiveTab("payments"),
        description: "Switch to Payments",
      },
      {
        key: "ctrl+5",
        action: () => setActiveTab("timeout"),
        description: "Switch to Timeout Monitor",
      },
      { key: "ctrl+r", action: refetchData, description: "Refresh Data" },
      {
        key: "ctrl+/",
        action: () => setShowKeyboardHelp(true),
        description: "Show Keyboard Shortcuts",
      },
      {
        key: "ctrl+b",
        action: () => setSidebarCollapsed(!sidebarCollapsed),
        description: "Toggle Sidebar",
      },
    ];

    shortcuts.forEach(({ key, action, description }) => {
      registerShortcut(key, action, description);
    });

    return () => {
      // Cleanup would be handled by the hook internally
    };
  }, [registerShortcut, refetchData, sidebarCollapsed]);

  // Handle tab changes
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Handle critical alert clicks
  const handleAlertClick = useCallback((alertId) => {
    switch (alertId) {
      case "overdue-appointments":
        setActiveTab("timeout");
        break;
      case "payment-pending":
        setActiveTab("payments");
        break;
      case "driver-shortage":
        setActiveTab("drivers");
        break;
      default:
        break;
    }
  }, []);

  // Handle bulk operations
  const handleBulkAction = useCallback(
    async (action, items, options = {}) => {
      await executeBulkOperation({
        action,
        items,
        options,
        onSuccess: (results) => {
          // Handle success
          console.log("Bulk operation completed:", results);
        },
        onError: (error) => {
          // Handle error
          console.error("Bulk operation failed:", error);
        },
      });
    },
    [executeBulkOperation]
  );

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <StatusOverview
            stats={stats}
            loading={loading.stats}
            onCardClick={handleAlertClick}
          />
        );

      case "appointments":
        return (
          <AppointmentManager
            appointments={appointments}
            loading={loading.appointments}
            onAppointmentAction={handleAppointmentAction}
            onBulkAction={handleBulkAction}
          />
        );

      case "drivers":
        return (
          <DriverCoordination
            onDriverAction={handleDriverAction}
            onBulkAction={handleBulkAction}
          />
        );

      case "payments":
        return (
          <PaymentHub
            onPaymentAction={handlePaymentAction}
            onBulkAction={handleBulkAction}
          />
        );

      case "timeout":
        return <TimeoutMonitoring onBulkAction={handleBulkAction} />;

      default:
        return (
          <div className="view-placeholder">
            <h3>View Not Found</h3>
            <p>The requested view is not available.</p>
          </div>
        );
    }
  };

  // Active bulk operations
  const activeBulkOperations = useMemo(() => {
    return Object.entries(bulkProgress).reduce((acc, [key, operation]) => {
      if (operation && operation.status === "running") {
        acc[key] = operation;
      }
      return acc;
    }, {});
  }, [bulkProgress]);

  return (
    <div className="operator-dashboard modern">
      <Helmet>
        <title>Operator Dashboard - Royal Care</title>
        <meta
          name="description"
          content="Modern operator dashboard for managing appointments, drivers, and payments"
        />
      </Helmet>

      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Operator Dashboard</h1>
          <p>Manage appointments, drivers, and payments efficiently</p>
        </div>
        <div className="header-actions">
          <button
            className="refresh-button"
            onClick={refetchData}
            disabled={loading.global}
            title="Refresh Data (Ctrl+R)"
          >
            <i
              className={`fas fa-sync-alt ${loading.global ? "fa-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            className="help-button"
            onClick={() => setShowKeyboardHelp(true)}
            title="Keyboard Shortcuts (Ctrl+/)"
          >
            <i className="fas fa-keyboard" />
          </button>
        </div>
      </header>

      {/* Critical Alerts Panel */}
      {criticalAlerts && criticalAlerts.length > 0 && (
        <section className="dashboard-alerts">
          <CriticalAlertsPanel
            alerts={criticalAlerts}
            onAlertClick={handleAlertClick}
          />
        </section>
      )}

      {/* Tab Navigation */}
      <nav className="tab-switcher">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
            title={`${tab.label} (Ctrl+${DASHBOARD_TABS.indexOf(tab) + 1})`}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {errors.global && (
          <div className="dashboard-errors">
            <div className="error-message">
              <strong>Error:</strong> {errors.global.message}
            </div>
          </div>
        )}

        {renderMainContent()}
      </main>

      {/* Bulk Operations Progress */}
      {Object.keys(activeBulkOperations).length > 0 && (
        <BulkProgressTracker
          operations={activeBulkOperations}
          onCancel={(operationId) => {
            // Handle cancellation
            console.log("Cancel operation:", operationId);
          }}
          onRetry={(operationId) => {
            // Handle retry
            console.log("Retry operation:", operationId);
          }}
          onViewDetails={(operationId) => {
            // Handle view details
            console.log("View details:", operationId);
          }}
        />
      )}

      {/* Notifications */}
      <NotificationDisplay
        notifications={notifications}
        onDismiss={dismissNotification}
        onAction={handleNotificationAction}
        position="top-right"
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={getActiveShortcuts()}
      />
    </div>
  );
};

export default ModernOperatorDashboard;
