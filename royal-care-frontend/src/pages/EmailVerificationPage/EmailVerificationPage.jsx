import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import { login } from "../../features/auth/authSlice";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import { api } from "../../services/api";
import styles from "../LoginPage/LoginPage.module.css";
import verificationStyles from "./EmailVerificationPage.module.css";

function EmailVerificationPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [autoSent, setAutoSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Get email from location state (for new registrations) or from logged-in user
  const email = location.state?.email || user?.email;

  // Define handleResendCode function BEFORE useEffect
  const handleResendCode = useCallback(async () => {
    if (!email) {
      setError("No email address available");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setError("");

    try {
      console.log("[EMAIL VERIFICATION] Sending verification code to:", email);
      const response = await api.post("/auth/resend-verification/", { email });
      setResendMessage("New verification code sent to your email!");
      console.log("[EMAIL VERIFICATION] Response:", response.data);
    } catch (err) {
      console.error("[EMAIL VERIFICATION] Failed to send code:", err);
      console.error("[EMAIL VERIFICATION] Error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });

      if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
        setError(
          "Cannot connect to server. Make sure Django server is running on port 8000."
        );
      } else {
        setError(
          err.response?.data?.error ||
            "Failed to resend code. Please try again."
        );
      }
    } finally {
      setResendLoading(false);
    }
  }, [email]);

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

    // Auto-send verification code when page loads (only once)
    if (!autoSent && email) {
      console.log(
        "[EMAIL VERIFICATION] Auto-sending verification code to:",
        email
      );
      setAutoSent(true);
      handleResendCode();
    }
  }, [
    email,
    navigate,
    handleResendCode,
    autoSent,
    location.state?.email,
    user,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      setLoading(false);
      return;
    }

    try {
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
    } catch (err) {
      console.error("[EMAIL VERIFICATION] Verification failed:", err);
      setError(
        err.response?.data?.error || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const header = "Verify Your Email Address";

  const formFields = (
    <div className={styles.formGroup}>
      <div className={verificationStyles.emailInfo}>
        <p>We've sent a 6-digit verification code to:</p>
        <strong>{email}</strong>
        <p>Please enter the code below to verify your email address.</p>
      </div>
      <FormField
        label="Verification Code"
        name="verificationCode"
        value={code}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
          setCode(value);
          if (error) setError("");
        }}
        required
        inputProps={{
          placeholder: "Enter 6-digit code",
          className: `${styles.formInput} ${verificationStyles.codeInput}`,
          type: "text",
          maxLength: 6,
          autoComplete: "one-time-code",
        }}
      />
    </div>
  );

  const errorMessage = error ? (
    <div className={styles.errorText}>{error}</div>
  ) : null;

  const successMessage = resendMessage ? (
    <div className={styles.statusText}>{resendMessage}</div>
  ) : null;

  const button = (
    <button
      type="submit"
      className={`action-btn ${loading ? "disabled" : ""}`}
      disabled={loading}
    >
      {loading ? "Verifying..." : "Verify Email"}
    </button>
  );

  const additionalContent = (
    <div className={verificationStyles.resendSection}>
      <p>Didn't receive the code?</p>
      <button
        type="button"
        onClick={handleResendCode}
        disabled={resendLoading}
        className={verificationStyles.resendButton}
      >
        {resendLoading ? "Sending..." : "Resend Code"}
      </button>
    </div>
  );

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        {successMessage}
        <FormBlueprint
          header={header}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          button={button}
        >
          {formFields}
          {additionalContent}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default EmailVerificationPage;
