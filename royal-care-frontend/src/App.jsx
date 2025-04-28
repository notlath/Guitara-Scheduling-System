// src/App.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/auth/Login";
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
          element={!user ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route path="/register" element={<Register />} />
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
