import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import syncService from "../../services/syncService";
import {
  sendAppointmentCreate,
  sendAppointmentDelete,
  sendAppointmentUpdate,
} from "../../services/webSocketService";
import { handleAuthenticationError } from "../../utils/authUtils";

// API URL based on environment
const API_URL =
  import.meta.env.MODE === "production"
    ? "/api/scheduling/"
    : "http://localhost:8000/api/scheduling/";

// Helper function to handle API errors consistently
const handleApiError = (error, fallbackMessage) => {
  // Check if it's an authentication error first
  if (handleAuthenticationError(error)) {
    return "Authentication failed";
  }

  // Return the API error or fallback message
  return error.response?.data || fallbackMessage;
};

// Async thunks for API calls

// Fetch all appointments
export const fetchAppointments = createAsyncThunk(
  "scheduling/fetchAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      console.error("❌ fetchAppointments: No authentication token found");
      return rejectWithValue("Authentication required");
    }

    console.log("🔄 fetchAppointments: Starting API call...");

    try {
      const response = await axios.get(`${API_URL}appointments/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      console.log(
        "✅ fetchAppointments: Success, received",
        response.data.length,
        "appointments"
      );
      return response.data;
    } catch (error) {
      console.error("❌ fetchAppointments: API Error", {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });

      return rejectWithValue(
        handleApiError(error, "Could not fetch appointments")
      );
    }
  }
);

// Fetch today's appointments
export const fetchTodayAppointments = createAsyncThunk(
  "scheduling/fetchTodayAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}appointments/today/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not fetch today's appointments")
      );
    }
  }
);

// Fetch upcoming appointments
export const fetchUpcomingAppointments = createAsyncThunk(
  "scheduling/fetchUpcomingAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}appointments/upcoming/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not fetch upcoming appointments")
      );
    }
  }
);

// Fetch appointments for a specific date
export const fetchAppointmentsByDate = createAsyncThunk(
  "scheduling/fetchAppointmentsByDate",
  async (date, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}appointments/?date=${date}`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not fetch appointments for this date")
      );
    }
  }
);

// Enhanced optimistic update handling for instant UI responsiveness
export const createAppointment = createAsyncThunk(
  "scheduling/createAppointment",
  async (appointmentData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticAppointment = {
      ...appointmentData,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "confirmed",
      isOptimistic: true,
    };

    // Track optimistic update for reconciliation
    syncService.addOptimisticUpdate(tempId, optimisticAppointment);

    // Immediately broadcast optimistic update to all dashboards
    syncService.broadcastWithImmediate("appointment_created_optimistic", {
      appointment: optimisticAppointment,
      tempId,
    });

    try {
      // Data sanitation to ensure correct format for backend API
      const formattedData = {
        ...appointmentData,
        // Ensure therapist is an integer, not an array
        therapist: Array.isArray(appointmentData.therapist)
          ? appointmentData.therapist.length > 0
            ? parseInt(appointmentData.therapist[0], 10)
            : null
          : typeof appointmentData.therapist === "string"
          ? parseInt(appointmentData.therapist, 10)
          : appointmentData.therapist,
        // Ensure services is an array of integers
        services: Array.isArray(appointmentData.services)
          ? appointmentData.services.map((id) =>
              typeof id === "string" ? parseInt(id, 10) : id
            )
          : appointmentData.services
          ? [parseInt(appointmentData.services, 10)]
          : [],
      };

      console.log("API submission data:", formattedData);
      console.log(
        "About to send appointment data to API:",
        JSON.stringify(formattedData, null, 2)
      );

      const response = await axios.post(
        `${API_URL}appointments/`,
        formattedData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Remove optimistic update and broadcast real data
      syncService.removeOptimisticUpdate(tempId);

      // Broadcast the real appointment data to replace optimistic version
      syncService.broadcastWithImmediate("appointment_created_confirmed", {
        appointment: response.data,
        tempId, // For identifying which optimistic update to replace
        wasOptimistic: true,
      });

      // Notify via WebSocket (if enabled)
      if (response.data.id) {
        sendAppointmentCreate(response.data.id);
      }

      return response.data;
    } catch (error) {
      // Remove failed optimistic update
      syncService.removeOptimisticUpdate(tempId);

      // Broadcast failure to remove optimistic appointment from UI
      syncService.broadcastWithImmediate("appointment_created_failed", {
        tempId,
        error: error.response?.data,
      });

      // Specific handling for therapist availability error
      if (
        error.response?.data?.therapist &&
        Array.isArray(error.response.data.therapist) &&
        error.response.data.therapist.includes(
          "Therapist is not available during this time slot"
        )
      ) {
        return rejectWithValue({
          therapist:
            "This therapist is not available during the selected time. Please select another therapist or time slot.",
          _original: error.response.data,
        });
      }

      return rejectWithValue(
        handleApiError(error, "Could not create appointment")
      );
    }
  }
);

// Enhanced updateAppointment with optimistic updates
export const updateAppointment = createAsyncThunk(
  "scheduling/updateAppointment",
  async ({ id, data }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    // Create optimistic update
    const optimisticUpdate = {
      ...data,
      id,
      updated_at: new Date().toISOString(),
      isOptimistic: true,
    };

    // Immediately broadcast optimistic update
    syncService.broadcastWithImmediate("appointment_updated_optimistic", {
      appointment: optimisticUpdate,
      appointmentId: id,
    });

    try {
      const response = await axios.patch(
        `${API_URL}appointments/${id}/`,
        data,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Broadcast confirmed update
      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId: id,
        wasOptimistic: true,
      });

      // Notify via WebSocket
      sendAppointmentUpdate(id);
      return response.data;
    } catch (error) {
      // Broadcast failure to revert optimistic update
      syncService.broadcastWithImmediate("appointment_updated_failed", {
        appointmentId: id,
        error: error.response?.data,
      });

      console.error("API Update Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(
        handleApiError(error, "Could not update appointment")
      );
    }
  }
);

// Enhanced deleteAppointment with optimistic updates
export const deleteAppointment = createAsyncThunk(
  "scheduling/deleteAppointment",
  async (id, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    // Immediately broadcast optimistic deletion
    syncService.broadcastWithImmediate("appointment_deleted_optimistic", {
      appointmentId: id,
    });

    try {
      await axios.delete(`${API_URL}appointments/${id}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      // Broadcast confirmed deletion
      syncService.broadcastWithImmediate("appointment_deleted_confirmed", {
        appointmentId: id,
        wasOptimistic: true,
      });

      // Notify via WebSocket
      sendAppointmentDelete(id);
      return id;
    } catch (error) {
      // Broadcast failure to restore deleted appointment
      syncService.broadcastWithImmediate("appointment_deleted_failed", {
        appointmentId: id,
        error: error.response?.data,
      });

      console.error("Delete appointment error:", error.response?.data);
      return rejectWithValue(
        handleApiError(error, "Could not delete appointment")
      );
    }
  }
);

// Enhanced updateAppointmentStatus with optimistic updates
export const updateAppointmentStatus = createAsyncThunk(
  "scheduling/updateAppointmentStatus",
  async ({ id, status }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    // Create optimistic status update
    const optimisticUpdate = {
      status,
      updated_at: new Date().toISOString(),
      isOptimistic: true,
    };

    // Immediately broadcast optimistic status update
    syncService.broadcastWithImmediate("appointment_updated_optimistic", {
      appointment: optimisticUpdate,
      appointmentId: id,
    });

    try {
      let response;

      if (status === "completed") {
        // Use the specific complete endpoint
        response = await axios.post(
          `${API_URL}appointments/${id}/complete/`,
          {},
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
      } else {
        // Use regular update for other status changes
        response = await axios.patch(
          `${API_URL}appointments/${id}/`,
          { status },
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
      }

      // Broadcast confirmed status update
      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId: id,
        wasOptimistic: true,
      });

      // Notify via WebSocket
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      // Broadcast failure to revert optimistic status update
      syncService.broadcastWithImmediate("appointment_updated_failed", {
        appointmentId: id,
        error: error.response?.data,
      });

      console.error("API Status Update Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(
        handleApiError(error, "Could not update appointment status")
      );
    }
  }
);

// Reject appointment with reason
export const rejectAppointment = createAsyncThunk(
  "scheduling/rejectAppointment",
  async ({ id, rejectionReason }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    console.log("🔍 schedulingSlice rejectAppointment - DETAILED DEBUG:", {
      id,
      rejectionReason,
      rejectionReasonType: typeof rejectionReason,
      rejectionReasonLength: rejectionReason?.length,
    });

    // Ensure rejectionReason is a string and not empty
    const cleanReason = String(rejectionReason || "").trim();
    if (!cleanReason) {
      console.error(
        "❌ schedulingSlice: Rejection reason is empty or invalid:",
        {
          rejectionReason,
          cleanReason,
          rejectionReasonType: typeof rejectionReason,
        }
      );
      return rejectWithValue("Rejection reason cannot be empty");
    }

    try {
      const payload = { rejection_reason: cleanReason };
      const url = `${API_URL}appointments/${id}/reject/`;

      console.log("🔍 schedulingSlice: Making API request with:", {
        url,
        payload,
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(
        "✅ schedulingSlice: Reject appointment successful:",
        response.data
      );

      // Notify via WebSocket
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      console.error("❌ schedulingSlice: API Reject Appointment Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: `${API_URL}appointments/${id}/reject/`,
        payload: { rejection_reason: cleanReason },
      });

      // Return the error data in a structured way for better error handling
      if (error.response?.data) {
        return rejectWithValue(error.response.data);
      }

      return rejectWithValue({
        error: error.message || "Could not reject appointment",
        status: error.response?.status || "unknown",
      });
    }
  }
);

// Review appointment rejection (operator)
export const reviewRejection = createAsyncThunk(
  "scheduling/reviewRejection",
  async ({ id, reviewDecision, reviewNotes }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${id}/review_rejection/`,
        {
          action: reviewDecision,
          reason: reviewNotes,
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      // Notify via WebSocket
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      console.error("API Review Rejection Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(
        error.response?.data || "Could not review rejection"
      );
    }
  }
);

// Auto-cancel overdue appointments
export const autoCancelOverdueAppointments = createAsyncThunk(
  "scheduling/autoCancelOverdueAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/auto_cancel_overdue/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      console.error("API Auto Cancel Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return rejectWithValue(
        error.response?.data || "Could not auto-cancel overdue appointments"
      );
    }
  }
);

// Fetch available therapists for a specific date and time
export const fetchAvailableTherapists = createAsyncThunk(
  "scheduling/fetchAvailableTherapists",
  async (params, { rejectWithValue }) => {
    if (!params) {
      console.error("fetchAvailableTherapists: No parameters provided");
      return rejectWithValue({ error: "No parameters provided" });
    }

    // Handle both naming conventions for parameters
    const date = params.date;
    const start_time = params.start_time || params.startTime;
    const end_time = params.end_time || params.endTime;

    // Validate required parameters - fail early with clear error messages
    if (!date) {
      console.error("fetchAvailableTherapists: Missing date parameter", params);
      return rejectWithValue({ error: "Missing date parameter" });
    }

    if (!start_time || start_time === "undefined") {
      console.error(
        "fetchAvailableTherapists: Missing or invalid start_time parameter",
        params
      );
      return rejectWithValue({
        error: "Missing or invalid start time parameter",
      });
    }

    if (!end_time || end_time === "undefined") {
      console.error(
        "fetchAvailableTherapists: Missing or invalid end_time parameter",
        params
      );
      return rejectWithValue({
        error: "Missing or invalid end time parameter",
      });
    }

    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    const url = `${API_URL}availabilities/available_therapists/?date=${date}&start_time=${start_time}&end_time=${end_time}`;
    console.log("fetchAvailableTherapists: Starting API call to", url);

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchAvailableTherapists: Success, received",
        response.data.length,
        "therapists"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchAvailableTherapists: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || {
          error: "Could not fetch available therapists",
        }
      );
    }
  }
);

// Fetch available drivers for a specific date and time
export const fetchAvailableDrivers = createAsyncThunk(
  "scheduling/fetchAvailableDrivers",
  async (params = {}, { rejectWithValue }) => {
    // If no params provided, just return empty array (used in some contexts)
    if (!params) {
      console.error("fetchAvailableDrivers: No parameters provided");
      return rejectWithValue({ error: "No parameters provided" });
    }

    // Handle both naming conventions for parameters
    const date = params.date;
    const start_time = params.start_time || params.startTime;
    const end_time = params.end_time || params.endTime;

    // Validate required parameters
    if (!date) {
      console.error("fetchAvailableDrivers: Missing date parameter", params);
      return rejectWithValue({ error: "Missing date parameter" });
    }

    if (!start_time || start_time === "undefined") {
      console.error(
        "fetchAvailableDrivers: Missing or invalid start_time parameter",
        params
      );
      return rejectWithValue({
        error: "Missing or invalid start time parameter",
      });
    }

    if (!end_time || end_time === "undefined") {
      console.error(
        "fetchAvailableDrivers: Missing or invalid end_time parameter",
        params
      );
      return rejectWithValue({
        error: "Missing or invalid end time parameter",
      });
    }

    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    const url = `${API_URL}availabilities/available_drivers/?date=${date}&start_time=${start_time}&end_time=${end_time}`;
    console.log("fetchAvailableDrivers: Starting API call to", url);

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchAvailableDrivers: Success, received",
        response.data.length,
        "drivers"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchAvailableDrivers: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not fetch available drivers" }
      );
    }
  }
);

// Fetch all clients
export const fetchClients = createAsyncThunk(
  "scheduling/fetchClients",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    console.log("fetchClients: Starting API call to", `${API_URL}clients/`);
    try {
      const response = await axios.get(`${API_URL}clients/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchClients: Success, received",
        response.data.length,
        "clients"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchClients: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(error.response?.data || "Could not fetch clients");
    }
  }
);

// Hardcoded service data to use when the API is not available
const FALLBACK_SERVICES = [
  {
    id: 1,
    name: "Shiatsu Massage",
    description: "A Japanese technique involving pressure points.",
    duration: 60, // 1 hour
    price: 500.0,
    is_active: true,
  },
  {
    id: 2,
    name: "Combi Massage",
    description: "A combination of multiple massage techniques.",
    duration: 60,
    price: 400.0,
    is_active: true,
  },
  {
    id: 3,
    name: "Dry Massage",
    description: "Performed without oils or lotions.",
    duration: 60,
    price: 500.0,
    is_active: true,
  },
  {
    id: 4,
    name: "Foot Massage",
    description: "Focused on the feet and lower legs.",
    duration: 60,
    price: 500.0,
    is_active: true,
  },
  {
    id: 5,
    name: "Hot Stone Service",
    description: "Uses heated stones for deep muscle relaxation.",
    duration: 90, // 1.5 hours
    price: 675.0,
    is_active: true,
  },
  {
    id: 6,
    name: "Ventosa",
    description: "Traditional cupping therapy to relieve muscle tension.",
    duration: 90, // 1.5 hours
    price: 675.0,
    is_active: true,
  },
  {
    id: 7,
    name: "Hand Massage",
    description: "Focused on hands and arms.",
    duration: 60,
    price: 400.0,
    is_active: true,
  },
];

// Fetch all services from the API endpoint
export const fetchServices = createAsyncThunk(
  "scheduling/fetchServices",
  async () => {
    const token = localStorage.getItem("knoxToken");
    console.log("fetchServices: Starting API call to", `${API_URL}services/`);
    try {
      const response = await axios.get(`${API_URL}services/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchServices: Success, received",
        response.data.length,
        "services",
        // Display all the received services for debugging
        console.log("Received services:", response.data)
      );
      return response.data;
    } catch (error) {
      console.log(
        "fetchServices: Error fetching from API, using fallback data:",
        error.response?.data || error.message
      );
      // Return hardcoded services as fallback when API fails
      return FALLBACK_SERVICES;
    }
  }
);

// Fetch appointments for a specific week
export const fetchAppointmentsByWeek = createAsyncThunk(
  "scheduling/fetchAppointmentsByWeek",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(
        `${API_URL}appointments/?date_after=${startDate}&date_before=${endDate}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch appointments for this week"
      );
    }
  }
);

// Fetch staff members (therapists and drivers)
export const fetchStaffMembers = createAsyncThunk(
  "scheduling/fetchStaffMembers",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}staff/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch staff members"
      );
    }
  }
);

// Fetch availability for a staff member
export const fetchAvailability = createAsyncThunk(
  "scheduling/fetchAvailability",
  async (
    { staffId, date, forceRefresh = false },
    { rejectWithValue, getState }
  ) => {
    const state = getState();
    const cacheKey = `${staffId}-${date}`;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && state.scheduling.availabilityCache[cacheKey]) {
      console.log(`📋 fetchAvailability: Using cached data for ${cacheKey}`);
      return {
        data: state.scheduling.availabilityCache[cacheKey],
        cached: true,
        cacheKey,
      };
    }

    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    console.log(`🔄 fetchAvailability: Loading fresh data for ${cacheKey}`);

    try {
      const response = await axios.get(
        `${API_URL}availabilities/?user=${staffId}&date=${date}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      return {
        data: response.data,
        cached: false,
        cacheKey,
      };
    } catch (error) {
      console.error(`❌ fetchAvailability: Error for ${cacheKey}:`, error);
      return rejectWithValue(
        handleApiError(error, "Could not fetch availability")
      );
    }
  }
);

// Create new availability
export const createAvailability = createAsyncThunk(
  "scheduling/createAvailability",
  async (availabilityData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    console.log("Creating availability with data:", availabilityData);

    try {
      const response = await axios.post(
        `${API_URL}availabilities/`,
        availabilityData,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      console.log("Availability creation successful:", response.data);

      // Broadcast sync event for real-time updates across dashboards
      syncService.broadcastWithImmediate("availability_created", {
        availability: response.data,
        staffId: response.data.user,
        date: response.data.date,
      });

      return response.data;
    } catch (error) {
      console.error("Create availability error:", error.response?.data);
      console.error("Full error:", error);

      let errorMessage = "Could not create availability";

      if (error.response?.data) {
        const data = error.response.data;
        if (data.user && Array.isArray(data.user)) {
          errorMessage = `User field error: ${data.user.join(", ")}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === "string") {
          errorMessage = data;
        } else {
          // Try to extract meaningful error from any field
          const firstErrorField = Object.keys(data)[0];
          if (firstErrorField && data[firstErrorField]) {
            errorMessage = `${firstErrorField}: ${
              Array.isArray(data[firstErrorField])
                ? data[firstErrorField].join(", ")
                : data[firstErrorField]
            }`;
          } else {
            errorMessage = JSON.stringify(data);
          }
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// Update existing availability
export const updateAvailability = createAsyncThunk(
  "scheduling/updateAvailability",
  async ({ id, data }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.put(
        `${API_URL}availabilities/${id}/`,
        data,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      console.log("Availability update successful:", response.data);

      // Broadcast sync event for real-time updates across dashboards
      syncService.broadcastWithImmediate("availability_updated", {
        availability: response.data,
        staffId: response.data.user,
        date: response.data.date,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not update availability"
      );
    }
  }
);

// Delete availability
export const deleteAvailability = createAsyncThunk(
  "scheduling/deleteAvailability",
  async (id, { rejectWithValue, getState }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    // Get the availability data before deletion for broadcast
    const state = getState();
    const availabilityToDelete = state.scheduling.availabilities.find(
      (avail) => avail.id === id
    );

    try {
      await axios.delete(`${API_URL}availabilities/${id}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      console.log("Availability deletion successful:", id);

      // Broadcast sync event for real-time updates across dashboards
      if (availabilityToDelete) {
        syncService.broadcastWithImmediate("availability_deleted", {
          id: id,
          user: availabilityToDelete.user,
          date: availabilityToDelete.date,
          staffId: availabilityToDelete.user,
        });
      }

      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete availability"
      );
    }
  }
);

// Fetch notifications
export const fetchNotifications = createAsyncThunk(
  "scheduling/fetchNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}notifications/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      // Also get unread count
      const countResponse = await axios.get(
        `${API_URL}notifications/unread_count/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      return {
        notifications: response.data,
        unreadCount: countResponse.data.count,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch notifications"
      );
    }
  }
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  "scheduling/markNotificationAsRead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}notifications/${id}/mark_as_read/`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not mark notification as read"
      );
    }
  }
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
  "scheduling/markAllNotificationsAsRead",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      await axios.post(
        `${API_URL}notifications/mark_all_as_read/`,
        {},
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not mark all notifications as read"
      );
    }
  }
);

// Mark notification as unread
export const markNotificationAsUnread = createAsyncThunk(
  "scheduling/markNotificationAsUnread",
  async (id, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.post(
        `${API_URL}notifications/${id}/mark_as_unread/`,
        {},
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not mark notification as unread"
      );
    }
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  "scheduling/deleteNotification",
  async (id, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      await axios.delete(`${API_URL}notifications/${id}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete notification"
      );
    }
  }
);

// Delete all notifications
export const deleteAllNotifications = createAsyncThunk(
  "scheduling/deleteAllNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      await axios.delete(`${API_URL}notifications/delete_all/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete all notifications"
      );
    }
  }
);

// Delete read notifications only
export const deleteReadNotifications = createAsyncThunk(
  "scheduling/deleteReadNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      await axios.delete(`${API_URL}notifications/delete_read/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete read notifications"
      );
    }
  }
);

// Initial state
const initialState = {
  appointments: [],
  todayAppointments: [],
  upcomingAppointments: [],
  appointmentsByDate: {},
  weekAppointments: [],
  availableTherapists: [],
  availableDrivers: [],
  staffMembers: [],
  clients: [],
  services: [],
  availabilities: [],
  availabilityCache: {}, // Cache for availability data: { "staffId-date": [...availabilities] }
  notifications: [],
  unreadNotificationCount: 0,
  loading: false,
  error: null,
  successMessage: null,
};

// Create the slice
const schedulingSlice = createSlice({
  name: "scheduling",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearAvailabilityCache: (state, action) => {
      // Clear specific cache entry or all cache
      if (action.payload) {
        const { staffId, date } = action.payload;
        const cacheKey = `${staffId}-${date}`;
        delete state.availabilityCache[cacheKey];
        console.log(`🗑️ Cleared availability cache for ${cacheKey}`);
      } else {
        state.availabilityCache = {};
        console.log("🗑️ Cleared all availability cache");
      }
    },
    invalidateAvailabilityCache: (state, action) => {
      // Mark cache as stale for a specific staff/date
      const { staffId, date } = action.payload;
      const cacheKey = `${staffId}-${date}`;
      delete state.availabilityCache[cacheKey];
      console.log(`🔄 Invalidated availability cache for ${cacheKey}`);
    },
    // Real-time sync reducers for immediate state updates
    syncAvailabilityCreated: (state, action) => {
      const newAvailability = action.payload;
      console.log(
        "🔄 syncAvailabilityCreated: Adding availability to state",
        newAvailability
      );

      // Invalidate cache for this staff/date
      const cacheKey = `${newAvailability.user}-${newAvailability.date}`;
      delete state.availabilityCache[cacheKey];

      // Add to current availabilities if not already there
      const existingIndex = state.availabilities.findIndex(
        (avail) => avail.id === newAvailability.id
      );
      if (existingIndex === -1) {
        state.availabilities.push(newAvailability);
      }
    },
    syncAvailabilityUpdated: (state, action) => {
      const updatedAvailability = action.payload;
      console.log(
        "🔄 syncAvailabilityUpdated: Updating availability in state",
        updatedAvailability
      );

      // Invalidate cache for this staff/date
      const cacheKey = `${updatedAvailability.user}-${updatedAvailability.date}`;
      delete state.availabilityCache[cacheKey];

      // Update in current availabilities
      const index = state.availabilities.findIndex(
        (avail) => avail.id === updatedAvailability.id
      );
      if (index !== -1) {
        state.availabilities[index] = updatedAvailability;
      }
    },
    syncAvailabilityDeleted: (state, action) => {
      const { id, user, date } = action.payload;
      console.log(
        "🔄 syncAvailabilityDeleted: Removing availability from state",
        { id, user, date }
      );

      // Invalidate cache for this staff/date
      const cacheKey = `${user}-${date}`;
      delete state.availabilityCache[cacheKey]; // Remove from current availabilities
      state.availabilities = state.availabilities.filter(
        (avail) => avail.id !== id
      );
    },
    // Real-time sync reducers for appointment optimistic updates
    syncAppointmentCreatedOptimistic: (state, action) => {
      const { appointment } = action.payload;
      console.log(
        "🔄 syncAppointmentCreatedOptimistic: Adding optimistic appointment",
        appointment
      );

      // Add optimistic appointment to the beginning of the list for immediate visibility
      state.appointments.unshift({ ...appointment, isOptimistic: true });
    },
    syncAppointmentCreatedConfirmed: (state, action) => {
      const { appointment, tempId } = action.payload;
      console.log(
        "🔄 syncAppointmentCreatedConfirmed: Confirming appointment",
        { appointment, tempId }
      );

      // Replace optimistic appointment with real one
      const optimisticIndex = state.appointments.findIndex(
        (apt) => apt.id === tempId
      );
      if (optimisticIndex !== -1) {
        state.appointments[optimisticIndex] = appointment;
      } else {
        // If optimistic not found, just add the real one
        state.appointments.unshift(appointment);
      }
    },
    syncAppointmentCreatedFailed: (state, action) => {
      const { tempId } = action.payload;
      console.log(
        "🔄 syncAppointmentCreatedFailed: Removing failed optimistic appointment",
        tempId
      );

      // Remove failed optimistic appointment
      state.appointments = state.appointments.filter(
        (apt) => apt.id !== tempId
      );
    },
    syncAppointmentUpdatedOptimistic: (state, action) => {
      const { appointment, appointmentId } = action.payload;
      console.log("🔄 syncAppointmentUpdatedOptimistic: Optimistic update", {
        appointment,
        appointmentId,
      });

      const index = state.appointments.findIndex(
        (apt) => apt.id === appointmentId
      );
      if (index !== -1) {
        state.appointments[index] = {
          ...state.appointments[index],
          ...appointment,
          isOptimistic: true,
        };
      }
    },
    syncAppointmentUpdatedConfirmed: (state, action) => {
      const { appointment, appointmentId } = action.payload;
      console.log("🔄 syncAppointmentUpdatedConfirmed: Confirming update", {
        appointment,
        appointmentId,
      });

      const index = state.appointments.findIndex(
        (apt) => apt.id === appointmentId
      );
      if (index !== -1) {
        state.appointments[index] = { ...appointment, isOptimistic: false };
      }
    },
    syncAppointmentUpdatedFailed: (state, action) => {
      const { appointmentId } = action.payload;
      console.log(
        "🔄 syncAppointmentUpdatedFailed: Reverting failed update",
        appointmentId
      );

      // In a real app, you'd revert to the previous state
      // For now, we'll refetch or mark as needing refresh
      const index = state.appointments.findIndex(
        (apt) => apt.id === appointmentId
      );
      if (index !== -1) {
        state.appointments[index] = {
          ...state.appointments[index],
          isOptimistic: false,
          needsRefresh: true,
        };
      }
    },
    syncAppointmentDeletedOptimistic: (state, action) => {
      const { appointmentId } = action.payload;
      console.log(
        "🔄 syncAppointmentDeletedOptimistic: Optimistic deletion",
        appointmentId
      );

      // Mark as optimistically deleted
      const index = state.appointments.findIndex(
        (apt) => apt.id === appointmentId
      );
      if (index !== -1) {
        state.appointments[index] = {
          ...state.appointments[index],
          isOptimisticDeleted: true,
        };
      }
    },
    syncAppointmentDeletedConfirmed: (state, action) => {
      const { appointmentId } = action.payload;
      console.log(
        "🔄 syncAppointmentDeletedConfirmed: Confirming deletion",
        appointmentId
      );

      // Remove the appointment completely
      state.appointments = state.appointments.filter(
        (apt) => apt.id !== appointmentId
      );
    },
    syncAppointmentDeletedFailed: (state, action) => {
      const { appointmentId } = action.payload;
      console.log(
        "🔄 syncAppointmentDeletedFailed: Reverting failed deletion",
        appointmentId
      );

      // Restore the appointment
      const index = state.appointments.findIndex(
        (apt) => apt.id === appointmentId
      );
      if (index !== -1) {
        const restored = { ...state.appointments[index] };
        delete restored.isOptimisticDeleted;
        state.appointments[index] = restored;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAppointments
      .addCase(fetchAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = action.payload;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchTodayAppointments
      .addCase(fetchTodayAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.todayAppointments = action.payload;
      })
      .addCase(fetchTodayAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchUpcomingAppointments
      .addCase(fetchUpcomingAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingAppointments = action.payload;
      })
      .addCase(fetchUpcomingAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAppointmentsByDate
      .addCase(fetchAppointmentsByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsByDate.fulfilled, (state, action) => {
        state.loading = false;
        state.appointmentsByDate = action.payload;
      })
      .addCase(fetchAppointmentsByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createAppointment
      .addCase(createAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAppointment.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments.push(action.payload);
        state.successMessage = "Appointment created successfully.";
      })
      .addCase(createAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateAppointment
      .addCase(updateAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
          state.successMessage = "Appointment updated successfully.";
        }
      })
      .addCase(updateAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteAppointment
      .addCase(deleteAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAppointment.fulfilled, (state, action) => {
        state.loading = false;
        state.appointments = state.appointments.filter(
          (appt) => appt.id !== action.payload
        );
        state.successMessage = "Appointment deleted successfully.";
      })
      .addCase(deleteAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateAppointmentStatus
      .addCase(updateAppointmentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAppointmentStatus.fulfilled, (state, action) => {
        state.loading = false;

        // Update appointment in all relevant arrays
        const updatedAppointment = action.payload;

        const updateArrays = [
          "appointments",
          "todayAppointments",
          "upcomingAppointments",
        ];

        updateArrays.forEach((arrayName) => {
          const index = state[arrayName].findIndex(
            (appt) => appt.id === updatedAppointment.id
          );
          if (index !== -1) {
            state[arrayName][index] = updatedAppointment;
          }
        });

        state.successMessage = "Appointment status updated successfully.";
      })
      .addCase(updateAppointmentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // rejectAppointment
      .addCase(rejectAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
          state.successMessage = "Appointment rejected successfully.";
        }
      })
      .addCase(rejectAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // reviewRejection
      .addCase(reviewRejection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reviewRejection.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
          state.successMessage = "Rejection reviewed successfully.";
        }
      })
      .addCase(reviewRejection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // autoCancelOverdueAppointments
      .addCase(autoCancelOverdueAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(autoCancelOverdueAppointments.fulfilled, (state) => {
        state.loading = false;
        state.successMessage =
          "Overdue appointments auto-canceled successfully.";
      })
      .addCase(autoCancelOverdueAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAvailableTherapists
      .addCase(fetchAvailableTherapists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableTherapists.fulfilled, (state, action) => {
        state.loading = false;
        // The backend now returns only therapists with availability data
        state.availableTherapists = action.payload;
      })
      .addCase(fetchAvailableTherapists.rejected, (state, action) => {
        state.loading = false;
        // Handle error objects and strings properly
        if (typeof action.payload === "string") {
          state.error = action.payload;
        } else if (action.payload && action.payload.error) {
          state.error = action.payload.error;
        } else {
          state.error = "Could not fetch available therapists";
        }
        // Don't clear existing data if we have it
        if (
          !state.availableTherapists ||
          state.availableTherapists.length === 0
        ) {
          state.availableTherapists = [];
        }
      })
      // fetchAvailableDrivers
      .addCase(fetchAvailableDrivers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableDrivers.fulfilled, (state, action) => {
        state.loading = false;
        state.availableDrivers = action.payload;
      })
      .addCase(fetchAvailableDrivers.rejected, (state, action) => {
        state.loading = false;
        // Handle error objects and strings properly
        if (typeof action.payload === "string") {
          state.error = action.payload;
        } else if (action.payload && action.payload.error) {
          state.error = action.payload.error;
        } else {
          state.error = "Could not fetch available drivers";
        }
        // Don't clear existing data if we have it
        if (!state.availableDrivers || state.availableDrivers.length === 0) {
          state.availableDrivers = [];
        }
      })
      // fetchClients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchServices
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAppointmentsByWeek
      .addCase(fetchAppointmentsByWeek.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsByWeek.fulfilled, (state, action) => {
        state.loading = false;
        state.weekAppointments = action.payload;
      })
      .addCase(fetchAppointmentsByWeek.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchStaffMembers
      .addCase(fetchStaffMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.staffMembers = action.payload;
      })
      .addCase(fetchStaffMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchAvailability
      .addCase(fetchAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.loading = false;
        const { data, cached, cacheKey } = action.payload;

        console.log(
          `📋 fetchAvailability.fulfilled - ${
            cached ? "Using cached" : "Setting fresh"
          } availabilities for ${cacheKey}:`,
          data
        );

        state.availabilities = data;

        // Update cache if this is fresh data
        if (!cached) {
          state.availabilityCache[cacheKey] = data;
          console.log(`💾 Cached availability data for ${cacheKey}`);
        }
      })
      .addCase(fetchAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createAvailability
      .addCase(createAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAvailability.fulfilled, (state, action) => {
        state.loading = false;
        console.log(
          "✨ createAvailability.fulfilled - Adding new availability:",
          action.payload
        );

        // Invalidate cache for this staff/date combination
        const availability = action.payload;
        const cacheKey = `${availability.user}-${availability.date}`;
        delete state.availabilityCache[cacheKey];
        console.log(
          `🔄 Invalidated cache for ${cacheKey} due to new availability`
        );

        // Only add to current availabilities if it's not already there
        // (to avoid duplicates when the user is viewing the same date/staff)
        const existingIndex = state.availabilities.findIndex(
          (avail) => avail.id === action.payload.id
        );
        if (existingIndex === -1) {
          console.log("➕ Adding new availability to local state");
          state.availabilities.push(action.payload);
        } else {
          console.log(
            "⚠️ Availability already exists in local state, skipping"
          );
        }
        state.successMessage = "Availability created successfully.";
      })
      .addCase(createAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateAvailability
      .addCase(updateAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAvailability.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.availabilities.findIndex(
          (avail) => avail.id === action.payload.id
        );
        if (index !== -1) {
          state.availabilities[index] = action.payload;
          state.successMessage = "Availability updated successfully.";
        }
      })
      .addCase(updateAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteAvailability
      .addCase(deleteAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.availabilities = state.availabilities.filter(
          (avail) => avail.id !== action.payload
        );
        state.successMessage = "Availability deleted successfully.";
      })
      .addCase(deleteAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadNotificationCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // markNotificationAsRead
      .addCase(markNotificationAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        state.loading = false;
        const notif = state.notifications.find(
          (n) => n.id === action.payload.id
        );
        if (notif && !notif.is_read) {
          notif.is_read = true;
          notif.notification_type = action.payload.notification_type;
          state.unreadNotificationCount = Math.max(
            0,
            state.unreadNotificationCount - 1
          );
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // markAllNotificationsAsRead
      .addCase(markAllNotificationsAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.loading = false;
        state.notifications.forEach((notif) => (notif.is_read = true));
        state.unreadNotificationCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // markNotificationAsUnread
      .addCase(markNotificationAsUnread.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markNotificationAsUnread.fulfilled, (state, action) => {
        state.loading = false;
        const notif = state.notifications.find(
          (n) => n.id === action.payload.id
        );
        if (notif && notif.is_read) {
          notif.is_read = false;
          notif.notification_type = action.payload.notification_type;
          state.unreadNotificationCount += 1;
        }
      })
      .addCase(markNotificationAsUnread.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteNotification
      .addCase(deleteNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.loading = false;
        const notificationToDelete = state.notifications.find(
          (n) => n.id === action.payload
        );
        if (notificationToDelete && !notificationToDelete.is_read) {
          state.unreadNotificationCount = Math.max(
            0,
            state.unreadNotificationCount - 1
          );
        }
        state.notifications = state.notifications.filter(
          (n) => n.id !== action.payload
        );
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteAllNotifications
      .addCase(deleteAllNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAllNotifications.fulfilled, (state) => {
        state.loading = false;
        state.notifications = [];
        state.unreadNotificationCount = 0;
      })
      .addCase(deleteAllNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteReadNotifications
      .addCase(deleteReadNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReadNotifications.fulfilled, (state) => {
        state.loading = false;
        // Remove only read notifications
        state.notifications = state.notifications.filter((n) => !n.is_read);
        // Unread count should remain the same
      })
      .addCase(deleteReadNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSuccessMessage,
  clearAvailabilityCache,
  invalidateAvailabilityCache,
  syncAvailabilityCreated,
  syncAvailabilityUpdated,
  syncAvailabilityDeleted,
  syncAppointmentCreatedOptimistic,
  syncAppointmentCreatedConfirmed,
  syncAppointmentCreatedFailed,
  syncAppointmentUpdatedOptimistic,
  syncAppointmentUpdatedConfirmed,
  syncAppointmentUpdatedFailed,
  syncAppointmentDeletedOptimistic,
  syncAppointmentDeletedConfirmed,
  syncAppointmentDeletedFailed,
} = schedulingSlice.actions;
export default schedulingSlice.reducer;
