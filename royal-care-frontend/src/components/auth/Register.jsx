import { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import { login } from "../../features/auth/authSlice";
import FormBlueprint from "../../globals/FormBlueprint";
import { FormField } from "../../globals/FormField";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import { checkEmailExists, completeRegistration } from "../../services/api";
import { sanitizeString } from "../../utils/sanitization";
import { validateInput } from "../../utils/validation";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";

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
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
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
              : "No registration found. Please contact your operator.",
        });
      })
      .catch((err) => {
        console.error("Email check error:", err);
        let errorMessage = "Could not verify email.";

        // Show more specific error messages from the backend
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status === 404) {
          errorMessage =
            "No registration found. Please contact your operator to register your email first.";
        } else if (err.response?.status === 400) {
          errorMessage = "Invalid email format.";
        } else if (err.message === "Network Error") {
          errorMessage =
            "Cannot connect to server. Please check your connection.";
        }

        setEmailCheck({
          loading: false,
          exists: false,
          eligible: false,
          error: errorMessage,
        });
      });
  }, [formData.email]);

  const fieldValidators = useMemo(
    () => ({
      email: (val) => {
        // Always show backend validation errors immediately (regardless of touch state)
        if (emailCheck.error) {
          return emailCheck.error;
        }

        // Only show "required" error if email has been touched or form is being submitted
        if ((!val || val.trim() === "") && (emailTouched || showFieldErrors)) {
          return "This field is required";
        }

        // If no error and email exists, let it pass
        return "";
      },
      password: (val) => {
        // Simple required check for password - don't use complex validation until user starts typing
        if (!val || val.trim() === "") return "This field is required";
        return validateInput("password", val, { required: true });
      },
      passwordConfirm: (val) => {
        if (!val) return "This field is required";
        if (val !== formData.password) return "Passwords don't match";
        return "";
      },
      // Phone validation - validate format when value exists
      phone_number: (val) => {
        console.log("Phone validation called with:", val); // Debug log

        // If no value, it's optional so no error
        if (!val || val.trim() === "") return "";

        // Only digits should be in this field
        const digits = val.replace(/[^0-9]/g, "");
        console.log("Digits extracted:", digits); // Debug log

        // Check if it has the right length and starts with 9 (Philippine mobile format)
        if (digits.length > 0) {
          if (digits.length > 10) return "Too many digits";
          if (digits.length > 0 && digits.length < 10)
            return "Please enter a complete 10-digit number";
          if (digits.length === 10 && !digits.startsWith("9")) {
            return "Philippine mobile numbers should start with 9";
          }
        }

        return "";
      },
    }),
    [emailCheck.error, formData.password, emailTouched, showFieldErrors]
  );

  // Force email field re-validation when emailTouched changes
  useEffect(() => {
    // Force FormField to re-run validation when email is touched
    if (emailTouched && formData.email) {
      // The validator will now return the appropriate error since emailTouched is true
      // We need to trigger a re-validation in FormField
      const emailError = fieldValidators.email(formData.email);
      handleFieldError("email", emailError);
    }
  }, [emailTouched, formData.email, fieldValidators]); // Re-validate when emailTouched changes

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
      // For phone number, only keep digits (no + since that's shown as prefix)
      sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
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

    // Clear email touched state when email is cleared
    if (name === "email" && !sanitizedValue) {
      setEmailTouched(false);
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

  const handleFieldError = (name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Email: Use backend validation result only, no redundant frontend validation
    if (emailCheck.error) {
      newErrors.email = emailCheck.error;
    } else if (!emailCheck.eligible && formData.email) {
      // Only show format error if email was entered but not eligible
      const emailFormatError = validateInput("email", formData.email, {
        required: true,
      });
      if (emailFormatError) newErrors.email = emailFormatError;
    }

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

    // Phone: validate only if provided (optional field)
    let phoneRaw = formData.phone_number.replace(/[^0-9]/g, "");
    if (phoneRaw.length > 0) {
      // Only validate if user entered something
      let phoneFull = `+63${phoneRaw}`;
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
    setShowFieldErrors(true); // Show all required field errors on submit

    // Validate form before submission
    const isValid = validateForm();
    if (!isValid) {
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

      // Check if email verification is required
      if (response.data.requires_verification) {
        // Navigate to email verification page
        navigate("/verify-email", {
          state: { email: response.data.email },
          replace: true,
        });
        return;
      }

      // Handle immediate login if no verification required (fallback)
      if (response.data && response.data.token && response.data.user) {
        localStorage.setItem("knoxToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        dispatch(login(response.data.user)); // Ensure Redux state is updated

        if (response.data.user && response.data.user.role) {
          navigate(getRedirectPath(response.data.user.role), { replace: true });
        } else {
          setErrors({
            form: "Registration succeeded, but user information is missing. Please log in manually.",
          });
        }
        return;
      }

      // If registration completed but no verification required and no token returned,
      // show success message instead of attempting automatic login
      setSuccess(true);
      return;
    } catch (err) {
      console.error("Registration error:", err);

      // Clear any existing form errors before setting new ones
      setErrors({});

      // Handle API errors with better error formatting
      if (err.response?.data) {
        const apiErrors = err.response.data;
        console.log("API returned errors:", apiErrors);

        const formattedErrors = {};

        // Format API errors to match our error state structure
        Object.keys(apiErrors).forEach((key) => {
          const errorValue = Array.isArray(apiErrors[key])
            ? apiErrors[key][0]
            : apiErrors[key];

          // Map API field names to our form field names if needed
          if (key === "phone_number" || key === "phone") {
            formattedErrors.phone_number = errorValue;
          } else if (key === "non_field_errors") {
            formattedErrors.form = errorValue;
          } else {
            formattedErrors[key] = errorValue;
          }
        });

        setErrors(formattedErrors);
      } else if (err.message) {
        // Network or other errors
        if (err.message === "Network Error") {
          setErrors({
            form: "Cannot connect to server. Please check your connection and try again.",
          });
        } else {
          setErrors({ form: `Registration failed: ${err.message}` });
        }
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
          required={true}
          validate={fieldValidators.email}
          onErrorChange={handleFieldError}
          showError={showFieldErrors || emailCheck.error} // Show error immediately if backend has an error
          inputProps={{
            placeholder: "e.g. johndoe@email.com",
            className: `global-form-field-input`,
            title: "Enter your email address",
            id: "email",
            autoComplete: "email",
            onBlur: () => setEmailTouched(true),
          }}
        />
      </div>
      <div className={styles.formGroup}>
        <FormField
          label="Mobile Number"
          name="phone_number"
          as="custom"
          required={false}
          value={formData.phone_number}
          validate={fieldValidators.phone_number}
          onErrorChange={handleFieldError}
          showError={showFieldErrors}
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
                console.log("Phone input onChange, cleaned value:", val); // Debug log
                console.log(
                  "Current formData.phone_number:",
                  formData.phone_number
                ); // Debug log
                // Use the main handleChange function to ensure proper integration
                const syntheticEvent = {
                  target: {
                    name: "phone_number",
                    value: val,
                  },
                };
                handleChange(syntheticEvent);
              }}
              onBlur={() => {
                console.log(
                  "Phone input onBlur, current value:",
                  formData.phone_number
                ); // Debug log
                // Manually trigger validation on blur
                const phoneError = fieldValidators.phone_number(
                  formData.phone_number
                );
                console.log("Manual phone validation result:", phoneError); // Debug log
                if (phoneError) {
                  handleFieldError("phone_number", phoneError);
                }
              }}
              placeholder="9XXXXXXXXX"
              className={`global-form-field-input ${styles.phoneInput}`}
              autoComplete="tel"
              maxLength={10}
              title="Enter your 10-digit Philippine mobile number"
            />
          </div>
          {/* Manual error display for custom FormField */}
          {errors.phone_number && (
            <div className="global-form-field-error">{errors.phone_number}</div>
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
          required={true}
          validate={fieldValidators.password}
          onErrorChange={handleFieldError}
          showError={showFieldErrors}
          inputProps={{
            placeholder: "Choose a strong password",
            className: `${styles.inputWithIcon} global-form-field-input`,
            title:
              "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
            id: "password",
            autoComplete: "new-password",
            onFocus: () => setPasswordFocused(true),
            onBlur: () => {
              // Call the parent's onBlur first (this sets touched=true for validation)
              // The FormField component will handle this automatically
              setPasswordFocused(false);
            },
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
          required={true}
          validate={fieldValidators.passwordConfirm}
          onErrorChange={handleFieldError}
          showError={showFieldErrors}
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
