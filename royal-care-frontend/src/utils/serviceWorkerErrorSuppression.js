/**
 * Service Worker Error Suppression Script
 * Reduces console spam from service worker network errors
 */

// Override console.warn to filter out service worker spam
(function () {
  const originalWarn = console.warn;
  const originalError = console.error;

  // Track error frequency to prevent spam
  const errorCache = new Map();
  const ERROR_COOLDOWN = 30000; // 30 seconds

  const shouldSuppressError = (message) => {
    const errorKey = typeof message === "string" ? message : String(message);

    // Check if this is a service worker related error
    const isServiceWorkerError =
      errorKey.includes("Service Worker") ||
      errorKey.includes("Failed to fetch") ||
      errorKey.includes("NetworkError") ||
      errorKey.includes("TypeError: Failed to fetch");

    if (!isServiceWorkerError) {
      return false;
    }

    // Check if we've already logged this error recently
    const lastErrorTime = errorCache.get(errorKey) || 0;
    const now = Date.now();

    if (now - lastErrorTime < ERROR_COOLDOWN) {
      return true; // Suppress
    }

    errorCache.set(errorKey, now);
    return false; // Allow
  };

  console.warn = function (...args) {
    if (args.length > 0 && !shouldSuppressError(args[0])) {
      originalWarn.apply(console, args);
    }
  };

  console.error = function (...args) {
    if (args.length > 0 && !shouldSuppressError(args[0])) {
      originalError.apply(console, args);
    }
  };

  // Clean up error cache periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, time] of errorCache.entries()) {
      if (now - time > ERROR_COOLDOWN * 2) {
        errorCache.delete(key);
      }
    }
  }, ERROR_COOLDOWN);

  console.log("Service Worker error suppression initialized");
})();
