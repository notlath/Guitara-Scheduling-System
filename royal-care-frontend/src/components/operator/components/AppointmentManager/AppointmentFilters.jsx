/**
 * Appointment Filters Component
 * Provides filtering options for appointment management
 */

const AppointmentFilters = ({
  filters = {},
  onFilterChange,
  appointmentCount = 0,
  className = "",
}) => {
  const handleFilterUpdate = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      status: "all",
      search: "",
      dateRange: "today",
      priority: "all",
    });
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.search ||
    filters.dateRange !== "today" ||
    filters.priority !== "all";

  return (
    <div className={`appointment-filters ${className}`}>
      <div className="filters-row">
        {/* Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            value={filters.status || "all"}
            onChange={(e) => handleFilterUpdate("status", e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="pickup_requested">Pickup Requested</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="filter-group">
          <label className="filter-label">Date Range</label>
          <select
            value={filters.dateRange || "today"}
            onChange={(e) => handleFilterUpdate("dateRange", e.target.value)}
            className="filter-select"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="filter-group">
          <label className="filter-label">Priority</label>
          <select
            value={filters.priority || "all"}
            onChange={(e) => handleFilterUpdate("priority", e.target.value)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        {/* Search Filter */}
        <div className="filter-group search-group">
          <label className="filter-label">Search</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              value={filters.search || ""}
              onChange={(e) => handleFilterUpdate("search", e.target.value)}
              placeholder="Search by client name, phone, or ID..."
              className="search-input"
            />
            <i className="fas fa-search search-icon" />
            {filters.search && (
              <button
                onClick={() => handleFilterUpdate("search", "")}
                className="clear-search-btn"
                title="Clear search"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Actions */}
      <div className="filters-actions">
        <div className="filter-results">
          {appointmentCount === 0 ? (
            <span className="no-results">No appointments found</span>
          ) : (
            <span className="results-count">
              {appointmentCount} appointment{appointmentCount !== 1 ? "s" : ""}{" "}
              found
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-filters-btn">
            <i className="fas fa-times" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Quick Filter Buttons */}
      <div className="quick-filters">
        <button
          onClick={() => handleFilterUpdate("status", "rejected")}
          className={`quick-filter-btn ${
            filters.status === "rejected" ? "active" : ""
          }`}
        >
          <i className="fas fa-times-circle" />
          Rejected
        </button>
        <button
          onClick={() => handleFilterUpdate("status", "overdue")}
          className={`quick-filter-btn ${
            filters.status === "overdue" ? "active" : ""
          }`}
        >
          <i className="fas fa-exclamation-triangle" />
          Overdue
        </button>
        <button
          onClick={() => handleFilterUpdate("status", "awaiting_payment")}
          className={`quick-filter-btn ${
            filters.status === "awaiting_payment" ? "active" : ""
          }`}
        >
          <i className="fas fa-credit-card" />
          Payment Due
        </button>
        <button
          onClick={() => handleFilterUpdate("status", "pickup_requested")}
          className={`quick-filter-btn ${
            filters.status === "pickup_requested" ? "active" : ""
          }`}
        >
          <i className="fas fa-car" />
          Need Driver
        </button>
      </div>
    </div>
  );
};

export default AppointmentFilters;
