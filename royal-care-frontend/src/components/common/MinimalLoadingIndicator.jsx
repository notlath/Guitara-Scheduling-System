import { useEffect, useState } from "react";
import "./MinimalLoadingIndicator.css";

/**
 * MinimalLoadingIndicator - Enhanced with immediate data display support
 * Only shows loading when no cached data is available
 * Shows background refresh indicator when data is being updated
 *
 * @param {boolean} show - Whether to show the loading indicator
 * @param {boolean} hasData - Whether data is already available (from cache)
 * @param {boolean} isRefreshing - Whether a background refresh is happening
 * @param {string} position - Position of the indicator
 * @param {string} size - Size of the indicator
 * @param {string} variant - Visual variant
 * @param {string} tooltip - Tooltip text for the indicator
 * @param {string} className - Additional CSS classes
 * @param {boolean} pulse - Whether to use pulse animation (default: true)
 * @param {boolean} fadeIn - Whether to fade in/out smoothly (default: true)
 * @param {string} color - Custom color override
 * @param {number} renderThreshold - Only show if operation takes longer than this (ms)
 * @param {number} timeoutWarning - Time in ms after which to show timeout warning
 * @param {number} errorTimeout - Time in ms after which to show error state
 * @param {string} operation - Description of the operation for timeout message
 */
const MinimalLoadingIndicator = ({
  show = false,
  hasData = false,
  isRefreshing = false,
  position = "bottom-right",
  size = "small",
  variant = "subtle",
  tooltip = "Loading...",
  className = "",
  pulse = true,
  fadeIn = true,
  color = null,
  renderThreshold = 300, // Only show after 300ms to avoid flash for quick operations
  timeoutWarning = 10000, // Increased from 8000 to 10000 for slow backend
  errorTimeout = 20000, // Increased from 15000 to 20000 for slow backend
  operation = "Loading data",
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [showErrorState, setShowErrorState] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Enhanced logic: Only show loading if no data available
  const shouldShowLoading = show && !hasData;
  const shouldShowRefreshing = isRefreshing && hasData;

  // Delay rendering to avoid flash for quick operations
  useEffect(() => {
    if (!shouldShowLoading && !shouldShowRefreshing) {
      setShouldRender(false);
      return;
    }

    // For refreshing with data, show immediately but subtly
    if (shouldShowRefreshing) {
      setShouldRender(true);
      return;
    }

    // For initial loading, delay to avoid flash
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, renderThreshold);

    return () => clearTimeout(timer);
  }, [shouldShowLoading, shouldShowRefreshing, renderThreshold]);

  // Track loading start time and reset states
  useEffect(() => {
    if (shouldShowLoading && !loadingStartTime) {
      setLoadingStartTime(Date.now());
      setShowTimeoutWarning(false);
      setShowErrorState(false);
    } else if (!shouldShowLoading) {
      setLoadingStartTime(null);
      setShowTimeoutWarning(false);
      setShowErrorState(false);
    }
  }, [shouldShowLoading, loadingStartTime]);

  // Set up timeout warnings and error state
  useEffect(() => {
    if (!shouldShowLoading || !loadingStartTime) return;

    const warningTimer = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, timeoutWarning);

    const errorTimer = setTimeout(() => {
      setShowErrorState(true);
    }, errorTimeout);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(errorTimer);
    };
  }, [shouldShowLoading, loadingStartTime, timeoutWarning, errorTimeout]);

  // Don't render at all if conditions aren't met
  if (!shouldRender) return null;

  const style = color ? { "--custom-color": color } : {};

  // Dynamic tooltip and variant based on state
  let currentTooltip = tooltip;
  let indicatorVariant = variant;

  // For background refreshing, use a more subtle variant
  if (shouldShowRefreshing) {
    currentTooltip = "Refreshing data...";
    indicatorVariant = "ghost";
  } else if (showErrorState) {
    currentTooltip = `${operation} failed or is taking too long (${Math.round(
      (Date.now() - loadingStartTime) / 1000
    )}s)`;
    indicatorVariant = "error";
  } else if (showTimeoutWarning) {
    currentTooltip = `${operation} is taking longer than expected (${Math.round(
      (Date.now() - loadingStartTime) / 1000
    )}s)`;
    indicatorVariant = "warning";
  }

  return (
    <div
      className={`minimal-loading-indicator ${position} ${size} ${indicatorVariant} ${
        pulse ? "pulse" : "static"
      } ${fadeIn ? "fade-in" : ""} ${showErrorState ? "error-state" : ""} ${
        showTimeoutWarning ? "timeout-warning" : ""
      } ${className}`}
      title={currentTooltip}
      role="status"
      aria-label={currentTooltip}
      style={style}
    >
      <div className="loading-dot" />
      {(showTimeoutWarning || showErrorState) && (
        <div className="timeout-message">
          <span className="timeout-text">
            {showErrorState
              ? "Failed or too slow!"
              : "Taking longer than expected..."}
          </span>
        </div>
      )}
    </div>
  );
};

export default MinimalLoadingIndicator;
