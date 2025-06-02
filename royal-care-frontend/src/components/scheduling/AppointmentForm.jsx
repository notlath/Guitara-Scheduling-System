import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAppointment,
  fetchAvailableDrivers,
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
    services: [],
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

  // Define calculateEndTime function first, before it's used in useEffect
  const calculateEndTime = useCallback(() => {
    if (
      !formData.start_time ||
      !formData.services.length ||
      !services ||
      !services.length
    ) {
      return "";
    }

    try {
      // Find selected services
      const selectedServices = services.filter((service) =>
        formData.services.includes(service.id)
      );

      if (!selectedServices.length) {
        console.log("No matching services found for the selected service IDs");
        return "";
      }

      // Calculate total duration in minutes
      const totalDurationMinutes = selectedServices.reduce(
        (total, service) => total + (service.duration || 0),
        0
      );

      if (!totalDurationMinutes) {
        console.log("Total duration is zero - check service duration values");
        return "";
      }

      // Parse start time
      const [hours, minutes] = formData.start_time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.log("Invalid start time format:", formData.start_time);
        return "";
      }

      // Calculate end time
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(
        startDate.getTime() + totalDurationMinutes * 60000
      );

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

  // Effect for fetching available therapists based on service and time
  useEffect(() => {
    if (!formData.start_time || !formData.date || !formData.services.length) {
      // Don't attempt to fetch without required data
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

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Fetching available therapists with:`, {
      date: formData.date,
      start_time: formData.start_time,
      end_time: calculatedEndTime,
      services: formData.services,
    });

    // Make sure we have valid parameters before making API calls
    if (!formData.date || !formData.start_time || !calculatedEndTime) {
      console.warn("Cannot fetch available staff: missing required parameters");
      return;
    }

    // Make sure times are in correct format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      !timeRegex.test(formData.start_time) ||
      !timeRegex.test(calculatedEndTime)
    ) {
      console.warn("Cannot fetch available staff: invalid time format", {
        start_time: formData.start_time,
        end_time: calculatedEndTime,
      });
      return;
    }

    // Ensure date is in correct format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.date)) {
      console.warn(
        "Cannot fetch available staff: invalid date format",
        formData.date
      );
      return;
    }

    // Dispatch actions to fetch available therapists and drivers
    try {
      // Fix parameter names to match what the API expects (start_time and end_time)
      dispatch(
        fetchAvailableTherapists({
          date: formData.date,
          start_time: formData.start_time,
          end_time: calculatedEndTime,
          services: formData.services,
        })
      );

      // Include parameters for fetchAvailableDrivers too
      dispatch(
        fetchAvailableDrivers({
          date: formData.date,
          start_time: formData.start_time,
          end_time: calculatedEndTime,
        })
      );
    } catch (error) {
      console.error("Error dispatching staff availability actions:", error);
      // We have fallback data that will be used if the API call fails
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
          services: appointment.services?.map((service) => service.id) || [],
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
    if (formData.services.length === 0)
      newErrors.services = "At least one service is required";
    if (!formData.therapist) newErrors.therapist = "Therapist is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.start_time) newErrors.start_time = "Start time is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!endTime)
      newErrors.services = "Cannot calculate end time with selected services";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        client: formData.client || "",
        services: Array.isArray(formData.services) ? formData.services : [],
        therapist: formData.therapist || "",
        driver: formData.driver || "",
        date: formData.date || "",
        start_time: formData.start_time || "",
        location: formData.location || "",
        notes: formData.notes || "",
      };

      // Prepare appointment data with required fields
      const appointmentData = {
        ...sanitizedFormData,
        end_time: endTime,
        status: "pending",
        payment_status: "unpaid",
      };

      console.log("Submitting appointment data:", appointmentData);

      // Validate critical fields again before API call
      if (
        !appointmentData.client ||
        !appointmentData.therapist ||
        !appointmentData.date ||
        !appointmentData.start_time ||
        !appointmentData.end_time ||
        !appointmentData.services.length
      ) {
        throw new Error("Missing required fields. Please check your form.");
      }

      if (appointment) {
        // Update existing appointment
        await dispatch(
          updateAppointment({ id: appointment.id, data: appointmentData })
        ).unwrap();
      } else {
        // Create new appointment
        await dispatch(createAppointment(appointmentData)).unwrap();
      }

      // Reset form and call success callback
      setFormData(initialFormState);
      setEndTime("");
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting appointment:", error);
      // Display friendly error message to user
      const errorMessage =
        error.message ||
        (typeof error === "string" ? error : "Unknown error occurred");
      setErrors((prev) => ({
        ...prev,
        form: `Failed to save appointment: ${errorMessage}`,
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
          <label htmlFor="services">Services:</label>
          <select
            id="services"
            name="services"
            multiple
            value={formData.services}
            onChange={handleChange}
            className={errors.services ? "error" : ""}
          >
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
                {formData.date &&
                formData.start_time &&
                formData.services.length > 0
                  ? `No available therapists for selected time${
                      import.meta.env.DEV
                        ? " (using fallback data in development)"
                        : ""
                    }`
                  : "Select date, time and services first"}
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
              className={
                !endTime && formData.services.length > 0 ? "error" : ""
              }
            />
            {!endTime &&
              formData.services.length > 0 &&
              formData.start_time && (
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
