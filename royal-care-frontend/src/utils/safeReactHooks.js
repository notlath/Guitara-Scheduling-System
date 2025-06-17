/**
 * Safe React Hooks Utilities
 * Provides fallbacks for React hook issues
 */

import React from "react";

// Check if React hooks are properly available
export const areHooksAvailable = () => {
  try {
    return (
      typeof React.useState === "function" &&
      typeof React.useEffect === "function" &&
      typeof React.useMemo === "function"
    );
  } catch (error) {
    console.error("Error checking React hooks availability:", error);
    return false;
  }
};

// Safe React import wrapper - for direct access to React functions
export const safeReact = {
  useState: React.useState,
  useEffect: React.useEffect,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,
};

// Check for React version conflicts
export const checkReactVersionConflicts = () => {
  try {
    const reactInstances = [];
    if (window.React) reactInstances.push("window.React");
    if (typeof globalThis !== "undefined" && globalThis.React) {
      reactInstances.push("global.React");
    }

    const hasConflict = reactInstances.length > 1 || !areHooksAvailable();

    if (hasConflict) {
      console.error("React version conflict detected!");
      console.log("Available React functions:", {
        useState: typeof React.useState,
        useEffect: typeof React.useEffect,
        useMemo: typeof React.useMemo,
        version: React.version,
        reactInstances,
      });
    }

    return hasConflict;
  } catch (error) {
    console.error("Error checking React version conflicts:", error);
    return true;
  }
};
