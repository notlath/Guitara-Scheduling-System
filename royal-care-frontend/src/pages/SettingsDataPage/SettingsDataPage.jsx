import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdAdd,
  MdBackup,
  MdClose,
  MdDownload,
  MdRestore,
} from "react-icons/md";
import { useSearchParams } from "react-router-dom";
import Select from "react-select";
import MinimalLoadingIndicator from "../../components/common/MinimalLoadingIndicator";
import ServerPagination from "../../components/ServerPagination";
import DataTable from "../../globals/DataTable";
import { FormField } from "../../globals/FormField";
import LayoutRow from "../../globals/LayoutRow";
import "../../globals/LayoutRow.css";
import PageLayout from "../../globals/PageLayout";
import TabSwitcher from "../../globals/TabSwitcher";
import useSettingsData from "../../hooks/useSettingsData";
import {
  api,
  checkUsernameAvailable,
  registerClient,
  registerDriver,
  registerMaterial,
  registerOperator,
  registerService,
  registerTherapist,
} from "../../services/api";
import "../../styles/LoadingConsistency.css";
import "../../styles/Placeholders.css";
import "../../styles/Settings.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import styles from "./SettingsDataPage.module.css";

const TABS = [
  "Therapists",
  "Drivers",
  "Operators",
  "Clients",
  "Services",
  "Materials",
];

const SPECIALIZATION_OPTIONS = [
  "Shiatsu Massage",
  "Combi Massage",
  "Dry Massage",
  "Foot Massage",
  "Hot Stone Service",
  "Ventosa",
];
const PRESSURE_OPTIONS = ["hard", "medium", "soft"];
const MATERIAL_OPTIONS = [
  "Lavender Oil",
  "Peppermint Oil",
  "Massage Lotion",
  "Alcohol Spray",
  "Ventosa Glass Bottles",
  "Hot Stone Kit",
];

// Map plural tab names to their singular form for modal titles
const TAB_SINGULARS = {
  Therapists: "Therapist",
  Drivers: "Driver",
  Operators: "Operator",
  Clients: "Client",
  Services: "Service",
  Materials: "Material",
};

// Helper function to capitalize names properly
const capitalizeName = (name) => {
  if (!name || typeof name !== "string") return "";

  // Split by spaces and capitalize each word
  return name
    .trim()
    .split(/\s+/) // Split by any whitespace (handles multiple spaces)
    .filter((word) => word.length > 0) // Remove empty strings
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to generate default username based on role and name
const generateDefaultUsername = (role, firstName, lastName) => {
  if (!lastName) return "";

  // Clean and prepare lastName only - prioritize lastName only
  const cleanLastName =
    (lastName || "")
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() || "";

  // Use only lastName - no fallback to firstName
  const name = cleanLastName;

  const prefixes = {
    Therapists: "rct",
    Drivers: "rcd",
    Operators: "rco",
  };

  const prefix = prefixes[role];
  if (!prefix || !name) return "";

  return `${prefix}_${name}`;
};

// (removed unused generateUniqueUsername function)

// Pagination defaults - Set to 12 items per page for production use
const DEFAULT_PAGE_SIZE = 12; // Display 12 items per page with navigation buttons

// Add fetch functions for each tab - Updated to return pagination metadata
const fetchers = {
  Therapists: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/therapist/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);
      const mappedItems = items.map((item) => ({
        Username: item.username,
        Name: `${capitalizeName(item.first_name) || ""} ${
          capitalizeName(item.last_name) || ""
        }`.trim(),
        Email: item.email,
        Contact: item.phone_number || "-",
        Specialization: item.specialization || "-",
        Pressure: item.pressure
          ? item.pressure.charAt(0).toUpperCase() + item.pressure.slice(1)
          : "-",
      }));

      // Return both data and pagination info
      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching therapists:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
  Drivers: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/driver/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);
      const mappedItems = items.map((item) => ({
        Username: item.username,
        Name: `${capitalizeName(item.first_name) || ""} ${
          capitalizeName(item.last_name) || ""
        }`.trim(),
        Email: item.email,
        Contact: item.phone_number || "-",
        Specialization: item.motorcycle_plate || "N/A",
        Pressure: "N/A",
      }));

      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching drivers:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
  Operators: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/operator/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);

      const mappedItems = items.map((item) => {
        // Safely handle name construction
        const firstName = capitalizeName(item.first_name || "");
        const lastName = capitalizeName(item.last_name || "");
        const fullName =
          [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

        return {
          Username: item.username || "N/A",
          Name: fullName,
          Email: item.email || "N/A",
          Contact: item.phone_number || "N/A", // This field might not exist
          Specialization: "N/A",
          Pressure: "N/A",
        };
      });

      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching operators:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
  Clients: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/client/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);
      const mappedItems = items.map((item) => ({
        Name: `${capitalizeName(item.first_name) || ""} ${
          capitalizeName(item.last_name) || ""
        }`.trim(),
        Email: item.email || "-",
        Address: item.address || "-",
        Contact: item.phone_number || "-",
        Notes: item.notes || "-",
      }));

      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching clients:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
  Services: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/service/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);

      const mappedItems = items.map((item) => {
        // Handle both Supabase and Django formats
        let materials = "-";

        if (Array.isArray(item.materials) && item.materials.length > 0) {
          materials = item.materials
            .map((mat) => {
              // Handle both object format { name: "..." } and string format
              if (typeof mat === "object" && mat.name) {
                return mat.name;
              } else if (typeof mat === "string") {
                return mat;
              }
              return null;
            })
            .filter(Boolean)
            .join(", ");
        }

        return {
          Name: item.name,
          Description: item.description || "-",
          Duration:
            item.duration !== undefined && item.duration !== null
              ? `${item.duration} min`
              : "-",
          Price:
            item.price !== undefined && item.price !== null
              ? `₱${item.price}`
              : "-",
          Materials: materials,
        };
      });

      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching services:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
  Materials: async (page = 1) => {
    try {
      const res = await api.get(
        `/registration/register/material/?page=${page}&page_size=${DEFAULT_PAGE_SIZE}`
      );
      const data = res.data;

      // Handle both old format (direct array) and new format (with results)
      const items = data.results || (Array.isArray(data) ? data : []);
      const mappedItems = items.map((item) => ({
        Name: item.name,
        Description: item.description || "-",
      }));

      return {
        data: mappedItems,
        pagination: {
          currentPage: data.current_page || page,
          totalPages:
            data.total_pages ||
            Math.ceil((data.count || mappedItems.length) / DEFAULT_PAGE_SIZE),
          totalItems: data.count || mappedItems.length,
          hasNext: data.has_next || false,
          hasPrevious: data.has_previous || false,
        },
      };
    } catch (error) {
      console.error("Error fetching materials:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  },
};

const SettingsDataPage = () => {
  // URL search params for tab and page persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab and page from URL parameters
  const urlTab = searchParams.get("tab");
  const urlPage = searchParams.get("page");

  // Validate tab parameter
  const initialTab = TABS.includes(urlTab) ? urlTab : TABS[0];
  const initialPage = urlPage ? Math.max(1, parseInt(urlPage, 10)) : 1;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [successPrompt, setSuccessPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");
  const [showBackupDropdown, setShowBackupDropdown] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Pagination state for each tab - Initialize with URL page if available
  const [currentPages, setCurrentPages] = useState({
    Therapists: activeTab === "Therapists" ? initialPage : 1,
    Drivers: activeTab === "Drivers" ? initialPage : 1,
    Operators: activeTab === "Operators" ? initialPage : 1,
    Clients: activeTab === "Clients" ? initialPage : 1,
    Services: activeTab === "Services" ? initialPage : 1,
    Materials: activeTab === "Materials" ? initialPage : 1,
  });

  // Pagination metadata for each tab
  const [paginationData, setPaginationData] = useState({
    Therapists: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
    Drivers: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
    Operators: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
    Clients: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
    Services: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
    Materials: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      hasNext: false,
      hasPrevious: false,
    },
  });

  const tableContainerRef = useRef(null);

  // Create enhanced fetchers that handle pagination - use useCallback for stability
  const enhancedFetchers = useMemo(() => {
    const createFetcher = (tabName) => async () => {
      const page = currentPages[tabName];
      console.log(
        `🔄 Fetching ${tabName} page ${page} with pageSize=${DEFAULT_PAGE_SIZE}`
      );

      try {
        const result = await fetchers[tabName](page);

        // Update pagination metadata immediately
        setPaginationData((prev) => {
          const newPaginationData = {
            ...prev,
            [tabName]: {
              ...result.pagination,
              // Ensure we have proper defaults
              currentPage: result.pagination.currentPage || page,
              totalPages: result.pagination.totalPages || 1,
              totalItems: result.pagination.totalItems || result.data.length,
              hasNext: result.pagination.hasNext || false,
              hasPrevious: result.pagination.hasPrevious || false,
            },
          };

          console.log(
            `📊 Updated pagination for ${tabName}:`,
            newPaginationData[tabName]
          );
          return newPaginationData;
        });

        // Return just the data for useSettingsData hook
        return result.data;
      } catch (error) {
        console.error(`❌ Error in enhanced fetcher for ${tabName}:`, error);
        // Reset pagination data on error
        setPaginationData((prev) => ({
          ...prev,
          [tabName]: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasNext: false,
            hasPrevious: false,
          },
        }));
        throw error;
      }
    };

    return Object.keys(fetchers).reduce((acc, tabName) => {
      acc[tabName] = createFetcher(tabName);
      return acc;
    }, {});
  }, [currentPages]);

  // Use the new settings data hook for immediate data display and caching
  const {
    tableData,
    isTabLoading,
    getTabError,
    loadTabData,
    refreshTabData,
    hasDataForTab,
    isTabDataStale,
    prefetchTabs,
  } = useSettingsData(enhancedFetchers);

  // Reset page to 1 when tab changes (separate effect to avoid infinite loops)
  useEffect(() => {
    setCurrentPages((prev) => ({
      ...prev,
      [activeTab]: 1,
    }));
  }, [activeTab]);

  // Track tab switching for immediate data display
  useEffect(() => {
    document.title = `${activeTab} | Royal Care`;

    // Load data for active tab with immediate cache display
    loadTabData(activeTab);

    // Prefetch adjacent tabs for smoother navigation
    const currentIndex = TABS.indexOf(activeTab);
    const adjacentTabs = [
      TABS[currentIndex - 1],
      TABS[currentIndex + 1],
    ].filter(Boolean);

    if (adjacentTabs.length > 0) {
      console.log(`🚀 SettingsData: Prefetching adjacent tabs:`, adjacentTabs);
      prefetchTabs(adjacentTabs);
    }
  }, [activeTab, loadTabData, prefetchTabs]);

  // Auto-refresh stale data in background
  useEffect(() => {
    if (isTabDataStale(activeTab) && hasDataForTab(activeTab)) {
      console.log(`🔄 SettingsData: Auto-refreshing stale ${activeTab} data`);
      refreshTabData(activeTab);
    }
  }, [activeTab, isTabDataStale, hasDataForTab, refreshTabData]);

  // URL parameter management functions
  const updateUrlParams = (newTab, newPage) => {
    const params = new URLSearchParams();
    if (newTab && newTab !== TABS[0]) {
      params.set("tab", newTab);
    }
    if (newPage && newPage !== 1) {
      params.set("page", newPage.toString());
    }

    // Only update if parameters actually changed
    const newParamsString = params.toString();
    const currentParamsString = searchParams.toString();
    if (newParamsString !== currentParamsString) {
      setSearchParams(params);
    }
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Reset to page 1 when changing tabs and update URL
    updateUrlParams(newTab, 1);
    setCurrentPages((prev) => ({
      ...prev,
      [newTab]: 1,
    }));
  };

  // Pagination handlers
  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > paginationData[activeTab].totalPages) return;

    // Update URL with new page
    updateUrlParams(activeTab, newPage);

    setCurrentPages((prev) => ({
      ...prev,
      [activeTab]: newPage,
    }));

    // Fetch new page data
    try {
      const result = await fetchers[activeTab](newPage);
      setPaginationData((prev) => ({
        ...prev,
        [activeTab]: result.pagination,
      }));

      // Refresh the tab data to show new page
      refreshTabData(activeTab);
    } catch (error) {
      console.error(`Error loading page ${newPage} for ${activeTab}:`, error);
    }
  };

  const handleAddClick = () => {
    setFormData({});
    setShowModal(true);
    setSuccessPrompt("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({});
    setUsernameError("");
    setIsCheckingUsername(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: checked };
      }

      let newValue = value;
      let updatedData = { ...prev };

      // Capitalize first and last names automatically
      if (name === "firstName" || name === "lastName") {
        newValue = capitalizeName(value);
        updatedData[name] = newValue;
      } else {
        updatedData[name] = newValue;
      }

      return updatedData;
    });
  };

  // Handle lastName field blur to generate username
  const handleLastNameBlur = async (e) => {
    const lastName = e.target.value.trim();

    if (
      !lastName ||
      !["Therapists", "Drivers", "Operators"].includes(activeTab)
    ) {
      return;
    }

    // Always generate username when lastName loses focus
    setIsCheckingUsername(true);
    setUsernameError("");

    try {
      const baseUsername = generateDefaultUsername(activeTab, "", lastName);

      if (baseUsername) {
        const response = await checkUsernameAvailable(baseUsername);

        if (response.data.available) {
          setFormData((prev) => ({
            ...prev,
            username: baseUsername,
          }));
          setUsernameError("");
        } else {
          setUsernameError(`Username "${baseUsername}" is already taken.`);
          // Try with number suffix
          let foundAvailable = false;
          for (let i = 1; i <= 99; i++) {
            const numberedUsername = `${baseUsername}${i}`;
            try {
              const numberResponse = await checkUsernameAvailable(
                numberedUsername
              );
              if (numberResponse.data.available) {
                setFormData((prev) => ({
                  ...prev,
                  username: numberedUsername,
                }));
                setUsernameError("");
                foundAvailable = true;
                break;
              }
            } catch (error) {
              console.warn(
                `Error checking username ${numberedUsername}:`,
                error
              );
            }
          }

          if (!foundAvailable) {
            setUsernameError(
              "Unable to generate available username. Please enter manually."
            );
          }
        }
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Handle username field change to clear errors
  const handleUsernameChange = async (e) => {
    const username = e.target.value;
    setFormData((prev) => ({ ...prev, username }));

    // Clear error when user starts typing
    if (usernameError) {
      setUsernameError("");
    }
  };

  // Handle username field blur to check availability
  const handleUsernameBlur = async (e) => {
    const username = e.target.value.trim();

    if (
      !username ||
      !["Therapists", "Drivers", "Operators"].includes(activeTab)
    ) {
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError("");

    try {
      const response = await checkUsernameAvailable(username);

      if (!response.data.available) {
        setUsernameError(`Username "${username}" is already taken.`);
      } else {
        setUsernameError("");
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability.");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // const handleMultiSelectChange = (e) => {
  //   const options = Array.from(e.target.selectedOptions, (opt) => opt.value);
  //   setFormData((prev) => ({ ...prev, materials: options }));
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for username errors before submitting
    if (usernameError) {
      setSuccessPrompt("Please fix username errors before submitting.");
      setTimeout(() => setSuccessPrompt(""), 3000);
      return;
    }

    // Check if username checking is in progress
    if (isCheckingUsername) {
      setSuccessPrompt("Please wait for username validation to complete.");
      setTimeout(() => setSuccessPrompt(""), 3000);
      return;
    }

    setIsSubmitting(true);
    // Sanitize only on submit
    let sanitized = { ...formData };
    if (sanitized.description) {
      sanitized.description = sanitizeFormInput(sanitized.description);
    }
    // Parse duration as integer if present
    if (sanitized.duration !== undefined && sanitized.duration !== "") {
      sanitized.duration = parseInt(sanitized.duration, 10);
      if (isNaN(sanitized.duration)) sanitized.duration = 0;
    }
    // Ensure price is a number
    if (sanitized.price !== undefined && sanitized.price !== "") {
      sanitized.price = Number(sanitized.price);
    }
    // Materials: ensure array of objects with name
    if (sanitized.materials && Array.isArray(sanitized.materials)) {
      sanitized.materials = sanitized.materials.map((mat) => ({ name: mat }));
    }
    let apiCall;
    let payload = { ...sanitized };
    setSuccessPrompt("");
    try {
      switch (activeTab) {
        case "Therapists":
          apiCall = registerTherapist;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
            specialization: sanitized.specialization,
            pressure: sanitized.pressure,
          };
          break;
        case "Drivers":
          apiCall = registerDriver;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
          };
          break;
        case "Operators":
          apiCall = registerOperator;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            username: sanitized.username,
            email: sanitized.email,
          };
          break;
        case "Clients":
          apiCall = registerClient;
          payload = {
            first_name: sanitized.firstName,
            last_name: sanitized.lastName,
            email: sanitized.email,
            phone_number: sanitized.phoneNumber,
            address: sanitized.address,
            notes: sanitized.notes || "",
          };
          break;
        case "Materials":
          apiCall = registerMaterial;
          payload = {
            name: sanitized.name,
            description: sanitized.description,
          };
          break;
        case "Services":
          apiCall = registerService;
          payload = {
            name: sanitized.name,
            description: sanitized.description,
            duration: sanitized.duration,
            price: sanitized.price,
            materials: sanitized.materials || [],
          };
          break;
        default:
          return;
      }
      const response = await apiCall(payload);
      setShowModal(false);

      // Handle different types of success responses
      if (response?.data?.fallback) {
        setSuccessPrompt(
          "Registered successfully! (Note: Stored locally due to database connectivity issues)"
        );
      } else {
        setSuccessPrompt("Registered successfully!");
      }
    } catch (err) {
      setSuccessPrompt(
        err?.errorMessage || err?.error || "Registration failed"
      );
      setTimeout(() => setSuccessPrompt(""), 3000);
      console.error("[handleSubmit] Registration error:", err);
    } finally {
      setIsSubmitting(false);
    }

    // Always refresh table after registration, even if there was an error
    console.log(
      `🔄 SettingsData: Refreshing ${activeTab} data after registration`
    );
    refreshTabData(activeTab);
    setTimeout(() => setSuccessPrompt(""), 2000);
  };

  // Backup functionality
  const handleBackupData = async () => {
    setIsBackingUp(true);
    setBackupStatus("");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${activeTab.toLowerCase()}_backup_${timestamp}.json`;

      // Get current data for the active tab
      const currentData = tableData[activeTab];

      if (!currentData || currentData.length === 0) {
        setBackupStatus("No data available to backup");
        return;
      }

      // Create backup object with metadata
      const backupData = {
        metadata: {
          type: activeTab,
          timestamp: new Date().toISOString(),
          count: currentData.length,
          version: "1.0",
          source: "Royal Care Scheduling System",
        },
        data: currentData,
      };

      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus(`✅ Backup created: ${filename}`);
    } catch (error) {
      console.error("Backup error:", error);
      setBackupStatus(`❌ Backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupStatus(""), 3000);
    }
  };

  // Backup all data at once
  const handleBackupAllData = async () => {
    setIsBackingUp(true);
    setBackupStatus("Creating complete backup...");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `royal_care_complete_backup_${timestamp}.json`;

      // Fetch all data types
      const allBackupData = {};
      let totalRecords = 0;

      for (const tab of TABS) {
        try {
          const data = await fetchers[tab]();
          allBackupData[tab] = data;
          totalRecords += data.length;
        } catch (error) {
          console.error(`Error fetching ${tab}:`, error);
          allBackupData[tab] = [];
        }
      }

      const completeBackup = {
        metadata: {
          type: "complete_backup",
          timestamp: new Date().toISOString(),
          totalRecords,
          dataTypes: TABS,
          version: "1.0",
          source: "Royal Care Scheduling System",
        },
        data: allBackupData,
      };

      const blob = new Blob([JSON.stringify(completeBackup, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStatus(
        `✅ Complete backup created with ${totalRecords} records`
      );
    } catch (error) {
      console.error("Complete backup error:", error);
      setBackupStatus(`❌ Complete backup failed: ${error.message}`);
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupStatus(""), 5000);
    }
  };

  // Restore functionality
  const handleRestoreData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setIsRestoring(true);
      setBackupStatus("Restoring data...");

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // Validate backup format
        if (!backupData.metadata || !backupData.data) {
          throw new Error("Invalid backup file format");
        }

        if (backupData.metadata.type === "complete_backup") {
          // Handle complete backup restore
          let restoredCount = 0;
          const results = {};

          for (const [dataType, records] of Object.entries(backupData.data)) {
            if (TABS.includes(dataType) && Array.isArray(records)) {
              results[dataType] = records.length;
              restoredCount += records.length;
              // Note: Direct table data update bypasses the cache
              // The data will be re-cached on next fetch
              console.log(
                `🔄 SettingsData: Restoring ${dataType} with ${records.length} records`
              );
            }
          }

          setBackupStatus(
            `✅ Restored complete backup: ${restoredCount} total records`
          );
        } else if (backupData.metadata.type === activeTab) {
          // Handle single tab restore
          if (!Array.isArray(backupData.data)) {
            throw new Error("Invalid data format in backup");
          }

          console.log(
            `🔄 SettingsData: Restoring ${activeTab} with ${backupData.data.length} records`
          );
          // Note: This bypasses the cache and will be refreshed on next load
          setBackupStatus(
            `✅ Restored ${activeTab}: ${backupData.data.length} records`
          );
        } else {
          throw new Error(
            `Backup type mismatch. Expected ${activeTab}, got ${backupData.metadata.type}`
          );
        }
      } catch (error) {
        console.error("Restore error:", error);
        setBackupStatus(`❌ Restore failed: ${error.message}`);
      } finally {
        setIsRestoring(false);
        setTimeout(() => setBackupStatus(""), 5000);
      }
    };

    input.click();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showBackupDropdown &&
        !event.target.closest(".backup-dropdown-container")
      ) {
        setShowBackupDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBackupDropdown]);

  // Simple skeleton loader for table (like BookingsPage)
  const renderTableSkeleton = () => {
    const tableConfig = getTableConfig();
    const skeletonRows = Array.from({ length: 5 }, (_, index) => (
      <tr key={`skeleton-${index}`} className={styles["table-skeleton-row"]}>
        {tableConfig.columns.map((col) => (
          <td key={`skeleton-${index}-${col.key}`}>
            <div className={styles["table-skeleton-cell"]}></div>
          </td>
        ))}
      </tr>
    ));

    return (
      <div className={styles["data-table-wrapper"]}>
        <table className={styles["data-table"]}>
          <thead>
            <tr className={styles["thead-row"]}>
              {tableConfig.columns.map((col) => (
                <th key={col.key} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{skeletonRows}</tbody>
        </table>
      </div>
    );
  };

  // Simple skeleton loader for form
  const renderFormSkeleton = () => {
    let fieldCount = 4; // Default for most forms

    switch (activeTab) {
      case "Therapists":
        fieldCount = 6;
        break;
      case "Clients":
        fieldCount = 6;
        break;
      case "Services":
        fieldCount = 5;
        break;
      case "Materials":
        fieldCount = 2;
        break;
      default:
        fieldCount = 4;
    }

    return (
      <div className={styles["form-skeleton"]}>
        {Array.from({ length: fieldCount }, (_, index) => (
          <div
            key={`form-skeleton-${index}`}
            className={styles["form-field-skeleton"]}
          ></div>
        ))}
        <div className={styles["form-button-skeleton"]}></div>
      </div>
    );
  };

  const renderFormFields = () => {
    switch (activeTab) {
      case "Therapists":
        return (
          <>
            <div className={styles["flex-row-fields"]}>
              <FormField
                name="firstName"
                label="First Name"
                value={formData.firstName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                onBlur={handleLastNameBlur}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
            </div>
            <FormField
              name="username"
              label="Username"
              value={formData.username || ""}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              inputProps={{
                placeholder: "rct_lastname",
                disabled: isCheckingUsername,
              }}
              error={usernameError}
              helperText={isCheckingUsername ? "Checking availability..." : ""}
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
            />
            <FormField
              as="select"
              name="specialization"
              label="Specialization"
              value={formData.specialization || ""}
              onChange={handleInputChange}
            >
              <option value="">Select Specialization</option>
              {SPECIALIZATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </FormField>
            <FormField
              as="select"
              name="pressure"
              label="Pressure Level"
              value={formData.pressure || ""}
              onChange={handleInputChange}
            >
              <option value="">Select Pressure Level</option>
              {PRESSURE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </FormField>
          </>
        );
      case "Drivers":
      case "Operators":
        return (
          <>
            <div className={styles["flex-row-fields"]}>
              <FormField
                name="firstName"
                label="First Name"
                value={formData.firstName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                onBlur={handleLastNameBlur}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
            </div>
            <FormField
              name="username"
              label="Username"
              value={formData.username || ""}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              inputProps={{
                placeholder:
                  activeTab === "Drivers" ? "rcd_lastname" : "rco_lastname",
                disabled: isCheckingUsername,
              }}
              error={usernameError}
              helperText={isCheckingUsername ? "Checking availability..." : ""}
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
            />
          </>
        );
      case "Clients":
        return (
          <>
            <div className={styles["flex-row-fields"]}>
              <FormField
                name="firstName"
                label="First Name"
                value={formData.firstName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
              <FormField
                name="lastName"
                label="Last Name"
                value={formData.lastName || ""}
                onChange={handleInputChange}
                inputProps={{ autoComplete: "off", maxLength: 50 }}
              />
            </div>
            <FormField
              name="email"
              label="Email"
              type="email"
              value={formData.email || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 100 }}
            />
            <FormField
              name="address"
              label="Address"
              value={formData.address || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 200 }}
            />
            <FormField
              name="phoneNumber"
              label="Contact Number"
              value={formData.phoneNumber || ""}
              onChange={handleInputChange}
              inputProps={{ maxLength: 20 }}
            />
            <FormField
              name="notes"
              label="Notes"
              as="textarea"
              value={formData.notes || ""}
              onChange={handleInputChange}
              inputProps={{
                className: "global-form-field-textarea",
                maxLength: 500,
                rows: 3,
              }}
              required={false}
            />
          </>
        );
      case "Services":
        return (
          <>
            <FormField
              name="name"
              label="Service Name"
              value={formData.name || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="description"
              label="Description"
              as="textarea"
              value={formData.description || ""}
              onChange={handleInputChange}
              inputProps={{ className: "global-form-field-textarea" }}
            />
            <FormField
              name="duration"
              label="Duration"
              value={formData.duration || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="price"
              label="Price"
              value={formData.price || ""}
              onChange={handleInputChange}
            />
            <div className="global-form-field-group">
              <div className="global-form-field-label-row">
                <label
                  className="global-form-field-label"
                  htmlFor="materials-select"
                >
                  Materials
                </label>
              </div>
              <Select
                id="materials-select"
                isMulti
                options={MATERIAL_OPTIONS.map((opt) => ({
                  label: opt,
                  value: opt,
                }))}
                value={(formData.materials || []).map((mat) => ({
                  label: mat,
                  value: mat,
                }))}
                onChange={(selected) => {
                  setFormData((prev) => ({
                    ...prev,
                    materials: selected ? selected.map((s) => s.value) : [],
                  }));
                }}
                placeholder="Select materials..."
                classNamePrefix="react-select"
                styles={{ menu: (base) => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
          </>
        );
      case "Materials":
        return (
          <>
            <FormField
              name="name"
              label="Material Name"
              value={formData.name || ""}
              onChange={handleInputChange}
            />
            <FormField
              name="description"
              label="Description"
              as="textarea"
              value={formData.description || ""}
              onChange={handleInputChange}
              inputProps={{ className: "global-form-field-textarea" }}
            />
          </>
        );
      default:
        return null;
    }
  };

  // Helper to get table columns and row data per tab
  const getTableConfig = () => {
    switch (activeTab) {
      case "Drivers":
      case "Operators":
        return {
          columns: [
            { key: "Username", label: "Username" },
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Contact", label: "Contact Number" },
          ],
        };
      case "Clients":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Address", label: "Address" },
            { key: "Contact", label: "Contact Number" },
            { key: "Notes", label: "Notes" },
          ],
        };
      case "Services":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Description", label: "Description" },
            { key: "Duration", label: "Duration" },
            { key: "Price", label: "Price" },
            { key: "Materials", label: "Materials" },
          ],
        };
      case "Materials":
        return {
          columns: [
            { key: "Name", label: "Name" },
            { key: "Description", label: "Description" },
          ],
        };
      case "Therapists":
      default:
        return {
          columns: [
            { key: "Username", label: "Username" },
            { key: "Name", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Contact", label: "Contact Number" },
            { key: "Specialization", label: "Specialization" },
            { key: "Pressure", label: "Pressure Level" },
          ],
        };
    }
  };

  // Compute if any loading is happening for UI indicators
  const currentTabLoading = isTabLoading(activeTab);
  const currentTabError = getTabError(activeTab);

  return (
    <PageLayout>
      <MinimalLoadingIndicator
        show={currentTabLoading || isBackingUp || isRestoring}
        position="top-right"
        operation={
          isBackingUp
            ? "Creating backup..."
            : isRestoring
            ? "Restoring data..."
            : `Loading ${activeTab.toLowerCase()}`
        }
        tooltip={
          isBackingUp
            ? "Generating backup file..."
            : isRestoring
            ? "Processing backup file..."
            : `Fetching ${activeTab.toLowerCase()} data...`
        }
      />

      {showModal && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]}>
            <div className={styles["modal-header"]}>
              <h2>Register {TAB_SINGULARS[activeTab]}</h2>
              <button
                className={styles["close-btn"]}
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form className={styles["modal-form"]} onSubmit={handleSubmit}>
              {isSubmitting ? renderFormSkeleton() : renderFormFields()}
              <button
                type="submit"
                className="action-btn"
                disabled={isSubmitting || usernameError || isCheckingUsername}
              >
                {isSubmitting ? "Registering..." : "Register"}
              </button>
            </form>
          </div>
        </div>
      )}

      {successPrompt && (
        <div className={styles["success-prompt"]}>{successPrompt}</div>
      )}

      {/* Backup Status */}
      {backupStatus && (
        <div className={styles["backup-status"]}>{backupStatus}</div>
      )}

      <div
        className={
          "global-content no-page-scroll" + (showModal ? " faded" : "")
        }
        style={{ overflow: "hidden" }}
      >
        <div className={styles["header-tabs-container"]}>
          <LayoutRow title="Data">
            <div className="action-buttons">
              {/* Backup/Restore Dropdown */}
              <div
                className="backup-dropdown-container"
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  className="secondary-action-btn"
                  onClick={() => setShowBackupDropdown(!showBackupDropdown)}
                  disabled={currentTabLoading || isBackingUp || isRestoring}
                  title="Backup and restore options"
                >
                  <MdBackup size={16} />
                  Backup
                </button>

                {showBackupDropdown && (
                  <div className={styles["backup-dropdown"]}>
                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleBackupData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdDownload size={14} />
                      Backup {activeTab}
                    </button>

                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleBackupAllData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdDownload size={14} />
                      Backup All Data
                    </button>

                    <div className={styles["dropdown-divider"]}></div>

                    <button
                      className={styles["dropdown-item"]}
                      onClick={() => {
                        setShowBackupDropdown(false);
                        handleRestoreData();
                      }}
                      disabled={isBackingUp || isRestoring}
                    >
                      <MdRestore size={14} />
                      Restore Data
                    </button>
                  </div>
                )}
              </div>

              <button
                className="primary-action-btn"
                onClick={handleAddClick}
                disabled={currentTabLoading || isBackingUp || isRestoring}
              >
                <span className="primary-action-icon">
                  <MdAdd size={20} />
                </span>{" "}
                Add
              </button>
            </div>
          </LayoutRow>
          <TabSwitcher
            tabs={TABS.map((tab) => ({ label: tab, value: tab }))}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Table container with pagination */}
        <div
          ref={tableContainerRef}
          className={`${styles["table-scroll-hide"]} ${styles["table-container"]}`}
        >
          {!hasDataForTab(activeTab) && isTabLoading(activeTab) ? (
            renderTableSkeleton()
          ) : (
            <DataTable
              columns={getTableConfig().columns}
              data={tableData[activeTab]}
            />
          )}
        </div>

        {/* Pagination Controls */}
        {hasDataForTab(activeTab) &&
          paginationData[activeTab].totalPages > 1 && (
            <div style={{ marginTop: "20px" }}>
              <ServerPagination
                currentPage={paginationData[activeTab].currentPage}
                totalPages={paginationData[activeTab].totalPages}
                hasNext={paginationData[activeTab].hasNext}
                hasPrevious={paginationData[activeTab].hasPrevious}
                onPageChange={handlePageChange}
                className="appointments-pagination"
                simplified={true} // Use simplified pagination for SettingsDataPage
              />
            </div>
          )}

        {/* Debug pagination info - remove this in production */}
        {import.meta.env.MODE === "development" && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#f5f5f5",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            <strong>Debug Pagination [{activeTab}]:</strong>
            <br />
            hasDataForTab: {hasDataForTab(activeTab) ? "true" : "false"}
            <br />
            totalPages: {paginationData[activeTab].totalPages}
            <br />
            currentPage: {paginationData[activeTab].currentPage}
            <br />
            totalItems: {paginationData[activeTab].totalItems}
            <br />
            hasNext: {paginationData[activeTab].hasNext ? "true" : "false"}
            <br />
            hasPrevious:{" "}
            {paginationData[activeTab].hasPrevious ? "true" : "false"}
          </div>
        )}

        {/* Show error message if there's an error and no data */}
        {currentTabError && !hasDataForTab(activeTab) && (
          <div className={styles["error-message"]}>{currentTabError}</div>
        )}
      </div>
    </PageLayout>
  );
};

export default SettingsDataPage;
