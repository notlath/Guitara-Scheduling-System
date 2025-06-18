import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import LoginPage from "../../pages/LoginPage/LoginPage";

const RouteHandler = () => {
  const { user, isAuthLoading } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    console.log("RouteHandler: Current location:", location.pathname);
    console.log("RouteHandler: User authenticated:", !!user);
    console.log("RouteHandler: Auth loading:", isAuthLoading);
    console.log("RouteHandler: Location state:", location.state);
  }, [location, user, isAuthLoading]);

  // Use useEffect for navigation with guard to prevent infinite loops
  useEffect(() => {
    if (
      !isAuthLoading &&
      user &&
      location.pathname === "/" &&
      !hasNavigatedRef.current
    ) {
      // First check if there's a saved location to return to (from login redirect)
      const from = location.state?.from?.pathname;

      if (from && from !== "/" && from.startsWith("/dashboard")) {
        console.log("RouteHandler: Redirecting to saved location:", from);
        hasNavigatedRef.current = true;
        navigate(from, { replace: true });
        return;
      }

      // Default redirect based on user role for users coming to root
      let defaultPath = "/dashboard";

      if (user.role === "operator") {
        defaultPath = "/dashboard";
      } else if (user.role === "therapist") {
        defaultPath = "/dashboard";
      } else if (user.role === "driver") {
        defaultPath = "/dashboard";
      }

      console.log("RouteHandler: Redirecting to default path:", defaultPath);
      hasNavigatedRef.current = true;
      navigate(defaultPath, { replace: true });
    }
  }, [user, isAuthLoading, location.pathname, location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset navigation flag when location changes away from root
  useEffect(() => {
    if (location.pathname !== "/") {
      hasNavigatedRef.current = false;
    }
  }, [location.pathname]);

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

  // For non-root paths or after navigation, return null
  return null;
};

export default RouteHandler;
