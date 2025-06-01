/**
 * Form-specific sanitization utilities that are less aggressive than general sanitization
 * to prevent interference with normal user input while still providing basic security
 */

/**
 * Sanitizes form input strings with minimal interference
 * Only removes the most dangerous content while preserving normal text
 * @param {string} input - The input string to sanitize
 * @returns {string} - The sanitized string
 */
export const sanitizeFormInput = (input) => {
  if (input === null || input === undefined) return "";
  if (typeof input !== "string") return String(input);

  // Only remove the most dangerous patterns while preserving normal text
  const sanitized = input
    // Remove script tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove javascript: protocol
    .replace(/javascript:/gi, "")
    // Remove specific event handlers that are commonly used for XSS
    .replace(/on(click|load|error|mouseover|focus|blur)=/gi, "")
    // Limit to reasonable length to prevent DOS attacks (adjust as needed)
    .substring(0, 1000);

  return sanitized;
};

/**
 * Sanitizes form data object with minimal interference
 * @param {object} formData - The form data object to sanitize
 * @returns {object} - A new object with sanitized values
 */
export const sanitizeFormData = (formData) => {
  if (typeof formData !== "object" || formData === null) {
    return formData;
  }

  if (Array.isArray(formData)) {
    return formData.map((item) => sanitizeFormData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeFormInput(value);
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
