/**
 * Token Manager
 *
 * Centralizes all token management to ensure consistency across tabs and components.
 * Addresses issues with tokens being stored under different names.
 */

// The single, consistent token key name to use throughout the application
export const TOKEN_KEY = "knoxToken";

/**
 * Get the authentication token from localStorage
 * @returns {string|null} The authentication token or null if not present
 */
export const getToken = () => {
  // Try to get token using the standard key
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;

  // Fallback for legacy token keys (during transition period)
  const legacyTokens = [
    localStorage.getItem("token"),
    localStorage.getItem("authToken"),
  ];

  // Return the first valid token from legacy storage or null if none exist
  const validToken = legacyTokens.find((t) => t && t.trim() !== "");

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
  if (!token) {
    console.error("⚠️ Attempted to store empty token");
    return;
  }

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
  return token && token.trim() !== "";
};

/**
 * Get authentication headers for API requests
 * @returns {Object} Headers object with Authorization header if token exists
 */
export const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
};

/**
 * Debug token status across all storage locations
 * @returns {Object} Token status information
 */
export const debugTokenStatus = () => {
  const knoxToken = localStorage.getItem(TOKEN_KEY);
  const legacyToken = localStorage.getItem("token");
  const authToken = localStorage.getItem("authToken");

  console.log("=== Token Debug Info ===");
  console.log(`Knox Token: ${knoxToken ? "Present" : "Missing"}`);
  console.log(`Legacy Token: ${legacyToken ? "Present" : "Missing"}`);
  console.log(`Auth Token: ${authToken ? "Present" : "Missing"}`);

  if (knoxToken) {
    console.log(`Knox Token Length: ${knoxToken.length}`);
    console.log(`Knox Token Preview: ${knoxToken.substring(0, 15)}...`);
  }

  return {
    hasKnoxToken: !!knoxToken,
    hasLegacyToken: !!legacyToken,
    hasAuthToken: !!authToken,
    tokenLength: knoxToken?.length || 0,
    areTokensConsistent: knoxToken === legacyToken && legacyToken === authToken,
  };
};
