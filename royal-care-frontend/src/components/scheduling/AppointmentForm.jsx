import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch } from "react-redux";
import {
  createAppointment,
  fetchAvailableDrivers,
  fetchAvailableTherapists,
  fetchClients,
  fetchServices,
  fetchStaffMembers,
  updateAppointment,
} from "../../features/scheduling/schedulingSlice";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import "../../styles/AppointmentForm.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import { fuzzyMatch } from "../../utils/searchUtils";
import {
  FormLoadingOverlay,
  LoadingButton,
  LoadingSpinner,
  OptimisticIndicator,
} from "../common/LoadingComponents";
// PERFORMANCE: Import cached components for better UX
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import CachedDriverSelect from "../common/CachedDriverSelect";
import CachedTherapistSelect from "../common/CachedTherapistSelect";
import LazyClientSearch from "../common/LazyClientSearch";

// Legacy Client Search Component (kept for fallback)
const ClientSearchDropdown = ({
  clients,
  selectedClient,
  onClientSelect,
  error,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter clients based on search term with fuzzy matching
  const filteredClients = useMemo(() => {
    if (!clients || !Array.isArray(clients)) return [];

    if (!searchTerm.trim()) return clients;

    return clients.filter((client) => {
      const fullName = `${client.first_name || ""} ${
        client.last_name || ""
      }`.trim();
      const phoneNumber = client.phone_number || "";

      return (
        fuzzyMatch(searchTerm, fullName) ||
        fuzzyMatch(searchTerm, client.first_name) ||
        fuzzyMatch(searchTerm, client.last_name) ||
        fuzzyMatch(searchTerm, phoneNumber)
      );
    });
  }, [clients, searchTerm]);

  // Get display text for selected client
  const getSelectedClientText = () => {
    if (!selectedClient) return "";
    const client = clients?.find((c) => c.id === selectedClient);
    if (!client) return "";
    return `${client.first_name || ""} ${client.last_name || ""} - ${
      client.phone_number || "No phone"
    }`.trim();
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    setSelectedIndex(-1);

    // Clear selection if input is cleared
    if (!value.trim() && selectedClient) {
      onClientSelect(null);
    }
  };

  // Handle client selection
  const handleClientSelect = (client) => {
    onClientSelect(client.id);
    setSearchTerm("");
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        setIsOpen(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }

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
        searchInputRef.current?.blur();
        break;
    }
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update search term when selected client changes externally
  useEffect(() => {
    if (selectedClient && !searchTerm) {
      // Don't update search term if user is actively searching
      setSearchTerm("");
    }
  }, [selectedClient, searchTerm]);

  return (
    <div className="client-search-dropdown" ref={dropdownRef}>
      <input
        ref={searchInputRef}
        type="text"
        value={
          searchTerm ||
          (selectedClient && !isOpen ? getSelectedClientText() : "")
        }
        onChange={handleInputChange}
        onFocus={() => {
          setIsOpen(true);
          if (selectedClient) {
            setSearchTerm(""); // Clear display text when focusing to show search input
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search client by name or phone..."
        className={`client-search-input ${error ? "error" : ""}`}
        disabled={disabled}
        autoComplete="off"
      />

      {isOpen && (
        <div className="client-search-results">
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
              </div>
            ))
          ) : (
            <div className="client-search-no-results">
              {searchTerm
                ? `No clients found matching "${searchTerm}"`
                : "No clients available"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FALLBACK_THERAPISTS = [
  {
    id: 101,
    first_name: "Maria",
    last_name: "Santos",
    specialization: "Shiatsu",
    massage_pressure: "Medium",
  },
  {
    id: 102,
    first_name: "James",
    last_name: "Wilson",
    specialization: "Swedish",
    massage_pressure: "Firm",
  },
  {
    id: 103,
    first_name: "Sarah",
    last_name: "Lee",
    specialization: "Deep Tissue",
    massage_pressure: "Hard",
  },
];

const FALLBACK_DRIVERS = [
  {
    id: 201,
    first_name: "Michael",
    last_name: "Johnson",
  },
  {
    id: 202,
    first_name: "Lisa",
    last_name: "Chen",
  },
];

const AppointmentForm = ({
  appointment = null,
  onSubmitSuccess,
  onCancel,
  selectedDate,
  selectedTime,
}) => {
  const initialFormState = {
    client: "",
    services: "", // Changed from array to string for single service selection
    therapist: "",
    therapists: [], // For multi-therapist booking
    driver: "",
    multipleTherapists: false, // Checkbox for multiple therapist option
    date: selectedDate
      ? (() => {
          try {
            const localDate = new Date(selectedDate);
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, "0");
            const day = String(localDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          } catch (error) {
            console.error("Error formatting initial date:", error);
            return "";
          }
        })()
      : "",
    start_time: selectedTime || "",
    end_time: "", // Add end_time to form state
    location: "",
    notes: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false); // Add form ready state
  const [fetchingAvailability, setFetchingAvailability] = useState(false); // Track availability fetching

  const dispatch = useDispatch();
  const schedulingState = useOptimizedSelector(
    (state) => state.scheduling,
    shallowEqual
  );
  const {
    clients,
    services,
    loading,
    staffMembers,
    availableTherapists: fetchedAvailableTherapists,
    availableDrivers: fetchedAvailableDrivers,
  } = schedulingState;

  // PERFORMANCE: Initialize centralized cache hook (used internally by cached components)
  useAppointmentFormCache();

  // Track form state for availability checks separately to avoid circular dependencies
  const [availabilityParams, setAvailabilityParams] = useState({
    date: "",
    start_time: "",
    services: "",
  });

  // Update availability params separately from form data to break the cycle
  useEffect(() => {
    if (formData.date && formData.start_time && formData.services) {
      const newParams = {
        date: formData.date,
        start_time: formData.start_time,
        services: formData.services,
      };

      // Only update if params actually changed
      if (
        availabilityParams.date !== newParams.date ||
        availabilityParams.start_time !== newParams.start_time ||
        availabilityParams.services !== newParams.services
      ) {
        setAvailabilityParams(newParams);
      }
    }
  }, [
    formData.date,
    formData.start_time,
    formData.services,
    availabilityParams,
  ]);

  // Update the availableTherapists memo to ensure only available users are shown
  const availableTherapists = useMemo(() => {
    // Only show therapists if we have specifically fetched available ones based on date/time/service
    if (
      fetchedAvailableTherapists &&
      Array.isArray(fetchedAvailableTherapists) &&
      fetchedAvailableTherapists.length > 0
    ) {
      console.log(
        "Using fetched available therapists:",
        fetchedAvailableTherapists
      );
      return fetchedAvailableTherapists;
    }

    // If user hasn't selected date, time, and service yet, don't show any therapists
    // This ensures only available therapists are shown once availability is checked
    if (
      !availabilityParams.date ||
      !availabilityParams.start_time ||
      !availabilityParams.services
    ) {
      return [];
    }

    // If we have date/time/service but no fetched results, return empty array
    // This means no therapists are available for the selected time
    return [];
  }, [
    fetchedAvailableTherapists,
    availabilityParams.date,
    availabilityParams.start_time,
    availabilityParams.services,
  ]);

  // Update the availableDrivers memo to ensure only available users are shown
  const availableDrivers = useMemo(() => {
    // Only show drivers if we have specifically fetched available ones based on date/time
    if (
      fetchedAvailableDrivers &&
      Array.isArray(fetchedAvailableDrivers) &&
      fetchedAvailableDrivers.length > 0
    ) {
      console.log("Using fetched available drivers:", fetchedAvailableDrivers);
      return fetchedAvailableDrivers;
    }

    // If user hasn't selected date, time, and service yet, don't show any drivers
    // This ensures only available drivers are shown once availability is checked
    if (
      !availabilityParams.date ||
      !availabilityParams.start_time ||
      !availabilityParams.services
    ) {
      return [];
    }

    // If we have date/time/service but no fetched results, return empty array
    // This means no drivers are available for the selected time
    return [];
  }, [
    fetchedAvailableDrivers,
    availabilityParams.date,
    availabilityParams.start_time,
    availabilityParams.services,
  ]);

  // Define calculateEndTime function using useCallback to prevent recreation on each render
  const calculateEndTime = useCallback(() => {
    try {
      if (!formData.start_time || !formData.services) {
        return "";
      }

      // Parse service ID and find the selected service
      const serviceId = parseInt(formData.services, 10);
      const selectedService = services.find(
        (service) => service.id === serviceId
      );

      // Return empty string if service not found or no duration
      if (!selectedService || !selectedService.duration) {
        console.warn("Service not found or has no duration");
        return "";
      }

      // Parse the start time
      const [hours, minutes] = formData.start_time.split(":").map(Number);

      // Calculate end time
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0);

      // Add duration (in minutes)
      const endDate = new Date(startDate.getTime());
      endDate.setMinutes(endDate.getMinutes() + selectedService.duration);

      // Format as "HH:MM"
      return `${endDate.getHours().toString().padStart(2, "0")}:${endDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("Error calculating end time:", error);
      return "";
    }
  }, [formData.start_time, formData.services, services]);

  // Debug: Log the data arrays to check if they contain data
  useEffect(() => {
    console.log("AppointmentForm Debug:", {
      clients: clients?.length ? clients : "Empty",
      services: services?.length ? services : "Empty",
      availableTherapists: availableTherapists?.length
        ? availableTherapists
        : "Empty",
      availableDrivers: availableDrivers?.length ? availableDrivers : "Empty",
      multipleTherapists: formData.multipleTherapists,
      selectedTherapist: formData.therapist,
      selectedTherapists: formData.therapists,
    });
  }, [
    clients,
    services,
    availableTherapists,
    availableDrivers,
    formData.multipleTherapists,
    formData.therapist,
    formData.therapists,
  ]);

  // Fetch clients and services when component mounts
  useEffect(() => {
    // Only fetch once per component lifetime
    if (initialDataFetchedRef.current) {
      return;
    }

    console.log("AppointmentForm - Dispatching fetchClients and fetchServices");
    dispatch(fetchClients());
    dispatch(fetchServices());

    // Fetch staff members to populate therapist and driver dropdowns
    // This ensures data is available when the form is opened from any context
    if (!staffMembers || staffMembers.length === 0) {
      console.log(
        "AppointmentForm - Dispatching fetchStaffMembers because staff data is missing."
      );
      dispatch(fetchStaffMembers());
    }

    initialDataFetchedRef.current = true;
  }, [dispatch, staffMembers]);

  // Mark form as ready when we have essential data
  useEffect(() => {
    if (services.length > 0 && !loading) {
      if (!isFormReady) {
        console.log("Form is now ready - services loaded successfully");
        setIsFormReady(true);
      }
    }
  }, [services.length, loading, isFormReady]);

  // Add loading timeout to prevent infinite loading, but track if we've warned already
  const hasWarnedRef = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isFormReady && !loading && !hasWarnedRef.current) {
        console.warn("Form loading timeout reached, forcing ready state");
        hasWarnedRef.current = true;
        setIsFormReady(true);
      }
    }, 3000); // Reduced from 5 seconds to 3 seconds for faster fallback

    return () => clearTimeout(timeout);
  }, [isFormReady, loading]);

  // Reset warning flag when form becomes ready naturally
  useEffect(() => {
    if (isFormReady) {
      hasWarnedRef.current = false;
    }
  }, [isFormReady]);

  // Update end time when relevant form data changes (only if end_time is empty - don't override manual input)
  useEffect(() => {
    // Only auto-calculate if end_time is empty (user hasn't manually set it)
    if (!formData.end_time) {
      const calculatedEndTime = calculateEndTime();
      if (calculatedEndTime && calculatedEndTime !== formData.end_time) {
        setFormData((prev) => ({
          ...prev,
          end_time: calculatedEndTime,
        }));
      }
    }
  }, [calculateEndTime, formData.end_time]);

  // Create a ref to store previous values for therapist fetch
  const prevFetchTherapistsRef = useRef({
    date: null,
    startTime: null,
    services: null,
  });

  // Track if we've already fetched initial data to prevent re-fetching
  const initialDataFetchedRef = useRef(false);

  // Update the useEffect to also fetch available drivers with debouncing
  useEffect(() => {
    // Only proceed if form is ready and we have all required fields
    if (
      !isFormReady ||
      !availabilityParams.start_time ||
      !availabilityParams.date ||
      !availabilityParams.services ||
      availabilityParams.services === "" ||
      loading
    ) {
      return;
    }

    // Check if we've already fetched with these exact params
    const prevFetch = prevFetchTherapistsRef.current;
    if (
      prevFetch.date === availabilityParams.date &&
      prevFetch.startTime === availabilityParams.start_time &&
      prevFetch.services === availabilityParams.services
    ) {
      return;
    }

    // Debounce the API calls to prevent rapid-fire requests
    const timeoutId = setTimeout(() => {
      setFetchingAvailability(true);

      // Use manually entered end time if available, otherwise calculate it
      let endTimeToUse = formData.end_time;
      if (!endTimeToUse) {
        try {
          endTimeToUse = calculateEndTime();
          if (!endTimeToUse) {
            console.warn(
              "Cannot fetch available therapists: unable to determine end time"
            );
            setFetchingAvailability(false);
            return;
          }
        } catch (error) {
          console.error("Error calculating end time:", error);
          setFetchingAvailability(false);
          return;
        }
      }

      prevFetchTherapistsRef.current = {
        date: availabilityParams.date,
        startTime: availabilityParams.start_time,
        services: availabilityParams.services,
      };

      console.log("AppointmentForm - Fetching available therapists/drivers");
      const serviceId = parseInt(availabilityParams.services, 10);

      if (serviceId) {
        // Fetch available therapists
        const fetchPromise1 = dispatch(
          fetchAvailableTherapists({
            date: availabilityParams.date,
            start_time: availabilityParams.start_time,
            end_time: endTimeToUse,
            service_id: serviceId,
          })
        );

        // Also fetch available drivers
        const fetchPromise2 = dispatch(
          fetchAvailableDrivers({
            date: availabilityParams.date,
            start_time: availabilityParams.start_time,
            end_time: endTimeToUse,
          })
        );

        // Set loading to false when both requests complete
        Promise.allSettled([fetchPromise1, fetchPromise2]).finally(() => {
          setFetchingAvailability(false);
        });
      } else {
        setFetchingAvailability(false);
      }
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [
    isFormReady,
    availabilityParams.date,
    availabilityParams.start_time,
    availabilityParams.services,
    formData.end_time,
    calculateEndTime,
    dispatch,
    loading,
  ]);

  // If editing an existing appointment, populate the form
  useEffect(() => {
    if (appointment) {
      try {
        // Fix date formatting for existing appointments too
        let formattedDate = "";
        if (appointment.date) {
          const appointmentDate = new Date(appointment.date);
          const year = appointmentDate.getFullYear();
          const month = String(appointmentDate.getMonth() + 1).padStart(2, "0");
          const day = String(appointmentDate.getDate()).padStart(2, "0");
          formattedDate = `${year}-${month}-${day}`;
        }

        setFormData({
          client: appointment.client || "",
          services:
            appointment.services?.length > 0
              ? appointment.services[0].id.toString()
              : "",
          therapist: appointment.therapist || "",
          driver: appointment.driver || "",
          date: formattedDate,
          start_time: appointment.start_time || "",
          end_time: appointment.end_time || "",
          location: appointment.location || "",
          notes: appointment.notes || "",
        });
      } catch (error) {
        console.error("Error setting appointment data:", error);
        setErrors({ form: "Failed to load appointment data" });
      }
    }
  }, [appointment]);

  // Update form when selected date/time changes (only set if not already set)
  useEffect(() => {
    if (selectedDate && !formData.date) {
      try {
        // Fix timezone issue - use local date formatting instead of toISOString()
        const localDate = new Date(selectedDate);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, "0");
        const day = String(localDate.getDate()).padStart(2, "0");
        const properFormattedDate = `${year}-${month}-${day}`;

        setFormData((prev) => ({
          ...prev,
          date: properFormattedDate,
        }));
      } catch (error) {
        console.error("Error formatting selected date:", error);
      }
    }
  }, [selectedDate, formData.date]);

  useEffect(() => {
    if (selectedTime && !formData.start_time) {
      setFormData((prev) => ({
        ...prev,
        start_time: selectedTime,
      }));
    }
  }, [selectedTime, formData.start_time]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked, options } = e.target;

    // Handle checkbox inputs
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));

      // Clear therapists array when switching from multi to single mode
      if (name === "multipleTherapists" && !checked) {
        setFormData((prev) => ({
          ...prev,
          therapists: [],
          therapist: "", // Reset single therapist selection
        }));
      }

      return;
    }

    // Handle multi-select for services
    if (name === "services" && type === "select-multiple") {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));

      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    }
    // Handle multi-select for therapists
    else if (name === "therapists" && type === "select-multiple") {
      const selectedTherapists = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));

      setFormData((prev) => ({
        ...prev,
        therapists: selectedTherapists,
      }));
    } else {
      // Sanitize input before setting it in state (use lighter sanitization for better UX)
      const sanitizedValue =
        type === "number" ? value : sanitizeFormInput(value);

      setFormData((prev) => {
        // Only update if value actually changed to prevent unnecessary re-renders
        if (prev[name] === sanitizedValue) {
          return prev;
        }

        return {
          ...prev,
          [name]: sanitizedValue,
        };
      });
    }

    // Clear error when field is edited
    setErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: "" };
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.client) newErrors.client = "Client is required";
    if (!formData.services) newErrors.services = "Service is required";

    // Check if we have availability data for the selected date/time
    const hasAvailabilityData =
      availabilityParams.date &&
      availabilityParams.start_time &&
      availabilityParams.services;

    // Validate therapist selection based on mode
    if (formData.multipleTherapists) {
      if (!formData.therapists || formData.therapists.length === 0) {
        newErrors.therapists = "At least one therapist is required";
      } else if (!hasAvailabilityData) {
        newErrors.therapists =
          "Please select date, time and service first to validate therapist availability";
      } else if (hasAvailabilityData && availableTherapists.length === 0) {
        newErrors.therapists =
          "No therapists are available for the selected date and time";
      } else if (hasAvailabilityData && formData.therapists.length > 0) {
        // Check if all selected therapists are still available
        const unavailableTherapists = formData.therapists.filter(
          (therapistId) =>
            !availableTherapists.some(
              (t) => t.id.toString() === therapistId.toString()
            )
        );
        if (unavailableTherapists.length > 0) {
          newErrors.therapists =
            "Some selected therapists are no longer available for the chosen date and time";
        }
      }
    } else {
      if (!formData.therapist) {
        newErrors.therapist = "Therapist is required";
      } else if (!hasAvailabilityData) {
        newErrors.therapist =
          "Please select date, time and service first to validate therapist availability";
      } else if (hasAvailabilityData && availableTherapists.length === 0) {
        newErrors.therapist =
          "No therapists are available for the selected date and time";
      } else if (
        hasAvailabilityData &&
        formData.therapist &&
        !availableTherapists.some(
          (t) => t.id.toString() === formData.therapist.toString()
        )
      ) {
        newErrors.therapist =
          "Selected therapist is not available for the chosen date and time";
      }
    }

    // Validate driver selection if one is chosen
    if (formData.driver) {
      if (!hasAvailabilityData) {
        newErrors.driver =
          "Please select date, time and service first to validate driver availability";
      } else if (
        hasAvailabilityData &&
        !availableDrivers.some(
          (d) => d.id.toString() === formData.driver.toString()
        )
      ) {
        newErrors.driver =
          "Selected driver is not available for the chosen date and time";
      }
    }

    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.start_time) newErrors.start_time = "Start time is required";
    if (!formData.end_time) newErrors.end_time = "End time is required";
    if (!formData.location) newErrors.location = "Location is required";

    // Validate that end time is after start time
    if (formData.start_time && formData.end_time) {
      const startTime = new Date(`2000-01-01T${formData.start_time}:00`);
      const endTime = new Date(`2000-01-01T${formData.end_time}:00`);

      if (endTime <= startTime) {
        newErrors.end_time = "End time must be after start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, availabilityParams, availableTherapists, availableDrivers]);

  // Helper function to ensure data is in the correct format for the API
  const sanitizeDataForApi = useCallback((data) => {
    const result = { ...data };

    // Handle single therapist
    if (result.therapist) {
      if (Array.isArray(result.therapist)) {
        result.therapist =
          result.therapist.length > 0
            ? parseInt(result.therapist[0], 10)
            : null;
      } else if (
        typeof result.therapist === "string" &&
        result.therapist.trim() !== ""
      ) {
        result.therapist = parseInt(result.therapist, 10);
      }
    }

    // Handle multiple therapists
    if (result.therapists && Array.isArray(result.therapists)) {
      result.therapists = result.therapists
        .map((t) => (typeof t === "number" ? t : parseInt(t, 10)))
        .filter((t) => !isNaN(t));
    }

    // Ensure services is an array of integers
    if (!Array.isArray(result.services)) {
      result.services = result.services ? [parseInt(result.services, 10)] : [];
    } else {
      result.services = result.services
        .map((s) => (typeof s === "number" ? s : parseInt(s, 10)))
        .filter((s) => !isNaN(s));
    }

    // Ensure client is an integer
    if (Array.isArray(result.client)) {
      result.client =
        result.client.length > 0 ? parseInt(result.client[0], 10) : null;
    } else if (
      typeof result.client === "string" &&
      result.client.trim() !== ""
    ) {
      result.client = parseInt(result.client, 10);
    }

    // Ensure driver is an integer if present
    if (result.driver) {
      if (Array.isArray(result.driver)) {
        result.driver =
          result.driver.length > 0 ? parseInt(result.driver[0], 10) : null;
      } else if (
        typeof result.driver === "string" &&
        result.driver.trim() !== ""
      ) {
        result.driver = parseInt(result.driver, 10);
      }
    }

    return result;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Use the form's end time (either calculated or manually entered)
      if (!formData.end_time) {
        throw new Error(
          "Could not calculate end time. Please check services selected."
        );
      }

      // Create a sanitized copy of form data to ensure no undefined values
      const sanitizedFormData = {
        client: parseInt(formData.client, 10) || null,
        services: formData.services ? [parseInt(formData.services, 10)] : [],
        therapist: formData.multipleTherapists
          ? null
          : parseInt(formData.therapist, 10) || null,
        therapists: formData.multipleTherapists
          ? formData.therapists || []
          : [],
        driver: formData.driver ? parseInt(formData.driver, 10) : null,
        date: formData.date || "",
        start_time: formData.start_time || "",
        end_time: formData.end_time || "",
        location: formData.location || "",
        notes: formData.notes || "",
        multipleTherapists: formData.multipleTherapists || false,
      };

      // Log the sanitized data for debugging
      console.log("Sanitized form data:", sanitizedFormData);

      // Triple check the therapist field specifically to ensure it's correct for the appointment type
      // For multi-therapist appointments, therapist should remain null
      if (
        !formData.multipleTherapists &&
        typeof sanitizedFormData.therapist !== "number"
      ) {
        console.warn(
          "Single therapist appointment but therapist field is not a number, attempting to fix:",
          sanitizedFormData.therapist
        );
        try {
          if (Array.isArray(sanitizedFormData.therapist)) {
            sanitizedFormData.therapist =
              sanitizedFormData.therapist.length > 0
                ? parseInt(sanitizedFormData.therapist[0], 10)
                : null;
          } else if (
            typeof sanitizedFormData.therapist === "string" &&
            sanitizedFormData.therapist.trim() !== ""
          ) {
            sanitizedFormData.therapist = parseInt(
              sanitizedFormData.therapist,
              10
            );
          } else {
            sanitizedFormData.therapist = null;
          }
        } catch (e) {
          console.error("Failed to fix therapist field:", e);
          sanitizedFormData.therapist = null;
        }
      } else if (formData.multipleTherapists) {
        // Ensure therapist is null for multi-therapist appointments
        sanitizedFormData.therapist = null;
        console.log(
          "Multi-therapist appointment - therapist field set to null"
        );
      }

      // Log the sanitized data for debugging
      console.log("Sanitized form data:", sanitizedFormData);

      // Prepare appointment data with required fields
      const appointmentData = {
        ...sanitizedFormData,
        status: "pending",
        payment_status: "unpaid",
        // Set requires_car and group_size for multi-therapist bookings
        requires_car:
          formData.multipleTherapists &&
          formData.therapists &&
          formData.therapists.length > 1,
        group_size:
          formData.multipleTherapists &&
          formData.therapists &&
          formData.therapists.length > 0
            ? formData.therapists.length
            : 1,
      };

      console.log("Pre-sanitized appointment data:", appointmentData);

      // Apply final sanitization to ensure all fields are in correct format for API
      const finalAppointmentData = sanitizeDataForApi(appointmentData);

      console.log("Final sanitized appointment data:", finalAppointmentData);
      console.log("Data types:", {
        client: typeof finalAppointmentData.client,
        services: Array.isArray(finalAppointmentData.services)
          ? `Array of ${finalAppointmentData.services.length} items`
          : typeof finalAppointmentData.services,
        therapist: typeof finalAppointmentData.therapist,
        therapists: Array.isArray(finalAppointmentData.therapists)
          ? `Array of ${finalAppointmentData.therapists.length} items`
          : typeof finalAppointmentData.therapists,
        driver: typeof finalAppointmentData.driver,
        date: typeof finalAppointmentData.date,
        start_time: typeof finalAppointmentData.start_time,
        end_time: typeof finalAppointmentData.end_time,
      });

      // Final verification of data formats for critical fields
      // For single therapist appointments, ensure therapist is an integer, not an array
      if (
        !formData.multipleTherapists &&
        Array.isArray(finalAppointmentData.therapist)
      ) {
        console.warn(
          "Converting therapist from array to integer for single therapist appointment:",
          finalAppointmentData.therapist
        );
        finalAppointmentData.therapist =
          finalAppointmentData.therapist.length > 0
            ? parseInt(finalAppointmentData.therapist[0], 10)
            : null;
      } else if (
        !formData.multipleTherapists &&
        typeof finalAppointmentData.therapist !== "number"
      ) {
        // Try to parse it as a number if it's not already (for single therapist appointments)
        try {
          if (
            typeof finalAppointmentData.therapist === "string" &&
            finalAppointmentData.therapist.trim() !== ""
          ) {
            finalAppointmentData.therapist = parseInt(
              finalAppointmentData.therapist,
              10
            );
          } else {
            finalAppointmentData.therapist = null;
          }
        } catch (e) {
          console.error("Failed to convert therapist to integer:", e);
          finalAppointmentData.therapist = null;
        }
      } else if (formData.multipleTherapists) {
        // For multi-therapist appointments, ensure therapist is null
        finalAppointmentData.therapist = null;
      }

      // Ensure services is an array of integers
      if (!Array.isArray(finalAppointmentData.services)) {
        finalAppointmentData.services = finalAppointmentData.services
          ? [parseInt(finalAppointmentData.services, 10)]
          : [];
      } else {
        // If it's already an array, make sure all items are integers
        finalAppointmentData.services = finalAppointmentData.services
          .map((service) =>
            typeof service === "number" ? service : parseInt(service, 10)
          )
          .filter((service) => !isNaN(service));
      }

      // Also fix client field if needed
      if (Array.isArray(finalAppointmentData.client)) {
        finalAppointmentData.client =
          finalAppointmentData.client.length > 0
            ? parseInt(finalAppointmentData.client[0], 10)
            : null;
      } else if (
        typeof finalAppointmentData.client !== "number" &&
        finalAppointmentData.client !== null
      ) {
        finalAppointmentData.client =
          parseInt(finalAppointmentData.client, 10) || null;
      }

      // Validate critical fields again before API call
      // For multi-therapist appointments, either therapist OR therapists array should be present
      const hasTherapist =
        finalAppointmentData.therapist ||
        (Array.isArray(finalAppointmentData.therapists) &&
          finalAppointmentData.therapists.length > 0);

      if (
        !finalAppointmentData.client ||
        !hasTherapist ||
        !finalAppointmentData.date ||
        !finalAppointmentData.start_time ||
        !finalAppointmentData.end_time ||
        !finalAppointmentData.services ||
        finalAppointmentData.services.length === 0
      ) {
        console.error("Validation failed. Current data:", finalAppointmentData);
        throw new Error("Missing required fields. Please check your form.");
      }

      if (appointment) {
        // Update existing appointment
        await dispatch(
          updateAppointment({ id: appointment.id, data: finalAppointmentData })
        ).unwrap();
      } else {
        // Create new appointment
        await dispatch(createAppointment(finalAppointmentData)).unwrap();
      }

      // Reset form and call success callback
      setFormData(initialFormState);
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting appointment:", error);

      // Special handling for therapist availability error
      if (error.therapist && typeof error.therapist === "string") {
        // This is our custom formatted error from the Redux slice
        setErrors((prev) => ({
          ...prev,
          therapist: error.therapist,
        }));

        // Show a more visible alert
        alert(error.therapist);
        return;
      }

      // Handle Redux thunk rejection errors (from rejectWithValue)
      if (typeof error === "object" && error !== null && !error.response) {
        console.error(
          "📋 Redux thunk error (likely from rejectWithValue):",
          error
        );

        // This is likely a validation error object from the API
        if (typeof error === "object") {
          // Create user-friendly error messages
          let errorMessages = [];
          const apiErrors = {};

          Object.entries(error).forEach(([field, messages]) => {
            if (field === "_original" || field === "therapist") return; // Skip meta fields

            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(", ")}`);
              apiErrors[field] = messages[0]; // Use first error message
            } else if (typeof messages === "string") {
              errorMessages.push(`${field}: ${messages}`);
              apiErrors[field] = messages;
            } else if (typeof messages === "object") {
              const messageStr = JSON.stringify(messages);
              errorMessages.push(`${field}: ${messageStr}`);
              apiErrors[field] = messageStr;
            }
          });

          // Update form errors with API validation errors
          if (Object.keys(apiErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...apiErrors }));
            alert(`Form validation failed:\n${errorMessages.join("\n")}`);
            return;
          }
        }
      }

      // Handle Axios response errors (legacy support)
      if (error.response) {
        console.error("API Response Error:", error.response.data);
        console.error("API Status:", error.response.status);
        console.error("API Headers:", error.response.headers);

        if (error.response.data && error.response.data.therapist) {
          console.warn(
            "Therapist field error detected:",
            error.response.data.therapist
          );

          // Check what's actually in the formData for debugging purposes
          console.warn(`Original therapist value: ${formData.therapist}`);
          console.warn(
            `Type of original therapist value: ${typeof formData.therapist}`
          );
        }

        // Handle specific error cases
        if (error.response.status === 400) {
          const errorData = error.response.data;

          // Create user-friendly error messages
          let errorMessages = [];

          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(", ")}`);
            } else if (typeof messages === "object") {
              errorMessages.push(`${field}: ${JSON.stringify(messages)}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          });

          // Update form errors with API validation errors
          const apiErrors = {};
          Object.keys(errorData).forEach((field) => {
            apiErrors[field] = Array.isArray(errorData[field])
              ? errorData[field][0]
              : JSON.stringify(errorData[field]);
          });

          setErrors((prev) => ({ ...prev, ...apiErrors }));
          alert(`Form submission failed: ${errorMessages.join("\n")}`);
        }
      } else {
        console.error("Unknown error:", error.message || error);
        alert("Failed to submit appointment. Please try again.");
      }

      setErrors((prev) => ({
        ...prev,
        form: error.message || "Failed to submit appointment",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };
  // Show loading spinner only if form is not ready and we're still loading essential data
  if (!isFormReady || (loading && services.length === 0)) {
    return (
      <LoadingSpinner
        size="large"
        variant="primary"
        text="Loading appointment form..."
        className="appointment-form-loading"
      />
    );
  }

  // Return the form once we have essential data
  return (
    <div className="appointment-form-container">
      <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>

      {errors.form && <div className="error-message">{errors.form}</div>}

      {/* Form Loading Overlay for submission */}
      <FormLoadingOverlay
        show={isSubmitting}
        message={
          appointment ? "Updating appointment..." : "Creating appointment..."
        }
      />

      {/* Optimistic indicator for availability fetching */}
      <OptimisticIndicator
        show={fetchingAvailability}
        message="Checking availability..."
        position="top-right"
      />

      <form
        onSubmit={handleSubmit}
        className="appointment-form"
        style={{ position: "relative" }}
      >
        <div className="form-group">
          <label htmlFor="client">Client:</label>
          <LazyClientSearch
            selectedClient={
              formData.client
                ? clients?.find((c) => c.id === formData.client)
                : null
            }
            onClientSelect={(client) => {
              setFormData((prev) => ({ ...prev, client: client?.id || "" }));
              // Clear error when client is selected
              setErrors((prev) =>
                prev.client ? { ...prev, client: "" } : prev
              );
            }}
            error={errors.client}
            disabled={isSubmitting}
            placeholder="Search client by name or phone..."
          />
          {errors.client && <div className="error-text">{errors.client}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="services">Service:</label>
          <select
            id="services"
            name="services"
            value={formData.services}
            onChange={handleChange}
            className={errors.services ? "error" : ""}
          >
            <option value="">Select a service</option>
            {services && services.length > 0 ? (
              services.map((service) => (
                <option key={`service-${service.id}`} value={service.id}>
                  {service.name || "Unnamed Service"} - {service.duration || 0}{" "}
                  min - ₱{service.price || 0}
                </option>
              ))
            ) : (
              <option value="" disabled>
                Loading services...
              </option>
            )}
          </select>
          {errors.services && (
            <div className="error-text">{errors.services}</div>
          )}
        </div>
        {/* Multi-therapist option checkbox */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="multipleTherapists"
              checked={formData.multipleTherapists}
              onChange={handleChange}
            />
            <span className="checkbox-text">
              Book multiple therapists for this appointment
            </span>
          </label>
        </div>
        {/* Single Therapist Selection */}
        {!formData.multipleTherapists && (
          <div className="form-group">
            <label htmlFor="therapist">Therapist:</label>
            <CachedTherapistSelect
              id="therapist"
              name="therapist"
              value={formData.therapist}
              onChange={handleChange}
              className={errors.therapist ? "error" : ""}
              disabled={
                !availabilityParams.date ||
                !availabilityParams.start_time ||
                !availabilityParams.services ||
                (availabilityParams.date &&
                  availabilityParams.start_time &&
                  availabilityParams.services &&
                  availableTherapists.length === 0)
              }
            />
            {/* Show warning when user needs to select prerequisites */}
            {(!availabilityParams.date ||
              !availabilityParams.start_time ||
              !availabilityParams.services) &&
              !fetchingAvailability && (
                <small className="info-text">
                  ℹ️ Please select date, time and service first to see available
                  therapists
                </small>
              )}
            {/* Show warning when no therapists are available */}
            {availabilityParams.date &&
              availabilityParams.start_time &&
              availabilityParams.services &&
              availableTherapists.length === 0 &&
              !fetchingAvailability && (
                <small className="warning-text">
                  ⚠️ No therapists are available for the selected date and time.
                  Please choose a different time or date.
                </small>
              )}
            {errors.therapist && (
              <div className="error-text">{errors.therapist}</div>
            )}
          </div>
        )}
        {/* Multiple Therapists Selection */}
        {formData.multipleTherapists && (
          <div className="form-group">
            <label htmlFor="therapists">Select Multiple Therapists:</label>
            <select
              id="therapists"
              name="therapists"
              multiple
              value={formData.therapists}
              onChange={handleChange}
              className={
                errors.therapists ? "error multi-select" : "multi-select"
              }
              size="5"
              disabled={
                !availabilityParams.date ||
                !availabilityParams.start_time ||
                !availabilityParams.services ||
                (availabilityParams.date &&
                  availabilityParams.start_time &&
                  availabilityParams.services &&
                  availableTherapists.length === 0)
              }
            >
              {fetchingAvailability ? (
                <option value="" disabled>
                  Checking availability...
                </option>
              ) : !availabilityParams.date ||
                !availabilityParams.start_time ||
                !availabilityParams.services ? (
                <option value="" disabled>
                  Please select date, time and service first to see available
                  therapists
                </option>
              ) : availableTherapists && availableTherapists.length > 0 ? (
                availableTherapists.map((therapist) => (
                  <option
                    key={`multi-therapist-${therapist.id}`}
                    value={therapist.id}
                  >
                    {therapist.first_name || ""} {therapist.last_name || ""} -{" "}
                    {therapist.specialization || "General"} -{" "}
                    {therapist.massage_pressure || "Standard"}{" "}
                    {therapist.start_time && therapist.end_time
                      ? `(Available: ${therapist.start_time}-${therapist.end_time})`
                      : ""}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No therapists available for selected date/time - please choose
                  a different time
                </option>
              )}
            </select>
            {/* Show warning when user needs to select prerequisites */}
            {(!availabilityParams.date ||
              !availabilityParams.start_time ||
              !availabilityParams.services) &&
              !fetchingAvailability && (
                <small className="info-text">
                  ℹ️ Please select date, time and service first to see available
                  therapists
                </small>
              )}
            {/* Show warning when no therapists are available */}
            {availabilityParams.date &&
              availabilityParams.start_time &&
              availabilityParams.services &&
              availableTherapists.length === 0 &&
              !fetchingAvailability && (
                <small className="warning-text">
                  ⚠️ No therapists are available for the selected date and time.
                  Please choose a different time or date.
                </small>
              )}
            <small className="help-text">
              Hold Ctrl (Cmd on Mac) to select multiple therapists
            </small>
            {errors.therapists && (
              <div className="error-text">{errors.therapists}</div>
            )}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="driver">Driver (Optional):</label>
          <CachedDriverSelect
            id="driver"
            name="driver"
            value={formData.driver}
            onChange={handleChange}
            disabled={
              !availabilityParams.date ||
              !availabilityParams.start_time ||
              !availabilityParams.services
            }
          />
          {/* Show info for driver selection */}
          {(!availabilityParams.date ||
            !availabilityParams.start_time ||
            !availabilityParams.services) && (
            <small className="info-text">
              ℹ️ Select date, time and service first to see available drivers
            </small>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date || ""}
              onChange={handleChange}
              className={errors.date ? "error" : ""}
            />
            {errors.date && <div className="error-text">{errors.date}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="start_time">Start Time:</label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={formData.start_time || ""}
              onChange={handleChange}
              className={errors.start_time ? "error" : ""}
            />
            {errors.start_time && (
              <div className="error-text">{errors.start_time}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="end_time">End Time:</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={formData.end_time || ""}
              onChange={handleChange}
              className={errors.end_time ? "error" : ""}
            />
            {errors.end_time && (
              <div className="error-text">{errors.end_time}</div>
            )}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location || ""}
            onChange={handleChange}
            placeholder="Enter client's address"
            className={errors.location ? "error" : ""}
          />
          {errors.location && (
            <div className="error-text">{errors.location}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="notes">Notes (Optional):</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            placeholder="Any special instructions or notes"
            rows="3"
          />
        </div>{" "}
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText={appointment ? "Updating..." : "Creating..."}
            variant="primary"
            size="medium"
            className="submit-button"
            disabled={
              isSubmitting ||
              (availabilityParams.date &&
                availabilityParams.start_time &&
                availabilityParams.services &&
                availableTherapists.length === 0)
            }
          >
            {appointment ? "Update Appointment" : "Create Appointment"}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;
