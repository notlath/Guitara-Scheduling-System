import "./MinimalLoadingIndicator.css";

/**
 * MinimalLoadingIndicator - A subtle, floating loading indicator
 * Similar to status-dot but for frequent data fetching operations
 * Non-intrusive design that won't interfere with user experience
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
}) => {
  if (!show) return null;

  const style = color ? { "--custom-color": color } : {};

  return (
    <div
      className={`minimal-loading-indicator ${position} ${size} ${variant} ${
        pulse ? "pulse" : "static"
      } ${fadeIn ? "fade-in" : ""} ${className}`}
      title={tooltip}
      role="status"
      aria-label={tooltip}
      style={style}
    >
      <div className="loading-dot" />
    </div>
  );
};

export default MinimalLoadingIndicator;
