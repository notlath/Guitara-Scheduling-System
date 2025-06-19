import {
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import AppointmentCard from "./AppointmentCard";
import "./AppointmentList.module.css";

// Virtual scrolling constants
const ITEM_HEIGHT = 200; // Estimated height per appointment card
const BUFFER_SIZE = 5; // Items to render outside visible area
const VIRTUALIZATION_THRESHOLD = 50; // Enable virtualization for 50+ items

/**
 * Custom hook for virtual scrolling
 */
const useVirtualScrolling = (items, containerHeight = 600) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const shouldVirtualize = items.length > VIRTUALIZATION_THRESHOLD;

  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: items.length };
    }

    const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleEnd = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT)
    );

    return {
      start: Math.max(0, visibleStart - BUFFER_SIZE),
      end: Math.min(items.length, visibleEnd + BUFFER_SIZE),
    };
  }, [scrollTop, containerHeight, items.length, shouldVirtualize]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = items.length * ITEM_HEIGHT;
  const offsetY = visibleRange.start * ITEM_HEIGHT;

  return {
    shouldVirtualize,
    visibleRange,
    handleScroll,
    containerRef,
    totalHeight,
    offsetY,
    visibleItems: shouldVirtualize
      ? items.slice(visibleRange.start, visibleRange.end)
      : items,
  };
};

/**
 * AppointmentList Component
 * Renders a list of appointments with selection and bulk action capabilities
 */
const AppointmentList = ({
  appointments = [],
  loading = false,
  viewMode = "list", // 'list' or 'card'
  selectedAppointments = new Set(),
  onAppointmentSelect,
  onSelectAll,
  onAppointmentAction,
  showSelection = false,
  className = "",
  containerHeight = 600, // Add containerHeight prop for virtual scrolling
}) => {
  // Virtual scrolling setup
  const {
    shouldVirtualize,
    handleScroll,
    containerRef,
    totalHeight,
    offsetY,
    visibleItems,
  } = useVirtualScrolling(appointments, containerHeight);

  // Memoized selection state
  const selectionState = useMemo(() => {
    const totalCount = appointments.length;
    const selectedCount = selectedAppointments.size;
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;
    const isPartiallySelected =
      selectedCount > 0 && selectedCount < totalCount;

    return {
      totalCount,
      selectedCount,
      isAllSelected,
      isPartiallySelected,
    };
  }, [appointments.length, selectedAppointments.size]);

  const handleSelectAll = (checked) => {
    onSelectAll?.(checked);
  };

  const handleAppointmentSelect = (appointmentId) => {
    const isSelected = selectedAppointments.has(appointmentId);
    onAppointmentSelect?.(appointmentId, !isSelected);
  };

  if (loading) {
    return (
      <div className={`appointment-list-loading ${className}`}>
        <div className="loading-skeleton">
          {Array(5)
            .fill()
            .map((_, index) => (
              <div key={index} className="appointment-card-skeleton">
                <div className="skeleton-header" />
                <div className="skeleton-content">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
                <div className="skeleton-actions" />
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className={`appointment-list-empty ${className}`}>
        <div className="empty-state">
          <i className="fas fa-calendar-times" />
          <h3>No Appointments Found</h3>
          <p>Try adjusting your filters or check back later.</p>
        </div>
      </div>
    );
  }

  const listClassName = `appointment-list ${viewMode}-mode ${className}`;

  return (
    <div className={listClassName}>
      {/* Selection Header */}
      {showSelection && (
        <div className="selection-header">
          <div className="select-all-control">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={selectionState.isAllSelected}
                ref={(checkbox) => {
                  if (checkbox) {
                    checkbox.indeterminate = selectionState.isPartiallySelected;
                  }
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="label-text">
                Select All ({selectionState.selectedCount}/
                {selectionState.totalCount})
              </span>
            </label>
          </div>

          {selectionState.selectedCount > 0 && (
            <div className="selection-info">
              <span className="selected-count">
                {selectionState.selectedCount} selected
              </span>
            </div>
          )}
        </div>
      )}

      {/* Appointment Cards/Items */}
      <div
        className={`appointments-container ${viewMode}-container ${
          shouldVirtualize ? "virtualized" : "standard"
        }`}
        onScroll={shouldVirtualize ? handleScroll : undefined}
        ref={shouldVirtualize ? containerRef : undefined}
        style={
          shouldVirtualize
            ? {
                height: `${containerHeight}px`,
                overflowY: "auto",
              }
            : {}
        }
      >
        {shouldVirtualize ? (
          <div
            className="appointments-virtual-list"
            style={{
              height: `${totalHeight}px`,
              position: "relative",
            }}
          >
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
              }}
            >
              {visibleItems.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  viewMode={viewMode}
                  isSelected={selectedAppointments.has(appointment.id)}
                  showSelection={showSelection}
                  onSelect={() => handleAppointmentSelect(appointment.id)}
                  onAction={onAppointmentAction}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="appointments-standard-list">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                viewMode={viewMode}
                isSelected={selectedAppointments.has(appointment.id)}
                showSelection={showSelection}
                onSelect={() => handleAppointmentSelect(appointment.id)}
                onAction={onAppointmentAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
