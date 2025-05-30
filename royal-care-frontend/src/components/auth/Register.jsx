import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import loginSidepic from "../../assets/images/login-sidepic.jpg";
import rcLogo from "../../assets/images/rc_logo.jpg";
import styles from "../../pages/LoginPage/LoginPage.module.css";
import { api } from "../../services/api";
import { sanitizePhone, sanitizeString } from "../../utils/sanitization";
import { validateInput } from "../../utils/validation";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role: "Driver", // Default to Driver role
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    document.title = "Royal Care - Register";
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    let sanitizedValue;
    // Apply appropriate sanitization based on field type
    if (name === "password" || name === "passwordConfirm") {
      sanitizedValue = value; // Skip sanitization for passwords
    } else if (name === "email") {
      // Special handling for email to preserve @ and . characters
      sanitizedValue = value.replace(/<[^>]*>/g, ""); // Only remove HTML tags
    } else if (name === "phone_number") {
      sanitizedValue = sanitizePhone(value);

      // Format phone number as international format
      if (sanitizedValue && !sanitizedValue.startsWith("+")) {
        sanitizedValue = "+" + sanitizedValue.replace(/^\+/, "");
      }
    } else if (name === "role") {
      // Ensure role is only Driver or Therapist
      sanitizedValue =
        value === "Driver" || value === "Therapist" ? value : "Driver";
    } else {
      sanitizedValue = sanitizeString(value);
    }

    setFormData({ ...formData, [name]: sanitizedValue });

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

    const emailError = validateInput("email", formData.email, {
      required: true,
    });
    if (emailError) newErrors.email = emailError;

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

    // Validate role selection
    if (
      !formData.role ||
      (formData.role !== "Driver" && formData.role !== "Therapist")
    ) {
      newErrors.role = "Please select either Driver or Therapist role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Create a clean submission object without the confirm password field
    const submissionData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      phone_number: formData.phone_number,
    };

    try {
      await api.post("/auth/register/", submissionData);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error(err);
      // Handle API errors
      if (err.response?.data) {
        const apiErrors = err.response.data;
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
          <h2 className={styles.welcomeHeading}>Create Your Account</h2>

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
                    <label htmlFor="username" className={styles.formLabel}>
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      placeholder="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.username ? styles.inputError : ""
                      }`}
                      pattern="^[a-zA-Z0-9_]{3,30}$"
                      title="Username must be 3-30 characters and contain only letters, numbers, and underscores"
                      required
                    />
                    {isCheckingUsername && (
                      <div className={styles.statusText}>
                        Checking availability...
                      </div>
                    )}
                    {errors.username && (
                      <div className={styles.errorText}>{errors.username}</div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.formLabel}>
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      placeholder="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.email ? styles.inputError : ""
                      }`}
                      pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                      title="Enter a valid email address"
                      required
                    />
                    {errors.email && (
                      <div className={styles.errorText}>{errors.email}</div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="password" className={styles.formLabel}>
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      placeholder="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.password ? styles.inputError : ""
                      }`}
                      pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
                      title="Password must be at least 8 characters and include uppercase, lowercase, number and special character"
                      required
                    />
                    {errors.password && (
                      <div className={styles.errorText}>{errors.password}</div>
                    )}
                  </div>{" "}
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="passwordConfirm"
                      className={styles.formLabel}
                    >
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="passwordConfirm"
                      placeholder="Confirm Password"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.passwordConfirm ? styles.inputError : ""
                      }`}
                      required
                    />
                    {errors.passwordConfirm && (
                      <div className={styles.errorText}>
                        {errors.passwordConfirm}
                      </div>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="role" className={styles.formLabel}>
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.role ? styles.inputError : ""
                      }`}
                      required
                    >
                      <option value="Driver">Driver</option>
                      <option value="Therapist">Therapist</option>
                    </select>
                    {errors.role && (
                      <div className={styles.errorText}>{errors.role}</div>
                    )}
                  </div>
                  <div
                    className={`${styles.formGroup} ${styles.phoneFormGroup}`}
                  >
                    <label htmlFor="phone_number" className={styles.formLabel}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      className={`${styles.formInput} ${
                        errors.phone_number ? styles.inputError : ""
                      }`}
                      pattern="^\+[0-9]{7,15}$"
                      title="Enter phone number in international format (e.g., +123456789)"
                      placeholder="+123456789"
                    />
                    {errors.phone_number && (
                      <div className={styles.errorText}>
                        {errors.phone_number}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`${styles.loginButton} ${
                    isSubmitting ? styles.loginButtonDisabled : ""
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "Register"}
                </button>
              </form>{" "}
              <div className={styles.registerLink}>
                Already have an account?{" "}
                <a href="/login" className={styles.registerLinkAnchor}>
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
