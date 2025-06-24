/**
 * API Request Utilities
 * Provides utilities to handle common API request issues in production
 */

/**
 * Create an axios configuration that's less likely to be blocked by ad blockers
 */
export const createAdBlockerFriendlyConfig = (baseConfig = {}) => {
  return {
    ...baseConfig,
    // Use different request headers that are less likely to be blocked
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Cache-Control": "no-cache",
      ...baseConfig.headers,
    },
    // Add timeout to prevent hanging requests
    timeout: 30000, // 30 seconds
    // Retry configuration
    validateStatus: (status) => {
      // Don't throw errors for 4xx and 5xx status codes
      // Let the application handle them gracefully
      return status < 600;
    },
  };
};

/**
 * Check if an error is caused by ad blocker or browser blocking
 */
export const isBlockedByClient = (error) => {
  return (
    error.code === "ERR_BLOCKED_BY_CLIENT" ||
    error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
    error.message?.includes("blocked by client") ||
    error.message?.includes("net::ERR_BLOCKED_BY_CLIENT")
  );
};

/**
 * Check if an error is a network/connection error
 */
export const isNetworkError = (error) => {
  return (
    error.code === "NETWORK_ERROR" ||
    error.code === "ERR_NETWORK" ||
    error.message?.includes("Network Error") ||
    error.message?.includes("ERR_NETWORK") ||
    !error.response // No response means network issue
  );
};

/**
 * Check if the server returned HTML instead of JSON (common error page scenario)
 */
export const isHTMLResponse = (error) => {
  const contentType = error.response?.headers?.["content-type"];
  return (
    contentType?.includes("text/html") ||
    error.message?.includes("Unexpected token") ||
    error.message?.includes("<!DOCTYPE")
  );
};

/**
 * Get user-friendly error message based on error type
 */
export const getUserFriendlyErrorMessage = (error) => {
  if (isBlockedByClient(error)) {
    return "Your request was blocked by your browser or an extension. Please check your ad blocker settings and try again.";
  }

  if (isNetworkError(error)) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (isHTMLResponse(error)) {
    return "The server is currently experiencing issues. Please try again later.";
  }

  if (error.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to access this resource.";
  }

  if (error.response?.status >= 500) {
    return "The server is currently experiencing issues. Please try again later.";
  }

  // Return the original error message if available
  return error.errorMessage || error.message || "An unexpected error occurred.";
};

/**
 * Retry configuration for common transient errors
 */
export const shouldRetryRequest = (error, retryCount = 0, maxRetries = 2) => {
  // Don't retry if we've exceeded max retries
  if (retryCount >= maxRetries) {
    return false;
  }

  // Don't retry client errors (4xx) except for specific cases
  if (error.response?.status >= 400 && error.response?.status < 500) {
    // Only retry 408 (Request Timeout) and 429 (Too Many Requests)
    return error.response.status === 408 || error.response.status === 429;
  }

  // Retry network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Retry server errors (5xx)
  if (error.response?.status >= 500) {
    return true;
  }

  // Don't retry blocked requests (they won't work anyway)
  if (isBlockedByClient(error)) {
    return false;
  }

  return false;
};

/**
 * Simple exponential backoff delay
 */
export const getRetryDelay = (retryCount) => {
  return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
};

/**
 * Sleep function for retry delays
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
