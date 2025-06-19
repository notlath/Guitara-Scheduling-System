import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchClients } from "../../features/scheduling/schedulingSlice";
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import { filterClients } from "../../utils/searchUtils";
import "./LazyClientSearch.css";

/**
 * Lazy loading client search component with infinite scroll and caching
 * @param {Object} props - Component props
 * @param {Object} props.selectedClient - Currently selected client
 * @param {Function} props.onClientSelect - Callback when client is selected
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.placeholder - Placeholder text for search input
 */
const LazyClientSearch = ({
  selectedClient,
  onClientSelect,
  error,
  disabled = false,
  placeholder = "Search client by name or phone...",
}) => {
  const dispatch = useDispatch();
  const { clientCache } = useAppointmentFormCache();

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [allClients, setAllClients] = useState([]);

  // Refs
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all clients function
  const fetchAllClients = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      // Check cache first
      const cached = clientCache.getAll();
      if (cached && Array.isArray(cached)) {
        setAllClients(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const response = await dispatch(fetchClients()).unwrap();
      const clients = response.clients || response.results || response || [];

      // Ensure clients is an array
      const clientsArray = Array.isArray(clients) ? clients : [];

      // Cache the results
      clientCache.setAll(clientsArray);
      setAllClients(clientsArray);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setAllClients([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch, clientCache, loading]);

  // Load clients on component mount
  useEffect(() => {
    fetchAllClients();
  }, [fetchAllClients]);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (debouncedSearchTerm.length < 2) {
      // For very short searches, show first 10 clients
      return allClients.slice(0, 10);
    }

    // Use the search utility to filter clients
    return filterClients(allClients, debouncedSearchTerm, 50);
  }, [allClients, debouncedSearchTerm]);

  // Get display text for selected client
  const getSelectedClientText = useCallback(() => {
    if (!selectedClient) return "";
    const firstName = selectedClient.first_name || "";
    const lastName = selectedClient.last_name || "";
    const phone = selectedClient.phone_number || "";
    return `${firstName} ${lastName}${phone ? ` (${phone})` : ""}`.trim();
  }, [selectedClient]);

  // Handle input change
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      setSelectedIndex(-1);

      if (!isOpen && value) {
        setIsOpen(true);
      }
    },
    [isOpen]
  );

  // Handle client selection
  const handleClientSelect = useCallback(
    (client) => {
      onClientSelect(client);
      setSearchTerm("");
      setIsOpen(false);
      setSelectedIndex(-1);
    },
    [onClientSelect]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredClients.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && filteredClients[selectedIndex]) {
            handleClientSelect(filteredClients[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
        default:
          break;
      }
    },
    [isOpen, filteredClients, selectedIndex, handleClientSelect]
  );

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Update search term when selected client changes externally
  useEffect(() => {
    if (selectedClient && !isOpen) {
      setSearchTerm("");
    }
  }, [selectedClient, isOpen]);

  return (
    <div className="lazy-client-search" ref={dropdownRef}>
      <input
        ref={searchInputRef}
        type="text"
        value={
          searchTerm ||
          (selectedClient && !isOpen ? getSelectedClientText() : "")
        }
        onChange={handleInputChange}
        onFocus={() => {
          if (!isOpen) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`client-search-input ${error ? "error" : ""}`}
        disabled={disabled}
        autoComplete="off"
      />

      {isOpen && (
        <div className="client-search-results">
          {debouncedSearchTerm.length < 2 ? (
            <div className="client-search-hint">
              Type at least 2 characters to search for clients
            </div>
          ) : (
            <div className="client-results-scroll" ref={scrollContainerRef}>
              {filteredClients.length > 0 ? (
                filteredClients.map((client, index) => (
                  <div
                    key={`client-${client.id}`}
                    className={`client-search-item ${
                      index === selectedIndex ? "selected" : ""
                    }`}
                    onClick={() => handleClientSelect(client)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="client-name">
                      {client.first_name || ""} {client.last_name || ""}
                    </div>
                    <div className="client-phone">
                      {client.phone_number || "No phone number"}
                    </div>
                    {client.email && (
                      <div className="client-email">{client.email}</div>
                    )}
                  </div>
                ))
              ) : loading ? (
                <div className="client-search-loading">
                  <i className="fas fa-spinner fa-spin"></i>
                  Loading clients...
                </div>
              ) : (
                <div className="client-search-no-results">
                  {debouncedSearchTerm
                    ? `No clients found matching "${debouncedSearchTerm}"`
                    : "No clients available"}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LazyClientSearch;
