import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import pageTitles from "../../constants/pageTitles";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import { api } from "../../services/api";
import styles from "./TwoFAForgotPasswordPage.module.css";

function TwoFAForgotPasswordPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
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

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time remaining for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handle resend password reset code
  const handleResendCode = useCallback(async () => {
    if (!email) {
      setError("No email address available");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setError("");

    try {
      await api.post("/auth/resend-password-reset/", { email });
      setResendMessage(`Password reset code sent to ${email}`);
      setTimeRemaining(15 * 60); // Reset timer to 15 minutes
    } catch (err) {
      console.error("Failed to resend password reset code:", err);

      if (err.response?.status === 429) {
        setError("Please wait at least 1 minute before requesting a new code");
      } else {
        setError(
          err.response?.data?.error ||
            "Failed to send password reset code. Please try again."
        );
      }
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowFieldErrors(true);
    setLoading(true);

    // Validate code
    if (!code || code.length !== 6) {
      setLoading(false);
      return;
    }

    if (!email) {
      setError(
        "We couldn't find your email. Please restart the password reset process."
      );
      setLoading(false);
      return;
    }

    try {
      // Verify the code with the backend
      await api.post("/auth/verify-password-reset-code/", { email, code });

      // If verification is successful, proceed to password reset
      navigate("/enter-new-password", { state: { email, code } });
    } catch (err) {
      console.error("Password reset code verification failed:", err);
      setError(
        err.response?.data?.error ||
          "Invalid or expired code. Please check your code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const header = "Check Your Email for a Verification Code";
  const errorMessage = error ? (
    <div className={styles.errorText}>{error}</div>
  ) : null;

  const formFields = (
    <div className={styles.formGroup}>
      <div className={styles.emailInfo}>
        {resendMessage ? (
          <p className={styles.successMessage}>{resendMessage}</p>
        ) : (
          <p className={styles.defaultMessage}>
            Password reset code sent to {email}
          </p>
        )}

        <p className={styles.emailInfoText}>
          Please enter the 6-digit code below to reset your password
        </p>

        {timeRemaining > 0 ? (
          <div className={styles.timer}>
            Code expires in: {formatTime(timeRemaining)}
          </div>
        ) : (
          <div className={styles.timerExpired}>
            Code has expired. Please request a new one.
          </div>
        )}

        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendLoading}
          className={styles.resendButton}
        >
          {resendLoading ? "Sending..." : "Send New Code"}
        </button>
      </div>

      <FormField
        label="Verification Code"
        name="verificationCode"
        value={code}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
          setCode(value);
        }}
        validate={(value, touched) => {
          // Always check if empty when field has been interacted with
          if (!value || value.trim() === "") {
            return touched || showFieldErrors
              ? "Please enter the complete 6-digit verification code"
              : "";
          }

          // Only show length validation error when field has been blurred or form submitted
          if ((touched || showFieldErrors) && value.length !== 6) {
            return "Please enter the complete 6-digit verification code";
          }

          return "";
        }}
        showError={showFieldErrors}
        inputProps={{
          placeholder: "Enter 6-digit code",
          type: "text",
          maxLength: 6,
          autoComplete: "one-time-code",
        }}
      />
    </div>
  );

  const button = (
    <button type="submit" className="action-btn" disabled={loading}>
      {loading ? "Verifying..." : "Verify Code"}
    </button>
  );

  const links = (
    <div className={styles.registerLink}>
      <a href="/forgot-password" className={styles.registerLinkAnchor}>
        ← Back to forgot password
      </a>
    </div>
  );

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        <FormBlueprint
          header={header}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          button={button}
          links={links}
          formClass={styles.loginForm}
        >
          {formFields}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default TwoFAForgotPasswordPage;
