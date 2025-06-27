import React, { useEffect, Suspense } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { useOptimizedSelector } from "./hooks/usePerformanceOptimization";
// WEBSOCKET CACHE SYNC: Import WebSocket cache synchronization hook
import { useAutoWebSocketCacheSync } from "./hooks/useWebSocketCacheSync";
// Import debugger utilities for performance monitoring in development
import DriverDashboard from "./components/DriverDashboard";
import MainLayout from "./components/MainLayout";
import OperatorDashboard from "./components/OperatorDashboard";
import TherapistDashboard from "./components/TherapistDashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteHandler from "./components/auth/RouteHandler";
import ReactErrorBoundary from "./components/common/ReactErrorBoundary";
import { AttendanceMemoProvider } from "./components/contexts/AttendanceContext";
const AvailabilityManager = React.lazy(() =>
  import("./components/scheduling/AvailabilityManager")
);
import { authInitialized, login } from "./features/auth/authSlice"; // Import new action
// Initialize service worker error suppression early
import "./utils/serviceWorkerErrorSuppression";

import TwoFAForgotPasswordPage from "./pages/2FAForgotPasswordPage/TwoFAForgotPasswordPage";

// Lazy load pages to enable code splitting and reduce initial bundle size
// This ensures CSS modules are only loaded when the page is actually accessed
const CompanyInfoPage = React.lazy(() =>
  import("./pages/AboutPages/CompanyInfoPage")
);
const DeveloperInfoPage = React.lazy(() =>
  import("./pages/AboutPages/DeveloperInfoPage")
);
const SystemInfoPage = React.lazy(() =>
  import("./pages/AboutPages/SystemInfoPage")
);
const AttendancePage = React.lazy(() =>
  import("./pages/AttendancePage/AttendancePage")
);
const BookingsPage = React.lazy(() =>
  import("./pages/BookingsPage/BookingsPage")
);
const ContactPage = React.lazy(() => import("./pages/ContactPage/ContactPage"));
const EnterNewPasswordPage = React.lazy(() =>
  import("./pages/EnterNewPasswordPage/EnterNewPasswordPage")
);
const FAQsPage = React.lazy(() => import("./pages/FAQsPage/FAQsPage"));
const ForgotPasswordConfirmationPage = React.lazy(() =>
  import(
    "./pages/ForgotPasswordConfirmationPage/ForgotPasswordConfirmationPage"
  )
);
const ForgotPasswordPage = React.lazy(() =>
  import("./pages/ForgotPasswordPage/ForgotPasswordPage")
);
const InventoryPage = React.lazy(() =>
  import("./pages/InventoryPage/InventoryPage")
);
const NotificationsPage = React.lazy(() =>
  import("./pages/NotificationsPage/NotificationsPage")
);
const ProfilePage = React.lazy(() => import("./pages/ProfilePage/ProfilePage"));
const RegisterPage = React.lazy(() =>
  import("./pages/RegisterPage/RegisterPage")
);
const SalesReportsPage = React.lazy(() =>
  import("./pages/SalesReportsPage/SalesReportsPage")
);
const SchedulingPage = React.lazy(() =>
  import("./pages/SchedulingPage/SchedulingPage")
);
const SettingsDataPage = React.lazy(() =>
  import("./pages/SettingsDataPage/SettingsDataPage")
);
const SettingsPage = React.lazy(() =>
  import("./pages/SettingsPage/SettingsPage")
);
const StaffAttendancePage = React.lazy(() =>
  import("./pages/StaffAttendancePage/StaffAttendancePage")
);
const TwoFactorAuthPage = React.lazy(() =>
  import("./pages/TwoFactorAuthPage/TwoFactorAuthPage")
);
const UserGuidePage = React.lazy(() =>
  import("./pages/UserGuidePage/UserGuidePage")
);
const LogsPage = React.lazy(() =>
  import("./pages/LogsPage/LogsPage")
);
import { validateToken } from "./services/auth";
import { cleanupInvalidTokens } from "./utils/tokenManager";
// import memoryManager from "./services/memoryManager"; // Removed - migrated to TanStack Query
import { initializePerformanceUtils } from "./utils/performanceTestSuite";
import { performServiceHealthCheck } from "./utils/serviceHealthCheck";

// Full-screen loading component for lazy-loaded pages
const LoadingOverlay = () => (
  <div className="loading-overlay">
    <div className="loading-overlay-spinner" />
    <div className="loading-overlay-text">Loading...</div>
  </div>
);

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

  // WEBSOCKET CACHE SYNC: Enable real-time cache synchronization
  useAutoWebSocketCacheSync();

  useEffect(() => {
    // Clean up any invalid tokens on app startup
    cleanupInvalidTokens();

    // Check if user data exists in localStorage and validate the token
    const checkStoredAuth = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("knoxToken");

      // Only proceed if both user data and token exist and are valid
      if (
        storedUser &&
        storedToken &&
        storedUser !== "undefined" &&
        storedToken !== "undefined"
      ) {
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
            console.log("Invalid user data in localStorage, clearing...");
            localStorage.removeItem("user");
            localStorage.removeItem("knoxToken");
            dispatch(authInitialized()); // Mark auth as initialized
          }
        } catch (error) {
          // Clear corrupted stored data or handle validation errors
          console.error("Error validating stored authentication:", error);
          console.log("Stored user data:", storedUser);
          console.log("Clearing corrupted authentication data...");
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
          tokenManager: "available",
        });

        // Cross-tab synchronization now handled by TanStack Query
        console.log(
          "✅ Cross-tab sync handled by TanStack Query automatically"
        );

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
          <Route
            path="/register"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <RegisterPage />
              </Suspense>
            }
          />
          <Route
            path="/2fa"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <TwoFactorAuthPage />
              </Suspense>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />
          <Route
            path="/2fa-forgot-password"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <TwoFAForgotPasswordPage />
              </Suspense>
            }
          />
          <Route
            path="/enter-new-password"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <EnterNewPasswordPage />
              </Suspense>
            }
          />
          <Route
            path="/forgot-password-confirmation"
            element={
              <Suspense fallback={<LoadingOverlay />}>
                <ForgotPasswordConfirmationPage />
              </Suspense>
            }
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
            <Route
              path="notifications"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <NotificationsPage />
                </Suspense>
              }
            />
            <Route
              path="scheduling"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <SchedulingPage />
                </Suspense>
              }
            />
            <Route
              path="availability"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <AvailabilityManager />
                </Suspense>
              }
            />
            <Route
              path="bookings"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <BookingsPage />
                </Suspense>
              }
            />
            <Route
              path="attendance"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Suspense fallback={<LoadingOverlay />}>
                    <StaffAttendancePage />
                  </Suspense>
                ) : (
                  <Suspense fallback={<LoadingOverlay />}>
                    <AttendancePage />
                  </Suspense>
                )
              }
            />
            <Route
              path="sales-reports"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Suspense fallback={<LoadingOverlay />}>
                    <SalesReportsPage />
                  </Suspense>
                )
              }
            />
            <Route
              path="inventory"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <InventoryPage />
                </Suspense>
              }
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<LoadingOverlay />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="data"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Suspense fallback={<LoadingOverlay />}>
                    <SettingsDataPage />
                  </Suspense>
                )
              }
            />
            <Route
              path="logs"
              element={
                user?.role === "therapist" || user?.role === "driver" ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Suspense fallback={<LoadingOverlay />}>
                    <LogsPage />
                  </Suspense>
                )
              }
            />
            <Route
              path="settings/data"
              element={<Navigate to="/dashboard/data" replace />} // Redirect old route
            />
            {/* Help Pages */}
            <Route path="help">
              <Route
                path="user-guide"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <UserGuidePage />
                  </Suspense>
                }
              />
              <Route
                path="faqs"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <FAQsPage />
                  </Suspense>
                }
              />
              <Route
                path="contact"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <ContactPage />
                  </Suspense>
                }
              />
            </Route>
            {/* About Pages */}
            <Route path="about">
              <Route
                path="company"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <CompanyInfoPage />
                  </Suspense>
                }
              />
              <Route
                path="system"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <SystemInfoPage />
                  </Suspense>
                }
              />
              <Route
                path="developers"
                element={
                  <Suspense fallback={<LoadingOverlay />}>
                    <DeveloperInfoPage />
                  </Suspense>
                }
              />
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
