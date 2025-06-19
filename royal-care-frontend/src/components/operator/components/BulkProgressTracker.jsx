/**
 * BulkProgressTracker Component
 * Displays progress for bulk operations with detailed feedback
 */
import { useState } from "react";
import "./BulkProgressTracker.module.css";

const BulkProgressTracker = ({
  operations = {},
  onCancel,
  onRetry,
  onViewDetails,
  className = "",
}) => {
  const [expandedOperations, setExpandedOperations] = useState(new Set());

  const toggleExpanded = (operationKey) => {
    setExpandedOperations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(operationKey)) {
        newSet.delete(operationKey);
      } else {
        newSet.add(operationKey);
      }
      return newSet;
    });
  };

  const getOperationIcon = (operationKey) => {
    const icons = {
      bulk_approve: "fas fa-check",
      bulk_cancel: "fas fa-times",
      bulk_assign_drivers: "fas fa-car",
      bulk_mark_paid: "fas fa-credit-card",
      bulk_export: "fas fa-download",
    };
    return icons[operationKey] || "fas fa-cog";
  };

  const getOperationTitle = (operationKey) => {
    const titles = {
      bulk_approve: "Approving Appointments",
      bulk_cancel: "Cancelling Appointments",
      bulk_assign_drivers: "Assigning Drivers",
      bulk_mark_paid: "Processing Payments",
      bulk_export: "Exporting Data",
    };
    return titles[operationKey] || "Processing";
  };

  const activeOperations = Object.entries(operations).filter(
    ([, operation]) => operation
  );

  if (activeOperations.length === 0) return null;

  return (
    <div className={`bulk-progress-tracker ${className}`}>
      <div className="progress-header">
        <h3>
          <i className="fas fa-tasks" />
          Bulk Operations in Progress
        </h3>
        <span className="active-count">{activeOperations.length} active</span>
      </div>

      <div className="operations-list">
        {activeOperations.map(([operationKey, operation]) => (
          <div
            key={operationKey}
            className={`operation-item ${
              expandedOperations.has(operationKey) ? "expanded" : ""
            }`}
          >
            <div className="operation-header">
              <div className="operation-info">
                <div className="operation-icon">
                  <i className={getOperationIcon(operationKey)} />
                </div>
                <div className="operation-details">
                  <h4>{getOperationTitle(operationKey)}</h4>
                  <p>
                    {operation.completed} of {operation.total} items processed
                    {operation.percentage && ` (${operation.percentage}%)`}
                  </p>
                </div>
              </div>

              <div className="operation-actions">
                <button
                  className="expand-btn"
                  onClick={() => toggleExpanded(operationKey)}
                  aria-label={
                    expandedOperations.has(operationKey) ? "Collapse" : "Expand"
                  }
                >
                  <i
                    className={`fas fa-chevron-${
                      expandedOperations.has(operationKey) ? "up" : "down"
                    }`}
                  />
                </button>

                {onCancel && (
                  <button
                    className="cancel-btn"
                    onClick={() => onCancel(operationKey)}
                    aria-label="Cancel operation"
                  >
                    <i className="fas fa-stop" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${operation.percentage || 0}%` }}
              />
            </div>

            {/* Expanded Details */}
            {expandedOperations.has(operationKey) && (
              <div className="operation-expanded">
                <div className="progress-stats">
                  <div className="stat">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">{operation.total}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Completed:</span>
                    <span className="stat-value success">
                      {operation.completed}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Remaining:</span>
                    <span className="stat-value">
                      {operation.total - operation.completed}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Success Rate:</span>
                    <span className="stat-value">
                      {operation.completed > 0
                        ? Math.round(
                            (operation.completed / operation.total) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                {operation.errors && operation.errors.length > 0 && (
                  <div className="operation-errors">
                    <h5>
                      <i className="fas fa-exclamation-triangle" />
                      Errors ({operation.errors.length})
                    </h5>
                    <div className="error-list">
                      {operation.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="error-item">
                          <span className="error-message">{error.error}</span>
                          {error.item && (
                            <span className="error-item-id">
                              Item: {error.item.id || error.item}
                            </span>
                          )}
                        </div>
                      ))}
                      {operation.errors.length > 3 && (
                        <button
                          className="view-all-errors-btn"
                          onClick={() => onViewDetails?.(operationKey)}
                        >
                          View all {operation.errors.length} errors
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="operation-actions-expanded">
                  {operation.errors &&
                    operation.errors.length > 0 &&
                    onRetry && (
                      <button
                        className="retry-btn"
                        onClick={() => onRetry(operationKey)}
                      >
                        <i className="fas fa-redo" />
                        Retry Failed Items
                      </button>
                    )}

                  {onViewDetails && (
                    <button
                      className="details-btn"
                      onClick={() => onViewDetails(operationKey)}
                    >
                      <i className="fas fa-list" />
                      View Details
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkProgressTracker;
