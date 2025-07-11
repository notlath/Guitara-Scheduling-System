import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import pageTitles from "../../constants/pageTitles";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import VerificationPageLayout from "../../components/common/VerificationPageLayout";

function TwoFactorAuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Get email from location state or from logged-in user
  const email = location.state?.email || user?.email;

  useEffect(() => {
    document.title = pageTitles.twoFactorAuth;

    // Debug: Log all available email sources
    console.log("[2FA] Debug info:", {
      locationStateEmail: location.state?.email,
      reduxUserEmail: user?.email,
      finalEmail: email,
      user: user,
    });

    // If no email is available from either source, redirect to login
    if (!email) {
      console.warn("[2FA] No email available, redirecting to login");
      navigate("/login");
      return;
    }
  }, [email, navigate, user, location.state?.email]);

  // Handle resend code
  const handleResendCode = useCallback(async (email) => {
    console.log("[2FA] Sending verification code to:", email);
    const response = await api.post("/auth/resend-2fa-code/", { email });
    console.log("[2FA] Response:", response.data);
    return response;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async ({ code, email }) => {
    console.log("[2FA] Submitting code:", code, "for email:", email);
    const response = await api.post("/auth/verify-2fa/", {
      email,
      code,
    });

    console.log("[2FA] Verification response:", response.data);

    if (response.data.token && response.data.user) {
      localStorage.setItem("knoxToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      dispatch(login(response.data.user));

      // Check if user was redirected from a specific page
      const from = location.state?.from?.pathname || "/dashboard";
      console.log("[2FA] Redirecting to:", from);
      navigate(from, { replace: true });
    }
  }, [dispatch, location.state?.from?.pathname, navigate]);

  // Handle errors
  const handleError = useCallback((error) => {
    console.error("[2FA] Error:", error);
  }, []);

  // Don't render if no email
  if (!email) {
    return null;
  }

  return (
    <VerificationPageLayout
      header="Two-Factor Authentication"
      email={email}
      onSubmit={handleSubmit}
      onResendCode={handleResendCode}
      emailInfoText="Please enter the 6-digit code below to complete your login"
      successMessagePrefix="Two-factor authentication code sent to"
      onError={handleError}
      backLink={{ href: "/login", text: "← Back to login" }}
    />
  );
}

export default TwoFactorAuthPage;
