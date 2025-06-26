import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../services/supabaseClient";
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
  const { clientCache } = useAppointmentFormCache();

  // Debug logging for props
  useEffect(() => {
    if (selectedClient) {
      console.log(
        "🔍 LazyClientSearch selectedClient:",
        selectedClient.first_name,
        selectedClient.last_name
      );
    }
  }, [selectedClient]);

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

  // Fetch all clients function (from Supabase)
  const fetchAllClients = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      // Check cache first
      const cached = clientCache.getAll();
      if (cached && Array.isArray(cached) && cached.length > 0) {
        console.log("📋 Using cached clients:", cached.length);
  
        // Validate cached clients and ensure they have IDs
        const validatedCached = cached
          .map((client, index) => {
            if (!client || typeof client !== "object") {
              return null;
            }
            return {
              ...client,
              id: client.id || client.ID || `cached-${index}-${Date.now()}`,
            };
          })
          .filter((client) => client !== null);
  
        setAllClients(validatedCached);
        setLoading(false);
        return;
      }
  
      try {
        // Fetch from Supabase
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*');
          
        if (clientsError) throw clientsError;
        
        const clients = clientsData || [];
    
        // Ensure clients is an array
        const clientsArray = Array.isArray(clients) ? clients : [];
        
        // Validate API clients
        const validatedClients = clientsArray
          .map((client, index) => {
            if (!client || typeof client !== "object") {
              return null;
            }
            return {
              ...client,
              id: client.id || client.ID || `api-${index}-${Date.now()}`,
            };
          })
          .filter((client) => client !== null);
    
        // Cache the results
        if (validatedClients.length > 0) {
          clientCache.setAll(validatedClients);
        }
        setAllClients(validatedClients);
      } catch (apiError) {
        console.error("❌ API Error fetching clients:", apiError);
  
        // If API fails, try to use any cached data as fallback
        const fallbackCached = clientCache.getAll();
        if (fallbackCached && Array.isArray(fallbackCached)) {
          console.log(
            "📋 Using fallback cached clients due to API error:",
            fallbackCached.length
          );
          setAllClients(fallbackCached);
        } else {
          console.log("📋 No fallback cached clients available");
          setAllClients([]);
        }
      }
    } catch (error) {
      console.error("❌ General error in fetchAllClients:", error);
      setAllClients([]);
    } finally {
      setLoading(false);
    }
  }, [clientCache, loading]);

  // Load clients on component mount
  useEffect(() => {
    fetchAllClients();
  }, [fetchAllClients]);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (debouncedSearchTerm.length === 0) {
      // Show first 10 clients when no search term
      return allClients.slice(0, 10);
    }

    if (debouncedSearchTerm.length === 1) {
      // For single character, show clients that start with that character
      return allClients
        .filter((client) => {
          const firstName =
            client.first_name || client.Name?.split(" ")[0] || "";
          const lastName =
            client.last_name ||
            client.Name?.split(" ").slice(1).join(" ") ||
            "";
          const phone = client.phone_number || client.Contact || "";

          return (
            firstName
              .toLowerCase()
              .startsWith(debouncedSearchTerm.toLowerCase()) ||
            lastName
              .toLowerCase()
              .startsWith(debouncedSearchTerm.toLowerCase()) ||
            phone.startsWith(debouncedSearchTerm)
          );
        })
        .slice(0, 20);
    }

    // Use the search utility to filter clients for 2+ characters
    return filterClients(allClients, debouncedSearchTerm, 50);
  }, [allClients, debouncedSearchTerm]);

  // Get display text for selected client
  const getSelectedClientText = useCallback(() => {
    if (!selectedClient) return "";

    // Handle both field naming conventions
    const firstName = selectedClient.first_name || "";
    const lastName = selectedClient.last_name || "";
    const phone = selectedClient.phone_number || selectedClient.Contact || "";

    // If no first/last name, try the Name field
    if (!firstName && !lastName && selectedClient.Name) {
      return `${selectedClient.Name}${phone ? ` (${phone})` : ""}`.trim();
    }

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
      console.log("✅ Client selected:", client.first_name, client.last_name);
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
      const displayText = getSelectedClientText();
      console.log(
        "🔍 LazyClientSearch - Setting search term from selectedClient:",
        displayText
      );
      setSearchTerm(""); // Clear search term so the selected client shows instead
    } else if (!selectedClient) {
      setSearchTerm("");
    }
  }, [selectedClient, isOpen, getSelectedClientText]);

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
          {debouncedSearchTerm.length === 0 ? (
            <div className="client-search-hint">
              Start typing to search for clients or browse recent clients below
              {allClients.length === 0 && !loading && (
                <div
                  style={{ marginTop: "8px", fontSize: "0.9em", color: "#666" }}
                >
                  No clients available. You can add client details when creating
                  the appointment.
                </div>
              )}
            </div>
          ) : (
            <div className="client-results-scroll" ref={scrollContainerRef}>
              {filteredClients.length > 0 ? (
                filteredClients.map((client, index) => (
                  <div
                    key={`client-${client.id || client.ID || index}-${index}`}
                    className={`client-search-item ${
                      index === selectedIndex ? "selected" : ""
                    }`}
                    onClick={() => handleClientSelect(client)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="client-name">
                      {client.first_name || ""} {client.last_name || ""}
                      {/* Fallback to Name field if first_name/last_name are empty */}
                      {!client.first_name &&
                        !client.last_name &&
                        client.Name &&
                        client.Name}
                    </div>
                    <div className="client-phone">
                      {client.phone_number ||
                        client.Contact ||
                        "No phone number"}
                    </div>
                    {(client.email || client.Email) && (
                      <div className="client-email">
                        {client.email || client.Email}
                      </div>
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
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "0.9em",
                      color: "#666",
                    }}
                  >
                    Client details can be added when creating the appointment.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show initial clients list when no search term */}
          {debouncedSearchTerm.length === 0 && allClients.length > 0 && (
            <div className="client-results-scroll" ref={scrollContainerRef}>
              {allClients.slice(0, 10).map((client, index) => (
                <div
                  key={`client-initial-${
                    client.id || client.ID || index
                  }-${index}`}
                  className={`client-search-item ${
                    index === selectedIndex ? "selected" : ""
                  }`}
                  onClick={() => handleClientSelect(client)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="client-name">
                    {client.first_name || ""} {client.last_name || ""}
                    {!client.first_name &&
                      !client.last_name &&
                      client.Name &&
                      client.Name}
                  </div>
                  <div className="client-phone">
                    {client.phone_number || client.Contact || "No phone number"}
                  </div>
                  {(client.email || client.Email) && (
                    <div className="client-email">
                      {client.email || client.Email}
                    </div>
                  )}
                </div>
              ))}
              {allClients.length > 10 && (
                <div
                  className="client-search-hint"
                  style={{ padding: "8px", fontStyle: "italic" }}
                >
                  Showing first 10 clients. Type to search for more...
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
