import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";
import { FormField } from "../../globals/FormField";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import { api } from "../../services/api";
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
  const navigate = useNavigate();

  useEffect(() => {
    // document.title = "Royal Care - Register";
    // Clean up FIDO2 scripts when component unmounts
    return () => {
      cleanupFido2Script();
    };
  }, []);

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

    // Validate each field
    const emailError = validateInput("email", formData.email, {
      required: true,
      pattern: "^[^s@]+@[^s@]+.[^s@]+$",
    });
    if (emailError) newErrors.email = emailError;

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
      email: formData.email,
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
                      label="Email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      required
                      validate={fieldValidators.email}
                      onErrorChange={handleFieldError}
                      inputProps={{
                        placeholder: "Email",
                        className: `global-form-field-input`,
                        title: "Enter your email address",
                        id: "email",
                        autoComplete: "email",
                      }}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <FormField
                      label="Phone number"
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
                            let val = e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 10);
                            if (val.length > 3 && val.length <= 7)
                              val = val.replace(/(\d{3})(\d+)/, "$1-$2");
                            else if (val.length > 7)
                              val = val.replace(
                                /(\d{3})(\d{4})(\d+)/,
                                "$1-$2-$3"
                              );
                            setFormData({ ...formData, phone_number: val });
                            if (errors.phone_number)
                              setErrors((prev) => ({
                                ...prev,
                                phone_number: "",
                              }));
                          }}
                          placeholder="XXX-XXXX-XXX"
                          className={`global-form-field-input${
                            errors.phone_number
                              ? " global-form-field-error"
                              : ""
                          } ${styles.phoneInput}`}
                          autoComplete="tel"
                          maxLength={12}
                          pattern="[0-9]{3}-[0-9]{4}-[0-9]{3}"
                          title="Enter a valid mobile number"
                          required
                        />
                      </div>
                      {errors.phone_number && (
                        <div className="global-form-field-error">
                          {errors.phone_number}
                        </div>
                      )}
                    </FormField>
                  </div>
                  <div
                    className={styles.formGroup}
                    style={{ position: "relative" }}
                  >
                    <FormField
                      label="Create password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      validate={fieldValidators.password}
                      onErrorChange={handleFieldError}
                      inputProps={{
                        placeholder: "Password",
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
                  <div className={styles.formGroup}>
                    <FormField
                      label="Re-enter password"
                      name="passwordConfirm"
                      type="password"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      required
                      validate={fieldValidators.passwordConfirm}
                      onErrorChange={handleFieldError}
                      inputProps={{
                        placeholder: "Confirm Password",
                        className: `${styles.inputWithIcon} global-form-field-input`,
                        id: "passwordConfirm",
                        autoComplete: "new-password",
                      }}
                    ></FormField>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`action-btn${isSubmitting ? " disabled" : ""}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Please Wait..." : "Complete Registration"}
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
