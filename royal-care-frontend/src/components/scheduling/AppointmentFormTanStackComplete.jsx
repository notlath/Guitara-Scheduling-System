/**
 * COMPLETE TanStack Query Migration Example
 * Shows the dramatic simplification possible with TanStack Query
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import { registerClient } from "../../services/api";
import "../../styles/AppointmentForm.css";

// TanStack Query hooks - Replace ALL your custom caching
import {
  useCreateAppointment,
  useUpdateAppointment,
} from "../../hooks/useAppointmentQueries";
import { useFormAvailability } from "../../hooks/useAvailabilityQueries";
import { useFormStaticData } from "../../hooks/useStaticDataQueries";
import { useMaterialsWithStock } from "../../hooks/useMaterialsWithStock";

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
  const [materials, setMaterials] = useState([]);
  const [materialQuantities, setMaterialQuantities] = useState({});

  // 🔥 BEFORE: 600+ lines of custom cache logic
  // 🎉 AFTER: 3 simple hooks that handle everything!

  // Static data (clients, services) - Cached automatically
  const {
    services,
    isLoadingServices,
  } = useFormStaticData();

  // Availability checking - Replaces your complex debounced logic
  const {
    availableTherapists,
    availableDrivers,
    isLoadingAvailability,
    hasAvailabilityError,
    canFetchAvailability,
  } = useFormAvailability(formData);

  // Mutations with optimistic updates
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  // Fetch materials with stock for the selected service
  const {
    data: materialsWithStock = [],
    isLoading: isLoadingMaterials,
    refetch: refetchMaterialsWithStock,
  } = useMaterialsWithStock(formData.services);

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
    [errors, refetchMaterialsWithStock]
  );

  // Refetch materials when the selected service changes
  useEffect(() => {
    if (formData.services) {
      refetchMaterialsWithStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.services]);

  // Register new client helper
  const registerNewClient = async () => {
    try {
      const response = await registerClient({
        first_name: clientDetails.first_name,
        last_name: clientDetails.last_name,
        phone_number: clientDetails.phone_number,
        email: clientDetails.email,
        address: formData.location,
      });

      return response.data?.id;
    } catch (error) {
      console.error("Failed to register client:", error);
      throw new Error("Failed to register new client");
    }
  };

  // Memoize processed materials to avoid infinite re-renders
  const processedMaterials = useMemo(() => {
    if (formData.services && materialsWithStock.length > 0) {
      console.log('DEBUG materialsWithStock from API:', materialsWithStock);
      const mats = materialsWithStock.map((mat) => ({
        ...mat,
        name: mat.name || mat.material_name || mat.item_name || Object.values(mat).find(v => typeof v === 'string') || "Material",
        current_stock: mat.current_stock ?? 0,
        unit_of_measure: mat.unit_of_measure || "",
      }));
      console.log('DEBUG processed materials:', mats);
      return mats;
    }
    return [];
  }, [formData.services, materialsWithStock]);

  // Update materials when processedMaterials changes
  useEffect(() => {
    setMaterials(processedMaterials);
    
    if (processedMaterials.length > 0) {
      // Reset material quantities when service changes
      const initialQuantities = {};
      processedMaterials.forEach((mat) => {
        initialQuantities[mat.id] = "";
      });
      setMaterialQuantities(initialQuantities);
    } else {
      setMaterialQuantities({});
    }
  }, [processedMaterials]);

  // Handle material quantity change
  const handleMaterialQuantityChange = (materialId, value) => {
    setMaterialQuantities((prev) => ({ ...prev, [materialId]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.client) newErrors.client = "Client is required";
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
      let clientId = formData.client?.id || formData.client;

      // Register new client if needed
      if (!clientId) {
        clientId = await registerNewClient();
        if (!clientId) {
          setErrors((prev) => ({
            ...prev,
            client: "Failed to register client",
          }));
          return;
        }
      }

      // Prepare appointment data
      const appointmentData = {
        ...formData,
        client: parseInt(clientId, 10),
        services: [parseInt(formData.services, 10)],
        therapist: formData.multipleTherapists
          ? null
          : parseInt(formData.therapist, 10) || null,
        therapists: formData.multipleTherapists
          ? formData.therapists.map((id) => parseInt(id, 10))
          : [],
        driver: formData.driver ? parseInt(formData.driver, 10) : null,
        materials: Object.entries(materialQuantities)
          .filter((entry) => entry[1] && !isNaN(Number(entry[1])))
          .map(([materialId, qty]) => ({
            material: parseInt(materialId, 10),
            quantity: Number(qty),
          })),
      };

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
      setFormData((prev) => ({ ...prev, date: selectedDate }));
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
      setFormData({
        client: appointment.client || "",
        services: appointment.services?.[0] || "",
        date: appointment.date || "",
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

  // Loading states
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Show loading while services are loading - but show the container
  const isFormReady = !isLoadingServices;

  return (
    <div className="appointment-form-container">
      <div className="form-header">
        <h2>{appointment ? "Edit Appointment" : "Create New Appointment"}</h2>
      </div>
      
      {!isFormReady ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          color: '#666'
        }}>
          <div className="loading-spinner" style={{ 
            width: '32px', 
            height: '32px',
            marginBottom: '16px'
          }}></div>
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
            selectedClient={formData.client || undefined}
            onClientSelect={(client) =>
              setFormData((prev) => ({ ...prev, client }))
            }
            onNewClientDetails={setClientDetails}
            error={errors.client}
            disabled={isSubmitting}
          />
        </div>          {/* Service Selection */}
          <div className="form-group">
            <label htmlFor="services">Service *</label>
            <select
              id="services"
              name="services"
              value={formData.services}
              onChange={handleChange}
              disabled={isSubmitting}
              className={errors.services ? "error" : ""}
              style={{ width: '100%' }}
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration} min - ₱{service.price}
                </option>
              ))}
            </select>
            {errors.services && (
              <div className="error-message">{errors.services}</div>
            )}
          </div>          {/* Materials Section */}
          <div className="form-group">
            <label>Materials Needed</label>
            <div className="materials-list">
              {formData.services && isLoadingMaterials ? (
                <div style={{ 
                  padding: '12px 0',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Loading materials...
                </div>
              ) : materials.length === 0 ? (
                <span style={{ color: '#888' }}>
                  {formData.services ? 'No required materials for this service.' : 'Select a service to see required materials.'}
                </span>
              ) : (
                materials.map((mat) => (
                  <div key={mat.id} className="material-item">
                    <span>{mat.name || mat.material_name || mat.item_name || "Material"} <span style={{color:'#888',fontSize:'0.9em'}}>(In stock: {mat.current_stock} {mat.unit_of_measure || ''})</span></span>
                    <input
                      type="number"
                      min="0"
                      value={materialQuantities[mat.id] || ""}
                      onChange={(e) => handleMaterialQuantityChange(mat.id, e.target.value)}
                      placeholder="Qty"
                      style={{ width: 60, marginLeft: 8 }}
                    />
                  </div>
                ))
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
            {errors.start_time && <div className="error-message">{errors.start_time}</div>}
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
              <div className="availability-loading" style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                <div className="loading-spinner-small"></div>
                Checking availability...
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
              {availableTherapists.map((therapist) => (
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
              {availableTherapists.map((therapist) => (
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
            {availableDrivers.map((driver) => (
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
      )}
    </div>
  );
};

export default AppointmentFormTanStackComplete;
