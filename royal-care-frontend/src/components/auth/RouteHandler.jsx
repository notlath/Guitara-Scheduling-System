import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import LoginPage from "../../pages/LoginPage/LoginPage";

const RouteHandler = () => {
  const { user, isAuthLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  useEffect(() => {
    console.log("RouteHandler: Current location:", location.pathname);
    console.log("RouteHandler: User authenticated:", !!user);
    console.log("RouteHandler: Auth loading:", isAuthLoading);
    console.log("RouteHandler: Location state:", location.state);
  }, [location, user, isAuthLoading]);

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

  // If no user, show login page
  if (!user) {
    return <LoginPage />;
  }

  // Only handle redirects for authenticated users at the root path
  // This prevents redirects on page refresh
  if (location.pathname === "/") {
    // First check if there's a saved location to return to (from login redirect)
    const from = location.state?.from?.pathname;

    if (from && from !== "/" && from.startsWith("/dashboard")) {
      console.log("RouteHandler: Redirecting to saved location:", from);
      return <Navigate to={from} replace />;
    }

    // Default redirect based on user role for users coming to root
    let defaultPath = "/dashboard";

    if (user.role === "operator") {
      // Operators usually go to the main dashboard
      defaultPath = "/dashboard";
    } else if (user.role === "therapist" || user.role === "driver") {
      // Therapists and drivers typically use scheduling
      defaultPath = "/dashboard/scheduling";
    }

    console.log("RouteHandler: Redirecting to default path:", defaultPath);
    return <Navigate to={defaultPath} replace />;
  }

  // For any other path, this component should not be reached
  // This should only handle the root ("/") path
  console.log(
    "RouteHandler: Warning - accessed for non-root path:",
    location.pathname
  );
  return null;
};

export default RouteHandler;
