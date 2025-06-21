/**
 * TanStack Query Dashboard Integration Test
 *
 * This test verifies that the dashboard is properly fetching data
 * using TanStack Query and all required fields are available.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOperatorDashboardData } from "./royal-care-frontend/src/hooks/useDashboardQueries";

// Create a test component to verify the hook works
const DashboardDataTest = () => {
  const {
    // Primary data
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    attendanceRecords,

    // States
    loading,
    error,
    hasData,
    isRefetching,

    // Functions
    forceRefresh,
    refreshAppointments,
    refreshNotifications,
    refreshTodayData,

    // Enhanced features
    queryStates,
    dataSource,
  } = useOperatorDashboardData();

  console.log("🧪 Dashboard Data Test Results:", {
    // Data verification
    appointmentsCount: appointments?.length || 0,
    todayAppointmentsCount: todayAppointments?.length || 0,
    upcomingAppointmentsCount: upcomingAppointments?.length || 0,
    notificationsCount: notifications?.length || 0,
    attendanceCount: attendanceRecords?.length || 0,

    // State verification
    loading: !!loading,
    hasError: !!error,
    hasData: !!hasData,
    isRefetching: !!isRefetching,

    // Function verification
    hasForceRefresh: typeof forceRefresh === "function",
    hasRefreshAppointments: typeof refreshAppointments === "function",
    hasRefreshNotifications: typeof refreshNotifications === "function",
    hasRefreshTodayData: typeof refreshTodayData === "function",

    // Enhanced features
    dataSource,
    hasQueryStates: !!queryStates,

    // Compatibility check
    allRequiredFieldsPresent: !!(
      appointments !== undefined &&
      todayAppointments !== undefined &&
      upcomingAppointments !== undefined &&
      notifications !== undefined &&
      loading !== undefined &&
      error !== undefined &&
      hasData !== undefined &&
      forceRefresh !== undefined
    ),
  });

  return (
    <div className="dashboard-test">
      <h2>Dashboard Data Test</h2>

      <div className="test-section">
        <h3>Data Status</h3>
        <p>Loading: {loading ? "Yes" : "No"}</p>
        <p>Has Data: {hasData ? "Yes" : "No"}</p>
        <p>Error: {error ? error.message : "None"}</p>
        <p>Data Source: {dataSource}</p>
      </div>

      <div className="test-section">
        <h3>Data Counts</h3>
        <p>Appointments: {appointments?.length || 0}</p>
        <p>Today's Appointments: {todayAppointments?.length || 0}</p>
        <p>Upcoming Appointments: {upcomingAppointments?.length || 0}</p>
        <p>Notifications: {notifications?.length || 0}</p>
        <p>Attendance Records: {attendanceRecords?.length || 0}</p>
      </div>

      <div className="test-section">
        <h3>Actions</h3>
        <button onClick={forceRefresh}>Force Refresh All</button>
        <button onClick={refreshAppointments}>Refresh Appointments</button>
        <button onClick={refreshNotifications}>Refresh Notifications</button>
        <button onClick={refreshTodayData}>Refresh Today's Data</button>
      </div>

      {queryStates && (
        <div className="test-section">
          <h3>Query States</h3>
          <pre>{JSON.stringify(queryStates, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

// Test wrapper with QueryClient
const DashboardTest = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retry for testing
        staleTime: 0, // Always fetch fresh data in tests
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardDataTest />
    </QueryClientProvider>
  );
};

// Export test results validation
export const validateDashboardIntegration = (dashboardData) => {
  const requiredFields = [
    "appointments",
    "todayAppointments",
    "upcomingAppointments",
    "notifications",
    "loading",
    "error",
    "hasData",
    "forceRefresh",
  ];

  const missingFields = requiredFields.filter(
    (field) => dashboardData[field] === undefined
  );

  const results = {
    isValid: missingFields.length === 0,
    missingFields,
    hasData: !!(
      dashboardData.appointments?.length ||
      dashboardData.todayAppointments?.length ||
      dashboardData.notifications?.length
    ),
    functionsWork: typeof dashboardData.forceRefresh === "function",
    dataSource: dashboardData.dataSource,
    timestamp: new Date().toISOString(),
  };

  console.log("✅ Dashboard Integration Validation:", results);
  return results;
};

export default DashboardTest;
