import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../features/auth/authSlice";
import { api } from "../../services/api";
import { invalidateCacheAfterLogin } from "../../utils/authUtils";
import { sanitizeString } from "../../utils/sanitization";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";

const Login = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [verificationCode, setVerificationCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false); // Track 2FA state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Clean up any FIDO2 scripts when component unmounts
  useEffect(() => {
    return () => {
      cleanupFido2Script();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    let sanitizedValue;
    // Apply appropriate sanitization based on field type
    if (name === "password") {
      sanitizedValue = value; // Skip sanitization for passwords
    } else if (name === "username" && value.includes("@")) {
      // Special handling for username that might be an email
      sanitizedValue = value.replace(/<[^>]*>/g, ""); // Only remove HTML tags
    } else {
      sanitizedValue = sanitizeString(value);
    }

    if (needs2FA) {
      // Ensure code is numbers only and limit to 6 digits
      if (name === "verificationCode") {
        const cleanCode = value.replace(/[^\d]/g, "").slice(0, 6);
        setVerificationCode(cleanCode);
      }
    } else {
      setFormData({ ...formData, [name]: sanitizedValue });
    }

    // Clear error when field is edited
    if (errors[name] || errors.form) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
        form: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!needs2FA) {
      // Only validate username/password during initial login
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      }

      if (!formData.password) {
        newErrors.password = "Password is required";
      }
    } else {
      // Validate 2FA code
      if (!verificationCode || verificationCode.length !== 6) {
        newErrors.verificationCode = "Please enter a valid 6-digit code";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!needs2FA) {
        // Initial login request
        const response = await api.post("/auth/login/", formData);

        if (response.data.message === "2FA code sent") {
          setNeeds2FA(true); // Show 2FA input        } else {
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
          email: formData.username, // Assuming username is email
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
    } catch (err) {
      // Handle different types of errors more specifically
      if (err.response?.status === 400) {
        const errorData = err.response.data;

        // Handle field-specific validation errors
        if (errorData?.errors) {
          const newErrors = {};

          // Map backend validation errors to frontend fields
          if (errorData.errors.username) {
            newErrors.username =
              errorData.errors.username[0] || "Username is required";
          }
          if (errorData.errors.password) {
            newErrors.password =
              errorData.errors.password[0] || "Password is required";
          }
          if (errorData.errors.email) {
            newErrors.username =
              errorData.errors.email[0] || "Valid email is required";
          }
          if (errorData.errors.code && needs2FA) {
            newErrors.verificationCode =
              errorData.errors.code[0] || "Invalid verification code";
          }

          setErrors(newErrors);
        } else if (errorData?.error) {
          // Handle general error messages
          if (
            errorData.error.includes("username") ||
            errorData.error.includes("Username")
          ) {
            setErrors({ username: "Username is required" });
          } else if (
            errorData.error.includes("password") ||
            errorData.error.includes("Password")
          ) {
            setErrors({ password: "Password is required" });
          } else if (
            errorData.error.includes("email") ||
            errorData.error.includes("Email")
          ) {
            setErrors({ username: "Valid email is required" });
          } else {
            setErrors({ form: errorData.error });
          }
        } else {
          // Fallback for empty fields or general 400 errors
          const newErrors = {};
          if (!formData.username.trim() && !needs2FA) {
            newErrors.username = "Username is required";
          }
          if (!formData.password && !needs2FA) {
            newErrors.password = "Password is required";
          }
          if (!verificationCode && needs2FA) {
            newErrors.verificationCode = "Verification code is required";
          }

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
          } else {
            setErrors({ form: "Please check your input and try again" });
          }
        }
      } else if (err.response?.status === 401) {
        setErrors({ form: "Invalid username or password" });
      } else if (err.response?.status === 403) {
        setErrors({ form: "Account is disabled or access denied" });
      } else if (err.response?.status === 429) {
        setErrors({ form: "Too many login attempts. Please try again later" });
      } else {
        // Network or other errors
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "Login failed. Please try again";
        setErrors({ form: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      {errors.form && <div className="error-message">{errors.form}</div>}

      {!needs2FA ? (
        // Username and password fields
        <>
          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Username or Email"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? "error" : ""}
              pattern="^([a-zA-Z0-9_]{3,30}|[^\s@]+@[^\s@]+\.[^\s@]+)$"
              title="Enter a valid username or email address"
              required
            />
            {errors.username && (
              <div className="error-text">{errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "error" : ""}
              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
              title="Password must be at least 8 characters and include uppercase, lowercase, number and special character"
              required
            />
            {errors.password && (
              <div className="error-text">{errors.password}</div>
            )}
          </div>
        </>
      ) : (
        // 2FA verification code field
        <div className="form-group">
          <input
            type="text"
            name="verificationCode"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={handleChange}
            maxLength={6}
            className={errors.verificationCode ? "error" : ""}
          />
          {errors.verificationCode && (
            <div className="error-text">{errors.verificationCode}</div>
          )}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Processing..." : needs2FA ? "Verify Code" : "Login"}
      </button>
    </form>
  );
};

export default Login;
