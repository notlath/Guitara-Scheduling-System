import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchAvailableDrivers } from "../../features/scheduling/schedulingSlice";
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import "./CachedDriverSelect.css";

/**
 * Cached driver select component with availability-based caching
 * @param {Object} props - Component props
 * @param {string} props.date - Selected appointment date
 * @param {string} props.startTime - Selected start time
 * @param {string} props.selectedDriver - Currently selected driver
 * @param {Function} props.onDriverSelect - Callback when driver is selected
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {boolean} props.loading - External loading state
 * @param {boolean} props.required - Whether driver selection is required
 */
const CachedDriverSelect = ({
  date,
  startTime,
  selectedDriver,
  onDriverSelect,
  error,
  disabled = false,
  loading: externalLoading = false,
  required = false,
}) => {
  const dispatch = useDispatch();
  const { driverCache } = useAppointmentFormCache();

  // Local state
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check if we have the required data to fetch drivers
  const canFetchDrivers = useMemo(() => {
    return date && startTime;
  }, [date, startTime]);

  // Fetch available drivers
  const fetchDrivers = useCallback(async () => {
    if (!canFetchDrivers || loading) return;

    setLoading(true);
    setFetchError(null);

    try {
      // Check cache first
      const cached = driverCache.getAvailable(date, startTime);
      if (cached) {
        setAvailableDrivers(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await dispatch(
        fetchAvailableDrivers({
          date,
          start_time: startTime,
        })
      ).unwrap();

      const drivers =
        response.drivers || response.available_drivers || response;

      // Cache the results
      driverCache.setAvailable(date, startTime, drivers);

      setAvailableDrivers(drivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setFetchError(error.message || "Failed to fetch available drivers");
      setAvailableDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch, driverCache, date, startTime, canFetchDrivers, loading]);

  // Fetch drivers when dependencies change
  useEffect(() => {
    if (canFetchDrivers) {
      fetchDrivers();
    } else {
      setAvailableDrivers([]);
      setFetchError(null);
    }
  }, [canFetchDrivers, fetchDrivers]);

  // Get display text for selected driver
  const getSelectedDriverText = useCallback(() => {
    if (!selectedDriver) return "";

    if (typeof selectedDriver === "object") {
      return `${selectedDriver.first_name || ""} ${
        selectedDriver.last_name || ""
      }`.trim();
    }

    // If it's just an ID, find the driver data
    const driverData = availableDrivers.find((d) => d.id === selectedDriver);
    return driverData
      ? `${driverData.first_name || ""} ${driverData.last_name || ""}`.trim()
      : "Selected Driver";
  }, [selectedDriver, availableDrivers]);

  // Handle driver selection
  const handleDriverSelect = useCallback(
    (driver) => {
      onDriverSelect(driver);
      setIsOpen(false);
    },
    [onDriverSelect]
  );

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (!disabled && canFetchDrivers) {
      setIsOpen(true);
    }
  }, [disabled, canFetchDrivers]);

  // Handle "No Driver" option
  const handleNoDriverSelect = useCallback(() => {
    onDriverSelect(null);
    setIsOpen(false);
  }, [onDriverSelect]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      const element = event.target.closest(".cached-driver-select");
      if (!element) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!canFetchDrivers) {
    return (
      <div className="cached-driver-select">
        <input
          type="text"
          value=""
          placeholder="Please select date and time first"
          className={`driver-select-input disabled ${error ? "error" : ""}`}
          disabled
          readOnly
        />
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="cached-driver-select">
      <input
        type="text"
        value={getSelectedDriverText()}
        onFocus={handleInputFocus}
        placeholder={
          required ? "Select driver..." : "Select driver (optional)..."
        }
        className={`driver-select-input ${error ? "error" : ""}`}
        disabled={disabled || loading || externalLoading}
        readOnly
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="driver-dropdown">
          {loading || externalLoading ? (
            <div className="driver-loading">
              <i className="fas fa-spinner fa-spin"></i>
              Loading available drivers...
            </div>
          ) : fetchError ? (
            <div className="driver-error">
              <i className="fas fa-exclamation-triangle"></i>
              {fetchError}
              <button
                type="button"
                onClick={fetchDrivers}
                className="retry-btn"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="driver-list">
              {/* No Driver Option (if not required) */}
              {!required && (
                <div
                  className={`driver-option no-driver ${
                    !selectedDriver ? "selected" : ""
                  }`}
                  onClick={handleNoDriverSelect}
                >
                  <div className="driver-info">
                    <div className="driver-name">No Driver Required</div>
                    <div className="driver-note">
                      Client will arrange their own transport
                    </div>
                  </div>
                  <div className="driver-status">
                    <i className="fas fa-walking"></i>
                    Self-transport
                  </div>
                </div>
              )}

              {/* Available Drivers */}
              {availableDrivers.length > 0 ? (
                availableDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={`driver-option ${
                      selectedDriver === driver.id ||
                      (typeof selectedDriver === "object" &&
                        selectedDriver.id === driver.id)
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleDriverSelect(driver)}
                  >
                    <div className="driver-info">
                      <div className="driver-name">
                        {driver.first_name} {driver.last_name}
                      </div>
                      {driver.vehicle_type && (
                        <div className="driver-vehicle">
                          Vehicle: {driver.vehicle_type}
                        </div>
                      )}
                      {driver.current_location && (
                        <div className="driver-location">
                          Location: {driver.current_location}
                        </div>
                      )}
                    </div>
                    <div className="driver-availability">
                      <i className="fas fa-check-circle available"></i>
                      Available
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-drivers">
                  <i className="fas fa-car"></i>
                  No drivers available for the selected date and time
                  {!required && (
                    <div className="no-drivers-suggestion">
                      You can select "No Driver Required" if the client will
                      arrange transport
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default CachedDriverSelect;
