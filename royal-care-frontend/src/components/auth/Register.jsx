import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import { api } from "../../services/api";
import { sanitizeString } from "../../utils/sanitization";
import { validateInput } from "../../utils/validation";
import { cleanupFido2Script } from "../../utils/webAuthnHelper";
import { FormField } from "../../globals/FormField";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    role: "Driver", // Default to Driver role - role field is not shown to users
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
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
  const navigate = useNavigate();

  // Debounce function for username availability check
  useEffect(() => {
    let timeoutId;

    if (formData.username && formData.username.length >= 3) {
      setIsCheckingUsername(true);
      timeoutId = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formData.username]);

  useEffect(() => {
    // document.title = "Royal Care - Register";
    // Clean up FIDO2 scripts when component unmounts
    return () => {
      cleanupFido2Script();
    };
  }, []);

  // Check if username is already taken
  const checkUsernameAvailability = async (username) => {
    try {
      const response = await api.get(
        `/auth/check-username/?username=${encodeURIComponent(username)}`
      );
      if (response.data.available === false) {
        setErrors((prev) => ({ ...prev, username: "Username already taken" }));
      }
    } catch (err) {
      console.error("Error checking username:", err);
    } finally {
      setIsCheckingUsername(false);
    }
  };
  const checkPasswordRequirements = (password, confirmPassword) => {
    return {
      startsWithLetter: /^[A-Za-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      exactLength: password.length === 8,
      confirmMatch: password === confirmPassword && password.length > 0,
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let sanitizedValue;

    // Apply appropriate sanitization based on field type
    if (name === "password" || name === "passwordConfirm") {
      sanitizedValue = value; // Skip sanitization for passwords
    } else if (name === "email") {
      // Special handling for email to preserve @ and . characters
      // Only remove HTML tags, but keep email specific characters
      sanitizedValue = value.replace(/<[^>]*>/g, "");
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

  const validateForm = () => {
    const newErrors = {};

    // Validate each field
    const usernameError = validateInput("username", formData.username, {
      required: true,
    });
    if (usernameError) newErrors.username = usernameError;

    const passwordError = validateInput("password", formData.password, {
      required: true,
    });
    if (passwordError) newErrors.password = passwordError;

    // Validate password confirmation
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Passwords don't match";
    }

    const phoneError = validateInput("phone", formData.phone_number);
    if (phoneError) newErrors.phone_number = phoneError;

    setErrors(newErrors);
    console.log("Validation errors:", newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

    // Create a clean submission object without the confirm password field
    const submissionData = {
      username: formData.username,
      password: formData.password,
      role: formData.role,
      phone_number: formData.phone_number,
    };

    console.log("Submitting data to API:", submissionData);

    try {
      const response = await api.post("/auth/register/", submissionData);
      console.log("Registration successful:", response.data);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
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

  return (
    <div className={styles.loginContainer}>
      <div className={styles.imageSide}>
        <img src={loginSidepic} alt="Background" />
      </div>
      <div className={styles.formSide}>
        <div className={styles.formContainer}>
          <div className={styles.logo}>
            <img src={rcLogo} alt="Royal Care Logo" />
          </div>
          <h2 className={styles.welcomeHeading}>Complete your Account</h2>

          {success ? (
            <div className={styles.successMessage}>
              <p>Registration successful! Redirecting to login page...</p>
            </div>
          ) : (
            <>
              {errors.form && (
                <div className={styles.errorMessage}>{errors.form}</div>
              )}
              <form
                onSubmit={handleSubmit}
                className={styles.loginForm}
                noValidate
              >
                <div className={styles.inputContainer}>
                  <div className={styles.formGroup}>
                    <FormField
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      pattern="^[a-zA-Z0-9_]{3,30}$"
                      status={
                        isCheckingUsername ? "Checking availability..." : null
                      }
                      inputProps={{
                        placeholder: "Username",
                        className: `global-form-field-input${
                          errors.username ? ` global-form-field-error` : ""
                        }`,
                        title:
                          "Username must be 3-30 characters and contain only letters, numbers, and underscores",
                        id: "username",
                      }}
                    >
                      {errors.username && (
                        <div className="global-form-field-error">
                          {errors.username}
                        </div>
                      )}
                    </FormField>
                  </div>
                  <div
                    className={`${styles.formGroup} ${styles.phoneFormGroup}`}
                  >
                    <FormField
                      label="Phone number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      required={false}
                      inputProps={{
                        placeholder: "+123456789",
                        className: `global-form-field-input${
                          errors.phone_number ? ` global-form-field-error` : ""
                        }`,
                        id: "phone_number",
                        title:
                          "Enter international format with + and 7-15 digits",
                      }}
                    >
                      {errors.phone_number && (
                        <div className="global-form-field-error">
                          {errors.phone_number}
                        </div>
                      )}
                      <div className={styles.helperText}>
                        Format: +[country code][number] (e.g., +12345678901)
                      </div>
                    </FormField>
                  </div>
                  <div className={styles.formGroup}>
                    <FormField
                      label="Create password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
                      inputProps={{
                        placeholder: "Password",
                        className: `global-form-field-input${
                          errors.password ? ` global-form-field-error` : ""
                        }`,
                        title:
                          "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
                        id: "password",
                        autoComplete: "new-password",
                        onFocus: () => setPasswordFocused(true),
                        onBlur: () => setPasswordFocused(false),
                      }}
                    >
                      {errors.password && (
                        <div className="global-form-field-error">
                          {errors.password}
                        </div>
                      )}
                      <div className={styles.passwordPopupWrapper}>
                        {formData.password &&
                          // Only hide when all requirements are met and input is unfocused
                          !(
                            !passwordFocused &&
                            passwordRequirements.hasLower &&
                            passwordRequirements.hasUpper &&
                            passwordRequirements.hasNumber &&
                            /[@$!%*?&]/.test(formData.password) &&
                            formData.password.length >= 8
                          ) && (
                            <div className={styles.passwordPopupError}>
                              <ul className={styles.passwordRequirementsList}>
                                <li
                                  className={
                                    passwordRequirements.hasLower
                                      ? styles.requirementMet
                                      : styles.requirementUnmet
                                  }
                                >
                                  At least one lowercase letter (a-z)
                                </li>
                                <li
                                  className={
                                    passwordRequirements.hasUpper
                                      ? styles.requirementMet
                                      : styles.requirementUnmet
                                  }
                                >
                                  At least one uppercase letter (A-Z)
                                </li>
                                <li
                                  className={
                                    passwordRequirements.hasNumber
                                      ? styles.requirementMet
                                      : styles.requirementUnmet
                                  }
                                >
                                  At least one number (0-9)
                                </li>
                                <li
                                  className={
                                    /[@$!%*?&]/.test(formData.password)
                                      ? styles.requirementMet
                                      : styles.requirementUnmet
                                  }
                                >
                                  At least one special character (@$!%*?&)
                                </li>
                                <li
                                  className={
                                    formData.password.length >= 8
                                      ? styles.requirementMet
                                      : styles.requirementUnmet
                                  }
                                >
                                  At least 8 characters long
                                </li>
                              </ul>
                            </div>
                          )}
                      </div>
                    </FormField>
                  </div>
                  <div className={styles.formGroup}>
                    <FormField
                      label="Re-enter password"
                      name="passwordConfirm"
                      type="password"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      required
                      inputProps={{
                        placeholder: "Confirm Password",
                        className: `global-form-field-input${
                          errors.passwordConfirm
                            ? ` global-form-field-error`
                            : ""
                        }`,
                        id: "passwordConfirm",
                        autoComplete: "new-password",
                      }}
                    >
                      {errors.passwordConfirm && (
                        <div className="global-form-field-error">
                          {errors.passwordConfirm}
                        </div>
                      )}
                    </FormField>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`action-btn${isSubmitting ? " disabled" : ""}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Register"}
                </button>
              </form>
              <div className={styles.registerLink}>
                Already have an account?{" "}
                <a href="/dashboard" className={styles.registerLinkAnchor}>
                  Login here
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
