import { sanitizeString } from "./sanitization";

/**
 * Input validation utilities
 */

/**
 * Validates the username format
 * @param {string} username - The username to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateUsername = (username) => {
  if (!username || username.trim() === "") {
    return "Username is required";
  }

  // At least 3 characters, alphanumeric and underscores only
  const re = /^[a-zA-Z0-9_]{3,30}$/;
  if (!re.test(username)) {
    return "Username must be 3-30 characters and contain only letters, numbers, and underscores";
  }

  return null;
};

/**
 * Validates the password strength
 * @param {string} password - The password to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return "Password must contain at least one number";
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  // Check for at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === "") {
    return "Email is required";
  }

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
};

/**
 * Validates a phone number
 * @param {string} phone - The phone number to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return null; // Phone might be optional
  }

  // International phone format validation (E.164 format)
  // Must start with + followed by 7-15 digits
  const re = /^\+[0-9]{7,15}$/;
  if (!re.test(String(phone))) {
    return "Please enter a valid international phone number (e.g., +123456789)";
  }

  return null;
};

/**
 * Validates the user role
 * @param {string} role - The role to validate
 * @returns {string|null} - Error message or null if valid
 */
export const validateRole = (role) => {
  if (!role || role.trim() === "") {
    return "Role is required";
  }

  const validRoles = ["Driver", "Therapist"];
  if (!validRoles.includes(role)) {
    return "Role must be either Driver or Therapist";
  }

  return null;
};

/**
 * Validates form inputs by type
 * @param {string} type - Input type (e.g., 'email', 'password')
 * @param {string} value - Input value
 * @param {object} options - Additional validation options
 * @returns {string|null} - Error message or null if valid
 */
export const validateInput = (type, value, options = {}) => {
  const { required = false } = options;

  // Check required fields first
  if (required && (!value || value.trim() === "")) {
    return "This field is required";
  }

  // Skip validation for empty optional fields
  if (!value && !required) {
    return null;
  }

  // Sanitize input before validation
  const sanitizedValue = type !== "password" ? sanitizeString(value) : value;

  // Validate based on input type
  switch (type) {
    case "email":
      return validateEmail(sanitizedValue);
    case "password":
      return validatePassword(sanitizedValue);
    case "phone":
      return validatePhone(sanitizedValue);
    case "username":
      return validateUsername(sanitizedValue);
    case "role":
      return validateRole(sanitizedValue);
    default:
      return null;
  }
};
