/**
 * Safe localStorage utilities to prevent JSON parsing errors
 */

/**
 * Safely get and parse JSON data from localStorage
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed value or default value
 */
export const safeGetFromStorage = (key, defaultValue = null) => {
  try {
    const storedValue = localStorage.getItem(key);

    // Check for invalid stored data
    if (!storedValue || storedValue === "undefined" || storedValue === "null") {
      return defaultValue;
    }

    return JSON.parse(storedValue);
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
    console.log(`Stored value was:`, localStorage.getItem(key));

    // Clear corrupted data
    localStorage.removeItem(key);
    return defaultValue;
  }
};

/**
 * Safely set JSON data to localStorage
 * @param {string} key - The localStorage key
 * @param {any} value - The value to store
 */
export const safeSetToStorage = (key, value) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set localStorage item "${key}":`, error);
  }
};

/**
 * Get user data from localStorage safely
 * @returns {Object|null} User object or null
 */
export const getSafeUserData = () => {
  return safeGetFromStorage("user");
};

/**
 * Get token from localStorage safely
 * @returns {string|null} Token string or null
 */
export const getSafeToken = () => {
  const token = localStorage.getItem("knoxToken");

  if (!token || token === "undefined" || token === "null") {
    return null;
  }

  return token;
};

/**
 * Clear all authentication data safely
 */
export const clearAuthData = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("knoxToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  console.log("🧹 Authentication data cleared safely");
};
