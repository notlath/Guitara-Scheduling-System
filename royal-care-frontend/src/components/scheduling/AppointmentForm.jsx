import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createAppointment,
  fetchClients,
  fetchServices,
  fetchAvailableTherapists,
  fetchAvailableDrivers,
  updateAppointment,
} from "../../features/scheduling/schedulingSlice";
import "../../styles/AppointmentForm.css";

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

  // Load clients and services on component mount
  useEffect(() => {
    dispatch(fetchClients());
    dispatch(fetchServices());
  }, [dispatch]);

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
      setFormData((prev) => ({
        ...prev,
        date: new Date(selectedDate).toISOString().split("T")[0],
      }));
    }
    if (selectedTime) {
      setFormData((prev) => ({
        ...prev,
        start_time: selectedTime,
      }));
    }
  }, [selectedDate, selectedTime]);

  // Calculate end time based on selected services and start time
  const calculateEndTime = () => {
    if (!formData.start_time || formData.services.length === 0) return "";

    // Find selected services
    const selectedServices = services.filter((service) =>
      formData.services.includes(service.id),
    );

    // Calculate total duration in minutes
    const totalDurationMinutes = selectedServices.reduce(
      (total, service) => total + service.duration,
      0,
    );

    // Parse start time
    const [hours, minutes] = formData.start_time.split(":").map(Number);

    // Calculate end time
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(
      startDate.getTime() + totalDurationMinutes * 60000,
    );

    return `${endDate.getHours().toString().padStart(2, "0")}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

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
      setFormData((prev) => ({
        ...prev,
        [name]: value,
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

    // Calculate end time based on services duration
    const end_time = calculateEndTime();

    try {
      const appointmentData = {
        ...formData,
        end_time,
        status: "pending",
        payment_status: "unpaid",
      };

      if (appointment) {
        // Update existing appointment
        await dispatch(
          updateAppointment({ id: appointment.id, data: appointmentData }),
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
      setErrors((prev) => ({ ...prev, form: "Failed to save appointment" }));
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
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.first_name} {client.last_name} - {client.phone_number}
              </option>
            ))}
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
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.duration} min - ${service.price}
              </option>
            ))}
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
            {availableTherapists.map((therapist) => (
              <option
                key={therapist.user_details.id}
                value={therapist.user_details.id}
              >
                {therapist.user_details.first_name}{" "}
                {therapist.user_details.last_name} -
                {therapist.user_details.specialization || "General"} -
                {therapist.user_details.massage_pressure || "Standard"}
              </option>
            ))}
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
            {availableDrivers.map((driver) => (
              <option
                key={driver.user_details.id}
                value={driver.user_details.id}
              >
                {driver.user_details.first_name} {driver.user_details.last_name}{" "}
                -{driver.user_details.motorcycle_plate || "No plate"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
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
              value={formData.start_time}
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
              value={calculateEndTime()}
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
