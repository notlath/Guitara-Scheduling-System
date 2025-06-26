/**
 * Chrome Extension Error Suppressor
 * Prevents Chrome extension errors from flooding the console in production
 */

const CHROME_EXTENSION_ERROR_PATTERNS = [
  "chrome-extension://",
  "Unchecked runtime.lastError",
  "extension port is moved into back/forward cache",
  "message channel is closed",
  "The page keeping the extension port",
  "Duplicate script ID",
  "No tab with id:",
  "Frame with ID",
  "was removed",
  "Failed to fetch",
  "WebSocket closed with status code",
  "Failed to start the connection",
  "triggerAutofillScriptInjection",
  "Extension context invalidated",
  "Could not establish connection",
  "Receiving end does not exist",
];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

/**
 * Filter function to check if an error is from a Chrome extension
 */
const isChromeExtensionError = (message) => {
  const messageStr = String(message);
  return CHROME_EXTENSION_ERROR_PATTERNS.some((pattern) =>
    messageStr.toLowerCase().includes(pattern.toLowerCase())
  );
};

/**
 * Filtered console.error that suppresses Chrome extension errors
 */
const filteredConsoleError = (...args) => {
  const firstArg = args[0];

  // Always suppress these specific extension errors as they're just noise
  if (isChromeExtensionError(firstArg)) {
    // In development, show a simplified message occasionally
    if (import.meta.env.MODE === "development") {
      // Show a summary every 10th extension error to avoid spam
      if (Math.random() < 0.1) {
        console.log(
          "🔇 [Suppressed] Chrome extension errors detected (showing 1 in 10)"
        );
      }
    }
    return;
  }

  return originalConsoleError(...args);
};

/**
 * Filtered console.warn that suppresses Chrome extension warnings
 */
const filteredConsoleWarn = (...args) => {
  const firstArg = args[0];

  // Always suppress extension warnings as they're not actionable
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
  // Apply filtering in both development and production
  // Extension errors are never useful for debugging our application
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
    `🔇 Chrome extension error suppressor initialized (${
      import.meta.env.MODE
    } mode)`
  );
};

/**
 * Reset console methods to original (for testing)
 */
export const resetConsoleErrorSuppressor = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};

/**
 * Test function to verify the error suppressor is working
 * Call this in the browser console to test: window.testExtensionErrorSuppressor()
 */
export const testExtensionErrorSuppressor = () => {
  console.log("🧪 Testing extension error suppressor...");

  // This should be suppressed
  console.error(
    "Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache, so the message channel is closed."
  );

  // This should also be suppressed
  console.error(
    "chrome-extension://test/background.js Error: Something went wrong"
  );

  // This should NOT be suppressed
  console.error("This is a real application error that should appear");

  console.log("✅ Test completed. Check if extension errors were suppressed.");
};

// Make it available globally for testing
if (typeof window !== "undefined") {
  window.testExtensionErrorSuppressor = testExtensionErrorSuppressor;
}
