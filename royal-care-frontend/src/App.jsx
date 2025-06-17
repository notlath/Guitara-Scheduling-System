import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
// Import debugger utilities for performance monitoring in development
import DriverDashboard from "./components/DriverDashboard";
import MainLayout from "./components/MainLayout";
import OperatorDashboard from "./components/OperatorDashboard";
import TherapistDashboard from "./components/TherapistDashboard";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RouteHandler from "./components/auth/RouteHandler";
import AvailabilityManager from "./components/scheduling/AvailabilityManager";
import { authInitialized, login } from "./features/auth/authSlice"; // Import new action
// Import performance optimization services
import TwoFAForgotPasswordPage from "./pages/2FAForgotPasswordPage/TwoFAForgotPasswordPage";
import CompanyInfoPage from "./pages/AboutPages/CompanyInfoPage";
import DeveloperInfoPage from "./pages/AboutPages/DeveloperInfoPage";
import SystemInfoPage from "./pages/AboutPages/SystemInfoPage";
import AttendancePage from "./pages/AttendancePage/AttendancePage";
import BookingsPage from "./pages/BookingsPage/BookingsPage";
import EnterNewPasswordPage from "./pages/EnterNewPasswordPage/EnterNewPasswordPage";
import ForgotPasswordConfirmationPage from "./pages/ForgotPasswordConfirmationPage/ForgotPasswordConfirmationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import FAQsPage from "./pages/HelpPages/FAQsPage";
import UserGuidePage from "./pages/HelpPages/UserGuidePage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import SalesReportsPage from "./pages/SalesReportsPage/SalesReportsPage";
import SchedulingPage from "./pages/SchedulingPage/SchedulingPage";
import SettingsAccountPage from "./pages/SettingsAccountPage/SettingsAccountPage";
import SettingsDataPage from "./pages/SettingsDataPage/SettingsDataPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import StaffAttendancePage from "./pages/StaffAttendancePage/StaffAttendancePage";
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage/TwoFactorAuthPage";
import { validateToken } from "./services/auth";
import cachePreloader from "./services/cachePreloader";
import crossTabSync from "./services/crossTabSync";
import memoryManager from "./services/memoryManager";
import "./utils/performanceTestSuite";
import { performServiceHealthCheck } from "./utils/serviceHealthCheck";

const App = () => {
  const { user } = useSelector((state) => state.auth);
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
        }

        // Debug what we imported
        console.log("Debug imports:", {
          memoryManager: typeof memoryManager,
          memoryManagerInit: typeof memoryManager?.initialize,
          crossTabSync: typeof crossTabSync,
          crossTabSyncInit: typeof crossTabSync?.initialize,
          cachePreloader: typeof cachePreloader,
          cachePreloaderPreload: typeof cachePreloader?.preloadCriticalData,
        });

        // Initialize memory manager
        if (memoryManager && typeof memoryManager.initialize === "function") {
          memoryManager.initialize();
          console.log("✅ Memory Manager initialized");
        } else {
          console.error(
            "❌ Memory Manager initialization failed - method not found",
            memoryManager
          );
        }

        // Initialize cross-tab synchronization
        if (crossTabSync && typeof crossTabSync.initialize === "function") {
          crossTabSync.initialize();
          console.log("✅ Cross-tab sync initialized");
        } else {
          console.error(
            "❌ Cross-tab sync initialization failed - method not found",
            crossTabSync
          );
        }

        // Initialize cache preloader and start critical data preloading
        if (user?.role) {
          await cachePreloader.preloadCriticalData(user.role);
          console.log("✅ Critical data preloaded for role:", user.role);
        } else {
          await cachePreloader.preloadCriticalData();
          console.log("✅ Basic critical data preloaded");
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
      {" "}
      <Routes>
        <Route path="/" element={<RouteHandler />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/2fa" element={<TwoFactorAuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/2fa-forgot-password"
          element={<TwoFAForgotPasswordPage />}
        />
        <Route path="/enter-new-password" element={<EnterNewPasswordPage />} />
        <Route
          path="/forgot-password-confirmation"
          element={<ForgotPasswordConfirmationPage />}
        />{" "}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout />
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
          />{" "}
          <Route path="scheduling" element={<SchedulingPage />} />
          <Route path="availability" element={<AvailabilityManager />} />{" "}
          <Route path="bookings" element={<BookingsPage />} />{" "}
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
          <Route path="profile" element={<ProfilePage />} />{" "}
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
          />
          {/* Help Pages */}
          <Route path="help">
            <Route path="user-guide" element={<UserGuidePage />} />
            <Route path="faqs" element={<FAQsPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>{" "}
          {/* About Pages */}{" "}
          <Route path="about">
            <Route path="company" element={<CompanyInfoPage />} />
            <Route path="system" element={<SystemInfoPage />} />
            <Route path="developers" element={<DeveloperInfoPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
