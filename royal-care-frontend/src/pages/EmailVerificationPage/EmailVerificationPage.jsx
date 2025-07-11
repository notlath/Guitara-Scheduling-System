import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import VerificationPageLayout from "../../components/common/VerificationPageLayout";

function EmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Get email from location state (for new registrations) or from logged-in user
  const email = location.state?.email || user?.email;

  useEffect(() => {
    document.title = "Verify Email - Guitara Scheduling";

    // Debug: Log all available email sources
    console.log("[EMAIL VERIFICATION] Debug info:", {
      locationStateEmail: location.state?.email,
      reduxUserEmail: user?.email,
      finalEmail: email,
      user: user,
    });

    // If no email is available from either source, redirect to register
    if (!email) {
      console.warn(
        "[EMAIL VERIFICATION] No email available, redirecting to register"
      );
      navigate("/register");
      return;
    }
  }, [email, navigate, user, location.state?.email]);

  // Handle resend code
  const handleResendCode = useCallback(async (email) => {
    console.log("[EMAIL VERIFICATION] Sending verification code to:", email);
    const response = await api.post("/auth/resend-verification/", { email });
    console.log("[EMAIL VERIFICATION] Response:", response.data);
    return response;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async ({ code, email }) => {
    console.log(
      "[EMAIL VERIFICATION] Submitting code:",
      code,
      "for email:",
      email
    );
    const response = await api.post("/auth/verify-email/", {
      email,
      code,
    });

    console.log("[EMAIL VERIFICATION] Verification response:", response.data);

    if (response.data.token && response.data.user) {
      localStorage.setItem("knoxToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      dispatch(login(response.data.user));

      // Check if user was redirected from a specific page
      const from = location.state?.from?.pathname || "/dashboard";
      console.log("[EMAIL VERIFICATION] Redirecting to:", from);
      navigate(from, { replace: true });
    }
  }, [dispatch, location.state?.from?.pathname, navigate]);

  // Handle errors
  const handleError = useCallback((error) => {
    console.error("[EMAIL VERIFICATION] Error:", error);
  }, []);

  // Don't render if no email
  if (!email) {
    return null;
  }

  return (
    <VerificationPageLayout
      header="Verify Your Email Address"
      email={email}
      onSubmit={handleSubmit}
      onResendCode={handleResendCode}
      emailInfoText="Please enter the 6-digit code below to verify your email address"
      successMessagePrefix="Verification code sent to"
      initialTimer={15 * 60} // 15 minutes to match backend email verification expiration
      onError={handleError}
    />
  );
}

export default EmailVerificationPage;
