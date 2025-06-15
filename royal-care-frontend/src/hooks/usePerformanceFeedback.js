/**
 * Custom hook for handling performance feedback and long-running operation warnings
 * Provides UI feedback when operations take longer than expected
 */

import { useCallback, useEffect, useState } from "react";

const usePerformanceFeedback = (options = {}) => {
  const {
    warningThreshold = 5000, // 5 seconds
    errorThreshold = 10000, // 10 seconds
    enableAutoWarning = true,
    onLongRunningOperation = null,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showError, setShowError] = useState(false);
  const [operationStartTime, setOperationStartTime] = useState(null);
  const [currentOperation, setCurrentOperation] = useState("");

  // Start tracking a new operation
  const startOperation = useCallback((operationName = "Loading") => {
    setIsLoading(true);
    setShowWarning(false);
    setShowError(false);
    setOperationStartTime(Date.now());
    setCurrentOperation(operationName);
  }, []);

  // End the current operation
  const endOperation = useCallback(() => {
    setIsLoading(false);
    setShowWarning(false);
    setShowError(false);
    setOperationStartTime(null);
    setCurrentOperation("");
  }, []);

  // Set up timeout warnings
  useEffect(() => {
    if (!isLoading || !operationStartTime || !enableAutoWarning) return;

    const warningTimer = setTimeout(() => {
      setShowWarning(true);
      if (onLongRunningOperation) {
        onLongRunningOperation({
          level: "warning",
          duration: Date.now() - operationStartTime,
          operation: currentOperation,
        });
      }
    }, warningThreshold);

    const errorTimer = setTimeout(() => {
      setShowError(true);
      if (onLongRunningOperation) {
        onLongRunningOperation({
          level: "error",
          duration: Date.now() - operationStartTime,
          operation: currentOperation,
        });
      }
    }, errorThreshold);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(errorTimer);
    };
  }, [
    isLoading,
    operationStartTime,
    enableAutoWarning,
    warningThreshold,
    errorThreshold,
    onLongRunningOperation,
    currentOperation,
  ]);

  // Listen for performance monitor events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLongRunningOperation = (event) => {
      const { detail } = event;
      if (detail.level === "warn") {
        setShowWarning(true);
      } else if (detail.level === "error") {
        setShowError(true);
      }

      if (onLongRunningOperation) {
        onLongRunningOperation(detail);
      }
    };

    window.addEventListener("longRunningOperation", handleLongRunningOperation);

    return () => {
      window.removeEventListener(
        "longRunningOperation",
        handleLongRunningOperation
      );
    };
  }, [onLongRunningOperation]);

  // Get appropriate loading indicator props
  const getLoadingProps = useCallback(() => {
    return {
      show: isLoading,
      variant: showError ? "error" : showWarning ? "warning" : "subtle",
      timeoutWarning: warningThreshold,
      operation: currentOperation,
      tooltip: showError
        ? "Operation is taking much longer than expected..."
        : showWarning
        ? "Operation is taking longer than expected..."
        : `${currentOperation}...`,
    };
  }, [isLoading, showError, showWarning, warningThreshold, currentOperation]);

  // Get current operation status
  const getOperationStatus = useCallback(() => {
    if (!isLoading) return "idle";
    if (showError) return "error";
    if (showWarning) return "warning";
    return "loading";
  }, [isLoading, showError, showWarning]);

  return {
    isLoading,
    showWarning,
    showError,
    operationStartTime,
    currentOperation,
    startOperation,
    endOperation,
    getLoadingProps,
    getOperationStatus,
    // Helper methods
    hasBeenLoading: operationStartTime ? Date.now() - operationStartTime : 0,
    isWarningState: showWarning && !showError,
    isErrorState: showError,
  };
};

export default usePerformanceFeedback;
