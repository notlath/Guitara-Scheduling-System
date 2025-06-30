/**
 * User utilities for consistent user data handling across dashboards
 * Contains frontend-only user data extraction and formatting logic
 */

/**
 * Get user from localStorage safely
 * @returns {Object|null} User object or null if not found/invalid
 */
export const getUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    console.warn("Failed to parse user from localStorage:", error);
  }
  return null;
};

/**
 * Extract user display name consistently across dashboards
 * @param {Object} user - User object
 * @param {string} fallback - Fallback name if user data is incomplete
 * @returns {string} Formatted user name
 */
export const getUserDisplayName = (user, fallback = "User") => {
  if (!user) return fallback;

  // Try first_name only (don't display last name)
  if (user.first_name) {
    return user.first_name;
  }

  // Fallback to username
  if (user.username) {
    return user.username;
  }

  // Final fallback
  return fallback;
};

/**
 * Get auth token from localStorage
 * @returns {string|null} Auth token or null if not found
 */
export const getAuthToken = () => {
  return localStorage.getItem("knoxToken");
};

/**
 * Check if user is authenticated (has valid token and user data)
 * @returns {boolean} True if user appears to be authenticated
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = getUser();
  return !!(token && user);
};

/**
 * Clear all authentication data from localStorage
 * Frontend-only cleanup function
 */
export const clearAuthData = () => {
  localStorage.removeItem("knoxToken");
  localStorage.removeItem("user");
};
