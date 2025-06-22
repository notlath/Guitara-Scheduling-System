import React, { useEffect } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useOptimizedSelector } from "./hooks/usePerformanceOptimization";
// Import debugger utilities for performance monitoring in development
import DriverDashboard from "./components/DriverDashboard";
import MainLayout from "./components/MainLayout";
import OperatorDashboard from "./components/OperatorDashboard";
import TherapistDashboard from "./components/TherapistDashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteHandler from "./components/auth/RouteHandler";
import ReactErrorBoundary from "./components/common/ReactErrorBoundary";
import { AttendanceMemoProvider } from "./components/contexts/AttendanceContext";
import AvailabilityManager from "./components/scheduling/AvailabilityManager";
import { authInitialized, login } from "./features/auth/authSlice"; // Import new action
// Initialize service worker error suppression early
import "./utils/serviceWorkerErrorSuppression";
// Import performance optimization services
import TwoFAForgotPasswordPage from "./pages/2FAForgotPasswordPage/TwoFAForgotPasswordPage";
import CompanyInfoPage from "./pages/AboutPages/CompanyInfoPage";
import DeveloperInfoPage from "./pages/AboutPages/DeveloperInfoPage";
import SystemInfoPage from "./pages/AboutPages/SystemInfoPage";
import AttendancePage from "./pages/AttendancePage/AttendancePage";
import BookingsPage from "./pages/BookingsPage/BookingsPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import EnterNewPasswordPage from "./pages/EnterNewPasswordPage/EnterNewPasswordPage";
import FAQsPage from "./pages/FAQsPage/FAQsPage";
import ForgotPasswordConfirmationPage from "./pages/ForgotPasswordConfirmationPage/ForgotPasswordConfirmationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import NotificationsPage from "./pages/NotificationsPage/NotificationsPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import SalesReportsPage from "./pages/SalesReportsPage/SalesReportsPage";
import SchedulingPage from "./pages/SchedulingPage/SchedulingPage";
import SettingsAccountPage from "./pages/SettingsAccountPage/SettingsAccountPage";
import SettingsDataPage from "./pages/SettingsDataPage/SettingsDataPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import StaffAttendancePage from "./pages/StaffAttendancePage/StaffAttendancePage";
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage/TwoFactorAuthPage";
import UserGuidePage from "./pages/UserGuidePage/UserGuidePage";
import { validateToken } from "./services/auth";
import crossTabSync from "./services/crossTabSync"; // Migrated - now a stub that indicates TanStack Query handles this
// import memoryManager from "./services/memoryManager"; // Removed - migrated to TanStack Query
import { initializePerformanceUtils } from "./utils/performanceTestSuite";
import { performServiceHealthCheck } from "./utils/serviceHealthCheck";

// Error Boundary Component
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h1>Something went wrong</h1>
          <p>The application encountered an error. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe App Component
const SafeApp = () => {
  // Check if React hooks are properly available
  if (typeof useEffect !== "function" || typeof useDispatch !== "function") {
    console.error(
      "React hooks not available - possible React version mismatch"
    );
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Loading...</h1>
        <p>Initializing application...</p>
      </div>
    );
  }

  return <App />;
};

const App = () => {
  const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if user data exists in localStorage and validate the token
    const checkStoredAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("knoxToken");

      // Only proceed if both user data and token exist
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Validate if user object has required fields
          if (parsedUser && parsedUser.id && parsedUser.role) {
            try {
              // Try to validate the token with the backend
              const validation = await validateToken();

              if (validation.valid) {
                // Token and account are valid, restore session
                dispatch(login(parsedUser));
              } else if (validation.reason === "ACCOUNT_DISABLED") {
                // Account is disabled, clear stored data
                console.log("Account is disabled, clearing stored data");
                localStorage.removeItem("user");
                localStorage.removeItem("knoxToken");
                dispatch(authInitialized()); // Mark auth as initialized
              } else {
                // Other validation errors (network, endpoint not found, etc.)
                // Still restore session but log the issue
                console.log(
                  "Token validation failed:",
                  validation.reason,
                  "- restoring session anyway"
                );
                dispatch(login(parsedUser));
              }
            } catch (validationError) {
              // If validation fails due to network issues, still restore the session
              console.log(
                "Token validation error:",
                validationError,
                "- restoring session anyway"
              );
              dispatch(login(parsedUser));
            }
          } else {
            // Clear invalid stored data
            localStorage.removeItem("user");
            localStorage.removeItem("knoxToken");
            dispatch(authInitialized()); // Mark auth as initialized
          }
        } catch (error) {
          // Clear corrupted stored data or handle validation errors
          console.error("Error validating stored authentication:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("knoxToken");
          dispatch(authInitialized()); // Mark auth as initialized
        }
      } else {
        // No stored auth data
        dispatch(authInitialized()); // Mark auth as initialized
      }
    };

    checkStoredAuth();
  }, [dispatch]);

  // Initialize performance optimization services
  useEffect(() => {
    const initializePerformanceServices = async () => {
      try {
        console.log("🚀 Initializing performance optimization services...");

        // Perform service health check before initialization
        const healthCheck = performServiceHealthCheck();
        if (healthCheck.overall !== "healthy") {
          console.error(
            "⚠️ Service health check failed, proceeding with caution:",
            healthCheck
          );
        } // Debug what we imported
        console.log("Debug imports:", {
          crossTabSync: typeof crossTabSync,
          crossTabSyncInit: typeof crossTabSync?.initialize,
        });

        // Initialize cross-tab synchronization (now handled by TanStack Query)
        if (crossTabSync && typeof crossTabSync.initialize === "function") {
          crossTabSync.initialize();
          console.log(
            "✅ Cross-tab sync initialized (now handled by TanStack Query)"
          );
        } else {
          console.error(
            "❌ Cross-tab sync initialization failed - method not found",
            crossTabSync
          );
        }

        // Cache preloading now handled by TanStack Query automatically
        console.log(
          "✅ Data preloading handled by TanStack Query background fetching"
        );
        // TanStack Query handles intelligent caching and background data fetching
        // No manual preloading needed - data is fetched on-demand and cached automatically

        // Initialize performance test utilities after user is authenticated
        if (
          user?.role &&
          typeof window !== "undefined" &&
          window.location.hostname === "localhost"
        ) {
          initializePerformanceUtils();
          console.log("✅ Performance test utilities initialized");
        }

        console.log("🎉 All performance services initialized successfully");
      } catch (error) {
        console.error("❌ Error initializing performance services:", error);
      }
    };

    // Only initialize after authentication is complete
    if (user || localStorage.getItem("authInitialized")) {
      initializePerformanceServices();
    }
  }, [user]); // Re-run when user changes (login/logout)
  // Add debugging to check route matching
  useEffect(() => {
    if (window.location.pathname.includes("/dashboard/scheduling")) {
      console.log("Detected scheduling route:", window.location.pathname);
      console.log("SchedulingPage component is:", SchedulingPage);
    }
  }, []);
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<RouteHandler />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/2fa" element={<TwoFactorAuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/2fa-forgot-password"
            element={<TwoFAForgotPasswordPage />}
          />
          <Route
            path="/enter-new-password"
            element={<EnterNewPasswordPage />}
          />
          <Route
            path="/forgot-password-confirmation"
            element={<ForgotPasswordConfirmationPage />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AttendanceMemoProvider>
                  <MainLayout />
                </AttendanceMemoProvider>
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                user?.role === "operator" ? (
                  <OperatorDashboard />
                ) : user?.role === "therapist" ? (
                  <TherapistDashboard />
                ) : user?.role === "driver" ? (
                  <DriverDashboard />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="scheduling" element={<SchedulingPage />} />
            <Route path="availability" element={<AvailabilityManager />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route
              path="attendance"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <StaffAttendancePage />
                ) : (
                  <AttendancePage />
                )
              }
            />
            <Route
              path="sales-reports"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <SalesReportsPage />
                )
              }
            />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/account" element={<SettingsAccountPage />} />
            <Route
              path="settings/data"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <SettingsDataPage />
                )
              }
            />{" "}
            {/* Help Pages */}
            <Route path="help">
              <Route path="user-guide" element={<UserGuidePage />} />
              <Route path="faqs" element={<FAQsPage />} />
              <Route path="contact" element={<ContactPage />} />
            </Route>
            {/* About Pages */}
            <Route path="about">
              <Route path="company" element={<CompanyInfoPage />} />
              <Route path="system" element={<SystemInfoPage />} />
              <Route path="developers" element={<DeveloperInfoPage />} />{" "}
            </Route>
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// Export the safe version wrapped in error boundary
const AppWrapper = () => (
  <ReactErrorBoundary>
    <AppErrorBoundary>
      <SafeApp />
    </AppErrorBoundary>
  </ReactErrorBoundary>
);

export default AppWrapper;
