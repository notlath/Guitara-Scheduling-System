import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAppointment,
  fetchAvailableDrivers,
  fetchAvailableTherapists,
  fetchClients,
  fetchServices,
  updateAppointment,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/AppointmentForm.css";
import { sanitizeString } from "../../utils/sanitization";

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

  const dispatch = useDispatch();
  const { clients, services, availableTherapists, availableDrivers, loading } =
    useSelector((state) => state.scheduling);

  // Debug: Log the data arrays to check if they contain data
  useEffect(() => {
    console.log('AppointmentForm Debug:', {
      clients: clients.length ? clients : 'Empty',
      services: services.length ? services : 'Empty',
      availableTherapists: availableTherapists.length ? availableTherapists : 'Empty',
      availableDrivers: availableDrivers.length ? availableDrivers : 'Empty'
    });
  }, [clients, services, availableTherapists, availableDrivers]);

  // Debug: Log when dispatching API calls
  useEffect(() => {
    console.log('AppointmentForm - Dispatching fetchClients and fetchServices');
    dispatch(fetchClients());
    dispatch(fetchServices());
  }, [dispatch]);

  // Define calculateEndTime function first, before it's used in useEffect
  const calculateEndTime = useCallback(() => {
    if (!formData.start_time || formData.services.length === 0 || !services || !services.length) return "";

    // Find selected services
    const selectedServices = services.filter((service) =>
      formData.services.includes(service.id)
    );

    // Calculate total duration in minutes
    const totalDurationMinutes = selectedServices.reduce(
      (total, service) => total + (service.duration || 0),
      0
    );

    // Parse start time
    const [hours, minutes] = formData.start_time.split(":").map(Number);

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
  }, [formData.start_time, formData.services, services]);

  // Debug: Log when form data changes that should trigger therapist/driver fetching
  useEffect(() => {
    if (formData.date && formData.start_time && formData.services.length > 0) {
      const end_time = calculateEndTime();
      console.log('AppointmentForm - Fetching available staff with params:', {
        date: formData.date,
        start_time: formData.start_time,
        end_time: end_time,
        services: formData.services
      });
      if (end_time) {
        dispatch(
          fetchAvailableTherapists({
            date: formData.date,
            start_time: formData.start_time,
            end_time: end_time,
          })
        );
        dispatch(
          fetchAvailableDrivers({
            date: formData.date,
            start_time: formData.start_time,
            end_time: end_time,
          })
        );
      }
    }
  }, [formData.services, formData.date, formData.start_time, dispatch, calculateEndTime]);

  // If editing an existing appointment, populate the form
  useEffect(() => {
    if (appointment) {
      setFormData({
        client: appointment.client,
        services: appointment.services.map((service) => service.id),
        therapist: appointment.therapist,
        driver: appointment.driver,
        date: new Date(appointment.date).toISOString().split("T")[0],
        start_time: appointment.start_time,
        location: appointment.location,
        notes: appointment.notes || "",
      });
    }
  }, [appointment]);

  // Update form when selected date/time changes
  useEffect(() => {
    if (selectedDate) {
      const formattedDate = new Date(selectedDate).toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        date: formattedDate,
      }));

      // Fetch available therapists and drivers when date changes
      if (formData.start_time) {
        const end_time = calculateEndTime();
        dispatch(
          fetchAvailableTherapists({
            date: formattedDate,
            start_time: formData.start_time,
            end_time: end_time,
          })
        );
        dispatch(
          fetchAvailableDrivers({
            date: formattedDate,
            start_time: formData.start_time,
            end_time: end_time,
          })
        );
      }
    }
    if (selectedTime) {
      setFormData((prev) => ({
        ...prev,
        start_time: selectedTime,
      }));

      // Fetch available therapists and drivers when time changes
      if (formData.date) {
        const end_time = calculateEndTime();
        dispatch(
          fetchAvailableTherapists({
            date: formData.date,
            start_time: selectedTime,
            end_time: end_time,
          })
        );
        dispatch(
          fetchAvailableDrivers({
            date: formData.date,
            start_time: selectedTime,
            end_time: end_time,
          })
        );
      }
    }
  }, [
    selectedDate,
    selectedTime,
    dispatch,
    formData.date,
    formData.start_time,
    formData.services,
    services,
    calculateEndTime,
  ]);

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
      // Sanitize input before setting it in state
      const sanitizedValue = type === "number" ? value : sanitizeString(value);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Calculate end time based on services duration
      const end_time = calculateEndTime();
      
      if (!end_time) {
        throw new Error("Could not calculate end time. Please check services selected.");
      }

      const appointmentData = {
        ...formData,
        end_time,
        status: "pending",
        payment_status: "unpaid",
      };

      console.log("Submitting appointment data:", appointmentData);

      if (appointment) {
        // Update existing appointment
        await dispatch(
          updateAppointment({ id: appointment.id, data: appointmentData })
        );
      } else {
        // Create new appointment
        await dispatch(createAppointment(appointmentData));
      }

      // Reset form and call success callback
      setFormData(initialFormState);
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting appointment:", error);
      setErrors((prev) => ({ 
        ...prev, 
        form: `Failed to save appointment: ${error.message || "Unknown error"}` 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
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
                  {client.first_name} {client.last_name} - {client.phone_number}
                </option>
              ))
            ) : (
              <option value="" disabled>Loading clients...</option>
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
                  {service.name} - {service.duration} min - ${service.price}
                </option>
              ))
            ) : (
              <option value="" disabled>Loading services...</option>
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
                  {therapist.first_name} {therapist.last_name} -{" "}
                  {therapist.specialization || "General"} -{" "}
                  {therapist.massage_pressure || "Standard"}{" "}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {formData.date && formData.start_time && formData.services.length > 0
                  ? "No available therapists for selected time"
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
                  {driver.first_name} {driver.last_name} -{" "}
                  {driver.motorcycle_plate || "No plate"}{" "}
                </option>
              ))
            ) : (
              <option value="" disabled>
                {formData.date && formData.start_time
                  ? "No available drivers for selected time"
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
              value={calculateEndTime() || ""}
              disabled
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
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
            value={formData.notes}
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
