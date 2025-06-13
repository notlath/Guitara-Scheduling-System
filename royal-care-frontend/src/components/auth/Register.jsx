import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import { FormField } from "../../globals/FormField";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import {
  completeRegistration,
  checkEmailExists,
  api,
} from "../../services/api";
import { sanitizeString } from "../../utils/sanitization";
import { validateInput } from "../../utils/validation";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";
import { login } from "../../features/auth/authSlice";
import FormBlueprint from "../../globals/FormBlueprint";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    role: "Driver", // Default to Driver role - role field is not shown to users
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    startsWithLetter: false,
    hasNumber: false,
    hasLower: false,
    hasUpper: false,
    exactLength: false,
    confirmMatch: false,
  });
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailCheck, setEmailCheck] = useState({
    loading: false,
    exists: false,
    eligible: false,
    error: "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    // document.title = "Royal Care - Register";
    // Clean up FIDO2 scripts when component unmounts
    return () => {
      cleanupFido2Script();
    };
  }, []);

  useEffect(() => {
    if (!formData.email) return;
    setEmailCheck((prev) => ({ ...prev, loading: true, error: "" }));
    checkEmailExists(formData.email)
      .then((res) => {
        setEmailCheck({
          loading: false,
          exists: res.data.exists,
          eligible: res.data.eligible,
          error:
            res.data.exists && !res.data.eligible
              ? "This email has already completed registration."
              : res.data.exists && res.data.eligible
              ? ""
              : "No registration found for this email. Please contact your operator.",
        });
      })
      .catch(() => {
        setEmailCheck({
          loading: false,
          exists: false,
          eligible: false,
          error: "Could not verify email.",
        });
      });
  }, [formData.email]);

  const checkPasswordRequirements = (password, confirmPassword) => {
    return {
      startsWithLetter: /^[A-Za-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      minLength: password.length >= 8,
      confirmMatch: password === confirmPassword && password.length > 0,
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let sanitizedValue; // Apply appropriate sanitization based on field type
    if (name === "password" || name === "passwordConfirm") {
      sanitizedValue = value; // Skip sanitization for passwords
    } else if (name === "email") {
      // Special handling for email to preserve @ and . characters
      // Only remove HTML tags, but keep email specific characters
      sanitizedValue = value.replace(/<[^>]*>/g, "");
    } else if (name === "username") {
      // Special handling for username - only allow alphanumeric and underscores
      // Remove HTML tags but preserve valid username characters including numbers
      sanitizedValue = value
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/[^a-zA-Z0-9_]/g, ""); // Only allow letters, numbers, and underscores
    } else if (name === "phone_number") {
      // Format: starts with + followed by digits only
      const digitsOnly = value.replace(/[^\d+]/g, "");

      // Ensure only one + at the beginning
      sanitizedValue = digitsOnly
        .replace(/^\+?/, "+")
        .replace(/\+(?=.*\+)/g, "");

      // If no + is present, add one at the beginning
      if (sanitizedValue && !sanitizedValue.startsWith("+")) {
        sanitizedValue = "+" + sanitizedValue;
      }
    } else {
      sanitizedValue = sanitizeString(value);
    }

    setFormData({ ...formData, [name]: sanitizedValue });

    // Password requirements update
    if (name === "password" || name === "passwordConfirm") {
      const reqs = checkPasswordRequirements(
        name === "password" ? sanitizedValue : formData.password,
        name === "passwordConfirm" ? sanitizedValue : formData.passwordConfirm
      );
      setPasswordRequirements(reqs);
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Special handling for password confirmation
    if (name === "password" && formData.passwordConfirm) {
      if (formData.passwordConfirm !== value) {
        setErrors((prev) => ({
          ...prev,
          passwordConfirm: "Passwords don't match",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          passwordConfirm: "",
        }));
      }
    }
  };

  const fieldValidators = {
    email: (val) => validateInput("email", val, { required: true }),
    password: (val) => validateInput("password", val, { required: true }),
    passwordConfirm: (val) => {
      if (!val) return "This field is required";
      if (val !== formData.password) return "Passwords don't match";
      return "";
    },
    phone_number: (val) => validateInput("phone", val, { required: true }),
  };

  const handleFieldError = (name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Email: only show backend error if present, otherwise only show frontend error if not eligible
    if (emailCheck.error) {
      newErrors.email = emailCheck.error;
    } else if (!emailCheck.eligible) {
      // Only show frontend format error if not eligible
      const emailFormatError = validateInput("email", formData.email, {
        required: true,
      });
      if (emailFormatError) newErrors.email = emailFormatError;
    }
    // If eligible, do not show any frontend email error at all

    const passwordError = validateInput("password", formData.password, {
      required: true,
    });
    if (passwordError) newErrors.password = passwordError;

    // Validate password confirmation (required and match)
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = "This field is required";
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Passwords don't match";
    }

    // Phone: always validate as +63 + 10 digits
    let phoneRaw = formData.phone_number.replace(/[^0-9]/g, "");
    let phoneFull = phoneRaw ? `+63${phoneRaw}` : "";
    if (phoneRaw.length !== 10) {
      newErrors.phone_number =
        "Please enter a valid 10-digit PH mobile number (e.g., 9123456789)";
    } else {
      // Validate the full international format (E.164)
      const phoneE164 = /^\+639\d{9}$/;
      if (!phoneE164.test(phoneFull)) {
        newErrors.phone_number =
          "Please enter a valid 10-digit PH mobile number (e.g., 9123456789)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to determine post-registration redirect
  const getRedirectPath = useCallback(
    (userRole) => {
      const from = location.state?.from?.pathname;
      if (from && from !== "/" && from.startsWith("/dashboard")) {
        return from;
      }
      if (userRole === "operator") {
        return "/dashboard";
      } else if (userRole === "therapist") {
        return "/dashboard";
      } else if (userRole === "driver") {
        return "/dashboard";
      } else {
        return "/dashboard";
      }
    },
    [location.state]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form data before validation:", formData);

    // Validate form before submission
    const isValid = validateForm();
    if (!isValid) {
      console.log("Form validation failed with errors:", errors);
      return;
    }

    setIsSubmitting(true);

    // Always submit phone as +63 + digits (no dashes)
    let phoneRaw = formData.phone_number.replace(/[^0-9]/g, "");
    let phoneFull = phoneRaw ? `+63${phoneRaw}` : "";

    // Create a clean submission object without the confirm password field
    const submissionData = {
      email: formData.email,
      password: formData.password,
      phone_number: phoneFull,
    };

    console.log(
      "Submitting data to API (complete registration):",
      submissionData
    );

    try {
      const response = await completeRegistration(submissionData);
      console.log("Registration successful:", response.data);
      // Save user and token to localStorage if provided by backend
      if (response.data && response.data.token && response.data.user) {
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user)); // Ensure Redux state is updated
        navigate(getRedirectPath(response.data.user.role), { replace: true });
        return;
      }
      // If no user/token returned, perform automatic login
      try {
        const loginResponse = await api.post("/auth/login/", {
          username: formData.email,
          password: formData.password,
        });
        if (
          loginResponse.data &&
          loginResponse.data.token &&
          loginResponse.data.user
        ) {
          localStorage.setItem("knoxToken", loginResponse.data.token);
          localStorage.setItem("user", JSON.stringify(loginResponse.data.user));
          dispatch(login(loginResponse.data.user));
          navigate(getRedirectPath(loginResponse.data.user.role), {
            replace: true,
          });
          return;
        }
      } catch {
        // Automatic login failed
        setErrors({
          form: "Registration succeeded, but automatic login failed. Please log in manually.",
        });
        return;
      }
      // Fallback: Show success and login button if no token/user returned and login failed
      setSuccess(true);
      return;
    } catch (err) {
      console.error("Registration error:", err);
      // Handle API errors
      if (err.response?.data) {
        const apiErrors = err.response.data;
        console.log("API returned errors:", apiErrors);
        const formattedErrors = {};
        // Format API errors to match our error state structure
        Object.keys(apiErrors).forEach((key) => {
          formattedErrors[key] = Array.isArray(apiErrors[key])
            ? apiErrors[key][0]
            : apiErrors[key];
        });
        setErrors(formattedErrors);
      } else {
        setErrors({ form: "Registration failed. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (success) {
      // Try to get user from Redux, fallback to localStorage
      let redirectUser = user;
      if (!redirectUser) {
        try {
          const storedUser = JSON.parse(localStorage.getItem("user"));
          if (storedUser && storedUser.role) {
            redirectUser = storedUser;
            dispatch(login(storedUser));
          }
        } catch {
          // Ignore error if user not in localStorage
        }
      }
      // Always redirect after short delay to avoid being stuck
      const timer = setTimeout(() => {
        navigate(getRedirectPath(redirectUser?.role), { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [success, user, navigate, getRedirectPath, dispatch]);

  // --- Blueprint props ---
  const header = "Complete Your Account Registration";
  const formFields = (
    <div className={styles.inputContainer}>
      <div className={styles.formGroup}>
        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email || ""}
          onChange={handleChange}
          required
          validate={fieldValidators.email}
          onErrorChange={handleFieldError}
          inputProps={{
            placeholder: "e.g. johndoe@email.com",
            className: `global-form-field-input`,
            title: "Enter your email address",
            id: "email",
            autoComplete: "email",
          }}
        />
        {emailCheck.error && (
          <div className={styles.errorMessage}>
            {emailCheck.error ===
            "No registration found for this email. Please contact your operator."
              ? "No registration found for this email. Please contact support."
              : emailCheck.error}
          </div>
        )}
      </div>
      <div className={styles.formGroup}>
        <FormField
          label="Mobile Number"
          name="phone_number"
          as="custom"
          required={true}
        >
          <div className={styles.phoneInputWrapper}>
            <span className={styles.phonePrefix}>+63</span>
            <input
              type="text"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                setFormData({ ...formData, phone_number: val });
                if (errors.phone_number)
                  setErrors((prev) => ({ ...prev, phone_number: "" }));
              }}
              placeholder="9XXXXXXXXX"
              className={`global-form-field-input ${styles.phoneInput}`}
              autoComplete="tel"
              maxLength={10}
              title="Enter your 10-digit Philippine mobile number"
              required
            />
          </div>
          {errors.phone_number && (
            <div className="global-form-field-error">
              {errors.phone_number.replace(
                "10-digit PH mobile number (e.g., 9123456789)",
                "10-digit Philippine mobile number (e.g., 9123456789)"
              )}
            </div>
          )}
        </FormField>
      </div>
      <div className={styles.formGroup} style={{ position: "relative" }}>
        <FormField
          label="Create Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          validate={fieldValidators.password}
          onErrorChange={handleFieldError}
          inputProps={{
            placeholder: "Choose a strong password",
            className: `${styles.inputWithIcon} global-form-field-input`,
            title:
              "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
            id: "password",
            autoComplete: "new-password",
            onFocus: () => setPasswordFocused(true),
            onBlur: () => setPasswordFocused(false),
          }}
        />
        {passwordFocused && (
          <div className={styles.passwordPopupError}>
            <ul className={styles.passwordRequirementsList}>
              <li
                className={
                  passwordRequirements.hasLower
                    ? styles.requirementMet
                    : styles.requirementUnmet
                }
              >
                Contains at least one lowercase letter (a-z)
              </li>
              <li
                className={
                  passwordRequirements.hasUpper
                    ? styles.requirementMet
                    : styles.requirementUnmet
                }
              >
                Contains at least one uppercase letter (A-Z)
              </li>
              <li
                className={
                  passwordRequirements.hasNumber
                    ? styles.requirementMet
                    : styles.requirementUnmet
                }
              >
                Contains at least one number (0-9)
              </li>
              <li
                className={
                  /[@$!%*?&]/.test(formData.password)
                    ? styles.requirementMet
                    : styles.requirementUnmet
                }
              >
                Contains at least one special character (@$!%*?&)
              </li>
              <li
                className={
                  formData.password.length >= 8
                    ? styles.requirementMet
                    : styles.requirementUnmet
                }
              >
                Is at least 8 characters long
              </li>
            </ul>
          </div>
        )}
      </div>
      <div className={styles.formGroup}>
        <FormField
          label="Confirm Password"
          name="passwordConfirm"
          type="password"
          value={formData.passwordConfirm}
          onChange={handleChange}
          required
          validate={fieldValidators.passwordConfirm}
          onErrorChange={handleFieldError}
          inputProps={{
            placeholder: "Re-enter your password",
            className: `${styles.inputWithIcon} global-form-field-input`,
            id: "passwordConfirm",
            autoComplete: "new-password",
          }}
        ></FormField>
      </div>
    </div>
  );

  const button = (
    <button
      type="submit"
      className={`action-btn${isSubmitting ? " disabled" : ""}`}
      disabled={isSubmitting}
    >
      {isSubmitting ? "Registering..." : "Complete Registration"}
    </button>
  );

  const links = (
    <>
      Already have an account? <a href="/dashboard">Log in here.</a>
    </>
  );

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          {success ? (
            <div className={styles.successMessage}>
              <p>
                Registration successful! Redirecting you to your dashboard...
              </p>
            </div>
          ) : (
            <>
              {errors.form && (
                <div className={styles.errorMessage}>{errors.form}</div>
              )}
              <FormBlueprint
                header={header}
                onSubmit={handleSubmit}
                button={button}
                links={links}
                containerClass=""
                formClass={styles.loginForm}
              >
                {formFields}
              </FormBlueprint>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
