import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { user, isAuthLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show loading while authentication state is being determined
  if (isAuthLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

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

  // Check if user's email is verified
  if (!user.email_verified) {
    // Redirect unverified users to email verification page
    return (
      <Navigate
        to="/verify-email"
        state={{ email: user.email, from: location }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
