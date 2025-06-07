import "./LoadingComponents.css";

// Enhanced Progress Bar with multiple variants
export const ProgressBar = ({
  progress = 0,
  variant = "primary",
  size = "medium",
  showPercentage = false,
  animated = true,
  className = "",
  label = "",
  indeterminate = false,
}) => {
  const progressValue = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={`progress-container ${size} ${className}`}>
      {label && <div className="progress-label">{label}</div>}
      <div
        className={`progress-bar ${variant} ${animated ? "animated" : ""} ${
          indeterminate ? "indeterminate" : ""
        }`}
      >
        <div
          className="progress-fill"
          style={{ width: indeterminate ? "100%" : `${progressValue}%` }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : progressValue}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={label || "Progress"}
        />
        {showPercentage && !indeterminate && (
          <span className="progress-percentage">
            {Math.round(progressValue)}%
          </span>
        )}
      </div>
    </div>
  );
};

// Enhanced Loading Spinner with multiple variants
export const LoadingSpinner = ({
  size = "medium",
  variant = "primary",
  text = "",
  overlay = false,
  className = "",
}) => {
  const SpinnerComponent = (
    <div
      className={`loading-spinner-container ${size} ${variant} ${className}`}
    >
      <div className="loading-spinner-circle">
        <div className="spinner-inner"></div>
      </div>
      {text && <div className="loading-text">{text}</div>}
    </div>
  );

  if (overlay) {
    return <div className="loading-overlay">{SpinnerComponent}</div>;
  }

  return SpinnerComponent;
};

// Skeleton Loading Component for content placeholders
export const SkeletonLoader = ({
  lines = 3,
  width = "100%",
  height = "1rem",
  avatar = false,
  className = "",
}) => {
  return (
    <div className={`skeleton-container ${className}`}>
      {avatar && <div className="skeleton-avatar" />}
      <div className="skeleton-content">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className="skeleton-line"
            style={{
              width: index === lines - 1 ? "70%" : width,
              height: height,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Button with Loading State
export const LoadingButton = ({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "medium",
  onClick,
  className = "",
  loadingText = "Loading...",
  ...props
}) => {
  return (
    <button
      className={`loading-button ${variant} ${size} ${
        loading ? "loading" : ""
      } ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <div className="button-spinner" />}
      <span className={loading ? "loading-text-hidden" : ""}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

// Optimistic Update Indicator (for real-time actions)
export const OptimisticIndicator = ({
  show = false,
  message = "Saving...",
  position = "top-right",
  className = "",
}) => {
  if (!show) return null;

  return (
    <div className={`optimistic-indicator ${position} ${className}`}>
      <div className="optimistic-content">
        <div className="optimistic-spinner" />
        <span>{message}</span>
      </div>
    </div>
  );
};

// Form Loading Overlay (non-intrusive)
export const FormLoadingOverlay = ({
  show = false,
  message = "Processing...",
  progress = null,
  className = "",
}) => {
  if (!show) return null;

  return (
    <div className={`form-loading-overlay ${className}`}>
      <div className="form-loading-content">
        <LoadingSpinner size="large" variant="primary" />
        <div className="form-loading-message">{message}</div>
        {progress !== null && (
          <ProgressBar
            progress={progress}
            variant="secondary"
            size="large"
            showPercentage={true}
            animated={true}
          />
        )}
      </div>
    </div>
  );
};

// Inline Loading Indicator (for table rows, lists, etc.)
export const InlineLoader = ({
  size = "small",
  variant = "subtle",
  className = "",
}) => {
  return (
    <div className={`inline-loader ${size} ${variant} ${className}`}>
      <div className="inline-spinner">
        <div className="dot dot-1"></div>
        <div className="dot dot-2"></div>
        <div className="dot dot-3"></div>
      </div>
    </div>
  );
};

// Data Table Loading State
export const TableLoadingState = ({
  rows = 5,
  columns = 4,
  className = "",
}) => {
  return (
    <div className={`table-loading-state ${className}`}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="table-loading-row">
          {Array.from({ length: columns }, (_, colIndex) => (
            <div
              key={colIndex}
              className="table-loading-cell"
              style={{
                width:
                  colIndex === 0
                    ? "25%"
                    : colIndex === columns - 1
                    ? "15%"
                    : "20%",
              }}
            >
              <div className="skeleton-line" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Page Loading State (for initial page loads)
export const PageLoadingState = ({
  title = "Loading...",
  subtitle = "Please wait while we load your data",
  showProgress = false,
  progress = 0,
  className = "",
}) => {
  return (
    <div className={`page-loading-state ${className}`}>
      <div className="page-loading-content">
        <LoadingSpinner size="large" variant="primary" />
        <h2 className="page-loading-title">{title}</h2>
        <p className="page-loading-subtitle">{subtitle}</p>
        {showProgress && (
          <ProgressBar
            progress={progress}
            variant="primary"
            size="large"
            showPercentage={true}
            animated={true}
            className="page-loading-progress"
          />
        )}
      </div>
    </div>
  );
};
