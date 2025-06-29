/**
 * Appointment Form Data Persistence Utility
 * Handles saving and loading form data to/from localStorage for better UX
 */

const STORAGE_KEY = "appointmentFormData";
const STORAGE_EXPIRY_KEY = "appointmentFormDataExpiry";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save form data to localStorage
 * @param {Object} formData - The form data to save
 * @param {Object} clientDetails - The client details to save
 * @param {Object} materialQuantities - The material quantities to save
 */
export const saveFormData = (
  formData,
  clientDetails = {},
  materialQuantities = {}
) => {
  try {
    // Exclude therapist and driver fields from being cached
    const {
      therapist: _therapist,
      therapists: _therapists,
      driver: _driver,
      ...formDataToCache
    } = formData || {};
    const dataToSave = {
      formData: formDataToCache,
      clientDetails,
      materialQuantities,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    localStorage.setItem(
      STORAGE_EXPIRY_KEY,
      (Date.now() + CACHE_DURATION).toString()
    );
    console.log(
      "💾 Appointment form data saved to cache (excluding therapist/driver)"
    );
  } catch (error) {
    console.error("Failed to save form data:", error);
  }
};

/**
 * Load form data from localStorage
 * @returns {Object|null} - The saved form data or null if not found/expired
 */
export const loadFormData = () => {
  try {
    const expiryTime = localStorage.getItem(STORAGE_EXPIRY_KEY);
    const now = Date.now();

    // Check if data has expired
    if (!expiryTime || now > parseInt(expiryTime, 10)) {
      clearFormData();
      return null;
    }

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return null;
    }

    const parsedData = JSON.parse(savedData);

    // Validate data structure
    if (!parsedData.formData || typeof parsedData.formData !== "object") {
      clearFormData();
      return null;
    }

    console.log("📥 Appointment form data loaded from cache");
    return {
      formData: parsedData.formData || {},
      clientDetails: parsedData.clientDetails || {},
      materialQuantities: parsedData.materialQuantities || {},
    };
  } catch (error) {
    console.error("Failed to load form data:", error);
    clearFormData();
    return null;
  }
};

/**
 * Clear saved form data from localStorage
 */
export const clearFormData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
    console.log("🗑️ Appointment form data cleared from cache");
  } catch (error) {
    console.error("Failed to clear form data:", error);
  }
};

/**
 * Check if there is saved form data
 * @returns {boolean} - True if there is valid saved data
 */
export const hasSavedFormData = () => {
  try {
    const expiryTime = localStorage.getItem(STORAGE_EXPIRY_KEY);
    const savedData = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    return !!(expiryTime && savedData && now <= parseInt(expiryTime, 10));
  } catch {
    return false;
  }
};

/**
 * Get a summary of saved form data for display purposes
 * @returns {Object|null} - Summary of saved data or null
 */
export const getSavedFormDataSummary = () => {
  try {
    const savedData = loadFormData();
    if (!savedData) return null;

    const { formData } = savedData;

    return {
      hasClient: !!formData.client,
      hasService: !!formData.services,
      hasDate: !!formData.date,
      hasTime: !!formData.start_time,
      hasLocation: !!formData.location,
      clientName: formData.client?.first_name
        ? `${formData.client.first_name} ${
            formData.client.last_name || ""
          }`.trim()
        : null,
      savedAt: new Date(savedData.timestamp || Date.now()).toLocaleString(),
    };
  } catch (error) {
    console.error("Failed to get saved form data summary:", error);
    return null;
  }
};

export default {
  saveFormData,
  loadFormData,
  clearFormData,
  hasSavedFormData,
  getSavedFormDataSummary,
};
