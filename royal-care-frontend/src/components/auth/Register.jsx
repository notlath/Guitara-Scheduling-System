import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { sanitizePhone, sanitizeString } from "../../utils/sanitization";
import { validateInput } from "../../utils/validation";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role: "",
    phone_number: "",
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

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
    }
  };

  return success ? (
    <p>Registration successful! Please log in.</p>
  ) : (
    <form onSubmit={handleSubmit} noValidate>
      {errors.form && <div className="error-message">{errors.form}</div>}
      <div className="form-group">
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className={errors.username ? "error" : ""}
          pattern="^[a-zA-Z0-9_]{3,30}$"
          title="Username must be 3-30 characters and contain only letters, numbers, and underscores"
          required
        />
        {isCheckingUsername && (
          <div className="status-text">Checking availability...</div>
        )}
        {errors.username && <div className="error-text">{errors.username}</div>}
      </div>
      <div className="form-group">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? "error" : ""}
          pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
          title="Enter a valid email address"
          required
        />
        {errors.email && <div className="error-text">{errors.email}</div>}
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
        {errors.password && <div className="error-text">{errors.password}</div>}
      </div>
      <div className="form-group">
        <input
          type="password"
          name="passwordConfirm"
          placeholder="Confirm Password"
          value={formData.passwordConfirm}
          onChange={handleChange}
          className={errors.passwordConfirm ? "error" : ""}
          required
        />
        {errors.passwordConfirm && (
          <div className="error-text">{errors.passwordConfirm}</div>
        )}
      </div>
      <div className="form-group">
        <input
          type="tel"
          name="phone_number" const roleError
          placeholder="Phone Number (International format: +123456789)"
          value={formData.phone_number}
          onChange={handleChange}
          className={errors.phone_number ? "error" : ""}
          pattern="^\+[0-9]{7,15}$"
          title="Enter phone number in international format (e.g., +123456789)"
        />
        {errors.phone_number && (
          <div className="error-text">{errors.phone_number}</div>
        )}
      </div>
      <button type="submit">Register</button>
    </form>
  );
};

export default Register;
