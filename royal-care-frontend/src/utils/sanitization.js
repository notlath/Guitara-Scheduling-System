/**
 * Sanitization utilities to prevent XSS and SQL injection attacks
 */

/**
 * Sanitizes string inputs by removing potentially dangerous characters
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeString = (input) => {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") return String(input);

  // Remove script tags and other potentially dangerous HTML
  const sanitized = input
    // Remove script tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove all HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove javascript: protocol
    .replace(/javascript:/gi, "")
    // Remove event handlers
    .replace(/on\w+=/gi, "")
    // Sanitize SQL injection attempts
    .replace(
      /(\s(select|insert|update|delete|drop|alter|create|modify)\s)/gi,
      " "
    )
    .replace(/(\s(from|where|union|join)\s)/gi, " ")
    // Encode quotes
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;")
    // Remove control characters (safely)
    .replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, "");

  return sanitized;
};

/**
 * Sanitizes an object by recursively sanitizing all string values
 * @param {object} obj - The object to sanitize
 * @returns {object} - A new object with sanitized values
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validates phone number format (basic validation)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const validatePhone = (phone) => {
  const re = /^[0-9+\-\s()]{7,20}$/;
  return re.test(String(phone));
};

/**
 * Sanitizes a phone number input
 * @param {string} phone - The phone number to sanitize
 * @returns {string} - The sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone) return "";

  // Remove all non-digit characters except the leading +
  const digits = String(phone).replace(/[^\d+]/g, "");

  // Ensure there's only one + at the beginning
  return digits.replace(/^\+?/, "+").replace(/\+(?=.*\+)/g, "");
};

/**
 * Creates an input change handler that sanitizes inputs
 * @param {function} setState - State setter function
 * @returns {function} - Change handler function
 */
export const createSanitizedChangeHandler = (setState) => (e) => {
  const { name, value, type, checked, options } = e.target;

  // Handle different input types
  if (type === "checkbox") {
    setState((prev) => ({ ...prev, [name]: checked }));
  } else if (type === "select-multiple") {
    const selectedOptions = Array.from(options)
      .filter((option) => option.selected)
      .map((option) => sanitizeString(option.value));
    setState((prev) => ({ ...prev, [name]: selectedOptions }));
  } else {
    const sanitizedValue = sanitizeString(value);
    setState((prev) => ({ ...prev, [name]: sanitizedValue }));
  }
};
