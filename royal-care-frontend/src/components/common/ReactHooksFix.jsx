/**
 * React Hooks Fix Component
 * Addresses React version conflicts and hook call issues
 */

import React from "react";

// Create a safe wrapper to detect React version issues
export const ReactHooksSafetyCheck = () => {
  // Check for React version conflicts
  const hasReactVersionConflict = () => {
    try {
      // Check if React hooks are properly available
      if (
        typeof React.useState !== "function" ||
        typeof React.useEffect !== "function" ||
        typeof React.useMemo !== "function"
      ) {
        return true;
      }

      // Check for multiple React instances
      const reactInstances = [];
      if (window.React) reactInstances.push("window.React");
      if (typeof globalThis !== "undefined" && globalThis.React) {
        reactInstances.push("global.React");
      }

      return reactInstances.length > 1;
    } catch (error) {
      console.error("Error checking React version:", error);
      return true;
    }
  };

  const hasConflict = hasReactVersionConflict();

  if (hasConflict) {
    console.error("React version conflict detected!");
    console.log("Available React functions:", {
      useState: typeof React.useState,
      useEffect: typeof React.useEffect,
      useMemo: typeof React.useMemo,
      version: React.version,
    });
  }

  return hasConflict;
};

const ReactHooksFix = () => {
  const hasConflict = ReactHooksSafetyCheck();

  if (hasConflict) {
    return (
      <div
        style={{
          padding: "20px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
        }}
      >
        <h3>React Version Conflict Detected</h3>
        <p>Multiple React instances are causing hook call issues.</p>
        <p>Please restart the development server.</p>
      </div>
    );
  }

  return null;
};

export default ReactHooksFix;
