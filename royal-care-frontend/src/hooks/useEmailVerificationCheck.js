import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Custom hook to check if user needs email verification
 * Redirects to /verify-email if user is logged in but email is not verified
 */
export const useEmailVerificationCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only check if user is authenticated and we have user data
    if (!isAuthenticated || !user) {
      return;
    }

    // Skip check if already on verification page or auth pages
    const exemptPaths = [
      "/verify-email",
      "/login",
      "/register",
      "/forgot-password",
    ];
    if (exemptPaths.some((path) => location.pathname.startsWith(path))) {
      return;
    }

    // Check if email verification is required
    if (user.email_verified === false) {
      console.log(
        "[EMAIL VERIFICATION] Redirecting unverified user to verification page"
      );
      navigate("/verify-email", {
        state: {
          email: user.email,
          from: location, // Remember where they were trying to go
        },
        replace: true,
      });
    }
  }, [isAuthenticated, user, location, navigate]);

  // Return verification status for components that need it
  return {
    isEmailVerified: user?.email_verified !== false,
    needsVerification: isAuthenticated && user?.email_verified === false,
  };
};
