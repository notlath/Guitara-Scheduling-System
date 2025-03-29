// src/App.js
import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route } from "react-router-dom";
import Login from "./components/Login";
import OperatorDashboard from "./components/OperatorDashboard";

const App = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={!user ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={
            user?.role === "operator" ? (
              <OperatorDashboard />
            ) : user?.role === "therapist" ? (
              <TherapistDashboard />
            ) : (
              <DriverDashboard />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
