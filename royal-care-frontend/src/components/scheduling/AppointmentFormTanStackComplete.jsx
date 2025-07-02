// Helper: Check if a time string is within allowed window (13:00-23:59 or 00:00-01:00)
const isTimeInAllowedWindow = (time) => {
  if (!time) return false;
  const [h, m] = time.split(":").map(Number);
  if (h >= 13 && h <= 23) return true;
  if (h === 0) return true;
  if (h === 1 && m === 0) return true;
  return false;
};

// Helper: Check if end time is after start time, accounting for cross-day scheduling
const isValidEndTime = (startTime, endTime) => {
  if (!startTime || !endTime) return false;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  // Convert to minutes for easier comparison
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // If end time is in early morning (00:00-01:00) and start time is afternoon/evening (13:00-23:59)
  // this is a valid cross-day appointment
  if (endH >= 0 && endH <= 1 && startH >= 13 && startH <= 23) {
    return true; // Cross-day is valid
  }

  // If both times are on the same day, end must be after start
  if (startH >= 13 && endH >= 13) {
    return endMinutes > startMinutes;
  }

  // If start is afternoon/evening and end is not early morning, it's invalid
  if (startH >= 13 && endH < 13 && endH > 1) {
    return false;
  }

  // For same-day appointments, end must be after start
  return endMinutes > startMinutes;
};
/**
 * COMPLETE TanStack Query Migration Example
 * Shows the dramatic simplification possible with TanStack Query
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { fetchClients } from "../../features/scheduling/schedulingSlice";
import FormField from "../../globals/FormField";
import modalStyles from "../../pages/SettingsDataPage/SettingsDataPage.module.css";
import { registerClient } from "../../services/api";
import "../../styles/AppointmentForm.css";
import {
  clearFormData,
  saveFormData,
} from "../../utils/appointmentFormPersistence";

// TanStack Query hooks - Replace ALL your custom caching
import {
  useCreateAppointment,
  useUpdateAppointment,
} from "../../hooks/useAppointmentQueries";
import { useFormAvailability } from "../../hooks/useAvailabilityQueries";
import { useMaterialsWithStock } from "../../hooks/useMaterialsWithStock";
import { useFormStaticData } from "../../hooks/useStaticDataQueries";
import { queryKeys } from "../../lib/queryClient";

// Components
import LazyClientSearch from "../common/LazyClientSearch";
import {
  LoadingButton,
  OptimisticIndicator,
} from "../common/LoadingComponents";

const initialFormState = {
  client: "",
  services: "",
  date: "",
  start_time: "",
  end_time: "",
  address: "", // Replace location with address (becomes both client address AND appointment location)
  notes: "",
  therapist: "",
  therapists: [],
  driver: "",
  multipleTherapists: false,
  // New inline client fields for seamless registration
  clientFirstName: "",
  clientLastName: "",
  clientPhone: "",
  clientEmail: "", // Optional
};

// Utility function to format date to yyyy-MM-dd
const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";

  // If it's already a yyyy-MM-dd string, return as-is (treat as local date)
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // If it's a Date object, format it as local date
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // If it's an ISO string with time, extract the date part
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    return dateValue.split("T")[0];
  }

  // If it's a date string with GMT, parse it as a Date and format as local
  if (typeof dateValue === "string" && dateValue.includes("GMT")) {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Return as-is for other string formats
  return dateValue;
};

// Utility function to check if selected date/time is in the past
const isDateTimeInPast = (date, time) => {
  if (!date || !time) return false;

  const now = new Date();
  const selectedDateTime = new Date(`${date}T${time}`);

  return selectedDateTime < now;
};

// Utility function to get minimum date (today)
const getMinDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Utility function to get minimum time for today
// Removed duplicate import of useEffect

const AppointmentFormTanStackComplete = ({
  appointment = null,
  onSubmitSuccess,
  onCancel,
  selectedDate,
  selectedTime,
}) => {
  // Form state (simplified)
  const [formData, setFormData] = useState(initialFormState);

  // Always fetch fresh therapist/driver options when form is opened or date/time changes
  useEffect(() => {
    // This effect triggers the TanStack Query hooks for therapist/driver availability
    // No-op here, but ensures hooks re-run on relevant changes
    // If you use a custom cache for therapist/driver, clear it here
    // (No-op: TanStack Query handles this if query keys use date/time)
  }, [formData.date, formData.start_time, formData.end_time]);
  
  const [errors, setErrors] = useState({});
  const [materialQuantities, setMaterialQuantities] = useState({});

  // Load saved form data on component mount (only if not editing existing appointment)
  useEffect(() => {
    // TEMPORARILY DISABLED: Auto-loading saved form data
    // This was causing previously selected clients to appear in the form
    /*
    if (!appointment && hasSavedFormData()) {
      try {
        const savedData = loadFormData();
        if (savedData) {
          console.log("📥 Loading saved form data for better UX");
          setFormData(savedData.formData);
          setMaterialQuantities(savedData.materialQuantities);
        }
      } catch (error) {
        console.error("Failed to load saved form data:", error);
        clearFormData(); // Clear corrupted data
      }
    }
    */
    
    // Clear any existing saved data to ensure clean start
    if (!appointment) {
      clearFormData();
    }
  }, [appointment]);

  // Auto-save form data when user makes changes (debounced)
  useEffect(() => {
    if (!appointment) {
      // Only save for new appointments
      const saveTimer = setTimeout(() => {
        // Only save if there's meaningful data
        const hasData =
          formData.client ||
          formData.services ||
          formData.date ||
          formData.start_time ||
          formData.address ||
          formData.notes;

        if (hasData) {
          saveFormData(formData, {}, materialQuantities);
        }
      }, 1000); // 1 second debounce

      return () => clearTimeout(saveTimer);
    }
  }, [formData, materialQuantities, appointment]);

  // Handle form close with data preservation
  const handleFormClose = useCallback(() => {
    // Check if user has entered any data
    const hasData =
      formData.client ||
      formData.services ||
      formData.date ||
      formData.start_time ||
      formData.address ||
      formData.notes;

    if (!appointment && hasData) {
      // For new appointments with data, just close - data will be saved automatically
      console.log(
        "📝 Form closed with unsaved data - data will be preserved for next time"
      );
    }

    onCancel?.();
  }, [formData, appointment, onCancel]);

  // Client registration modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    phoneNumber: "",
    notes: "",
  });
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  // Redux dispatch for client fetching
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [materials, setMaterials] = useState([]);

  // 🔥 BEFORE: 600+ lines of custom cache logic
  // 🎉 AFTER: 3 simple hooks that handle everything!

  // Static data (clients, services) - Cached automatically
  const {
    services,
    clients,
    isLoadingServices,
    isLoadingClients,
    staticDataReady = false,
  } = useFormStaticData();

  // Debug logging for static data
  useEffect(() => {
    if (staticDataReady) {
      console.log(
        "✅ Static data ready - Clients:",
        Array.isArray(clients) ? clients.length : "not array",
        "Services:",
        Array.isArray(services) ? services.length : "not array"
      );
    }
  }, [clients, services, isLoadingServices, isLoadingClients, staticDataReady]);

  // Availability checking - Replaces your complex debounced logic
  const {
    availableTherapists,
    availableDrivers,
    isLoadingAvailability,
    hasAvailabilityError,
    canFetchAvailability,
  } = useFormAvailability({
    ...formData,
    date: formatDateForInput(formData.date),
  });

  // Mutations with optimistic updates
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  // Fetch materials with stock for the selected service
  const {
    data: materialsWithStock = [],
    isLoading: isLoadingMaterials,
    error: materialsError,
    refetch: refetchMaterialsWithStock,
  } = useMaterialsWithStock(formData.services);

  // Auto-calculate end time when dependencies change
  useEffect(() => {
    // Inline calculation to avoid dependency on calculateEndTime callback
    if (!formData.start_time || !formData.services || !services.length) return;

    const service = services.find((s) => s.id === parseInt(formData.services));
    if (!service?.duration) return;

    const startTime = new Date(`2000-01-01T${formData.start_time}:00`);
    startTime.setMinutes(startTime.getMinutes() + service.duration);
    const endTime = startTime.toTimeString().slice(0, 5);

    if (endTime && formData.end_time !== endTime) {
      setFormData((prev) => ({ ...prev, end_time: endTime }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.start_time, formData.services, services]); // formData.end_time intentionally excluded to prevent infinite loop

  // Handle form changes
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked, multiple, options } = e.target;

      if (type === "checkbox") {
        setFormData((prev) => ({ ...prev, [name]: checked }));
        if (name === "multipleTherapists") {
          if (checked) {
            // Switching to multiple therapists mode - clear single therapist
            setFormData((prev) => ({ ...prev, therapist: "", therapists: [] }));
          } else {
            // Switching to single therapist mode - clear multiple therapists
            setFormData((prev) => ({ ...prev, therapists: [], therapist: "" }));
          }
        }
        return;
      }

      // Clear existing errors for this field
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }

      // Validate date - prevent past dates
      if (name === "date") {
        const today = getMinDate();
        if (value && value < today) {
          setErrors((prev) => ({
            ...prev,
            date: "Cannot book appointments for past dates",
          }));
          return; // Don't update the form data
        }

        // If changing date, also validate existing time
        if (
          formData.start_time &&
          isDateTimeInPast(value, formData.start_time)
        ) {
          setErrors((prev) => ({
            ...prev,
            start_time: "Cannot book appointments in the past",
          }));
        }
      }

      // Validate start time - prevent past times for today and restrict to allowed window
      if (name === "start_time") {
        if (formData.date && isDateTimeInPast(formData.date, value)) {
          setErrors((prev) => ({
            ...prev,
            start_time: "Cannot book appointments in the past",
          }));
          return; // Don't update the form data
        } else if (!isTimeInAllowedWindow(value)) {
          setErrors((prev) => ({
            ...prev,
            start_time: "Start time must be between 13:00 and 01:00",
          }));
          return;
        }
      }

      // Validate end time - ensure it's after start time and restrict to allowed window
      if (name === "end_time") {
        if (
          formData.start_time &&
          value &&
          !isValidEndTime(formData.start_time, value)
        ) {
          setErrors((prev) => ({
            ...prev,
            end_time: "End time must be after start time",
          }));
          return; // Don't update the form data
        } else if (!isTimeInAllowedWindow(value)) {
          setErrors((prev) => ({
            ...prev,
            end_time: "End time must be between 13:00 and 01:00",
          }));
          return;
        }
      }

      let newValue = value;
      if (multiple) {
        // For multi-select, collect all selected options as an array
        newValue = Array.from(options)
          .filter((opt) => opt.selected)
          .map((opt) => opt.value);
      }

      setFormData((prev) => ({ ...prev, [name]: newValue }));
    },
    [errors, formData.date, formData.start_time]
  );

  // Refetch materials when the selected service changes
  useEffect(() => {
    if (formData.services) {
      refetchMaterialsWithStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.services]);

  // Update materials when service or materialsWithStock changes (prevent infinite loop)
  useEffect(() => {
    console.log("🔍 Materials useEffect triggered:", {
      serviceSelected: !!formData.services,
      serviceId: formData.services,
      materialsWithStockLength: materialsWithStock.length,
      materialsWithStock: materialsWithStock,
      isLoadingMaterials,
      materialsError: materialsError?.message || materialsError,
    });

    // Only process materials if a service is selected
    if (!formData.services) {
      console.log("🚫 No service selected, clearing materials");
      setMaterials([]);
      setMaterialQuantities({});
      return;
    }

    // If there's an error, clear materials and log it
    if (materialsError) {
      console.error("❌ Materials API error:", materialsError);
      setMaterials([]);
      setMaterialQuantities({});
      return;
    }

    if (materialsWithStock.length > 0) {
      console.log("DEBUG materialsWithStock from API:", materialsWithStock);
      
      // Filter out materials without valid inventory_item_id to prevent deduction failures
      const validMaterials = materialsWithStock.filter(mat => mat.inventory_item !== null && mat.inventory_item !== undefined);
      console.log("DEBUG filtered valid materials:", validMaterials);
      
      if (validMaterials.length !== materialsWithStock.length) {
        console.warn(`⚠️ Filtered out ${materialsWithStock.length - validMaterials.length} materials without inventory items`);
      }
      
      const processedMats = validMaterials.map((mat) => ({
        ...mat,
        name:
          mat.name ||
          mat.material_name ||
          mat.item_name ||
          Object.values(mat).find((v) => typeof v === "string") ||
          "Material",
        current_stock: mat.current_stock ?? 0,
        unit_of_measure: mat.unit_of_measure || "",
      }));
      console.log("DEBUG processed materials:", processedMats);

      setMaterials(processedMats);

      // Reset material quantities when service changes
      const initialQuantities = {};
      processedMats.forEach((mat) => {
        initialQuantities[mat.id] = "";
      });
      setMaterialQuantities(initialQuantities);
    } else {
      console.log("⚠️ No materials found, clearing materials state");
      setMaterials([]);
      setMaterialQuantities({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.services, materialsWithStock.length, materialsError]); // Use length instead of the full array to prevent frequent re-renders

  // Handle material quantity change
  const handleMaterialQuantityChange = (materialId, value) => {
    console.log(`🔍 DEBUG - Material quantity changed: ID ${materialId} = ${value}`);
    setMaterialQuantities((prev) => {
      const updated = { ...prev, [materialId]: value };
      console.log("🔍 DEBUG - Updated materialQuantities:", updated);
      return updated;
    });
  };

  // Handle client selection from LazyClientSearch
  const handleClientSelect = useCallback((client) => {
    console.log("🔍 Client selected:", client);
    setFormData((prev) => ({ ...prev, client }));
    // Clear client error if it exists
    if (errors.client) {
      setErrors((prev) => ({ ...prev, client: "" }));
    }
  }, [errors.client]);

  // Handle client clear from LazyClientSearch
  const handleClearClient = useCallback(() => {
    console.log("🔍 Clearing selected client");
    setFormData((prev) => ({ ...prev, client: "" }));
  }, []);

  // Client registration modal handlers
  const handleRegisterClientClick = () => {
    setShowClientModal(true);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setClientFormData({
      firstName: "",
      lastName: "",
      email: "",
      address: "",
      phoneNumber: "",
      notes: "",
    });
  };

  const handleClientFormChange = (e) => {
    const { name, value } = e.target;
    setClientFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingClient(true);

    try {
      const clientData = {
        first_name: clientFormData.firstName,
        last_name: clientFormData.lastName,
        email: clientFormData.email,
        phone_number: clientFormData.phoneNumber,
        address: clientFormData.address,
        notes: clientFormData.notes,
      };

      console.log("📋 Registering new client from modal:", clientData);
      const response = await registerClient(clientData);

      const newClientId = response.data?.id || response.data?.client?.id;

      if (newClientId) {
        // Refresh clients list
        await dispatch(fetchClients()).unwrap();

        // Invalidate TanStack Query cache for clients to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: queryKeys.clients.all,
        });

        // Auto-select the newly registered client
        const newClient = {
          id: newClientId,
          ...clientData,
          database_id: newClientId,
          is_existing_client: true,
        };

        setFormData((prev) => ({ ...prev, client: newClient }));

        // Clear client error if it exists
        if (errors.client) {
          setErrors((prev) => ({ ...prev, client: "" }));
        }

        console.log("✅ Client registered and selected:", newClient);
        handleCloseClientModal();
      } else {
        throw new Error("No client ID returned from registration");
      }
    } catch (error) {
      console.error("❌ Failed to register client:", error);
      alert("Failed to register client. Please try again.");
    } finally {
      setIsSubmittingClient(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    // Check if client is selected (either as object or ID)
    const hasClient =
      formData.client &&
      ((typeof formData.client === "object" &&
        (formData.client.id || formData.client.ID)) ||
        (typeof formData.client === "string" && formData.client.trim()) ||
        (typeof formData.client === "number" && formData.client));

    if (!hasClient) newErrors.client = "Client is required";
    if (!formData.services) newErrors.services = "Service is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.start_time) newErrors.start_time = "Start time is required";
    if (!formData.end_time) newErrors.end_time = "End time is required";
    if (!formData.address) newErrors.address = "Address is required";

    // Validate date and time are not in the past
    if (formData.date && formData.start_time) {
      if (isDateTimeInPast(formData.date, formData.start_time)) {
        newErrors.start_time = "Cannot book appointments in the past";
      }
    }

    // Validate date is not in the past
    if (formData.date && formData.date < getMinDate()) {
      newErrors.date = "Cannot book appointments for past dates";
    }

    // Validate end time is after start time
    if (
      formData.start_time &&
      formData.end_time &&
      !isValidEndTime(formData.start_time, formData.end_time)
    ) {
      newErrors.end_time = "End time must be after start time";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      let clientId;
      
      // Determine if we need to register a new client
      if (typeof formData.client === "object" && formData.client) {
        // Use existing client object
        if (formData.client.is_existing_client && formData.client.database_id) {
          clientId = formData.client.database_id;
        } else if (formData.client.id) {
          clientId = parseInt(formData.client.id, 10);
        } else {
          console.log(
            "⚠️  Client object detected but no ID field, will register as new client"
          );
          console.log("📋 Client object:", formData.client);
          clientId = null; // Force registration of new client
        }
      } else if (formData.client) {
        const id = formData.client;
        // Check if ID is numeric or can be converted to a valid numeric ID
        const numericId = parseInt(id, 10);
        if (
          !isNaN(numericId) &&
          numericId > 0 &&
          !id.toString().includes("-")
        ) {
          clientId = numericId;
          console.log("📋 Using valid numeric client ID directly:", clientId);
        } else {
          console.log(
            "⚠️ Invalid client ID format:",
            id,
            "- will register as new client"
          );
          clientId = null;
        }
      } else {
        console.log("📋 No valid client ID found");
        clientId = null;
      }

      // Register new client if needed
      if (!clientId) {
        console.log("📋 Registering new client...");

        // Use client details from form for registration
        const clientDetailsForRegistration = {
          first_name: formData.clientFirstName || "",
          last_name: formData.clientLastName || "",
          phone_number: formData.clientPhone || "",
          email: formData.clientEmail || "",
        };

        // If we have a selected client object but no database ID, use its details for registration
        if (typeof formData.client === "object" && formData.client) {
          const clientObject = formData.client;
          clientDetailsForRegistration.first_name = 
            clientObject.first_name || clientDetailsForRegistration.first_name;
          clientDetailsForRegistration.last_name = 
            clientObject.last_name || clientDetailsForRegistration.last_name;
          clientDetailsForRegistration.phone_number = 
            clientObject.phone_number || clientDetailsForRegistration.phone_number;
          clientDetailsForRegistration.email = 
            clientObject.email || clientDetailsForRegistration.email;

          console.log(
            "📋 Using client object details for registration:",
            clientDetailsForRegistration
          );
        }

        console.log(
          "📋 Client details being used for registration:",
          clientDetailsForRegistration
        );

        try {
          const response = await registerClient({
            first_name: clientDetailsForRegistration.first_name,
            last_name: clientDetailsForRegistration.last_name,
            phone_number: clientDetailsForRegistration.phone_number,
            email: clientDetailsForRegistration.email,
            address: formData.address,
          });

          console.log("📋 Registration response:", response.data);

          // Try to get client ID from response
          clientId = response.data?.id || response.data?.client?.id;

          if (clientId) {
            console.log("✅ Client registered successfully with ID:", clientId);
          } else {
            // If no ID returned, try to fetch the client by details
            console.log("⚠️ No client ID in response, fetching from clients list...");

            // Refetch clients to get the newly created client
            await dispatch(fetchClients()).unwrap();

            // Invalidate TanStack Query cache for clients
            await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });

            // Try to find the client by phone number (most reliable)
            const updatedClients = clients || [];
            const foundClient = updatedClients.find(
              (c) => c.phone_number && c.phone_number === clientDetailsForRegistration.phone_number
            );

            if (foundClient && foundClient.id) {
              console.log("✅ Found newly registered client:", foundClient.id);
              clientId = foundClient.id;
            } else {
              throw new Error("Client registered but ID not found");
            }
          }
        } catch (error) {
          console.error("❌ Failed to register client:", error);
          setErrors((prev) => ({
            ...prev,
            client: "Failed to register client. Please check the client details.",
          }));
          return;
        }

        if (!clientId) {
          setErrors((prev) => ({
            ...prev,
            client: "Failed to register client. Please check the client details.",
          }));
          return;
        }
        console.log("✅ New client registered with ID:", clientId);
      }

      // Validate final client ID
      const numericClientId = parseInt(clientId, 10);
      if (isNaN(numericClientId) || numericClientId <= 0) {
        console.error("❌ Invalid client ID:", clientId);
        setErrors((prev) => ({
          ...prev,
          client: "Invalid client selection. Please try again.",
        }));
        return;
      }

      console.log("📋 Final client ID for submission:", numericClientId);

      // Debug: Log materials state before preparing appointment data
      console.log("🔍 DEBUG - Materials state before submission:");
      console.log("  materialQuantities:", materialQuantities);
      console.log("  materials array:", materials);
      console.log("  materials length:", materials.length);
      
      // Check if we have any materials with quantities
      const materialsWithQuantities = Object.entries(materialQuantities)
        .filter((entry) => entry[1] && !isNaN(Number(entry[1])));
      console.log("  materials with quantities:", materialsWithQuantities);
      
      if (materialsWithQuantities.length === 0) {
        console.log("⚠️ WARNING: No materials with quantities found!");
      }

      // Prepare appointment data
      const appointmentData = {
        ...formData,
        client: numericClientId,
        services: [parseInt(formData.services, 10)],
        // Always use the therapists array since the form only has multi-select
        therapist: null, // Always null for new multi-therapist structure
        therapists: Array.isArray(formData.therapists)
          ? formData.therapists.map((id) => parseInt(id, 10))
          : [], // Convert therapist IDs to integers
        driver: formData.driver ? parseInt(formData.driver, 10) : null,
        location: formData.address, // Map address to location for backend compatibility
        materials: Object.entries(materialQuantities)
          .filter((entry) => entry[1] && !isNaN(Number(entry[1])))
          .map(([materialId, qty]) => {
            // Find the material in our materials array to validate it has inventory_item
            const material = materials.find(m => m.id === parseInt(materialId, 10));
            if (!material || !material.inventory_item) {
              console.warn(`⚠️ Skipping material ${materialId} - no valid inventory item`);
              return null;
            }
            return {
              material: parseInt(materialId, 10),
              quantity: Number(qty),
            };
          })
          .filter(Boolean), // Remove null values
        date: formatDateForInput(formData.date),
      };

      // Debug: Log the materials preparation process
      console.log("🔍 DEBUG - Materials preparation process:");
      console.log("  materialQuantities entries:", Object.entries(materialQuantities));
      console.log("  filtered entries:", Object.entries(materialQuantities).filter((entry) => entry[1] && !isNaN(Number(entry[1]))));
      console.log("  final materials array:", appointmentData.materials);

      console.log("📋 Appointment data being submitted:", appointmentData);

      console.log("📋 Appointment data being submitted:", appointmentData);
      console.log("🔍 DEBUG - Final materials check:");
      console.log("  appointmentData.materials:", appointmentData.materials);
      console.log("  materials count:", appointmentData.materials?.length || 0);

      // 🔥 BEFORE: Complex manual Redux dispatch + cache management
      // 🎉 AFTER: One simple mutation call with automatic cache updates!

      console.log("🚀 About to call createMutation.mutateAsync...");
      
      if (appointment) {
        await updateMutation.mutateAsync({
          id: appointment.id,
          data: appointmentData,
        });
      } else {
        const result = await createMutation.mutateAsync(appointmentData);
        console.log("✅ Create mutation result:", result);
      }

      // Success - form is automatically reset by the mutation
      onSubmitSuccess?.();

      // Clear saved form data only after successful appointment creation
      clearFormData();

      setFormData(initialFormState);
      setErrors({});
    } catch (error) {
      console.error("Submission error:", error);

      // Handle validation errors
      if (error && typeof error === "object") {
        const apiErrors = {};
        Object.entries(error).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            apiErrors[field] = messages[0];
          } else if (typeof messages === "string") {
            apiErrors[field] = messages;
          }
        });
        setErrors((prev) => ({ ...prev, ...apiErrors }));
      } else {
        setErrors((prev) => ({
          ...prev,
          form: "Failed to submit appointment",
        }));
      }
    }
  };

  // Set initial values

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = formatDateForInput(selectedDate);
      if (formData.date !== formattedDate) {
        setFormData((prev) => ({ ...prev, date: formattedDate }));
      }
    }
    // Only run when selectedDate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTime && formData.start_time !== selectedTime) {
      setFormData((prev) => ({ ...prev, start_time: selectedTime }));
    }
    // Only run when selectedTime changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime]);

  // Populate form for editing - Prevent infinite loops by removing formData.date dependency
  useEffect(() => {
    if (appointment && !formData.date) {
      // Handle client data - can be ID or object
      let clientData = appointment.client;
      if (typeof appointment.client === "object") {
        clientData = appointment.client;
      } else if (Array.isArray(clients) && appointment.client) {
        // Find the full client object from the clients list
        const foundClient = clients.find(
          (c) => (c.id || c.ID) === appointment.client
        );
        clientData = foundClient || appointment.client;
      }

      setFormData({
        client: clientData || "",
        services: appointment.services?.[0] || "",
        date: formatDateForInput(appointment.date),
        start_time: appointment.start_time || "",
        end_time: appointment.end_time || "",
        address: appointment.location || "", // Use appointment location as address
        notes: appointment.notes || "",
        therapist: "", // No longer used since we only use multi-select
        therapists: Array.isArray(appointment.therapists)
          ? appointment.therapists
          : appointment.therapist
          ? [appointment.therapist] // Convert single therapist to array
          : [],
        driver: appointment.driver || "",
        multipleTherapists: !!(appointment.therapists?.length > 0),
      });
    }
  }, [appointment, clients]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading states
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading while services are loading - but show the container
  const isFormReady = true;

  // URL param management for modal state
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    // Add ?showAppointmentForm=1 when form is mounted
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set("showAppointmentForm", "1");

    // Add appointment context to URL if editing
    if (appointment) {
      currentParams.set("appointmentId", appointment.id.toString());
      currentParams.set("mode", "edit");
    } else {
      currentParams.set("mode", "create");
    }

    setSearchParams(currentParams, { replace: true });
    return () => {
      // Remove params on unmount
      const cleanupParams = new URLSearchParams(searchParams);
      cleanupParams.delete("showAppointmentForm");
      cleanupParams.delete("appointmentId");
      cleanupParams.delete("mode");
      setSearchParams(cleanupParams, { replace: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment]);
  return (
    <div className="appointment-form-container">
      <div
        className="form-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>
          {/* {!appointment && hasSavedFormData() && (
            <div
              style={{
                fontSize: "0.85em",
                color: "#666",
                marginTop: "4px",
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              💾 Previous form data restored for your convenience
              <button
                type="button"
                onClick={() => {
                  clearFormData();
                  setFormData(initialFormState);
                  setMaterialQuantities({});
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
                  fontSize: "0.8em",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>
          )} */}
        </div>
        <button
          type="button"
          className="close-btn"
          aria-label="Close appointment form"
          style={{
            background: "none",
            border: "none",
            fontSize: 24,
            cursor: "pointer",
            color: "#888",
            marginLeft: 8,
            lineHeight: 1,
          }}
          onClick={handleFormClose}
        >
          &times;
        </button>
      </div>

      {!isFormReady ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            color: "#666",
          }}
        >
          <div
            className="loading-spinner"
            style={{
              width: "32px",
              height: "32px",
              marginBottom: "16px",
            }}
          ></div>
          <p>Loading form...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="appointment-form">
          {/* 🔥 BEFORE: Complex manual loading indicators */}
          {/* 🎉 AFTER: Simple, automatic optimistic indicators */}
          {isSubmitting && (
            <OptimisticIndicator message="Saving appointment..." />
          )}
          {errors.form && <div className="error-message">{errors.form}</div>}
          {/* Client Selection */}
          <div className="form-group">
            <label htmlFor="client">Client *</label>
            <LazyClientSearch
              selectedClient={(() => {
                // If formData.client is already a client object, use it directly
                if (
                  typeof formData.client === "object" &&
                  formData.client &&
                  formData.client.id
                ) {
                  console.log(
                    "🔍 Using formData.client directly as selectedClient:",
                    formData.client
                  );
                  return formData.client;
                }

                // Otherwise try to find it in the clients array (for editing existing appointments)
                if (Array.isArray(clients) && formData.client) {
                  const foundClient = clients.find((c) => {
                    const clientId = c.id || c.ID;
                    const match = clientId === formData.client;
                    return match;
                  });

                  console.log("🔍 Found client in clients array:", foundClient);
                  return foundClient || null;
                }

                return null;
              })()}
              onClientSelect={handleClientSelect}
              onRegisterClientClick={handleRegisterClientClick}
              error={errors.client}
              disabled={isSubmitting}
              hideRegisterText={true}
              showClearButton={true}
              onClear={handleClearClient}
            />
          </div>{" "}
          {/* Service Selection */}
          <div className="form-group">
            <label htmlFor="services">Service *</label>
            <select
              id="services"
              name="services"
              value={formData.services}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.services ? "error" : ""}
              style={{ width: "100%" }}
            >
              <option value="">Select a service</option>
              {Array.isArray(services) &&
                services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.duration} min - ₱{service.price}
                  </option>
                ))}
            </select>
            {errors.services && (
              <div className="error-message">{errors.services}</div>
            )}
          </div>{" "}
          {/* Materials Section */}
          <div className="form-group">
            <label>Materials Needed</label>
            <div className="materials-list">
              {formData.services && isLoadingMaterials ? (
                <div
                  style={{
                    padding: "12px 0",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  Loading materials...
                </div>
              ) : materialsError ? (
                <div
                  style={{
                    padding: "12px 0",
                    color: "#d32f2f",
                    fontStyle: "italic",
                  }}
                >
                  Error loading materials. Please try refreshing or contact
                  support if the issue persists.
                  <button
                    type="button"
                    onClick={() => refetchMaterialsWithStock()}
                    style={{
                      marginLeft: "8px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : materials.length === 0 ? (
                <span style={{ color: "#888" }}>
                  {formData.services
                    ? "No required materials for this service."
                    : "Select a service to see required materials."}
                </span>
              ) : (
                materials.map((mat) => {
                  return (
                    <div key={mat.id} className="material-item" style={{ 
                      marginBottom: '12px', 
                      padding: '8px', 
                      border: '1px solid #e0e0e0', 
                      borderRadius: '4px',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500' }}>
                            {mat.name || mat.material_name || mat.item_name || "Material"}
                          </div>
                          <div style={{ color: "#666", fontSize: "0.85em", marginTop: '2px' }}>
                            Category: {mat.category} | In stock: {mat.current_stock} {mat.unit_of_measure || 'units'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={materialQuantities[mat.id] || ""}
                            onChange={(e) =>
                              handleMaterialQuantityChange(mat.id, e.target.value)
                            }
                            placeholder="Qty"
                            style={{ 
                              width: 60, 
                              padding: '4px 8px',
                              border: '1px solid #ccc',
                              borderRadius: '3px'
                            }}
                          />
                          <span style={{ 
                            fontSize: '0.85em', 
                            color: '#666',
                            minWidth: '30px'
                          }}>
                            {mat.unit_of_measure || 'units'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                disabled={isSubmitting}
                min={getMinDate()}
                className={errors.date ? "error" : ""}
              />
              {errors.date && (
                <div className="error-message">{errors.date}</div>
              )}
            </div>

            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                disabled={isSubmitting}
                className={errors.start_time ? "error" : ""}
                min="13:00"
                max="01:00"
                required
              />
              {errors.start_time && (
                <div className="error-message">{errors.start_time}</div>
              )}
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                disabled={isSubmitting}
                className={errors.end_time ? "error" : ""}
                min="13:00"
                max="01:00"
                required
              />
              {errors.end_time && (
                <div className="error-message">{errors.end_time}</div>
              )}
            </div>
          </div>
          {/* 🔥 BEFORE: 200+ lines of complex availability checking */}
          {/* 🎉 AFTER: Simple, automatic availability display */}
          {canFetchAvailability && (
            <div className="availability-status">
              {isLoadingAvailability && (
                <div
                  className="availability-loading"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "#666",
                  }}
                >
                  <div className="loading-spinner-small"></div>
                  Checking availability...
                </div>
              )}
              {hasAvailabilityError && (
                <div className="availability-error">
                  ⚠️ Error checking availability - Please check your login
                  status or refresh the page
                </div>
              )}
              {!isLoadingAvailability && !hasAvailabilityError && (
                <div className="availability-info">
                  ✅ {availableTherapists.length} therapists,{" "}
                  {availableDrivers.length} drivers available
                </div>
              )}
            </div>
          )}
          {/* Therapist Selection Mode Toggle */}
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="multipleTherapists"
                checked={formData.multipleTherapists}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              Multiple Therapists
            </label>
          </div>

          {/* Therapist Selection - Single or Multiple */}
          <div className="form-group">
            <label>Select Therapist(s) *</label>
            
            {!formData.multipleTherapists ? (
              // Single Therapist Selection
              <select
                name="therapist"
                value={formData.therapist}
                onChange={handleChange}
                disabled={isSubmitting || !canFetchAvailability}
                className={errors.therapist ? "error" : ""}
              >
                <option value="">Select a therapist</option>
                {Array.isArray(availableTherapists) &&
                  availableTherapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.first_name} {therapist.last_name} -{" "}
                      {therapist.specialization}
                    </option>
                  ))}
              </select>
            ) : (
              // Multiple Therapists Selection
              <select
                name="therapists"
                multiple
                value={formData.therapists}
                onChange={handleChange}
                disabled={isSubmitting || !canFetchAvailability}
                className={
                  errors.therapists ? "error multi-select" : "multi-select"
                }
                size="5"
              >
                {Array.isArray(availableTherapists) &&
                  availableTherapists.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.first_name} {therapist.last_name} -{" "}
                      {therapist.specialization}
                    </option>
                  ))}
              </select>
            )}
            
            {errors.therapist && (
              <div className="error-message">{errors.therapist}</div>
            )}
            {errors.therapists && (
              <div className="error-message">{errors.therapists}</div>
            )}
          </div>
          {/* Driver Selection */}
          <div className="form-group">
            <label>Driver (Optional)</label>
            <select
              name="driver"
              value={formData.driver}
              onChange={handleChange}
              disabled={isSubmitting || !canFetchAvailability}
              className={errors.driver ? "error" : ""}
            >
              <option value="">Select a driver (optional)</option>
              {Array.isArray(availableDrivers) &&
                availableDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </option>
                ))}
            </select>
            {errors.driver && (
              <div className="error-message">{errors.driver}</div>
            )}
          </div>
          {/* Notes */}
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special instructions"
              rows="3"
              disabled={isSubmitting}
            />
          </div>
          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleFormClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText={appointment ? "Updating..." : "Creating..."}
              className="submit-button"
              disabled={
                isSubmitting ||
                (!canFetchAvailability && availableTherapists.length === 0)
              }
            >
              {appointment ? "Update Appointment" : "Create Appointment"}
            </LoadingButton>
          </div>
        </form>
      )}

      {/* Client Registration Modal */}
      {showClientModal && (
        <div className={modalStyles["modal-overlay"]}>
          <div className={modalStyles["modal"]}>
            <div className={modalStyles["modal-header"]}>
              <h2>Register New Client</h2>
              <button
                className={modalStyles["close-btn"]}
                onClick={handleCloseClientModal}
                disabled={isSubmittingClient}
              >
                <MdClose size={20} />
              </button>
            </div>
            <form
              className={modalStyles["modal-form"]}
              onSubmit={handleClientSubmit}
            >
              <div style={{ display: "flex", gap: "16px" }}>
                <FormField
                  name="firstName"
                  label="First Name"
                  value={clientFormData.firstName}
                  onChange={handleClientFormChange}
                  inputProps={{ autoComplete: "off", maxLength: 50 }}
                  style={{ flex: 1 }}
                />
                <FormField
                  name="lastName"
                  label="Last Name"
                  value={clientFormData.lastName}
                  onChange={handleClientFormChange}
                  inputProps={{ autoComplete: "off", maxLength: 50 }}
                  style={{ flex: 1 }}
                />
              </div>
              <FormField
                name="email"
                label="Email"
                type="email"
                value={clientFormData.email}
                onChange={handleClientFormChange}
                inputProps={{ maxLength: 100 }}
              />
              <FormField
                name="address"
                label="Address"
                value={clientFormData.address}
                onChange={handleClientFormChange}
                inputProps={{ maxLength: 200 }}
              />
              <FormField
                name="phoneNumber"
                label="Contact Number"
                value={clientFormData.phoneNumber}
                onChange={handleClientFormChange}
                inputProps={{ maxLength: 20 }}
              />
              <FormField
                name="notes"
                label="Notes"
                as="textarea"
                value={clientFormData.notes}
                onChange={handleClientFormChange}
                inputProps={{
                  maxLength: 500,
                  rows: 3,
                }}
                required={false}
              />
              <button
                type="submit"
                className="action-btn"
                disabled={isSubmittingClient}
              >
                {isSubmittingClient ? "Registering..." : "Register Client"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentFormTanStackComplete;
