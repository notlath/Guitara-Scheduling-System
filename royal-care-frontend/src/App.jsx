// src/App.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Register from "./components/auth/Register";
import DriverDashboard from "./components/DriverDashboard";
import MainLayout from "./components/MainLayout";
import OperatorDashboard from "./components/OperatorDashboard";
import TherapistDashboard from "./components/TherapistDashboard";
import { login } from "./features/auth/authSlice"; // Import Redux action
import TwoFAForgotPasswordPage from "./pages/2FAForgotPasswordPage/TwoFAForgotPasswordPage";
import AttendancePage from "./pages/AttendancePage/AttendancePage";
import BookingsPage from "./pages/BookingsPage/BookingsPage";
import EnterNewPasswordPage from "./pages/EnterNewPasswordPage/EnterNewPasswordPage";
import ForgotPasswordConfirmationPage from "./pages/ForgotPasswordConfirmationPage/ForgotPasswordConfirmationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import InventoryPage from "./pages/InventoryPage/InventoryPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import SalesReportsPage from "./pages/SalesReportsPage/SalesReportsPage";
import SchedulingPage from "./pages/SchedulingPage";
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage/TwoFactorAuthPage";
import TestConnection from "./TestConnection";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

const App = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check if user data exists in localStorage and update Redux state
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      dispatch(login(JSON.parse(storedUser)));
    }
  }, [dispatch]);

  // Add debugging to check route matching
  useEffect(() => {
    if (window.location.pathname.includes("/dashboard/scheduling")) {
      console.log("Detected scheduling route:", window.location.pathname);
      console.log("SchedulingPage component is:", SchedulingPage);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/test" element={<TestConnection />} />
        <Route
          path="/"
          element={!user ? <LoginPage /> : <Navigate to="/dashboard" />}
        />
        <Route path="/register" element={<Register />} />
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
        <Route path="/dashboard" element={<MainLayout />}>
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
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="sales-reports" element={<SalesReportsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
