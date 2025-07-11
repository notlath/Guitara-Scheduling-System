/**
 * TanStack Query version of AppointmentForm
 * Replaces complex manual caching and availability logic
 */

import { useCallback, useEffect, useState } from "react";
import { registerClient } from "../../services/api";
import "../../styles/AppointmentForm.css";
import { sanitizeFormInput } from "../../utils/formSanitization";
import {
  FormLoadingOverlay,
  LoadingButton,
  OptimisticIndicator,
} from "../common/LoadingComponents";

// TanStack Query hooks
import {
  useCreateAppointment,
  useUpdateAppointment,
} from "../../hooks/useAppointmentQueries";
import { useFormAvailability } from "../../hooks/useAvailabilityQueries";
import { useFormStaticData } from "../../hooks/useStaticDataQueries";

// Legacy components (kept for compatibility)
import LazyClientSearch from "../common/LazyClientSearch";

// Utility function to ensure date is in yyyy-MM-dd format
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

const AppointmentFormTanStack = ({
  appointment = null,
  onSubmitSuccess,
  onCancel,
  selectedDate,
  selectedTime,
}) => {
  // Form state
  const [formData, setFormData] = useState(initialFormState);
  const [clientDetails, setClientDetails] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
  });
  const [errors, setErrors] = useState({});

  const {
    clients,
    services,
    isLoadingAny: loadingStaticData,
    hasAnyError: staticDataError,
    isReady: staticDataReady,
  } = useFormStaticData();

  const {
    availableTherapists,
    availableDrivers,
    isLoadingAvailability,
    hasAvailabilityError,
    canFetchAvailability,
  } = useFormAvailability({
    ...formData,
    // Ensure date is properly formatted for queries
    date: formatDateForInput(formData.date),
  });

  // Mutations
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  // Calculate end time when relevant form data changes
  const calculateEndTime = useCallback(() => {
    if (
      !formData.start_time ||
      !formData.services ||
      !Array.isArray(services) ||
      !services.length
    ) {
      return "";
    }

    try {
      const service = services.find(
        (s) => s.id === parseInt(formData.services)
      );
      if (!service?.duration) return "";

      // Validate start time format
      const [h, m] = formData.start_time.split(":").map(Number);
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        console.error("Invalid start time format:", formData.start_time);
        return "";
      }

      // Use proper date calculation that handles cross-day scenarios
      const startTime = new Date();
      startTime.setHours(h, m, 0, 0);
      const endTime = new Date(startTime.getTime() + service.duration * 60000);

      // Validate the result before using toTimeString
      if (isNaN(endTime.getTime())) {
        console.error("Invalid date calculation result");
        return "";
      }

      return endTime.toTimeString().slice(0, 5);
    } catch (error) {
      console.error("Error calculating end time:", error);
      return "";
    }
  }, [formData.start_time, formData.services, services]);

  // Auto-calculate end time
  useEffect(() => {
    if (!formData.end_time) {
      const calculatedEndTime = calculateEndTime();
      if (calculatedEndTime && calculatedEndTime !== formData.end_time) {
        setFormData((prev) => ({ ...prev, end_time: calculatedEndTime }));
      }
    }
  }, [calculateEndTime, formData.end_time]);

  // Update form when selected date/time changes

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

  // If editing an existing appointment, populate the form
  useEffect(() => {
    if (appointment) {
      setFormData({
        client: appointment.client || "",
        services: appointment.services?.[0] || "",
        date: formatDateForInput(appointment.date),
        start_time: appointment.start_time || "",
        end_time: appointment.end_time || "",
        location: appointment.location || "",
        notes: appointment.notes || "",
        therapist: appointment.therapist || "",
        therapists: appointment.therapists || [],
        driver: appointment.driver || "",
        multipleTherapists: !!(appointment.therapists?.length > 0),
      });
    }
  }, [appointment]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked, options } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));

      if (name === "multipleTherapists" && !checked) {
        setFormData((prev) => ({ ...prev, therapists: [] }));
      }
      return;
    }

    if (name === "services" && type === "select-multiple") {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));

      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    } else if (name === "therapists" && type === "select-multiple") {
      const selectedTherapists = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));

      setFormData((prev) => ({
        ...prev,
        [name]: selectedTherapists,
      }));
    } else {
      const sanitizedValue =
        type === "number" ? value : sanitizeFormInput(value);
      setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
    }

    // Clear error when field is edited
    setErrors((prev) => {
      if (prev[name]) {
        return { ...prev, [name]: "" };
      }
      return prev;
    });
  }, []);

  // Register new client helper
  const registerAndFetchClientId = async (clientDetails, formData) => {
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
      const newClient = response.data;

      // Find client after registration
      let foundClient =
        newClient && newClient.id
          ? newClient
          : Array.isArray(clients)
          ? clients.find(
              (c) =>
                c.email === clientDetails.email ||
                c.phone_number === clientDetails.phone_number
            )
          : null;

      return foundClient?.id || null;
    } catch (error) {
      console.error("Failed to register client:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};

    // Check if client is selected (can be ID or object)
    const hasClient =
      formData.client &&
      ((typeof formData.client === "object" && formData.client.id) ||
        typeof formData.client === "number" ||
        (typeof formData.client === "string" && formData.client.trim()));

    if (!hasClient) {
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

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      let clientId = formData.client;

      // Extract client ID if formData.client is an object
      if (typeof formData.client === "object" && formData.client?.id) {
        clientId = formData.client.id;
      }

      // Register new client if needed
      if (!clientId) {
        clientId = await registerAndFetchClientId(clientDetails, formData);
        if (!clientId) {
          setErrors((prev) => ({
            ...prev,
            client: "Failed to register new client. Please try again.",
          }));
          return;
        }
      }

      // Prepare appointment data
      const appointmentData = {
        ...formData,
        client: parseInt(clientId, 10),
        services: formData.services ? [parseInt(formData.services, 10)] : [],
      };

      // Handle therapist field for multi-therapist appointments
      if (formData.multipleTherapists) {
        appointmentData.therapist = null;
      } else if (typeof appointmentData.therapist !== "number") {
        if (Array.isArray(appointmentData.therapist)) {
          appointmentData.therapist =
            appointmentData.therapist.length > 0
              ? parseInt(appointmentData.therapist[0], 10)
              : null;
        } else {
          appointmentData.therapist = appointmentData.therapist
            ? parseInt(appointmentData.therapist, 10)
            : null;
        }
      }

      // Create or update appointment using TanStack Query
      if (appointment) {
        await updateMutation.mutateAsync({
          id: appointment.id,
          data: appointmentData,
        });
      } else {
        await createMutation.mutateAsync(appointmentData);
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
      console.error("Form submission error:", error);

      // Handle validation errors
      if (typeof error === "object" && error !== null && !error.response) {
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
        return;
      }

      setErrors((prev) => ({
        ...prev,
        form: error.message || "Failed to submit appointment",
      }));
    }
  };

  // Loading states
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const showLoadingOverlay = loadingStaticData && !staticDataReady;

  return (
    <div className="appointment-form-container">
      {showLoadingOverlay && <FormLoadingOverlay />}

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-header">
          <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>
          {(createMutation.isPending || updateMutation.isPending) && (
            <OptimisticIndicator message="Saving appointment..." />
          )}
        </div>

        {/* Client Selection */}
        <div className="form-group">
          <label htmlFor="client">Client *</label>
          <LazyClientSearch
            selectedClient={
              formData.client && typeof formData.client === "object"
                ? formData.client
                : clients?.find((c) => c.id === formData.client) || null
            }
            onClientSelect={(client) =>
              setFormData((prev) => ({ ...prev, client: client.id || client }))
            }
            onNewClientDetails={setClientDetails}
            error={errors.client}
            disabled={isSubmitting}
          />
          {errors.client && (
            <div className="error-message">{errors.client}</div>
          )}
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
                  {service.name} ({service.duration} min - ₱{parseFloat(service.price).toFixed(2)})
                </option>
              ))}
          </select>
          {errors.services && (
            <div className="error-message">{errors.services}</div>
          )}
        </div>

        {/* Date & Time */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.date ? "error" : ""}
            />
            {errors.date && <div className="error-message">{errors.date}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="start_time">Start Time *</label>
            <input
              type="time"
              id="start_time"
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
            <label htmlFor="end_time">End Time *</label>
            <input
              type="time"
              id="end_time"
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

        {/* Availability Status */}
        {canFetchAvailability && (
          <div className="availability-status">
            {isLoadingAvailability && (
              <div className="availability-loading">
                🔄 Checking availability...
              </div>
            )}
            {hasAvailabilityError && (
              <div className="availability-error">
                ⚠️ Error checking availability - Please check your login status
                or refresh the page
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
            Multiple Therapists
          </label>
        </div>

        {/* Therapist Selection */}
        <div className="form-group">
          <label
            htmlFor={formData.multipleTherapists ? "therapists" : "therapist"}
          >
            {formData.multipleTherapists ? "Therapists *" : "Therapist *"}
          </label>

          {formData.multipleTherapists ? (
            <select
              id="therapists"
              name="therapists"
              multiple
              value={formData.therapists}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.therapist ? "error" : ""}
            >
              {Array.isArray(availableTherapists) &&
                availableTherapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.first_name} {therapist.last_name}
                  </option>
                ))}
            </select>
          ) : (
            <select
              id="therapist"
              name="therapist"
              value={formData.therapist}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.therapist ? "error" : ""}
            >
              <option value="">Select a therapist</option>
              {Array.isArray(availableTherapists) &&
                availableTherapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.first_name} {therapist.last_name}
                  </option>
                ))}
            </select>
          )}
          {errors.therapist && (
            <div className="error-message">{errors.therapist}</div>
          )}
        </div>

        {/* Driver Selection */}
        <div className="form-group">
          <label htmlFor="driver">Driver</label>
          <select
            id="driver"
            name="driver"
            value={formData.driver}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="">Select a driver</option>
            {Array.isArray(availableDrivers) &&
              availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
          </select>
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            disabled={isSubmitting}
            className={errors.location ? "error" : ""}
            placeholder="Enter appointment location"
          />
          {errors.location && (
            <div className="error-message">{errors.location}</div>
          )}
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            disabled={isSubmitting}
            rows="3"
            placeholder="Additional notes (optional)"
          />
        </div>

        {/* Form Errors */}
        {errors.form && <div className="form-error">{errors.form}</div>}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <LoadingButton
            type="submit"
            isLoading={isSubmitting}
            className="btn btn-primary"
            disabled={!staticDataReady || staticDataError}
          >
            {appointment ? "Update Appointment" : "Create Appointment"}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};

export default AppointmentFormTanStack;
