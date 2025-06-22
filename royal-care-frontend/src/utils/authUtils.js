// Utility functions for better authentication and error handling
import {
  getToken,
  getAuthHeaders as getTokenHeaders,
  hasValidToken,
  removeToken,
} from "./tokenManager";

export const handleAuthenticationError = (error) => {
  // Check if error is authentication related
  const isAuthError =
    error?.response?.status === 401 ||
    error?.status === 401 ||
    error?.message?.includes("401") ||
    error?.message?.includes("Authentication") ||
    error?.message?.includes("Unauthorized");

  if (isAuthError) {
    // Clear localStorage and redirect to login
    removeToken();
    localStorage.removeItem("user");

    // Show user-friendly message
    alert(
      "Your session has expired. You will be redirected to the login page."
    );

    // Redirect to login
    window.location.href = "/";

    return true; // Indicates auth error was handled
  }

  return false; // Not an auth error
};

export const isValidToken = () => {
  return hasValidToken();
};

export const getAuthHeaders = () => {
  return getTokenHeaders();
};

// Debounce utility for API calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Safe error message extraction
export const getErrorMessage = (
  error,
  defaultMessage = "An error occurred"
) => {
  if (typeof error === "string") return error;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  return defaultMessage;
};

// Enhanced token validation and debugging
export const validateTokenAndDebug = () => {
  const token = getToken();
  const user = localStorage.getItem("user");

  console.log("🔍 Token Debug Info:", {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenStart: token?.substring(0, 20) + "...",
    hasUser: !!user,
    userData: user ? JSON.parse(user) : null,
  });

  if (!token) {
    console.error("❌ No authentication token found");
    return false;
  }

  if (token.length < 20) {
    console.error("❌ Token appears to be invalid (too short)");
    return false;
  }

  return true;
};

// Force logout and redirect
export const forceLogout = (reason = "Session expired") => {
  console.log(`🚪 Forcing logout: ${reason}`);
  removeToken();
  localStorage.removeItem("user");
  sessionStorage.clear(); // Clear all session data
  window.location.href = "/";
};

// Check if we should retry authentication
export const shouldRetryAuth = (error) => {
  // Don't retry if clearly a permissions issue
  if (error?.response?.status === 403) {
    return false;
  }

  // Retry on 401 only if token exists (might be temporary network issue)
  if (error?.response?.status === 401) {
    return isValidToken();
  }

  return false;
};
