import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageTitles from "../../constants/pageTitles";
import { api } from "../../services/api";
import VerificationPageLayout from "../../components/common/VerificationPageLayout";

function TwoFAForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from location.state
  const email = location.state?.email;

  useEffect(() => {
    document.title = pageTitles.twoFAForgotPassword;
  }, []);

  // Redirect if no email is provided
  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // Handle resend code
  const handleResendCode = useCallback(async (email) => {
    const response = await api.post("/auth/resend-password-reset/", { email });
    return response;
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async ({ code, email }) => {
    // Verify the code with the backend
    await api.post("/auth/verify-password-reset-code/", { email, code });

    // If verification is successful, proceed to password reset
    navigate("/enter-new-password", { state: { email, code } });
  }, [navigate]);

  // Handle errors
  const handleError = useCallback((error) => {
    console.error("Password reset code verification failed:", error);
  }, []);

  // Don't render if no email
  if (!email) {
    return null;
  }

  return (
    <VerificationPageLayout
      header="Verify Your Password Reset Request"
      email={email}
      onSubmit={handleSubmit}
      onResendCode={handleResendCode}
      emailInfoText="Please enter the 6-digit code below to continue with your password reset"
      successMessagePrefix="Password reset code sent to"
      onError={handleError}
      initialTimer={15 * 60} // 15 minutes to match backend password reset expiration
      backLink={{ href: "/forgot-password", text: "← Back to forgot password" }}
    />
  );
}

export default TwoFAForgotPasswordPage;
