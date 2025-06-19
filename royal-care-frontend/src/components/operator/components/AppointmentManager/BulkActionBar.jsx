import "./BulkActionBar.module.css";

/**
 * BulkActionBar Component
 * Provides bulk action capabilities for selected appointments
 */
const BulkActionBar = ({
  selectedCount = 0,
  actions = [],
  onAction,
  onClearSelection,
  loading = {},
  className = "",
}) => {
  if (selectedCount === 0) {
    return null;
  }

  const handleAction = (actionId, options = {}) => {
    onAction?.(actionId, options);
  };

  const isActionLoading = (actionId) => {
    return loading[actionId] || false;
  };

  return (
    <div className={`bulk-action-bar ${className}`}>
      <div className="selection-info">
        <span className="selected-count">
          <i className="fas fa-check-square"></i>
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="bulk-actions">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`bulk-action-btn ${action.variant || "primary"}`}
            onClick={() => handleAction(action.id, action.options)}
            disabled={isActionLoading(action.id) || action.disabled}
            title={action.description || action.label}
          >
            {isActionLoading(action.id) ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className={action.icon}></i>
            )}
            <span>{action.label}</span>
            {action.count && (
              <span className="action-count">({action.count})</span>
            )}
          </button>
        ))}

        <button
          className="clear-selection-btn"
          onClick={onClearSelection}
          title="Clear selection"
        >
          <i className="fas fa-times"></i>
          Clear
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
