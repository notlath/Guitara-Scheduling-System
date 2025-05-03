// src/App.js
import "./App.css";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import TwoFactorAuthPage from "./pages/TwoFactorAuthPage/TwoFactorAuthPage";
import TwoFAForgotPasswordPage from "./pages/2FAForgotPasswordPage/TwoFAForgotPasswordPage";
import EnterNewPasswordPage from "./pages/EnterNewPasswordPage/EnterNewPasswordPage";
import ForgotPasswordConfirmationPage from "./pages/ForgotPasswordConfirmationPage/ForgotPasswordConfirmationPage";
import Register from "./components/auth/Register";
import DriverDashboard from "./components/DriverDashboard";
import OperatorDashboard from "./components/OperatorDashboard";
import TherapistDashboard from "./components/TherapistDashboard";
import { login } from "./features/auth/authSlice"; // Import Redux action
import TestConnection from "./TestConnection";

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
        />
        <Route
          path="/dashboard"
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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
