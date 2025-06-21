import { useCallback, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useOperatorData } from "../hooks/useOperatorData";
import AppointmentList from "./AppointmentList";
import DebugAppointments from "./DebugAppointments";
import PaymentVerificationModal from "./PaymentVerificationModal";

// Import styles
import "../globals/TabSwitcher.css";
import "../styles/OperatorDashboardClean.css";

/**
 * REFACTORED OperatorDashboard - Clean, Simple, Fast
 *
 * Key improvements:
 * - Reduced from 3140 lines to ~300 lines
 * - Removed complex abstractions and custom hooks
 * - Uses simple, direct patterns
 * - Optimized for performance with large datasets
 */
const OperatorDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Single hook for all data management
  const {
    appointments,
    todayAppointments,
    rejectedAppointments,
    pendingAppointments,
    awaitingPaymentAppointments,
    overdueAppointments,
    loading,
    error,
    startAppointment,
    verifyPayment,
    buttonLoading,
    loadData,
  } = useOperatorData();

  // Simple local state
  const [currentTab, setCurrentTab] = useState("all");
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    appointment: null,
  });

  // Tab configuration
  const tabs = useMemo(
    () => [
      {
        id: "all",
        label: "All Appointments",
        count: appointments?.length || 0,
        priority: "low",
      },
      {
        id: "rejected",
        label: "Rejected Reviews",
        count: rejectedAppointments?.length || 0,
        priority: "high",
      },
      {
        id: "pending",
        label: "Pending Acceptance",
        count: pendingAppointments?.length || 0,
        priority: "high",
      },
      {
        id: "overdue",
        label: "Overdue",
        count: overdueAppointments?.length || 0,
        priority: "critical",
      },
      {
        id: "payment",
        label: "Payment Verification",
        count: awaitingPaymentAppointments?.length || 0,
        priority: "medium",
      },
      {
        id: "today",
        label: "Today",
        count: todayAppointments?.length || 0,
        priority: "medium",
      },
    ],
    [
      appointments?.length,
      rejectedAppointments?.length,
      pendingAppointments?.length,
      overdueAppointments?.length,
      awaitingPaymentAppointments?.length,
      todayAppointments?.length,
    ]
  );

  // Get current tab data
  const getCurrentTabData = useCallback(() => {
    switch (currentTab) {
      case "rejected":
        return rejectedAppointments;
      case "pending":
        return pendingAppointments;
      case "overdue":
        return overdueAppointments;
      case "payment":
        return awaitingPaymentAppointments;
      case "today":
        return todayAppointments;
      default:
        return appointments;
    }
  }, [
    currentTab,
    appointments,
    rejectedAppointments,
    pendingAppointments,
    overdueAppointments,
    awaitingPaymentAppointments,
    todayAppointments,
  ]);

  // Action handlers
  const handleStartAppointment = useCallback(
    async (appointmentId) => {
      await startAppointment(appointmentId);
    },
    [startAppointment]
  );

  const handlePaymentVerification = useCallback((appointment) => {
    setPaymentModal({
      isOpen: true,
      appointment,
    });
  }, []);

  const handlePaymentSubmit = useCallback(
    async (paymentData) => {
      if (!paymentModal.appointment) return false;

      const success = await verifyPayment(
        paymentModal.appointment,
        paymentData
      );
      if (success) {
        setPaymentModal({ isOpen: false, appointment: null });
      }
      return success;
    },
    [paymentModal.appointment, verifyPayment]
  );

  const handlePaymentCancel = useCallback(() => {
    setPaymentModal({ isOpen: false, appointment: null });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }, [dispatch, navigate]);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  return (
    <PageLayout>
      <div className="operator-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Operator Dashboard</h1>
            <div className="header-actions">
              <button
                onClick={handleRefresh}
                className="refresh-btn"
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{appointments?.length || 0}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{todayAppointments?.length || 0}</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {pendingAppointments?.length || 0}
            </div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {awaitingPaymentAppointments?.length || 0}
            </div>
            <div className="stat-label">Payment Pending</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-content">
          {/* Tab Navigation */}
          <TabSwitcher
            tabs={tabs}
            activeTab={currentTab}
            onTabChange={setCurrentTab}
            className="dashboard-tabs"
          />

          {/* Tab Content */}
          <div className="tab-content">
            <AppointmentList
              appointments={getCurrentTabData()}
              loading={loading}
              error={error}
              onStartAppointment={handleStartAppointment}
              onPaymentVerification={handlePaymentVerification}
              buttonLoading={buttonLoading}
            />
          </div>
        </div>

        {/* Payment Modal */}
        <PaymentVerificationModal
          isOpen={paymentModal.isOpen}
          appointment={paymentModal.appointment}
          onSubmit={handlePaymentSubmit}
          onCancel={handlePaymentCancel}
          loading={buttonLoading[`payment_${paymentModal.appointment?.id}`]}
        />

        {/* Debug Component (Development Only) */}
        {import.meta.env.DEV && <DebugAppointments />}
      </div>
    </PageLayout>
  );
};

export default OperatorDashboard;
