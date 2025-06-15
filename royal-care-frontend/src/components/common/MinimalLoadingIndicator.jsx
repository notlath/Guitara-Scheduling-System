import { useEffect, useState } from "react";
import "./MinimalLoadingIndicator.css";

/**
 * MinimalLoadingIndicator - A subtle, floating loading indicator with timeout warnings
 * Similar to status-dot but for frequent data fetching operations
 * Non-intrusive design that won't interfere with user experience
 * Now includes timeout warnings for long-running operations
 *
 * @param {boolean} show - Whether to show the loading indicator
 * @param {string} position - Position of the indicator (top-right, top-left, bottom-right, bottom-left, center-right, center-left)
 * @param {string} size - Size of the indicator (micro, small, medium, large)
 * @param {string} variant - Visual variant (default, primary, accent, subtle, ghost)
 * @param {string} tooltip - Tooltip text for the indicator
 * @param {string} className - Additional CSS classes
 * @param {boolean} pulse - Whether to use pulse animation (default: true)
 * @param {boolean} fadeIn - Whether to fade in/out smoothly (default: true)
 * @param {string} color - Custom color override
 * @param {number} timeoutWarning - Time in ms after which to show timeout warning (default: 8000)
 * @param {number} errorTimeout - Time in ms after which to show error state (default: 15000)
 * @param {string} operation - Description of the operation for timeout message
 */
const MinimalLoadingIndicator = ({
  show = false,
  position = "bottom-right",
  size = "small",
  variant = "subtle",
  tooltip = "Loading...",
  className = "",
  pulse = true,
  fadeIn = true,
  color = null,
  timeoutWarning = 10000, // Increased from 8000 to 10000 for slow backend
  errorTimeout = 20000, // Increased from 15000 to 20000 for slow backend
  operation = "Loading data",
}) => {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [showErrorState, setShowErrorState] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(null);

  // Track loading start time and reset states
  useEffect(() => {
    if (show && !loadingStartTime) {
      setLoadingStartTime(Date.now());
      setShowTimeoutWarning(false);
      setShowErrorState(false);
    } else if (!show) {
      setLoadingStartTime(null);
      setShowTimeoutWarning(false);
      setShowErrorState(false);
    }
  }, [show, loadingStartTime]);

  // Set up timeout warnings and error state
  useEffect(() => {
    if (!show || !loadingStartTime) return;

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
  }, [show, loadingStartTime, timeoutWarning, errorTimeout]);

  if (!show) return null;

  const style = color ? { "--custom-color": color } : {};

  // Dynamic tooltip based on state
  let currentTooltip = tooltip;
  let indicatorVariant = variant;

  if (showErrorState) {
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
