import { useCallback, useEffect, useState } from "react";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import verificationStyles from "./VerificationPageLayout.module.css";

/**
 * Reusable verification page layout component
 * Provides consistent UI and functionality for all verification pages
 */
function VerificationPageLayout({
  // Required props
  header,
  email,
  onSubmit,
  onResendCode,
  
  // Optional props with defaults
  codeLabel = "Verification Code",
  emailInfoText = "Please enter the 6-digit code below to verify",
  successMessagePrefix = "Verification code sent to",
  resendButtonText = "Send New Code",
  submitButtonText = "Verify Code",
  submitButtonLoadingText = "Verifying...",
  backLink = null, // { href: "/login", text: "← Back to login" }
  
  // Validation and error handling
  validateCode = null,
  onError = null,
  
  // Initial timer value (in seconds)
  initialTimer = 15 * 60, // 15 minutes
  
  // Additional form fields (for pages that need more than just the code)
  additionalFields = null,
  
  // Custom styles
  containerClass = "",
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(initialTimer);

  // Handle resend code functionality
  const handleResendCode = useCallback(async () => {
    if (!email) {
      setSubmitError("No email address available");
      return;
    }

    setResendLoading(true);
    setResendMessage("");
    setSubmitError("");

    try {
      console.log(`[VERIFICATION] Sending code to: ${email}`);
      await onResendCode(email);
      setResendMessage(`${successMessagePrefix} ${email}`);
      setTimeRemaining(initialTimer); // Reset timer
    } catch (err) {
      console.error("[VERIFICATION] Failed to send code:", err);
      
      const errorMessage = err.response?.data?.error || 
                          err.message === "Network Error" || err.code === "ERR_NETWORK" ?
                          "Cannot connect to server. Please check your connection." :
                          "Failed to send verification code. Please try again.";
      
      setSubmitError(errorMessage);
      if (onError) onError(err);
    } finally {
      setResendLoading(false);
    }
  }, [email, onResendCode, successMessagePrefix, initialTimer, onError]);

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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setShowFieldErrors(true);
    setLoading(true);

    // Basic validation
    if (!code || code.length !== 6) {
      setLoading(false);
      return;
    }

    try {
      await onSubmit({ code, email });
    } catch (err) {
      console.error("[VERIFICATION] Submission failed:", err);
      setSubmitError(
        err.response?.data?.error ||
          "Verification failed. Please check your code and try again."
      );
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  // Default code validation
  const defaultValidateCode = (value, touched) => {
    if (!value || value.trim() === "") {
      return touched || showFieldErrors
        ? "Please enter the complete 6-digit verification code"
        : "";
    }

    if ((touched || showFieldErrors) && value.length !== 6) {
      return "Please enter the complete 6-digit verification code";
    }

    return "";
  };

  const formFields = (
    <div className={styles.formGroup}>
      <div className={verificationStyles.emailInfo}>
        {resendMessage ? (
          <p className={verificationStyles.successMessage}>{resendMessage}</p>
        ) : (
          <p className={verificationStyles.defaultMessage}>
            {successMessagePrefix} {email}
          </p>
        )}

        <p className={verificationStyles.emailInfoText}>
          {emailInfoText}
        </p>

        {timeRemaining > 0 ? (
          <div className={verificationStyles.timer}>
            Code expires in: {formatTime(timeRemaining)}
          </div>
        ) : (
          <div className={verificationStyles.timerExpired}>
            Code has expired. Please request a new one.
          </div>
        )}

        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendLoading}
          className={verificationStyles.resendButton}
        >
          {resendLoading ? "Sending..." : resendButtonText}
        </button>
      </div>

      {/* Additional fields if provided */}
      {additionalFields}

      <FormField
        label={codeLabel}
        name="verificationCode"
        value={code}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
          setCode(value);
        }}
        validate={validateCode || defaultValidateCode}
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

  const errorMessage = submitError ? (
    <div className={styles.errorText}>{submitError}</div>
  ) : null;

  const button = (
    <button
      type="submit"
      className={`action-btn ${loading ? "disabled" : ""}`}
      disabled={loading}
    >
      {loading ? submitButtonLoadingText : submitButtonText}
    </button>
  );

  const links = backLink ? (
    <div className={verificationStyles.registerLink}>
      <a href={backLink.href} className={verificationStyles.registerLinkAnchor}>
        {backLink.text}
      </a>
    </div>
  ) : null;

  return (
    <div className={`${styles.loginContainer} ${containerClass}`}>
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
        >
          {formFields}
        </FormBlueprint>
      </div>
    </div>
  );
}

export default VerificationPageLayout;
