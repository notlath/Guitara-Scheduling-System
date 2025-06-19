import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchAvailableTherapists } from "../../features/scheduling/schedulingSlice";
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import "./CachedTherapistSelect.css";

/**
 * Cached therapist select component with availability-based caching
 * @param {Object} props - Component props
 * @param {string} props.date - Selected appointment date
 * @param {string} props.startTime - Selected start time
 * @param {string} props.services - Selected services (comma-separated IDs)
 * @param {Array} props.selectedTherapists - Currently selected therapists
 * @param {Function} props.onTherapistSelect - Callback when therapist is selected
 * @param {Function} props.onTherapistRemove - Callback when therapist is removed
 * @param {boolean} props.multipleSelection - Whether multiple therapists can be selected
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {boolean} props.loading - External loading state
 */
const CachedTherapistSelect = ({
  date,
  startTime,
  services = "",
  selectedTherapists = [],
  onTherapistSelect,
  onTherapistRemove,
  multipleSelection = false,
  error,
  disabled = false,
  loading: externalLoading = false,
}) => {
  const dispatch = useDispatch();
  const { therapistCache } = useAppointmentFormCache();

  // Local state
  const [availableTherapists, setAvailableTherapists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check if we have the required data to fetch therapists
  const canFetchTherapists = useMemo(() => {
    return date && startTime && services;
  }, [date, startTime, services]);

  // Fetch available therapists
  const fetchTherapists = useCallback(async () => {
    if (!canFetchTherapists || loading) return;

    setLoading(true);
    setFetchError(null);

    try {
      // Check cache first
      const cached = therapistCache.getAvailable(date, startTime, services);
      if (cached) {
        setAvailableTherapists(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await dispatch(
        fetchAvailableTherapists({
          date,
          start_time: startTime,
          services: services.split(",").filter(Boolean),
        })
      ).unwrap();

      const therapists =
        response.therapists || response.available_therapists || response;

      // Cache the results
      therapistCache.setAvailable(date, startTime, services, therapists);

      setAvailableTherapists(therapists);
    } catch (error) {
      console.error("Error fetching therapists:", error);
      setFetchError(error.message || "Failed to fetch available therapists");
      setAvailableTherapists([]);
    } finally {
      setLoading(false);
    }
  }, [
    dispatch,
    therapistCache,
    date,
    startTime,
    services,
    canFetchTherapists,
    loading,
  ]);

  // Fetch therapists when dependencies change
  useEffect(() => {
    if (canFetchTherapists) {
      fetchTherapists();
    } else {
      setAvailableTherapists([]);
      setFetchError(null);
    }
  }, [canFetchTherapists, fetchTherapists]);

  // Filter out already selected therapists
  const selectableTherapists = useMemo(() => {
    if (!multipleSelection) return availableTherapists;

    const selectedIds = selectedTherapists.map((t) => t.id || t);
    return availableTherapists.filter(
      (therapist) => !selectedIds.includes(therapist.id)
    );
  }, [availableTherapists, selectedTherapists, multipleSelection]);

  // Handle therapist selection
  const handleTherapistSelect = useCallback(
    (therapist) => {
      onTherapistSelect(therapist);
      if (!multipleSelection) {
        setIsOpen(false);
      }
    },
    [onTherapistSelect, multipleSelection]
  );

  // Handle therapist removal (for multiple selection)
  const handleTherapistRemove = useCallback(
    (therapist) => {
      if (onTherapistRemove) {
        onTherapistRemove(therapist);
      }
    },
    [onTherapistRemove]
  );

  // Get display text for single selection
  const getSelectedTherapistText = useCallback(() => {
    if (multipleSelection || selectedTherapists.length === 0) return "";

    const therapist = selectedTherapists[0];
    if (typeof therapist === "object") {
      return `${therapist.first_name || ""} ${
        therapist.last_name || ""
      }`.trim();
    }

    // If it's just an ID, find the therapist data
    const therapistData = availableTherapists.find((t) => t.id === therapist);
    return therapistData
      ? `${therapistData.first_name || ""} ${
          therapistData.last_name || ""
        }`.trim()
      : "Selected Therapist";
  }, [selectedTherapists, multipleSelection, availableTherapists]);

  // Handle input focus for single selection
  const handleInputFocus = useCallback(() => {
    if (!disabled && canFetchTherapists) {
      setIsOpen(true);
    }
  }, [disabled, canFetchTherapists]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      const element = event.target.closest(".cached-therapist-select");
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

  if (!canFetchTherapists) {
    return (
      <div className="cached-therapist-select">
        <div
          className={`therapist-select-input disabled ${error ? "error" : ""}`}
        >
          <span className="placeholder-text">
            Please select date, time, and services first
          </span>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="cached-therapist-select">
      {/* Multiple Selection Display */}
      {multipleSelection && (
        <div className={`therapist-multi-select ${error ? "error" : ""}`}>
          <div className="selected-therapists">
            {selectedTherapists.length > 0 ? (
              selectedTherapists.map((therapist, index) => (
                <div
                  key={therapist.id || index}
                  className="selected-therapist-tag"
                >
                  <span>
                    {typeof therapist === "object"
                      ? `${therapist.first_name || ""} ${
                          therapist.last_name || ""
                        }`.trim()
                      : "Selected Therapist"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTherapistRemove(therapist)}
                    className="remove-therapist"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <span className="placeholder-text">Select therapists...</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="add-therapist-btn"
            disabled={disabled || loading || externalLoading}
          >
            {loading || externalLoading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-plus"></i>
            )}
          </button>
        </div>
      )}

      {/* Single Selection Input */}
      {!multipleSelection && (
        <input
          type="text"
          value={getSelectedTherapistText()}
          onFocus={handleInputFocus}
          placeholder="Select therapist..."
          className={`therapist-select-input ${error ? "error" : ""}`}
          disabled={disabled || loading || externalLoading}
          readOnly
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="therapist-dropdown">
          {loading || externalLoading ? (
            <div className="therapist-loading">
              <i className="fas fa-spinner fa-spin"></i>
              Loading available therapists...
            </div>
          ) : fetchError ? (
            <div className="therapist-error">
              <i className="fas fa-exclamation-triangle"></i>
              {fetchError}
              <button
                type="button"
                onClick={fetchTherapists}
                className="retry-btn"
              >
                Retry
              </button>
            </div>
          ) : selectableTherapists.length > 0 ? (
            <div className="therapist-list">
              {selectableTherapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className="therapist-option"
                  onClick={() => handleTherapistSelect(therapist)}
                >
                  <div className="therapist-info">
                    <div className="therapist-name">
                      {therapist.first_name} {therapist.last_name}
                    </div>
                    {therapist.specialization && (
                      <div className="therapist-specialization">
                        {therapist.specialization}
                      </div>
                    )}
                    {therapist.massage_pressure && (
                      <div className="therapist-pressure">
                        Pressure: {therapist.massage_pressure}
                      </div>
                    )}
                  </div>
                  <div className="therapist-availability">
                    <i className="fas fa-check-circle available"></i>
                    Available
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-therapists">
              <i className="fas fa-calendar-times"></i>
              No therapists available for the selected date, time, and services
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default CachedTherapistSelect;
