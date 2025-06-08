import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../globals/theme.css";
import styles from "./LoginPage.module.css";

import { useDispatch } from "react-redux";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";
import DisabledAccountAlert from "../../components/auth/DisabledAccountAlert";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import { handleAuthError } from "../../utils/authErrorHandler";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";
import { FormField } from "../../globals/FormField";

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
    document.title = "Royal Care";

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
        newFieldErrors.username = "Username is required";
      }

      if (!formData.password || formData.password.trim() === "") {
        newFieldErrors.password = "Password is required";
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
        try {
          const response = await api.post("/auth/login/", formData);
          if (response.data.message === "2FA code sent") {
            setNeeds2FA(true); // Show 2FA input
            setFieldErrors({}); // Clear previous field errors when switching to 2FA
          } else {
            // Handle non-2FA login (if allowed)
            localStorage.setItem("knoxToken", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            dispatch(login(response.data.user));
            navigate(getRedirectPath(response.data.user.role));
          }
        } catch (authError) {
          // Use enhanced error handling utility
          const errorInfo = handleAuthError(authError);

          if (errorInfo.isDisabled) {
            // Clear any stored authentication data to prevent infinite loops
            localStorage.removeItem("knoxToken");
            localStorage.removeItem("user");

            // Show disabled account alert with retry option for recently re-enabled accounts
            setDisabledAccountInfo({
              type: errorInfo.accountType,
              message: errorInfo.message,
              contactInfo: errorInfo.contactInfo,
            });
            setShowDisabledAlert(true);
          } else {
            // Show regular error message
            setError(errorInfo.message || "Login failed. Please try again.");
          }
        }
      } else {
        // Verify 2FA code
        const response = await api.post("/auth/two-factor-verify/", {
          email: formData.username, // Assuming username is email
          code: verificationCode,
        }); // On success
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user));
        navigate(getRedirectPath(response.data.user.role));
      }
    } catch (err) {
      // Handle 2FA verification errors
      if (needs2FA) {
        setError(err.response?.data?.error || "Invalid verification code");
      } else {
        setError(err.response?.data?.error || "An unexpected error occurred");
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
  return (
    <div className={styles.loginContainer}>
      {" "}
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
        <div className={styles.formContainer}>
          <div className={styles.logo}>
            <img src={rcLogo} alt="Royal Care Logo" />
          </div>
          <h2 className={styles.welcomeHeading}>Good to See You!</h2>
          {error && <p className={styles.errorMessage}>{error}</p>}
          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {" "}
            {!needs2FA ? (
              <div className={styles.inputContainer}>
                <div className={styles.formGroup}>
                  <FormField
                    name="username"
                    label="Username"
                    value={formData.username}
                    onChange={handleChange}
                    inputProps={{
                      placeholder: "Username",
                      className:
                        "global-form-field-input " +
                        (fieldErrors.username ? styles.inputError : ""),
                    }}
                  />
                  {fieldErrors.username && (
                    <div className={styles.fieldError}>
                      {fieldErrors.username}
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <FormField
                    name="password"
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    inputProps={{
                      placeholder: "Password",
                      className:
                        "global-form-field-input " +
                        (fieldErrors.password ? styles.inputError : ""),
                    }}
                  />
                  {fieldErrors.password && (
                    <div className={styles.fieldError}>
                      {fieldErrors.password}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.formGroup}>
                <FormField
                  name="verificationCode"
                  label="2FA Code"
                  value={verificationCode}
                  onChange={handleChange}
                  inputProps={{
                    placeholder: "Enter 6-digit code",
                    maxLength: 6,
                    className:
                      "global-form-field-input " +
                      (fieldErrors.verificationCode ? styles.inputError : ""),
                  }}
                />
                {fieldErrors.verificationCode && (
                  <div className={styles.fieldError}>
                    {fieldErrors.verificationCode}
                  </div>
                )}
              </div>
            )}
            <div className={styles.forgotPassword}>
              <a href="/forgot-password" className={styles.forgotPasswordLink}>
                Forgot password?
              </a>
            </div>
            <button
              type="submit"
              className={`action-btn${isLoading ? " disabled" : ""}`}
              disabled={isLoading}
            >
              {needs2FA ? "Verify Code" : "Login"}
            </button>
          </form>
          <div className={styles.registerLink}>
            Is this your first login?{" "}
            <a href="/register" className={styles.registerLinkAnchor}>
              Complete your registration
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
