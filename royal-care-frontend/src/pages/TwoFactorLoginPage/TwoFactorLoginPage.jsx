import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import VerificationPageLayout from "../../components/common/VerificationPageLayout";
import pageTitles from "../../constants/pageTitles";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import { invalidateCacheAfterLogin } from "../../utils/authUtils";

function TwoFactorLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Set page title
  useEffect(() => {
    document.title = pageTitles.twoFactorAuth;
  }, []);

  // Get the username/email from the navigation state
  const { email, username } = location.state || {};

  // If no authentication data was passed, redirect back to login
  if (!email && !username) {
    navigate("/login", { replace: true });
    return null;
  }

  const userIdentifier = email || username;

  // Helper function to determine post-login redirect
  const getRedirectPath = (userRole) => {
    // Check if there's a saved location to return to
    const from = location.state?.from?.pathname;

    if (from && from !== "/" && from.startsWith("/dashboard")) {
      return from;
    }

    // Default redirect based on user role
    if (userRole === "operator") {
      return "/dashboard";
    } else if (userRole === "therapist") {
      return "/dashboard";
    } else if (userRole === "driver") {
      return "/dashboard";
    } else {
      return "/dashboard";
    }
  };

  const handleSubmit = async (code) => {
    try {
      const response = await api.post("/auth/two-factor-verify/", {
        email: userIdentifier,
        username: userIdentifier,
        code: code,
      });

      // On success, store token and user data
      localStorage.setItem("knoxToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      dispatch(login(response.data.user));

      // Invalidate cache after successful login
      await invalidateCacheAfterLogin(response.data.user.role);

      // Navigate to appropriate dashboard
      navigate(getRedirectPath(response.data.user.role));
    } catch (error) {
      console.error("2FA verification error:", error);
      throw new Error("Invalid verification code. Please try again.");
    }
  };

  const handleResendCode = async () => {
    try {
      // Resend the 2FA code by making a login request again
      await api.post("/auth/login/", {
        username: userIdentifier,
        password: location.state?.password || "", // If password was passed
      });
      return "A new verification code has been sent to your email.";
    } catch (error) {
      console.error("Failed to resend 2FA code:", error);
      throw new Error(
        "Failed to resend verification code. Please try logging in again."
      );
    }
  };

  const validateCode = (code) => {
    if (!code || code.trim() === "") {
      return "Please enter the verification code.";
    }
    if (code.length !== 6) {
      return "Verification code must be exactly 6 digits.";
    }
    if (!/^\d{6}$/.test(code)) {
      return "Verification code must contain only numbers.";
    }
    return null;
  };

  const handleError = (error) => {
    // Error handling is managed by VerificationPageLayout
    console.error("2FA verification error:", error);
  };

  return (
    <VerificationPageLayout
      header="Two-Factor Authentication"
      email={userIdentifier}
      emailInfoText="Please enter the 6-digit verification code sent to your email"
      codeLabel="Verification Code"
      submitButtonText="Verify & Log In"
      submitButtonLoadingText="Verifying..."
      resendButtonText="Resend Code"
      successMessagePrefix="New verification code sent to"
      backLink={{ href: "/", text: "← Back to login" }}
      onSubmit={handleSubmit}
      onResendCode={handleResendCode}
      validateCode={validateCode}
      onError={handleError}
      initialTimer={15 * 60} // 15 minutes
    />
  );
}

export default TwoFactorLoginPage;
