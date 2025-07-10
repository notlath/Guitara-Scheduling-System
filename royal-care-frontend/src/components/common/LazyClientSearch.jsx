import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import { getBaseURL, getToken } from "../../utils/authUtils";
import "./LazyClientSearch.css";

/**
 * Lazy loading client search component with infinite scroll and caching
 * @param {Object} props - Component props
 * @param {Object} props.selectedClient - Currently selected client
 * @param {Function} props.onClientSelect - Callback when client is selected
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.placeholder - Placeholder text for search input
 * @param {Function} props.onRegisterClientClick - DEPRECATED: No longer used since registration prompt was removed
 */
const LazyClientSearch = ({
  selectedClient,
  onClientSelect,
  error,
  disabled = false,
  placeholder = "Search client by name or phone..."
  // onRegisterClientClick param removed - no longer used
}) => {
  const { clientCache } = useAppointmentFormCache();

  // Debug logging for props
  useEffect(() => {
    if (selectedClient) {
      console.log(
        "🔍 LazyClientSearch selectedClient:",
        selectedClient?.first_name || "Unknown",
        selectedClient?.last_name || "Client"
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
    console.log("🔍 LazyClientSearch - Starting fetchAllClients");

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

      // Fetch from Django API (same as schedulingSlice)
      const token = getToken();
      console.log("🔍 LazyClientSearch - Token status:", {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 10) + "...",
      });

      if (!token) {
        console.error("❌ No authentication token available");
        setAllClients([]);
        setLoading(false);
        return;
      }

      console.log(
        "🔍 LazyClientSearch - Making API request to:",
        `${getBaseURL()}/registration/register/client/`
      );

      // Fetch ALL clients by handling pagination
      let allClients = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100; // Use a larger page size to reduce requests

      while (hasMore) {
        console.log(
          `🔍 LazyClientSearch - Fetching page ${page} with page_size=${pageSize}`
        );

        const response = await axios.get(
          `${getBaseURL()}/registration/register/client/?page=${page}&page_size=${pageSize}`,
          {
            headers: { Authorization: `Token ${token}` },
          }
        );

        console.log(`🔍 LazyClientSearch - Page ${page} response:`, {
          status: response.status,
          currentPage: response.data.current_page,
          totalPages: response.data.total_pages,
          count: response.data.count,
          hasNext: response.data.has_next,
          resultsLength: response.data.results?.length,
        });

        const pageClients = response.data.results || [];
        allClients = [...allClients, ...pageClients];

        hasMore = response.data.has_next;
        page++;

        // Safety check to prevent infinite loops
        if (page > 20) {
          console.warn(
            "🔍 LazyClientSearch - Breaking after 20 pages to prevent infinite loop"
          );
          break;
        }
      }

      console.log("🔍 LazyClientSearch - Final API response:", {
        totalPages: page - 1,
        totalClients: allClients.length,
        firstClient: allClients[0],
        jessClientsFound: allClients.filter(
          (c) =>
            (c.first_name || "").toLowerCase().includes("jess") ||
            (c.last_name || "").toLowerCase().includes("jess")
        ).length,
      });

      const clients = allClients;

      // Normalize the client data structure (same as schedulingSlice)
      const normalizedClients = clients.map((client) => ({
        id: client.id,
        first_name: client.first_name || client.Name?.split(" ")[0] || "",
        last_name:
          client.last_name || client.Name?.split(" ").slice(1).join(" ") || "",
        phone_number: client.phone_number || client.Contact || "",
        email: client.email || client.Email || "",
        address: client.address || client.Address || "",
        notes: client.notes || client.Notes || "",
        // Keep original fields for compatibility
        Name: client.Name,
        Email: client.Email,
        Contact: client.Contact,
        Address: client.Address,
        Notes: client.Notes,
      }));

      // Validate clients
      const validatedClients = normalizedClients
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

      console.log("🔍 LazyClientSearch - Normalized clients:", {
        originalCount: clients.length,
        normalizedCount: normalizedClients.length,
        validatedCount: validatedClients.length,
        jessClients: validatedClients
          .filter(
            (c) =>
              (c.first_name || "").toLowerCase().includes("jess") ||
              (c.last_name || "").toLowerCase().includes("jess")
          )
          .map((c) => ({
            name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
            phone: c.phone_number,
            original: { first_name: c.first_name, last_name: c.last_name },
          })),
      });

      // Cache the results
      if (validatedClients.length > 0) {
        clientCache.setAll(validatedClients);
        console.log("📋 LazyClientSearch - Cached clients:", {
          count: validatedClients.length,
          sampleNames: validatedClients
            .slice(0, 3)
            .map((c) => `${c.first_name || ""} ${c.last_name || ""}`),
          jessClients: validatedClients
            .filter(
              (c) =>
                (c.first_name || "").toLowerCase().includes("jess") ||
                (c.last_name || "").toLowerCase().includes("jess")
            )
            .map((c) => `${c.first_name || ""} ${c.last_name || ""}`),
        });
      }
      setAllClients(validatedClients);
    } catch (apiError) {
      console.error("❌ API Error fetching clients:", apiError);
      console.error("❌ API Error details:", {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        url: apiError.config?.url,
      });

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
    console.log("🔍 LazyClientSearch - Filtering:", {
      searchTerm: debouncedSearchTerm,
      searchLength: debouncedSearchTerm.length,
      totalClients: allClients.length,
      sampleClient: allClients[0],
    });

    if (debouncedSearchTerm.length === 0) {
      // Show first 10 clients when no search term
      const result = allClients.slice(0, 10);
      console.log(
        "🔍 No search term - showing first 10 clients:",
        result.length
      );
      return result;
    }

    // SIMPLIFIED SEARCH - Use consistent logic for all search term lengths
    const searchLower = debouncedSearchTerm.toLowerCase();
    console.log("🔍 Starting filter with searchLower:", searchLower);

    const filtered = allClients
      .filter((client, index) => {
        // Handle both field naming conventions
        const firstName = (
          client.first_name ||
          client.Name?.split(" ")[0] ||
          ""
        ).toLowerCase();
        const lastName = (
          client.last_name ||
          client.Name?.split(" ").slice(1).join(" ") ||
          ""
        ).toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const phone = client.phone_number || client.Contact || "";
        const email = (client.email || client.Email || "").toLowerCase();

        // Check if search term appears anywhere in name, phone, or email
        const nameMatch =
          fullName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower);
        const phoneMatch = phone.includes(debouncedSearchTerm);
        const emailMatch = email.includes(searchLower);

        const isMatch = nameMatch || phoneMatch || emailMatch;

        // Enhanced debug logging for all searches, especially "jess"
        if (
          searchLower === "jess" ||
          firstName.includes("jess") ||
          lastName.includes("jess")
        ) {
          console.log(`🔍 SEARCH DEBUG [${index}]:`, {
            searchTerm: debouncedSearchTerm,
            client: {
              id: client.id,
              original: {
                first_name: client.first_name,
                last_name: client.last_name,
                Name: client.Name,
                phone_number: client.phone_number,
                Contact: client.Contact,
              },
              computed: {
                firstName,
                lastName,
                fullName,
                phone,
                email,
              },
            },
            matches: {
              nameMatch,
              phoneMatch,
              emailMatch,
              isMatch,
            },
          });
        }

        return isMatch;
      })
      .slice(0, 50);

    console.log("🔍 LazyClientSearch - Filter results:", {
      searchTerm: debouncedSearchTerm,
      totalClients: allClients.length,
      matchCount: filtered.length,
      matches: filtered
        .map((c) => ({
          name: `${c.first_name || ""} ${c.last_name || ""}`,
          phone: c.phone_number,
          id: c.id,
        }))
        .slice(0, 5),
    });

    return filtered;
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
      console.log(
        "✅ Client selected:",
        client?.first_name || "Unknown",
        client?.last_name || "Client"
      );
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
      {/* Debug info - temporary */}
      {import.meta.env.DEV && (
        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
          Debug: {allClients.length} clients loaded | Search: "
          {debouncedSearchTerm}" | Filtered: {filteredClients.length}
          {allClients.length > 0 && (
            <span>
              {" "}
              | Sample: {allClients[0]?.first_name} {allClients[0]?.last_name}
            </span>
          )}
        </div>
      )}

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
