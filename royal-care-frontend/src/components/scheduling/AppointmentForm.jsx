import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useAppointmentFormErrorHandler } from "../../hooks/useAppointmentFormErrorHandler";
import { useOptimizedSelector } from "../../hooks/usePerformanceOptimization";
import { queryKeys, queryUtils } from "../../lib/queryClient";
import { registerClient } from "../../services/api";
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
// Removed CachedDriverSelect and CachedTherapistSelect
import LazyClientSearch from "../common/LazyClientSearch";
// Debug component for troubleshooting client search
import ClientSearchDebug from "../debug/ClientSearchDebug";

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
  const [clientDetails, setClientDetails] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false); // Add form ready state
  const [fetchingAvailability, setFetchingAvailability] = useState(false); // Track availability fetching
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Error handling hook
  const { handleError, clearError, showError } =
    useAppointmentFormErrorHandler();

  // TanStack Query mutations for optimistic updates
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData) => {
      const result = await dispatch(createAppointment(appointmentData));
      if (result.error)
        throw new Error(result.error.message || "Failed to create appointment");
      return result.payload;
    },
    onMutate: async (newAppointment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.appointments.all });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.all
      );

      // Optimistically update the cache
      const optimisticAppointment = {
        ...newAppointment,
        id: `temp-${Date.now()}`,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKeys.appointments.all, (old) =>
        old ? [...old, optimisticAppointment] : [optimisticAppointment]
      );

      return { previousAppointments };
    },
    onSuccess: () => {
      // Invalidate and refetch to get fresh data
      queryUtils.invalidateAppointments();
      queryUtils.invalidateAvailability();
      clearError(); // Clear any previous errors on success
    },
    onError: (err, newAppointment, context) => {
      // Rollback optimistic update
      if (context?.previousAppointments) {
        queryClient.setQueryData(
          queryKeys.appointments.all,
          context.previousAppointments
        );
      }
      handleError(err); // Use error handler
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await dispatch(updateAppointment({ id, data }));
      if (result.error)
        throw new Error(result.error.message || "Failed to update appointment");
      return result.payload;
    },
    onSuccess: () => {
      queryUtils.invalidateAppointments();
      queryUtils.invalidateAvailability();
      clearError(); // Clear any previous errors on success
    },
    onError: (err) => {
      handleError(err); // Use error handler
    },
  });

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
      if (import.meta.env && import.meta.env.MODE === "development") {
        console.log(
          "Using fetched available drivers:",
          fetchedAvailableDrivers
        );
      }
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
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.warn("Service not found or has no duration");
        }
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
      if (import.meta.env && import.meta.env.MODE === "development") {
        console.error("Error calculating end time:", error);
      }
      return "";
    }
  }, [formData.start_time, formData.services, services]);

  // Debug: Log the data arrays to check if they contain data
  useEffect(() => {
    if (import.meta.env && import.meta.env.MODE === "development") {
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
    }
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

    if (import.meta.env && import.meta.env.MODE === "development") {
      console.log(
        "AppointmentForm - Dispatching fetchClients and fetchServices"
      );
    }
    dispatch(fetchClients());
    dispatch(fetchServices());

    // Fetch staff members to populate therapist and driver dropdowns
    // This ensures data is available when the form is opened from any context
    if (!staffMembers || staffMembers.length === 0) {
      if (import.meta.env && import.meta.env.MODE === "development") {
        console.log(
          "AppointmentForm - Dispatching fetchStaffMembers because staff data is missing."
        );
      }
      dispatch(fetchStaffMembers());
    }

    initialDataFetchedRef.current = true;
  }, [dispatch, staffMembers]);

  // Mark form as ready when we have essential data
  useEffect(() => {
    if (services.length > 0 && !loading) {
      if (!isFormReady) {
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.log("Form is now ready - services loaded successfully");
        }
        setIsFormReady(true);
      }
    }
  }, [services.length, loading, isFormReady]);

  // Add loading timeout to prevent infinite loading, but track if we've warned already
  const hasWarnedRef = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isFormReady && !loading && !hasWarnedRef.current) {
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.warn("Form loading timeout reached, forcing ready state");
        }
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
            if (import.meta.env && import.meta.env.MODE === "development") {
              console.warn(
                "Cannot fetch available therapists: unable to determine end time"
              );
            }
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

      if (import.meta.env && import.meta.env.MODE === "development") {
        console.log("AppointmentForm - Fetching available therapists/drivers");
      }
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
        Promise.allSettled([fetchPromise1, fetchPromise2])
          .then(() => {
            // Update TanStack Query cache with fresh availability data
            queryClient.setQueryData(
              queryKeys.availability.therapists(
                availabilityParams.date,
                availabilityParams.start_time,
                availabilityParams.services
              ),
              fetchedAvailableTherapists
            );

            queryClient.setQueryData(
              queryKeys.availability.drivers(
                availabilityParams.date,
                availabilityParams.start_time
              ),
              fetchedAvailableDrivers
            );
          })
          .finally(() => {
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
    queryClient,
    fetchedAvailableTherapists,
    fetchedAvailableDrivers,
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
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.error("Error setting appointment data:", error);
        }
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
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.error("Error formatting selected date:", error);
        }
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

  // Extracted function for registering a new client and retrying to get the client ID
  const registerAndFetchClientId = async (
    clientDetails,
    formData,
    clients,
    dispatch,
    setErrors,
    setIsSubmitting
  ) => {
    const newClientPayload = {
      first_name: clientDetails.first_name,
      last_name: clientDetails.last_name,
      phone_number: clientDetails.phone_number,
      email: clientDetails.email,
      address: formData.location,
      notes: formData.notes,
    };
    try {
      const response = await registerClient(newClientPayload);
      let newClient = response.data;
      await dispatch(fetchClients());
      // Retry loop to get the new client from the latest clients state
      let foundClient = null;
      for (let i = 0; i < 10; i++) {
        foundClient =
          newClient && newClient.id
            ? newClient
            : clients.find(
                (c) =>
                  c.email === clientDetails.email ||
                  c.phone_number === clientDetails.phone_number
              );
        if (foundClient && foundClient.id) break;
        await new Promise((res) => setTimeout(res, 100));
      }
      const clientId = foundClient && foundClient.id ? foundClient.id : null;
      if (!clientId) {
        setErrors((prev) => ({
          ...prev,
          client: "Failed to register new client. Please try again.",
        }));
        setIsSubmitting(false);
        return null;
      }
      return clientId;
    } catch {
      setErrors((prev) => ({
        ...prev,
        client: "Failed to register new client. Please try again.",
      }));
      setIsSubmitting(false);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side validation
    const newErrors = {};

    if (!formData.client) {
      newErrors.client = "Client is required";
    }

    if (!formData.services) {
      newErrors.services = "Service is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.start_time) {
      newErrors.start_time = "Start time is required";
    }

    if (!formData.end_time) {
      newErrors.end_time = "End time is required";
    }

    if (!formData.location) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);

    // If there are validation errors, don't submit the form
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    // Check if mutations are already pending to prevent double submission
    if (
      createAppointmentMutation.isPending ||
      updateAppointmentMutation.isPending
    ) {
      console.warn(
        "Mutation already in progress, preventing double submission"
      );
      setIsSubmitting(false);
      return;
    }

    try {
      let clientId = formData.client;

      // 2. After registering a new client, always use the latest client list from Redux after fetchClients
      if (!clientId) {
        clientId = await registerAndFetchClientId(
          clientDetails,
          formData,
          clients,
          dispatch,
          setErrors,
          setIsSubmitting
        );
        if (!clientId) {
          return;
        }
      }

      // Prepare sanitized form data
      const sanitizedFormData = {
        ...formData,
        client: parseInt(clientId, 10),
        services: formData.services ? [parseInt(formData.services, 10)] : [],
        start_time: formData.start_time || "",
        end_time: formData.end_time || "",
        location: formData.location || "",
        notes: formData.notes || "",
        multipleTherapists: formData.multipleTherapists || false,
      };

      // Triple check the therapist field specifically to ensure it's correct for the appointment type
      // For multi-therapist appointments, therapist should remain null
      if (
        !formData.multipleTherapists &&
        typeof sanitizedFormData.therapist !== "number"
      ) {
        console.warn(
          "Single therapist appointment but therapist field is not a number, attempting to fix:"
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
          if (import.meta.env && import.meta.env.MODE === "development") {
            console.error("Failed to fix therapist field:", e);
          }
          sanitizedFormData.therapist = null;
        }
      } else if (formData.multipleTherapists) {
        // Ensure therapist is null for multi-therapist appointments
        sanitizedFormData.therapist = null;
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.log(
            "Multi-therapist appointment - therapist field set to null"
          );
        }
      }

      // Prepare appointment data with required fields
      const appointmentData = {
        ...sanitizedFormData,
      };

      // Log the sanitized data for debugging (after declaration)
      if (import.meta.env && import.meta.env.MODE === "development") {
        console.log("Pre-sanitized appointment data:", appointmentData);
        console.log("Final sanitized appointment data:", appointmentData);
        console.log("Data types:", {
          client: typeof appointmentData.client,
          services: Array.isArray(appointmentData.services)
            ? `Array of ${appointmentData.services.length} items`
            : typeof appointmentData.services,
          therapist: typeof appointmentData.therapist,
          therapists: Array.isArray(appointmentData.therapists)
            ? `Array of ${appointmentData.therapists.length} items`
            : typeof appointmentData.therapists,
          driver: typeof appointmentData.driver,
          date: typeof appointmentData.date,
          start_time: typeof appointmentData.start_time,
          end_time: typeof appointmentData.end_time,
        });
      }

      // Remove usage of sanitizeDataForApi and just use appointmentData directly
      const finalAppointmentData = appointmentData;

      // Final verification of data formats for critical fields
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
        !finalAppointmentData.services
      ) {
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.error(
            "Validation failed. Current data:",
            finalAppointmentData
          );
        }
        throw new Error("Missing required fields. Please check your form.");
      }

      if (appointment) {
        // Update existing appointment with TanStack Query
        await updateAppointmentMutation.mutateAsync({
          id: appointment.id,
          data: finalAppointmentData,
        });
      } else {
        // Create new appointment with optimistic updates
        await createAppointmentMutation.mutateAsync(finalAppointmentData);
      }

      // Reset form and call success callback
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      setFormData(initialFormState);
      setClientDetails({
        first_name: "",
        last_name: "",
        phone_number: "",
        email: "",
      });
      setErrors({});
    } catch (error) {
      if (import.meta.env && import.meta.env.MODE === "development") {
        console.error("📋 Form submission error:", error);
      }

      // Use the error handler hook for consistent error handling
      handleError(error);

      // Special handling for therapist availability error
      if (error.therapist && typeof error.therapist === "string") {
        setErrors((prev) => ({
          ...prev,
          therapist: error.therapist,
        }));
      }

      // Handle validation errors from API
      if (typeof error === "object" && error !== null && !error.response) {
        if (typeof error === "object") {
          const apiErrors = {};
          Object.entries(error).forEach(([field, messages]) => {
            if (field === "_original" || field === "therapist") return;
            if (Array.isArray(messages)) {
              apiErrors[field] = messages[0];
            } else if (typeof messages === "string") {
              apiErrors[field] = messages;
            }
          });
          setErrors((prev) => ({ ...prev, ...apiErrors }));
        }
      }

      // Handle Axios response errors (legacy support)
      if (error.response) {
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.error("API Response Error:", error.response.data);
          console.error("API Status:", error.response.status);
          console.error("API Headers:", error.response.headers);
        }

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
          return;
        }
      } else {
        if (import.meta.env && import.meta.env.MODE === "development") {
          console.error("Unknown error:", error.message || error);
        }
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

  // Update clientDetails when an existing client is selected
  useEffect(() => {
    if (formData.client) {
      const selected = clients.find((c) => c.id === formData.client);
      if (selected) {
        setClientDetails({
          first_name: selected.first_name || "",
          last_name: selected.last_name || "",
          phone_number: selected.phone_number || "",
          email: selected.email || "",
        });
      }
    } else {
      setClientDetails({
        first_name: "",
        last_name: "",
        phone_number: "",
        email: "",
      });
    }
  }, [formData.client, clients]);

  // Show loading spinner only if form is not ready and we're still loading essential data
  if (!isFormReady || (loading && services.length === 0)) {
    return (
      <FormLoadingOverlay>
        <LoadingSpinner
          size="large"
          variant="primary"
          text="Loading appointment form..."
          className="appointment-form-loading"
        />
        {loading && <p>Fetching services and client data...</p>}
      </FormLoadingOverlay>
    );
  }

  // Show mutation loading state and errors
  const isMutationPending =
    createAppointmentMutation.isPending || updateAppointmentMutation.isPending;
  const mutationError =
    createAppointmentMutation.error || updateAppointmentMutation.error;

  // Return the form once we have essential data
  return (
    <div className="appointment-form-container">
      {/* Debug component for troubleshooting client search */}
      {import.meta.env.DEV && <ClientSearchDebug />}

      <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>

      {/* Error Handler Display */}
      {showError && (
        <div className="error-message error-boundary">
          <strong>Error:</strong> {showError}
          <button
            type="button"
            onClick={clearError}
            className="error-dismiss-btn"
            style={{ marginLeft: "10px", padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TanStack Query Error Display */}
      {mutationError && (
        <div className="error-message">
          <strong>Submission Error:</strong> {mutationError.message}
        </div>
      )}

      {errors.form && <div className="error-message">{errors.form}</div>}

      {/* Optimistic Update Indicator */}
      {isMutationPending && (
        <OptimisticIndicator
          message={
            appointment ? "Updating appointment..." : "Creating appointment..."
          }
        />
      )}

      {/* Form Loading Overlay for submission */}
      <FormLoadingOverlay
        show={isSubmitting || isMutationPending}
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
        {/* Always show phone/email fields for new or existing client */}
        <div className="form-row">
          <div className="form-group">
            <label>First Name:</label>
            <input
              type="text"
              value={clientDetails.first_name}
              onChange={(e) =>
                setClientDetails((d) => ({ ...d, first_name: e.target.value }))
              }
              disabled={!!formData.client}
              placeholder="First name"
            />
          </div>
          <div className="form-group">
            <label>Last Name:</label>
            <input
              type="text"
              value={clientDetails.last_name}
              onChange={(e) =>
                setClientDetails((d) => ({ ...d, last_name: e.target.value }))
              }
              disabled={!!formData.client}
              placeholder="Last name"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Phone Number:</label>
            <input
              type="text"
              value={clientDetails.phone_number}
              onChange={(e) =>
                setClientDetails((d) => ({
                  ...d,
                  phone_number: e.target.value,
                }))
              }
              disabled={!!formData.client}
              placeholder="09XXXXXXXXX"
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={clientDetails.email}
              onChange={(e) =>
                setClientDetails((d) => ({ ...d, email: e.target.value }))
              }
              disabled={!!formData.client}
              placeholder="email@example.com"
            />
          </div>
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
                  min - ₱{parseFloat(service.price || 0).toFixed(2)}
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
            <select
              id="therapist"
              name="therapist"
              value={formData.therapist || ""}
              onChange={handleChange}
              className={errors.therapist ? "error" : ""}
              disabled={
                isSubmitting ||
                !formData.date ||
                !formData.start_time ||
                !formData.services ||
                (formData.date &&
                  formData.start_time &&
                  formData.services &&
                  availableTherapists.length === 0)
              }
            >
              {fetchingAvailability ? (
                <option value="" disabled>
                  Checking availability...
                </option>
              ) : !formData.date ||
                !formData.start_time ||
                !formData.services ? (
                <option value="" disabled>
                  Please select date, time and service first to see available
                  therapists
                </option>
              ) : availableTherapists && availableTherapists.length > 0 ? (
                [
                  <option value="" key="none">
                    Select a therapist
                  </option>,
                  ...availableTherapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.first_name || ""} {therapist.last_name || ""} -{" "}
                      {therapist.specialization || "General"} -{" "}
                      {therapist.massage_pressure || "Standard"}{" "}
                      {therapist.start_time && therapist.end_time
                        ? `(Available: ${therapist.start_time}-${therapist.end_time})`
                        : ""}
                    </option>
                  )),
                ]
              ) : (
                <option value="" disabled>
                  No therapists available for selected date/time - please choose
                  a different time
                </option>
              )}
            </select>
            {(!formData.date || !formData.start_time || !formData.services) &&
              !fetchingAvailability && (
                <small className="info-text">
                  ℹ️ Please select date, time and service first to see available
                  therapists
                </small>
              )}
            {formData.date &&
              formData.start_time &&
              formData.services &&
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
                !formData.date ||
                !formData.start_time ||
                !formData.services ||
                (formData.date &&
                  formData.start_time &&
                  formData.services &&
                  availableTherapists.length === 0)
              }
            >
              {fetchingAvailability ? (
                <option value="" disabled>
                  Checking availability...
                </option>
              ) : !formData.date ||
                !formData.start_time ||
                !formData.services ? (
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
            {(!formData.date || !formData.start_time || !formData.services) &&
              !fetchingAvailability && (
                <small className="info-text">
                  ℹ️ Please select date, time and service first to see available
                  therapists
                </small>
              )}
            {formData.date &&
              formData.start_time &&
              formData.services &&
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
          <select
            id="driver"
            name="driver"
            value={formData.driver || ""}
            onChange={handleChange}
            className={errors.driver ? "error" : ""}
            disabled={
              isSubmitting ||
              !formData.date ||
              !formData.start_time ||
              !formData.services ||
              (formData.date &&
                formData.start_time &&
                formData.services &&
                availableDrivers.length === 0)
            }
          >
            {fetchingAvailability ? (
              <option value="" disabled>
                Checking availability...
              </option>
            ) : !formData.date || !formData.start_time || !formData.services ? (
              <option value="" disabled>
                Please select date, time and service first to see available
                drivers
              </option>
            ) : availableDrivers && availableDrivers.length > 0 ? (
              [
                <option value="" key="none">
                  Select a driver (optional)
                </option>,
                ...availableDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name || ""} {driver.last_name || ""}{" "}
                    {driver.start_time && driver.end_time
                      ? `(Available: ${driver.start_time}-${driver.end_time})`
                      : ""}
                  </option>
                )),
              ]
            ) : (
              <option value="" disabled>
                No drivers available for selected date/time - please choose a
                different time
              </option>
            )}
          </select>
          {(!formData.date || !formData.start_time || !formData.services) && (
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
            loading={isSubmitting || isMutationPending}
            loadingText={
              isMutationPending
                ? appointment
                  ? "Updating..."
                  : "Creating..."
                : appointment
                ? "Updating..."
                : "Creating..."
            }
            variant="primary"
            size="medium"
            className="submit-button"
            disabled={
              isSubmitting ||
              isMutationPending ||
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
