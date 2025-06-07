import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  // If no user is authenticated, redirect to login
  if (!user) {
    // Use replace to prevent infinite loops and preserve navigation history
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user has a valid role
  if (!user.role || !["operator", "therapist", "driver"].includes(user.role)) {
    // Clear invalid user data
    localStorage.removeItem("user");
    localStorage.removeItem("knoxToken");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
