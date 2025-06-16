/**
 * Smart Loading States with Context Awareness
 * Implements Solution #6: Adaptive loading indicators with context awareness
 */

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSmartUX } from "../hooks/useSmartUX";
import "./SmartLoadingStates.css";

/**
 * Adaptive Loading Indicator with context awareness and intelligent delays
 */
const AdaptiveLoadingIndicator = ({
  show,
  hasData,
  isRefreshing,
  context = "default",
  previousLoadTime = 0,
  operation = "Loading",
  priority = "normal", // low, normal, high, critical
  userActivity = "normal", // low, normal, high
  connectionQuality = "good", // poor, average, good
  devicePerformance = "good", // poor, average, good
  className = "",
  onTimeout,
  onShow,
  onHide,
}) => {
  const [shouldShowImmediate, setShouldShowImmediate] = useState(false);
  const [showAfterDelay, setShowAfterDelay] = useState(false);
  const [adaptiveMessage, setAdaptiveMessage] = useState("");
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Calculate adaptive delay based on context and performance indicators
  const adaptiveDelay = useMemo(() => {
    // Base delay considerations
    let delay = 300; // Default 300ms

    // Adjust based on data availability
    if (hasData) {
      delay = 500; // Longer delay if we have fallback data
    }

    // Adjust based on connection quality
    if (connectionQuality === "poor") {
      delay = 150; // Show sooner on poor connections
    } else if (connectionQuality === "good") {
      delay = 400; // Can wait longer on good connections
    }

    // Adjust based on device performance
    if (devicePerformance === "poor") {
      delay = 200; // Show sooner on slow devices
    }

    // Adjust based on user activity
    if (userActivity === "high") {
      delay = 200; // Impatient users - show sooner
    } else if (userActivity === "low") {
      delay = 600; // Patient users - can wait longer
    }

    // Adjust based on priority
    if (priority === "critical") {
      delay = 100; // Critical operations show immediately
    } else if (priority === "low") {
      delay = 800; // Low priority can wait
    }

    // Adjust based on context
    const contextDelays = {
      critical: 100,
      dashboard: hasData ? 500 : 200,
      background: 1000,
      form_save: 150,
      search: 300,
      default: 300,
    };

    delay = contextDelays[context] || delay;

    // Don't show loading for operations that were previously fast
    if (previousLoadTime > 0 && previousLoadTime < 1000) {
      delay = Math.max(delay, 800); // Wait longer for typically fast operations
    }

    return Math.max(100, Math.min(delay, 2000)); // Clamp between 100ms and 2s
  }, [
    hasData,
    connectionQuality,
    devicePerformance,
    userActivity,
    priority,
    context,
    previousLoadTime,
  ]);

  // Context-aware loading messages
  const getAdaptiveMessage = useMemo(() => {
    const baseMessages = {
      critical: "Loading essential data...",
      dashboard: hasData ? "Refreshing..." : "Loading dashboard...",
      background: "Updating in background...",
      form_save: "Saving changes...",
      search: "Searching...",
      upload: "Uploading file...",
      default: operation || "Loading...",
    };

    let message = baseMessages[context] || baseMessages.default;

    // Adapt message based on performance context
    if (connectionQuality === "poor") {
      message += " (slow connection detected)";
    }

    if (devicePerformance === "poor") {
      message += " (optimizing for your device)";
    }

    return message;
  }, [context, hasData, operation, connectionQuality, devicePerformance]);

  // Timeout thresholds based on context and performance
  const timeoutThreshold = useMemo(() => {
    const baseTimeout =
      {
        critical: 5000,
        dashboard: 8000,
        background: 15000,
        form_save: 10000,
        search: 5000,
        default: 10000,
      }[context] || 10000;

    // Adjust for connection quality
    const connectionMultiplier =
      {
        poor: 2.0,
        average: 1.5,
        good: 1.0,
      }[connectionQuality] || 1.0;

    return baseTimeout * connectionMultiplier;
  }, [context, connectionQuality]);

  // Set up show logic with adaptive delay
  useEffect(() => {
    if (!show || (show && !shouldShowImmediate)) {
      setShowAfterDelay(false);
      setTimeoutWarning(false);
      setStartTime(null);
      return;
    }

    const startTs = Date.now();
    setStartTime(startTs);

    if (onShow) {
      onShow({ context, delay: adaptiveDelay, message: getAdaptiveMessage });
    }

    // For refreshing with data, show immediately but subtly
    if (isRefreshing && hasData) {
      setShowAfterDelay(true);
      setAdaptiveMessage(getAdaptiveMessage);
      return;
    }

    // For initial loading, use adaptive delay
    const delayTimer = setTimeout(() => {
      setShowAfterDelay(true);
      setAdaptiveMessage(getAdaptiveMessage);
    }, adaptiveDelay);

    // Set up timeout warning
    const timeoutTimer = setTimeout(() => {
      setTimeoutWarning(true);
      if (onTimeout) {
        onTimeout({
          context,
          duration: Date.now() - startTs,
          message: getAdaptiveMessage,
        });
      }
    }, timeoutThreshold);

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(timeoutTimer);
    };
  }, [
    show,
    shouldShowImmediate,
    isRefreshing,
    hasData,
    adaptiveDelay,
    getAdaptiveMessage,
    timeoutThreshold,
    context,
    onShow,
    onTimeout,
  ]);

  // Determine if we should show immediately based on conditions
  useEffect(() => {
    const shouldShow =
      show &&
      (previousLoadTime > 3000 || // Previous operation was slow
        !hasData || // No fallback data
        priority === "critical" || // Critical priority
        connectionQuality === "poor"); // Poor connection

    setShouldShowImmediate(shouldShow);
  }, [show, previousLoadTime, hasData, priority, connectionQuality]);

  // Cleanup on hide
  useEffect(() => {
    if (!show && showAfterDelay) {
      if (onHide) {
        onHide({
          context,
          duration: startTime ? Date.now() - startTime : 0,
          wasVisible: showAfterDelay,
        });
      }
    }
  }, [show, showAfterDelay, context, startTime, onHide]);

  // Don't render if conditions aren't met
  if (!show || !showAfterDelay) return null;

  // Determine variant based on state
  let variant = "subtle";
  if (timeoutWarning) {
    variant = "warning";
  } else if (isRefreshing && hasData) {
    variant = "ghost";
  } else if (priority === "critical") {
    variant = "primary";
  } else if (connectionQuality === "poor") {
    variant = "info";
  }

  return (
    <div
      className={`adaptive-loading-indicator ${variant} ${context} ${className}`}
      role="status"
      aria-label={adaptiveMessage}
      data-context={context}
      data-priority={priority}
    >
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
      </div>

      <div className="loading-content">
        <span className="loading-message">{adaptiveMessage}</span>

        {timeoutWarning && (
          <span className="timeout-indicator">
            Taking longer than expected...
          </span>
        )}

        {connectionQuality === "poor" && (
          <span className="connection-indicator">Slow connection detected</span>
        )}
      </div>
    </div>
  );
};

/**
 * Contextual Loading Manager for different UI contexts
 */
export const LoadingContextManager = ({ children, context = "default" }) => {
  const { uxState, trackOperationPerformance } = useSmartUX();
  const { loading } = useSelector((state) => state.scheduling);

  const [loadingOperations, setLoadingOperations] = useState(new Map());

  const registerOperation = React.useCallback(
    (operationId, options = {}) => {
      const startTime = Date.now();
      setLoadingOperations((prev) =>
        new Map(prev).set(operationId, {
          startTime,
          context: options.context || context,
          priority: options.priority || "normal",
          ...options,
        })
      );

      return () => {
        const operation = loadingOperations.get(operationId);
        if (operation) {
          const duration = Date.now() - operation.startTime;
          trackOperationPerformance(duration);
          setLoadingOperations((prev) => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
        }
      };
    },
    [context, loadingOperations, trackOperationPerformance]
  );

  return (
    <div
      className={`loading-context-${context}`}
      data-ux-state={JSON.stringify(uxState)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            uxState,
            registerOperation,
            globalLoading: loading,
          });
        }
        return child;
      })}
    </div>
  );
};

export default AdaptiveLoadingIndicator;
