import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAppointment,
  fetchAvailableTherapists,
  fetchClients,
  fetchServices,
  fetchStaffMembers,
  updateAppointment,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/AppointmentForm.css";
import { sanitizeFormInput } from "../../utils/formSanitization";

// Fallback data for therapists and drivers in case API calls fail
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
    driver: "",
    date: selectedDate
      ? new Date(selectedDate).toISOString().split("T")[0]
      : "",
    start_time: selectedTime || "",
    location: "",
    notes: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endTime, setEndTime] = useState(""); // Store calculated end time separately

  const dispatch = useDispatch();
  const { clients, services, loading, staffMembers } = useSelector(
    (state) => state.scheduling
  );

  // Filter staffMembers to get therapists and drivers
  // Use fallbacks when API data is empty or when staffMembers is not loaded
  const availableTherapists = useMemo(() => {
    return staffMembers?.length > 0
      ? staffMembers.filter(
          (member) => member.role === "therapist" || member.role === "Therapist"
        )
      : import.meta.env.DEV
      ? FALLBACK_THERAPISTS
      : [];
  }, [staffMembers]);

  const availableDrivers = useMemo(() => {
    return staffMembers?.length > 0
      ? staffMembers.filter(
          (member) => member.role === "driver" || member.role === "Driver"
        )
      : import.meta.env.DEV
      ? FALLBACK_DRIVERS
      : [];
  }, [staffMembers]);

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
    });
  }, [clients, services, availableTherapists, availableDrivers]);

  // Fetch clients and services when component mounts
  useEffect(() => {
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
  }, [dispatch, staffMembers]);

  // Update end time when relevant form data changes
  useEffect(() => {
    const calculatedEndTime = calculateEndTime();
    setEndTime(calculatedEndTime);
  }, [formData.services, formData.start_time, calculateEndTime]);

  // Create a ref to store previous values for therapist fetch
  const prevFetchTherapistsRef = useRef({
    date: null,
    startTime: null,
    services: null,
  });

  // Effect for fetching available therapists based on service and time
  useEffect(() => {
    if (
      !formData.start_time ||
      !formData.date ||
      !formData.services ||
      formData.services === ""
    ) {
      // Don't attempt to fetch without required data
      return;
    }

    // Check if we've already fetched with these exact params
    const prevFetch = prevFetchTherapistsRef.current;
    if (
      prevFetch.date === formData.date &&
      prevFetch.startTime === formData.start_time &&
      prevFetch.services === formData.services
    ) {
      // Skip this fetch as it's identical to the previous one
      return;
    }

    // Calculate end time with better error handling
    let calculatedEndTime;
    try {
      calculatedEndTime = calculateEndTime();
      if (!calculatedEndTime) {
        console.warn(
          "Cannot fetch available therapists: unable to calculate end time"
        );
        return;
      }
    } catch (error) {
      console.error("Error calculating end time:", error);
      return;
    }

    // Update previous fetch reference
    prevFetchTherapistsRef.current = {
      date: formData.date,
      startTime: formData.start_time,
      services: formData.services,
    };

    // Now we can fetch available therapists
    console.log("AppointmentForm - Fetching available therapists/drivers");
    const serviceId = parseInt(formData.services, 10);

    if (serviceId) {
      dispatch(
        fetchAvailableTherapists({
          date: formData.date,
          start_time: formData.start_time,
          end_time: calculatedEndTime,
          service_id: serviceId,
        })
      );
    }
  }, [
    formData.date,
    formData.start_time,
    formData.services,
    calculateEndTime,
    dispatch,
  ]);

  // If editing an existing appointment, populate the form
  useEffect(() => {
    if (appointment) {
      try {
        setFormData({
          client: appointment.client || "",
          services:
            appointment.services?.length > 0
              ? appointment.services[0].id.toString()
              : "",
          therapist: appointment.therapist || "",
          driver: appointment.driver || "",
          date: appointment.date
            ? new Date(appointment.date).toISOString().split("T")[0]
            : "",
          start_time: appointment.start_time || "",
          location: appointment.location || "",
          notes: appointment.notes || "",
        });
      } catch (error) {
        console.error("Error setting appointment data:", error);
        setErrors({ form: "Failed to load appointment data" });
      }
    }
  }, [appointment]);

  // Update form when selected date/time changes
  useEffect(() => {
    if (selectedDate) {
      try {
        const formattedDate = new Date(selectedDate)
          .toISOString()
          .split("T")[0];
        setFormData((prev) => ({
          ...prev,
          date: formattedDate,
        }));
      } catch (error) {
        console.error("Error formatting selected date:", error);
      }
    }

    if (selectedTime) {
      setFormData((prev) => ({
        ...prev,
        start_time: selectedTime,
      }));
    }
  }, [selectedDate, selectedTime]);

  const handleChange = (e) => {
    const { name, value, type, options } = e.target;

    // Handle multi-select for services
    if (name === "services" && type === "select-multiple") {
      const selectedOptions = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));

      setFormData((prev) => ({
        ...prev,
        [name]: selectedOptions,
      }));
    } else {
      // Sanitize input before setting it in state (use lighter sanitization for better UX)
      const sanitizedValue =
        type === "number" ? value : sanitizeFormInput(value);

      setFormData((prev) => ({
        ...prev,
        [name]: sanitizedValue,
      }));
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.client) newErrors.client = "Client is required";
    if (!formData.services) newErrors.services = "Service is required";
    if (!formData.therapist) newErrors.therapist = "Therapist is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.start_time) newErrors.start_time = "Start time is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!endTime)
      newErrors.services = "Cannot calculate end time with selected service";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to ensure data is in the correct format for the API
  const sanitizeDataForApi = (data) => {
    const result = { ...data };

    // Ensure therapist is an integer, not an array
    if (Array.isArray(result.therapist)) {
      result.therapist =
        result.therapist.length > 0 ? parseInt(result.therapist[0], 10) : null;
    } else if (
      typeof result.therapist === "string" &&
      result.therapist.trim() !== ""
    ) {
      result.therapist = parseInt(result.therapist, 10);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Use our calculated end time
      if (!endTime) {
        throw new Error(
          "Could not calculate end time. Please check services selected."
        );
      }

      // Create a sanitized copy of form data to ensure no undefined values
      const sanitizedFormData = {
        client: parseInt(formData.client, 10) || null,
        services: formData.services ? [parseInt(formData.services, 10)] : [],
        therapist: parseInt(formData.therapist, 10) || null,
        driver: formData.driver ? parseInt(formData.driver, 10) : null,
        date: formData.date || "",
        start_time: formData.start_time || "",
        location: formData.location || "",
        notes: formData.notes || "",
      };

      // Log the sanitized data for debugging
      console.log("Sanitized form data:", sanitizedFormData);

      // Triple check the therapist field specifically to ensure it's an integer
      if (typeof sanitizedFormData.therapist !== "number") {
        console.warn(
          "Therapist field is not a number, attempting to fix:",
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
      }

      // Pre-submission verification for therapist field
      console.log("FINAL PRE-SUBMISSION CHECK:");
      console.log("Therapist value:", sanitizedFormData.therapist);
      console.log("Therapist type:", typeof sanitizedFormData.therapist);

      // Force therapist to be an integer as a final safeguard
      if (typeof sanitizedFormData.therapist !== "number") {
        try {
          const therapistId = parseInt(
            String(sanitizedFormData.therapist).replace(/[^0-9]/g, ""),
            10
          );
          if (!isNaN(therapistId)) {
            console.log("Converted therapist to number:", therapistId);
            sanitizedFormData.therapist = therapistId;
          } else {
            console.error("Could not convert therapist to a valid number");
          }
        } catch (e) {
          console.error("Error converting therapist to number:", e);
        }
      }

      // Prepare appointment data with required fields
      const appointmentData = {
        ...sanitizedFormData,
        end_time: endTime,
        status: "pending",
        payment_status: "unpaid",
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
        driver: typeof finalAppointmentData.driver,
        date: typeof finalAppointmentData.date,
        start_time: typeof finalAppointmentData.start_time,
        end_time: typeof finalAppointmentData.end_time,
      });

      // Final verification of data formats for critical fields
      // Ensure therapist is an integer, not an array
      if (Array.isArray(finalAppointmentData.therapist)) {
        console.warn(
          "Converting therapist from array to integer:",
          finalAppointmentData.therapist
        );
        finalAppointmentData.therapist =
          finalAppointmentData.therapist.length > 0
            ? parseInt(finalAppointmentData.therapist[0], 10)
            : null;
      } else if (typeof finalAppointmentData.therapist !== "number") {
        // Try to parse it as a number if it's not already
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
      if (
        !finalAppointmentData.client ||
        !finalAppointmentData.therapist ||
        !finalAppointmentData.date ||
        !finalAppointmentData.start_time ||
        !finalAppointmentData.end_time ||
        !finalAppointmentData.services ||
        finalAppointmentData.services.length === 0
      ) {
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
      setEndTime("");
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

      // More detailed error logging with enhanced diagnostics
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
        console.error("Unknown error:", error.message);
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

  if (loading) {
    return <div className="loading">Loading appointment form...</div>;
  }

  return (
    <div className="appointment-form-container">
      <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>

      {errors.form && <div className="error-message">{errors.form}</div>}

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
          <label htmlFor="client">Client:</label>
          <select
            id="client"
            name="client"
            value={formData.client}
            onChange={handleChange}
            className={errors.client ? "error" : ""}
          >
            <option value="">Select a client</option>
            {clients && clients.length > 0 ? (
              clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name || ""} {client.last_name || ""} -{" "}
                  {client.phone_number || "No phone"}
                </option>
              ))
            ) : (
              <option value="" disabled>
                Loading clients...
              </option>
            )}
          </select>
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
                <option key={service.id} value={service.id}>
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

        <div className="form-group">
          <label htmlFor="therapist">Therapist:</label>
          <select
            id="therapist"
            name="therapist"
            value={formData.therapist}
            onChange={handleChange}
            className={errors.therapist ? "error" : ""}
          >
            <option value="">Select a therapist</option>
            {availableTherapists && availableTherapists.length > 0 ? (
              availableTherapists.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.first_name || ""} {therapist.last_name || ""} -{" "}
                  {therapist.specialization || "General"} -{" "}
                  {therapist.massage_pressure || "Standard"}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {formData.date && formData.start_time && formData.services
                  ? `No available therapists for selected time${
                      import.meta.env.DEV
                        ? " (using fallback data in development)"
                        : ""
                    }`
                  : "Select date, time and service first"}
              </option>
            )}
          </select>
          {errors.therapist && (
            <div className="error-text">{errors.therapist}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="driver">Driver (Optional):</label>
          <select
            id="driver"
            name="driver"
            value={formData.driver}
            onChange={handleChange}
          >
            <option value="">No driver needed</option>
            {availableDrivers && availableDrivers.length > 0 ? (
              availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name || ""} {driver.last_name || ""} -{" "}
                  {driver.motorcycle_plate || "No plate"}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {formData.date && formData.start_time
                  ? `No available drivers for selected time${
                      import.meta.env.DEV
                        ? " (using fallback data in development)"
                        : ""
                    }`
                  : "Select date and time first"}
              </option>
            )}
          </select>
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
            <label htmlFor="end_time">End Time (Auto-calculated):</label>
            <input
              type="time"
              id="end_time"
              name="end_time"
              value={endTime}
              disabled
              className={!endTime && formData.services ? "error" : ""}
            />
            {!endTime && formData.services && formData.start_time && (
              <div className="error-text">Could not calculate end time</div>
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
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : appointment
              ? "Update Appointment"
              : "Create Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;
