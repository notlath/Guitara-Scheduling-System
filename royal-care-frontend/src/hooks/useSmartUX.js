/**
 * Smart UX Hook for detecting user and system context
 * Part of Solution #6: Smart Loading States with Context Awareness
 */

import React, { useEffect, useState } from "react";

/**
 * Smart UX Hook for detecting user and system context
 */
export const useSmartUX = () => {
  const [uxState, setUxState] = useState({
    connectionQuality: "good",
    userPatience: "normal",
    devicePerformance: "good",
    userActivity: "normal",
    lastInteraction: Date.now(),
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageLoadTime: 0,
    operationCount: 0,
    slowOperations: 0,
  });

  // Detect connection quality
  useEffect(() => {
    const updateConnectionQuality = () => {
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType;
        let quality = "good";

        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          quality = "poor";
        } else if (effectiveType === "3g") {
          quality = "average";
        } else if (effectiveType === "4g") {
          quality = "good";
        }

        setUxState((prev) => ({ ...prev, connectionQuality: quality }));
      }
    };

    updateConnectionQuality();

    if (navigator.connection) {
      navigator.connection.addEventListener("change", updateConnectionQuality);
      return () => {
        navigator.connection.removeEventListener(
          "change",
          updateConnectionQuality
        );
      };
    }
  }, []);

  // Detect device performance
  useEffect(() => {
    const detectDevicePerformance = () => {
      const hardwareConcurrency = navigator.hardwareConcurrency || 2;
      const memory = navigator.deviceMemory || 4;

      let performance = "good";

      if (hardwareConcurrency <= 2 || memory <= 2) {
        performance = "poor";
      } else if (hardwareConcurrency <= 4 || memory <= 4) {
        performance = "average";
      }

      setUxState((prev) => ({ ...prev, devicePerformance: performance }));
    };

    detectDevicePerformance();
  }, []);

  // Track user activity and patience
  const trackUserActivity = React.useCallback(() => {
    const now = Date.now();
    const timeSinceLastInteraction = now - uxState.lastInteraction;

    setUxState((prev) => {
      let activity = "normal";
      let patience = "normal";

      // High activity = frequent interactions
      if (timeSinceLastInteraction < 1000) {
        activity = "high";
        patience = "impatient";
      } else if (timeSinceLastInteraction > 10000) {
        activity = "low";
        patience = "patient";
      }

      return {
        ...prev,
        userActivity: activity,
        userPatience: patience,
        lastInteraction: now,
      };
    });
  }, [uxState.lastInteraction]);

  // Track performance metrics
  const trackOperationPerformance = React.useCallback((duration) => {
    setPerformanceMetrics((prev) => {
      const newCount = prev.operationCount + 1;
      const newAverage =
        (prev.averageLoadTime * prev.operationCount + duration) / newCount;
      const newSlowCount =
        duration > 3000 ? prev.slowOperations + 1 : prev.slowOperations;

      return {
        averageLoadTime: newAverage,
        operationCount: newCount,
        slowOperations: newSlowCount,
      };
    });
  }, []);

  // Set up activity tracking
  useEffect(() => {
    const events = ["click", "keydown", "scroll", "touchstart"];

    events.forEach((event) => {
      document.addEventListener(event, trackUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, trackUserActivity);
      });
    };
  }, [trackUserActivity]);

  return {
    uxState,
    performanceMetrics,
    trackUserActivity,
    trackOperationPerformance,

    // Computed states for easy use
    shouldShowSkeletons: uxState.connectionQuality === "poor",
    shouldPreloadAggressively: uxState.userPatience === "impatient",
    shouldReduceAnimations: uxState.devicePerformance === "poor",
    shouldShowProgressBars:
      uxState.connectionQuality === "poor" ||
      uxState.devicePerformance === "poor",

    // Performance insights
    isPerformancePoor:
      performanceMetrics.slowOperations /
        Math.max(1, performanceMetrics.operationCount) >
      0.3,
    averageLoadTime: performanceMetrics.averageLoadTime,
  };
};
