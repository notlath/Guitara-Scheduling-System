/**
 * WebAuthn/FIDO2 Helper Functions
 * This file provides utilities to prevent duplicate authentication script loading
 */

// Track whether the FIDO2 script has been loaded
let fido2ScriptLoaded = false;

/**
 * Safely loads the FIDO2 authentication script only once
 * @param {string} scriptId - The ID to assign to the script tag
 * @returns {Promise} - Resolves when the script is loaded or if already loaded
 */
export const loadFido2Script = (
  scriptId = "fido2-page-script-registration"
) => {
  return new Promise((resolve, reject) => {
    // If script is already loaded, resolve immediately
    if (fido2ScriptLoaded) {
      console.log("FIDO2 script already loaded, skipping duplicate loading");
      resolve();
      return;
    }

    // Check if the script already exists in the DOM
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      console.log("FIDO2 script found in DOM, marking as loaded");
      fido2ScriptLoaded = true;
      resolve();
      return;
    }

    // Create new script element with a unique ID
    const uniqueId = `${scriptId}-${Date.now()}`;
    const script = document.createElement("script");
    script.id = uniqueId;

    // Set success and error handlers
    script.onload = () => {
      console.log("FIDO2 script loaded successfully");
      fido2ScriptLoaded = true;
      resolve();
    };

    script.onerror = (error) => {
      console.error("Error loading FIDO2 script:", error);
      reject(error);
    };

    // Add the script to the document
    document.head.appendChild(script);
  });
};

/**
 * Cleanup FIDO2 script when no longer needed
 * Call this when navigating away from authentication pages
 */
export const cleanupFido2Script = () => {
  const scripts = document.querySelectorAll('[id^="fido2-page-script"]');
  scripts.forEach((script) => {
    script.remove();
  });
  fido2ScriptLoaded = false;
  console.log("FIDO2 scripts cleaned up");
};
