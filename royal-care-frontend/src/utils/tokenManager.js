/**
 * Token Manager
 *
 * Centralizes all token management to ensure consistency across tabs and components.
 * Addresses issues with tokens being stored under different names.
 */

// The single, consistent token key name to use throughout the application
export const TOKEN_KEY = "knoxToken";

/**
 * Check if a token value is valid
 * @param {string} token - The token to validate
 * @returns {boolean} True if the token is valid
 */
const isValidToken = (token) => {
  return token && 
         token !== "undefined" && 
         token !== "null" && 
         token.trim() !== "" &&
         token !== "undefined" &&
         typeof token === "string";
};

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The authentication token or null if not present
 */
export const getToken = () => {
  // Try to get token using the standard key
  const token = localStorage.getItem(TOKEN_KEY);
  if (isValidToken(token)) return token;

  // Fallback for legacy token keys (during transition period)
  const legacyTokens = [
    localStorage.getItem("token"),
    localStorage.getItem("authToken"),
  ];

  // Return the first valid token from legacy storage or null if none exist
  const validToken = legacyTokens.find(isValidToken);

  // If we found a valid token in a legacy location, migrate it to the standard location
  if (validToken) {
    console.log("🔄 Migrating token from legacy storage");
    setToken(validToken);
    return validToken;
  }

  return null;
};

/**
 * Set the authentication token in localStorage
 * @param {string} token - The token to store
 */
export const setToken = (token) => {
  if (!isValidToken(token)) {
    console.warn("⚠️ Attempted to store invalid token:", token);
    return;
  }

  // Store the token using the standard key
  localStorage.setItem(TOKEN_KEY, token);

  // During transition period, also set legacy token keys to maintain compatibility
  // This can be removed after full migration
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
};

/**
 * Remove the authentication token from localStorage
 */
export const removeToken = () => {
  // Remove from all known locations
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("authToken");

  console.log("🔒 Token removed from all storage locations");
};

/**
 * Check if a valid token exists
 * @returns {boolean} True if a valid token exists
 */
export const hasValidToken = () => {
  const token = getToken();
  return isValidToken(token);
};

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization header if token exists
 */
export const getAuthHeaders = () => {
  const token = getToken();
  if (isValidToken(token)) {
    return {
      Authorization: `Token ${token}`,
    };
  }
  return {};
};

/**
 * Clean up any invalid tokens from localStorage
 * This should be called on app startup to ensure clean state
 */
export const cleanupInvalidTokens = () => {
  const keys = [TOKEN_KEY, "token", "authToken"];
  let cleaned = false;
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value && !isValidToken(value)) {
      localStorage.removeItem(key);
      cleaned = true;
    }
  });
  
  if (cleaned) {
    console.log("🧹 Cleaned up invalid tokens from localStorage");
  }
};

/**
 * Debug function to check token status
 * Only available in development mode
 */
export const debugTokenStatus = () => {
  if (import.meta.env.DEV) {
    const token = getToken();
    console.log("🔍 Token Debug Info:", {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : "None",
      isValid: isValidToken(token),
      storageKeys: {
        knoxToken: localStorage.getItem(TOKEN_KEY),
        token: localStorage.getItem("token"),
        authToken: localStorage.getItem("authToken"),
      }
    });
  }
};
