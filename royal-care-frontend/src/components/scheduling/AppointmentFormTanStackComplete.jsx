/**
 * COMPLETE TanStack Query Migration Example
 * Shows the dramatic simplification possible with TanStack Query
 */

import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchClients } from "../../features/scheduling/schedulingSlice";
import { registerClient } from "../../services/api";
import "../../styles/AppointmentForm.css";

// TanStack Query hooks - Replace ALL your custom caching
import {
  useCreateAppointment,
  useUpdateAppointment,
} from "../../hooks/useAppointmentQueries";
import { useFormAvailability } from "../../hooks/useAvailabilityQueries";
import { useFormStaticData } from "../../hooks/useStaticDataQueries";

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
  location: "",
  notes: "",
  therapist: "",
  therapists: [],
  driver: "",
  multipleTherapists: false,
};

// Utility function to format date to yyyy-MM-dd
const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split("T")[0];
  }
  if (typeof dateValue === "string" && dateValue.includes("T")) {
    return dateValue.split("T")[0];
  }
  if (typeof dateValue === "string" && dateValue.includes("GMT")) {
    // Handle date strings like "Thu Jun 26 2025 00:00:00 GMT+0800"
    return new Date(dateValue).toISOString().split("T")[0];
  }
  return dateValue;
};

const AppointmentFormTanStackComplete = ({
  appointment = null,
  onSubmitSuccess,
  onCancel,
  selectedDate,
  selectedTime,
}) => {
  // Form state (simplified)
  const [formData, setFormData] = useState(initialFormState);
  const [clientDetails, setClientDetails] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
  });
  const [errors, setErrors] = useState({});

  // Redux dispatch for client fetching
  const dispatch = useDispatch();

  // 🔥 BEFORE: 600+ lines of custom cache logic
  // 🎉 AFTER: 3 simple hooks that handle everything!

  // Static data (clients, services) - Cached automatically
  const {
    clients,
    services,
    isLoading: loadingStaticData,
    isReady: staticDataReady,
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
  }, [clients, services, loadingStaticData, staticDataReady]);

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

  // Auto-calculate end time (simplified)
  const calculateEndTime = useCallback(() => {
    if (!formData.start_time || !formData.services || !services.length)
      return "";

    const service = services.find((s) => s.id === parseInt(formData.services));
    if (!service?.duration) return "";

    const startTime = new Date(`2000-01-01T${formData.start_time}:00`);
    startTime.setMinutes(startTime.getMinutes() + service.duration);

    return startTime.toTimeString().slice(0, 5);
  }, [formData.start_time, formData.services, services]);

  // Auto-calculate end time when dependencies change
  useEffect(() => {
    if (!formData.end_time) {
      const endTime = calculateEndTime();
      if (endTime) {
        setFormData((prev) => ({ ...prev, end_time: endTime }));
      }
    }
  }, [calculateEndTime, formData.end_time]);

  // Handle form changes
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;

      if (type === "checkbox") {
        setFormData((prev) => ({ ...prev, [name]: checked }));
        if (name === "multipleTherapists" && !checked) {
          setFormData((prev) => ({ ...prev, therapists: [] }));
        }
        return;
      }

      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear errors
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors]
  );

  // Register new client helper
  const registerNewClient = async (clientDetailsOverride = null) => {
    try {
      const detailsToUse = clientDetailsOverride || clientDetails;
      console.log("📋 Registering client with details:", detailsToUse);

      const response = await registerClient({
        first_name: detailsToUse.first_name,
        last_name: detailsToUse.last_name,
        phone_number: detailsToUse.phone_number,
        email: detailsToUse.email,
        address: formData.location,
      });

      console.log("📋 Registration response:", response.data);

      // Try to get client ID from response
      let clientId = response.data?.id || response.data?.client?.id;

      if (clientId) {
        console.log("✅ Client registered successfully with ID:", clientId);
        return clientId;
      }

      // If no ID returned, try to fetch the client by details
      console.log("⚠️ No client ID in response, fetching from clients list...");

      // Refetch clients to get the newly created client
      await dispatch(fetchClients()).unwrap();

      // Try to find the client by email or phone number
      const updatedClients = clients || [];
      const foundClient = updatedClients.find(
        (c) =>
          (c.email && c.email === detailsToUse.email) ||
          (c.phone_number && c.phone_number === detailsToUse.phone_number)
      );

      if (foundClient && foundClient.id) {
        console.log("✅ Found newly registered client:", foundClient.id);
        return foundClient.id;
      }

      throw new Error("Client registered but ID not found");
    } catch (error) {
      console.error("❌ Failed to register client:", error);
      throw new Error("Failed to register new client");
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
    if (!formData.location) newErrors.location = "Location is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Extract client ID from client object or use directly if it's already an ID
      let clientId;
      if (typeof formData.client === "object" && formData.client) {
        // Check if this is an existing client with a real database ID
        if (formData.client.is_existing_client && formData.client.database_id) {
          clientId = formData.client.database_id;
          console.log("✅ Using existing client database ID:", clientId);
        } else if (
          formData.client.id &&
          !formData.client.id.toString().startsWith("generated-")
        ) {
          clientId = formData.client.id;
          console.log("✅ Using client ID:", clientId);
        } else {
          console.log(
            "⚠️  Client object detected but no valid database ID, will register as new client"
          );
          console.log("📋 Client object:", formData.client);
          clientId = null; // Force registration of new client
        }
      } else if (
        formData.client &&
        !formData.client.toString().startsWith("generated-")
      ) {
        clientId = formData.client;
        console.log("📋 Using client ID directly:", clientId);
      } else {
        console.log("📋 No valid client ID found");
        clientId = null;
      }

      // Register new client if needed
      if (!clientId) {
        console.log("📋 Registering new client...");

        let clientDetailsForRegistration = clientDetails;

        // If we have a selected client object but no database ID, use its details for registration
        if (typeof formData.client === "object" && formData.client) {
          const clientObject = formData.client;
          clientDetailsForRegistration = {
            first_name:
              clientObject.first_name || clientDetails.first_name || "",
            last_name: clientObject.last_name || clientDetails.last_name || "",
            phone_number:
              clientObject.phone_number || clientDetails.phone_number || "",
            email: clientObject.email || clientDetails.email || "",
          };

          console.log(
            "📋 Using client object details for registration:",
            clientDetailsForRegistration
          );
        }

        console.log(
          "📋 Client details being used for registration:",
          clientDetailsForRegistration
        );

        clientId = await registerNewClient(clientDetailsForRegistration);
        if (!clientId) {
          setErrors((prev) => ({
            ...prev,
            client:
              "Failed to register client. Please check the client details.",
          }));
          return;
        }
        console.log("✅ New client registered with ID:", clientId);
      }

      // Validate that we have a numeric client ID
      const numericClientId = parseInt(clientId, 10);
      if (isNaN(numericClientId)) {
        console.error("❌ Invalid client ID:", clientId);
        setErrors((prev) => ({
          ...prev,
          client: "Invalid client ID. Please select a valid client.",
        }));
        return;
      }

      console.log("📋 Final client ID for submission:", numericClientId);

      // Prepare appointment data
      const appointmentData = {
        ...formData,
        client: numericClientId,
        services: [parseInt(formData.services, 10)],
        therapist: formData.multipleTherapists
          ? null
          : parseInt(formData.therapist, 10) || null,
        therapists: formData.multipleTherapists
          ? formData.therapists.map((id) => parseInt(id, 10))
          : [],
        driver: formData.driver ? parseInt(formData.driver, 10) : null,
        date: formatDateForInput(formData.date),
      };

      console.log("📋 Appointment data being submitted:", appointmentData);

      // 🔥 BEFORE: Complex manual Redux dispatch + cache management
      // 🎉 AFTER: One simple mutation call with automatic cache updates!

      if (appointment) {
        await updateMutation.mutateAsync({
          id: appointment.id,
          data: appointmentData,
        });
      } else {
        await createMutation.mutateAsync(appointmentData);
      }

      // Success - form is automatically reset by the mutation
      onSubmitSuccess?.();
      setFormData(initialFormState);
      setClientDetails({
        first_name: "",
        last_name: "",
        phone_number: "",
        email: "",
      });
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
    if (selectedDate && !formData.date) {
      const formattedDate = formatDateForInput(selectedDate);
      setFormData((prev) => ({ ...prev, date: formattedDate }));
    }
  }, [selectedDate, formData.date]);

  useEffect(() => {
    if (selectedTime && !formData.start_time) {
      setFormData((prev) => ({ ...prev, start_time: selectedTime }));
    }
  }, [selectedTime, formData.start_time]);

  // Populate form for editing
  useEffect(() => {
    if (appointment) {
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
        location: appointment.location || "",
        notes: appointment.notes || "",
        therapist: appointment.therapist || "",
        therapists: Array.isArray(appointment.therapists)
          ? appointment.therapists
          : [],
        driver: appointment.driver || "",
        multipleTherapists: !!(appointment.therapists?.length > 0),
      });
    }
  }, [appointment, clients]);

  // Loading states
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading while static data loads
  if (loadingStaticData && !staticDataReady) {
    return (
      <div className="appointment-form-container">
        <div className="loading-message">Loading form data...</div>
      </div>
    );
  }

  return (
    <div className="appointment-form-container">
      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-header">
          <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>

          {/* 🔥 BEFORE: Complex manual loading indicators */}
          {/* 🎉 AFTER: Simple, automatic optimistic indicators */}
          {isSubmitting && (
            <OptimisticIndicator message="Saving appointment..." />
          )}
        </div>

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
            onClientSelect={(client) => {
              console.log(
                "✅ Client selected:",
                client.first_name,
                client.last_name
              );

              setFormData((prev) => {
                const newFormData = { ...prev, client: client };
                return newFormData;
              });

              // Clear client error when a client is selected
              if (errors.client) {
                setErrors((prev) => ({ ...prev, client: "" }));
              }
            }}
            error={errors.client}
            disabled={isSubmitting}
          />
        </div>

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
              className={errors.date ? "error" : ""}
            />
            {errors.date && <div className="error-message">{errors.date}</div>}
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
              <div className="availability-loading">
                🔄 Checking availability...
              </div>
            )}
            {hasAvailabilityError && (
              <div className="availability-error">
                ⚠️ Error checking availability
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

        {/* Multiple Therapists Option */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="multipleTherapists"
              checked={formData.multipleTherapists}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <span>Book multiple therapists</span>
          </label>
        </div>

        {/* Therapist Selection */}
        {!formData.multipleTherapists ? (
          <div className="form-group">
            <label>Therapist *</label>
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
            {errors.therapist && (
              <div className="error-message">{errors.therapist}</div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label>Select Multiple Therapists *</label>
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
            {errors.therapists && (
              <div className="error-message">{errors.therapists}</div>
            )}
          </div>
        )}

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

        {/* Location */}
        <div className="form-group">
          <label>Location *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Enter client's address"
            disabled={isSubmitting}
            className={errors.location ? "error" : ""}
          />
          {errors.location && (
            <div className="error-message">{errors.location}</div>
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
            onClick={onCancel}
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
    </div>
  );
};

export default AppointmentFormTanStackComplete;
