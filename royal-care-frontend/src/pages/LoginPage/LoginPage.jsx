import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../globals/theme.css";
import styles from "./LoginPage.module.css";

import { useDispatch } from "react-redux";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import DisabledAccountAlert from "../../components/auth/DisabledAccountAlert";
import pageTitles from "../../constants/pageTitles";
import { login } from "../../features/auth/authSlice";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import { api } from "../../services/api";
import { handleAuthError } from "../../utils/authErrorHandler";
import { invalidateCacheAfterLogin } from "../../utils/authUtils";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";

function LoginPage() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false); // Track 2FA state
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // Individual field errors
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const [showDisabledAlert, setShowDisabledAlert] = useState(false);
  const [disabledAccountInfo, setDisabledAccountInfo] = useState({
    type: "account",
    message: "",
    contactInfo: null,
  });
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to determine post-login redirect
  const getRedirectPath = (userRole) => {
    // Check if there's a saved location to return to
    const from = location.state?.from?.pathname;

    if (from && from !== "/" && from.startsWith("/dashboard")) {
      return from;
    } // Default redirect based on user role for new logins
    if (userRole === "operator") {
      return "/dashboard";
    } else if (userRole === "therapist") {
      return "/dashboard"; // Therapists use TherapistDashboard
    } else if (userRole === "driver") {
      return "/dashboard"; // Drivers use DriverDashboard
    } else {
      return "/dashboard"; // Default fallback
    }
  };

  useEffect(() => {
    document.title = pageTitles.login;

    // Clean up FIDO2 scripts when component unmounts
    return () => {
      cleanupFido2Script();
    };
  }, []); // Event handlers to update state on input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (needs2FA) {
      // For 2FA code, only allow numeric input and limit to 6 digits
      const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
      setVerificationCode(numericValue);

      // Clear field-specific error for 2FA code when user starts typing
      if (fieldErrors.verificationCode) {
        setFieldErrors({ ...fieldErrors, verificationCode: "" });
      }
    } else {
      setFormData({ ...formData, [name]: value }); // Capture username/password

      // Clear field-specific error when user starts typing
      if (fieldErrors[name]) {
        setFieldErrors({ ...fieldErrors, [name]: "" });
      }
    }

    // Clear general error when user starts typing
    if (error) {
      setError("");
    }
  };

  // Validation function for form inputs
  const validateForm = () => {
    const newFieldErrors = {};

    if (!needs2FA) {
      // Validate login form
      if (!formData.username || formData.username.trim() === "") {
        newFieldErrors.username = "This field is required";
      }

      if (!formData.password || formData.password.trim() === "") {
        newFieldErrors.password = "This field is required";
      }
    } else {
      // Validate 2FA form
      if (!verificationCode || verificationCode.trim() === "") {
        newFieldErrors.verificationCode = "Verification code is required";
      } else if (verificationCode.length !== 6) {
        newFieldErrors.verificationCode = "Verification code must be 6 digits";
      }
    }

    setFieldErrors(newFieldErrors);
    return Object.keys(newFieldErrors).length === 0;
  }; // Handle account re-enabled callback from DisabledAccountAlert
  const handleAccountReEnabled = () => {
    setShowDisabledAlert(false);
    setError("");
    setFieldErrors({}); // Clear field errors

    // Auto-trigger login attempt
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 500);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowFieldErrors(true); // Show all required field errors on submit

    // Validate form inputs
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }

    setIsLoading(true);
    setError(""); // Clear any previous errors
    setShowDisabledAlert(false); // Hide disabled alert

    try {
      if (!needs2FA) {
        // Initial login request using enhanced auth service
        let response;
        let errorHandled = false;
        try {
          response = await api.post("/auth/login/", formData);
        } catch (authError) {
          // Robust error handling using error code from backend (for thrown errors)
          console.log(
            "🔍 LOGIN ERROR DEBUG - Full authError object:",
            authError
          );

          const errorData = authError.response?.data;
          let errorCode = errorData?.error_code || errorData?.code;
          let backendError = errorData?.error || "";
          const status = authError.response?.status;

          console.log("🔍 LOGIN ERROR DEBUG - Extracted values:", {
            status,
            errorData,
            errorCode,
            backendError,
            fullResponse: authError.response,
          });

          // Debug logging to help diagnose issues
          console.log("Auth Error Debug:", {
            status,
            errorData,
            errorCode,
            backendError,
            rawResponse: authError.response,
          });

          // Handle Django REST Framework error format where errors might be nested
          if (!errorCode && errorData?.code && Array.isArray(errorData.code)) {
            errorCode = errorData.code[0];
          }
          if (
            !backendError &&
            errorData?.error &&
            Array.isArray(errorData.error)
          ) {
            backendError = errorData.error[0];
          }

          // PRIORITY: Handle email verification first before other errors
          if (errorCode === "EMAIL_NOT_VERIFIED") {
            console.log(
              "🚀 EMAIL_NOT_VERIFIED detected! Redirecting to verification page"
            );
            console.log(
              "🚀 Email for redirect:",
              errorData.email || formData.username
            );
            navigate("/verify-email", {
              state: { email: errorData.email || formData.username },
              replace: true,
            });
            setIsLoading(false);
            return;
          } else if (errorCode === "ACCOUNT_LOCKED") {
            setError(
              backendError ||
                "Your account has been temporarily locked due to multiple failed login attempts. Please wait 5 minutes before trying again."
            );
            errorHandled = true;
          } else if (errorCode === "ACCOUNT_DISABLED") {
            // Clear any stored authentication data to prevent infinite loops
            localStorage.removeItem("knoxToken");
            localStorage.removeItem("user");
            setDisabledAccountInfo({
              type: "account",
              message:
                backendError ||
                "Your account has been disabled. Please see your system administrator.",
              contactInfo: null,
            });
            setShowDisabledAlert(true);
            errorHandled = true;
          } else if (errorCode === "INVALID_LOGIN") {
            setError(backendError || "Incorrect username or password.");
            errorHandled = true;
          } else {
            // Fallback to previous logic or generic error
            const errorInfo = handleAuthError(authError);
            if (errorInfo.isDisabled && !errorInfo.isLocked) {
              localStorage.removeItem("knoxToken");
              localStorage.removeItem("user");
              setDisabledAccountInfo({
                type: errorInfo.accountType,
                message:
                  "Your account has been disabled. Please see your system administrator.",
                contactInfo: errorInfo.contactInfo,
              });
              setShowDisabledAlert(true);
              errorHandled = true;
            } else {
              setError(backendError || "Incorrect username or password.");
              errorHandled = true;
            }
          }
        }
        // If the API wrapper does not throw for error responses, check for error codes in the response
        if (
          !errorHandled &&
          response &&
          response.data &&
          (response.data.error_code || response.data.code)
        ) {
          const errorCode = response.data.error_code || response.data.code;
          const backendError = response.data.error || "";

          // PRIORITY: Handle email verification first
          if (errorCode === "EMAIL_NOT_VERIFIED") {
            console.log(
              "Email not verified (from response), redirecting to verification page"
            );
            navigate("/verify-email", {
              state: { email: response.data.email || formData.username },
              replace: true,
            });
            setIsLoading(false);
            return;
          } else if (errorCode === "ACCOUNT_LOCKED") {
            setError(
              backendError ||
                "Your account has been temporarily locked due to multiple failed login attempts. Please wait 5 minutes before trying again."
            );
            setIsLoading(false);
            return;
          } else if (errorCode === "ACCOUNT_DISABLED") {
            localStorage.removeItem("knoxToken");
            localStorage.removeItem("user");
            setDisabledAccountInfo({
              type: "account",
              message:
                backendError ||
                "Your account has been disabled. Please see your system administrator.",
              contactInfo: null,
            });
            setShowDisabledAlert(true);
            setIsLoading(false);
            return;
          } else if (errorCode === "INVALID_LOGIN") {
            setError(backendError || "Incorrect username or password.");
            setIsLoading(false);
            return;
          }
        }
        // If no error, proceed as normal
        if (
          response &&
          response.data &&
          response.data.message === "2FA code sent"
        ) {
          setNeeds2FA(true); // Show 2FA input
          setFieldErrors({}); // Clear previous field errors when switching to 2FA
          setShowFieldErrors(false); // Reset field errors display for 2FA step
        } else if (response && response.data && response.data.user) {
          // Handle non-2FA login (if allowed)
          localStorage.setItem("knoxToken", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          dispatch(login(response.data.user));

          // ✅ CRITICAL FIX: Invalidate all queries after successful login
          // This ensures fresh data is fetched for the new user
          await invalidateCacheAfterLogin(response.data.user.role);

          navigate(getRedirectPath(response.data.user.role));
        }
      } else {
        // Verify 2FA code
        const response = await api.post("/auth/two-factor-verify/", {
          email: formData.username, // could be email or username
          username: formData.username, // always include as username too
          code: verificationCode,
        }); // On success
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user));

        // ✅ CRITICAL FIX: Invalidate all queries after successful 2FA login
        // This ensures fresh data is fetched for the new user
        await invalidateCacheAfterLogin(response.data.user.role);

        navigate(getRedirectPath(response.data.user.role));
      }
    } catch (finalError) {
      // Handle 2FA verification errors and other uncaught errors
      console.log("Final catch block error:", finalError);

      if (needs2FA) {
        setError("Invalid code.");
      } else {
        // Check if this is an unhandled email verification error
        const errorData = finalError.response?.data;
        const errorCode = errorData?.error_code || errorData?.code;

        if (errorCode === "EMAIL_NOT_VERIFIED") {
          console.log(
            "Email not verified (in final catch), redirecting to verification page"
          );
          navigate("/verify-email", {
            state: { email: errorData.email || formData.username },
            replace: true,
          });
          setIsLoading(false);
          return;
        }

        setError("Incorrect username or password.");
      }
    }

    setIsLoading(false);
  };
  const handleContactSupport = () => {
    const accountInfo = disabledAccountInfo;
    const contactInfo = accountInfo.contactInfo || {
      email: "support@guitara.com",
    };
    const emailSubject = `Account Access Issue - ${accountInfo.type} Account`;
    const emailBody = `Hello,\n\nI am unable to access my ${accountInfo.type} account. The system shows that my account is disabled.\n\nUsername: ${formData.username}\nError Message: ${accountInfo.message}\n\nPlease assist me with reactivating my account.\n\nThank you.`;

    window.location.href = `mailto:${
      contactInfo.email
    }?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
      emailBody
    )}`;
  };
  const handleBackToHome = () => {
    // Clear any stored authentication data to prevent loops
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");

    // Clear component state
    setShowDisabledAlert(false);
    setError("");
    setFieldErrors({}); // Clear field errors
    setFormData({ username: "", password: "" });
    setNeeds2FA(false);
    setVerificationCode("");

    // Navigate to login page (which is home for non-authenticated users)
    navigate("/", { replace: true });
  };

  const header = "Good to See You!";
  const errorMessage = error ? (
    <p className={`${styles.errorMessage}`}>{error}</p>
  ) : null;
  const formFields = !needs2FA ? (
    <div className={styles.inputContainer}>
      <div className={styles.formGroup}>
        {" "}
        <FormField
          label="Email or Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          showError={showFieldErrors}
          inputProps={{
            placeholder: "Enter your email or username",
            className:
              "global-form-field-input " +
              (fieldErrors.username ? styles.inputError : ""),
          }}
        />
        {showFieldErrors && fieldErrors.username && (
          <div className="global-form-field-error">
            Please enter your email or username.
          </div>
        )}
      </div>
      <div className={styles.formGroup}>
        {" "}
        <FormField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          showError={showFieldErrors}
          inputProps={{
            placeholder: "Enter your password",
            className:
              "global-form-field-input " +
              (fieldErrors.password ? styles.inputError : ""),
          }}
        />
        {showFieldErrors && fieldErrors.password && (
          <div className="global-form-field-error">
            Please enter your password.
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className={styles.formGroup}>
      {" "}
      <FormField
        label="Two-Factor Authentication Code"
        name="verificationCode"
        value={verificationCode}
        onChange={handleChange}
        required
        showError={showFieldErrors}
        inputProps={{
          placeholder: "Enter the 6-digit code",
          maxLength: 6,
          className:
            "global-form-field-input " +
            (fieldErrors.verificationCode ? styles.inputError : ""),
        }}
      />
      {showFieldErrors && fieldErrors.verificationCode && (
        <div className="global-form-field-error">
          {verificationCode.length === 0
            ? "Please enter the 6-digit verification code."
            : "Verification code must be exactly 6 digits."}
        </div>
      )}
    </div>
  );

  const button = (
    <>
      <div className={styles.forgotPassword}>
        <a href="/forgot-password" className={styles.forgotPasswordLink}>
          Forgot your password?
        </a>
      </div>
      <button
        type="submit"
        className={`action-btn${isLoading ? " disabled" : ""}`}
        disabled={isLoading}
      >
        {needs2FA ? "Verify Code" : "Log In"}
      </button>
    </>
  );

  const links = (
    <>
      First time here? <a href="/register">Complete your registration.</a>
    </>
  );

  return (
    <div className={styles.loginContainer}>
      {showDisabledAlert && (
        <DisabledAccountAlert
          accountType={disabledAccountInfo.type}
          errorMessage={disabledAccountInfo.message}
          username={formData.username}
          showRetryOption={true}
          onContactSupport={handleContactSupport}
          onBackToHome={handleBackToHome}
          onAccountReEnabled={handleAccountReEnabled}
        />
      )}
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={`${styles.formSide} global-form-field-container`}>
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

export default LoginPage;
