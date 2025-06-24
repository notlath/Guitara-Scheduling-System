/**
 * Chrome Extension Error Suppressor
 * Prevents Chrome extension errors from flooding the console in production
 */

const CHROME_EXTENSION_ERROR_PATTERNS = [
  "chrome-extension://",
  "Unchecked runtime.lastError",
  "The page keeping the extension port is moved into back/forward cache",
  "Duplicate script ID",
  "No tab with id:",
  "Frame with ID",
  "was removed",
  "Failed to fetch",
  "WebSocket closed with status code",
  "Failed to start the connection",
  "triggerAutofillScriptInjection",
];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

/**
 * Filter function to check if an error is from a Chrome extension
 */
const isChromeExtensionError = (message) => {
  const messageStr = String(message);
  return CHROME_EXTENSION_ERROR_PATTERNS.some((pattern) =>
    messageStr.includes(pattern)
  );
};

/**
 * Filtered console.error that suppresses Chrome extension errors in production
 */
const filteredConsoleError = (...args) => {
  // In development, show all errors
  if (import.meta.env.MODE === "development") {
    return originalConsoleError(...args);
  }

  // In production, filter out Chrome extension errors
  const firstArg = args[0];
  if (isChromeExtensionError(firstArg)) {
    // Optionally log a summary instead of the full error
    return;
  }

  return originalConsoleError(...args);
};

/**
 * Filtered console.warn that suppresses Chrome extension warnings in production
 */
const filteredConsoleWarn = (...args) => {
  // In development, show all warnings
  if (import.meta.env.MODE === "development") {
    return originalConsoleWarn(...args);
  }

  // In production, filter out Chrome extension warnings
  const firstArg = args[0];
  if (isChromeExtensionError(firstArg)) {
    return;
  }

  return originalConsoleWarn(...args);
};

/**
 * Initialize the extension error suppressor
 * Call this once in your app's entry point
 */
export const initializeExtensionErrorSuppressor = () => {
  // Only apply in production to avoid hiding important development errors
  if (import.meta.env.MODE === "production") {
    console.error = filteredConsoleError;
    console.warn = filteredConsoleWarn;

    // Also handle window error events
    window.addEventListener("error", (event) => {
      if (isChromeExtensionError(event.message || event.error?.message)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      if (isChromeExtensionError(event.reason?.message || event.reason)) {
        event.preventDefault();
        return false;
      }
    });

    console.log(
      "🔇 Chrome extension error suppressor initialized for production"
    );
  } else {
    console.log(
      "🔍 Chrome extension error suppressor disabled in development mode"
    );
  }
};

/**
 * Reset console methods to original (for testing)
 */
export const resetConsoleErrorSuppressor = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};
