/**
 * Appointment Manager Component
 * Main component for managing appointments with filtering and bulk actions
 */
import { useMemo, useState } from "react";
import AppointmentFilters from "./AppointmentFilters";
import AppointmentList from "./AppointmentList";
import styles from "./AppointmentManager.module.css";
import BulkActionBar from "./BulkActionBar";

const AppointmentManager = ({
  appointments = [],
  loading = false,
  onAppointmentAction,
  onBulkAction,
  className = "",
}) => {
  // Filter state
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    dateRange: "today",
    priority: "all",
  });

  // Selection state
  const [selectedAppointments, setSelectedAppointments] = useState(new Set());

  // View preferences
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'card'
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");

  // Filter appointments based on current filters
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((apt) => apt.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.client_details?.first_name?.toLowerCase().includes(searchLower) ||
          apt.client_details?.last_name?.toLowerCase().includes(searchLower) ||
          apt.client_details?.phone_number?.includes(filters.search) ||
          apt.id?.toString().includes(filters.search)
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.date);

        switch (filters.dateRange) {
          case "today":
            return aptDate.toDateString() === startOfDay.toDateString();
          case "tomorrow": {
            const tomorrow = new Date(startOfDay);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return aptDate.toDateString() === tomorrow.toDateString();
          }
          case "week": {
            const weekFromNow = new Date(startOfDay);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return aptDate >= startOfDay && aptDate <= weekFromNow;
          }
          default:
            return true;
        }
      });
    }

    // Priority filter (based on urgency/status)
    if (filters.priority !== "all") {
      filtered = filtered.filter((apt) => {
        const isUrgent = apt.status === "overdue" || apt.status === "critical";
        const isHigh = apt.status === "pending" || apt.status === "rejected";

        switch (filters.priority) {
          case "urgent":
            return isUrgent;
          case "high":
            return isHigh;
          case "normal":
            return !isUrgent && !isHigh;
          default:
            return true;
        }
      });
    }

    // Sort appointments
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.date + " " + (a.start_time || "00:00"));
          bValue = new Date(b.date + " " + (b.start_time || "00:00"));
          break;
        case "client":
          aValue =
            (a.client_details?.first_name || "") +
            (a.client_details?.last_name || "");
          bValue =
            (b.client_details?.first_name || "") +
            (b.client_details?.last_name || "");
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "priority": {
          const priorityOrder = {
            overdue: 3,
            critical: 3,
            rejected: 2,
            pending: 2,
            confirmed: 1,
          };
          aValue = priorityOrder[a.status] || 0;
          bValue = priorityOrder[b.status] || 0;
          break;
        }
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [appointments, filters, sortBy, sortOrder]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setSelectedAppointments(new Set()); // Clear selection when filters change
  };

  // Handle appointment selection
  const handleAppointmentSelect = (appointmentId, selected) => {
    setSelectedAppointments((prev) => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(appointmentId);
      } else {
        newSelection.delete(appointmentId);
      }
      return newSelection;
    });
  };

  // Handle select all
  const handleSelectAll = (selectAll) => {
    if (selectAll) {
      setSelectedAppointments(
        new Set(filteredAppointments.map((apt) => apt.id))
      );
    } else {
      setSelectedAppointments(new Set());
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action, options = {}) => {
    const selectedIds = Array.from(selectedAppointments);

    if (selectedIds.length === 0) {
      return;
    }

    try {
      await onBulkAction?.(action, selectedIds, options);
      setSelectedAppointments(new Set()); // Clear selection after action
    } catch (error) {
      console.error("Bulk action failed:", error);
    }
  };

  // Available bulk actions based on selected appointments
  const availableBulkActions = useMemo(() => {
    if (selectedAppointments.size === 0) return [];

    const selectedAppts = filteredAppointments.filter((apt) =>
      selectedAppointments.has(apt.id)
    );

    const actions = [];

    // Check if any can be approved
    if (selectedAppts.some((apt) => apt.status === "pending")) {
      actions.push({
        id: "approve",
        label: "Approve Selected",
        icon: "fas fa-check",
        variant: "success",
      });
    }

    // Check if any can be assigned drivers
    if (
      selectedAppts.some((apt) => !apt.driver_id && apt.status === "confirmed")
    ) {
      actions.push({
        id: "assign-driver",
        label: "Assign Driver",
        icon: "fas fa-car",
        variant: "primary",
      });
    }

    // Check if any can be marked as paid
    if (selectedAppts.some((apt) => apt.status === "awaiting_payment")) {
      actions.push({
        id: "mark-paid",
        label: "Mark as Paid",
        icon: "fas fa-credit-card",
        variant: "success",
      });
    }

    // Cancel is always available for non-completed appointments
    if (
      selectedAppts.some(
        (apt) => !["completed", "cancelled"].includes(apt.status)
      )
    ) {
      actions.push({
        id: "cancel",
        label: "Cancel Selected",
        icon: "fas fa-times",
        variant: "danger",
      });
    }

    return actions;
  }, [selectedAppointments, filteredAppointments]);

  const stats = useMemo(
    () => ({
      total: appointments.length,
      filtered: filteredAppointments.length,
      selected: selectedAppointments.size,
    }),
    [
      appointments.length,
      filteredAppointments.length,
      selectedAppointments.size,
    ]
  );

  return (
    <div className={`${styles.appointmentManager} ${className}`}>
      {/* Header with stats */}
      <div className={styles.managerHeader}>
        <div className={styles.headerInfo}>
          <h2 className={styles.managerTitle}>Appointment Management</h2>
          <div className={styles.statsSummary}>
            <span className={styles.statItem}>
              {stats.filtered} of {stats.total} appointments
            </span>
            {stats.selected > 0 && (
              <span className={`${styles.statItem} ${styles.selected}`}>
                {stats.selected} selected
              </span>
            )}
          </div>
        </div>

        {/* View controls */}
        <div className={styles.viewControls}>
          <div className={styles.viewModeToggle}>
            <button
              className={`${styles.viewBtn} ${
                viewMode === "list" ? styles.active : ""
              }`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <i className="fas fa-list" />
            </button>
            <button
              className={`${styles.viewBtn} ${
                viewMode === "card" ? styles.active : ""
              }`}
              onClick={() => setViewMode("card")}
              title="Card view"
            >
              <i className="fas fa-th" />
            </button>
          </div>

          <div className={styles.sortControls}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="date">Sort by Date</option>
              <option value="client">Sort by Client</option>
              <option value="status">Sort by Status</option>
              <option value="priority">Sort by Priority</option>
            </select>
            <button
              className={styles.sortOrderBtn}
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
            >
              <i
                className={`fas fa-sort-${sortOrder === "asc" ? "up" : "down"}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AppointmentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        appointmentCount={stats.filtered}
      />

      {/* Bulk Actions */}
      {availableBulkActions.length > 0 && (
        <BulkActionBar
          selectedCount={selectedAppointments.size}
          actions={availableBulkActions}
          onAction={handleBulkAction}
          onClearSelection={() => setSelectedAppointments(new Set())}
        />
      )}

      {/* Appointment List */}
      <AppointmentList
        appointments={filteredAppointments}
        loading={loading}
        viewMode={viewMode}
        selectedAppointments={selectedAppointments}
        onAppointmentSelect={handleAppointmentSelect}
        onSelectAll={handleSelectAll}
        onAppointmentAction={onAppointmentAction}
        showSelection={true}
      />
    </div>
  );
};

export default AppointmentManager;
