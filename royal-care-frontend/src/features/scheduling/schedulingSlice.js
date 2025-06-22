import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import syncService from "../../services/syncService";
import {
  sendAppointmentCreate,
  sendAppointmentDelete,
  sendAppointmentUpdate,
} from "../../services/webSocketService";
import { handleAuthenticationError } from "../../utils/authUtils";
import { getToken } from "../../utils/tokenManager";

// API URL based on environment
const API_URL =
  import.meta.env.MODE === "production"
    ? "/api/scheduling/"
    : "http://localhost:8000/api/scheduling/";

// Fallback services data
const FALLBACK_SERVICES = [
  {
    id: 1,
    name: "Swedish Massage",
    duration: 60,
    price: 100.0,
    description: "Relaxing full-body massage",
  },
  {
    id: 2,
    name: "Deep Tissue Massage",
    duration: 90,
    price: 150.0,
    description: "Therapeutic deep tissue work",
  },
  {
    id: 3,
    name: "Hot Stone Massage",
    duration: 75,
    price: 130.0,
    description: "Heated stone therapy massage",
  },
];

// Helper function to handle API errors consistently
const handleApiError = (error, fallbackMessage) => {
  // Check if it's an authentication error first
  if (handleAuthenticationError(error)) {
    return "Authentication failed";
  }

  // If we have detailed API error data, format it properly
  if (error.response?.data) {
    const errorData = error.response.data;

    // If it's a validation error with field-specific messages
    if (typeof errorData === "object" && !Array.isArray(errorData)) {
      // Check for common error patterns
      if (errorData.detail) {
        return errorData.detail;
      }

      // Handle field-specific errors
      const fieldErrors = [];
      Object.entries(errorData).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          fieldErrors.push(`${field}: ${messages.join(", ")}`);
        } else if (typeof messages === "string") {
          fieldErrors.push(`${field}: ${messages}`);
        }
      });

      if (fieldErrors.length > 0) {
        return fieldErrors.join("; ");
      }
    }

    // If it's a string message
    if (typeof errorData === "string") {
      return errorData;
    }
  }

  // Return the fallback message
  return fallbackMessage;
};

// Async thunks for API calls

// Fetch all appointments
export const fetchAppointments = createAsyncThunk(
  "scheduling/fetchAppointments",
  async (_, { rejectWithValue }) => {
    const token = getToken();
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
    const token = getToken();
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
    const token = getToken();
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
    const token = getToken();
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
    const token = getToken();
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
        "📤 About to send appointment data to API:",
        JSON.stringify(formattedData, null, 2)
      );
      console.log("🔗 API endpoint:", `${API_URL}appointments/`);
      console.log("🔑 Authorization token present:", !!token);

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

      // Log detailed error information for debugging
      console.error("❌ createAppointment error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

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

      // Handle specific 400 Bad Request errors with field validation
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        console.error("📋 Validation errors:", errorData);

        // Return the structured error data for form field validation
        return rejectWithValue(errorData);
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
    const token = getToken();
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
    const token = getToken();
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

// Enhanced updateAppointmentStatus with optimistic updates and additional fields
export const updateAppointmentStatus = createAsyncThunk(
  "scheduling/updateAppointmentStatus",
  async ({ id, status, action, ...additionalFields }, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");

    // Create optimistic status update
    const optimisticUpdate = {
      status,
      ...additionalFields,
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

      if (action === "start_appointment") {
        // Use the specific start_appointment endpoint
        response = await axios.post(
          `${API_URL}appointments/${id}/start_appointment/`,
          {},
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
      } else if (action === "drop_off_therapist") {
        // Use the specific drop_off_therapist endpoint
        response = await axios.post(
          `${API_URL}appointments/${id}/drop_off_therapist/`,
          {},
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
      } else if (action === "complete_appointment" || status === "completed") {
        // Use the specific complete endpoint for appointment completion
        const updateData = { ...additionalFields };
        response = await axios.post(
          `${API_URL}appointments/${id}/complete/`,
          updateData,
          {
            headers: { Authorization: `Token ${token}` },
          }
        );
      } else {
        // For regular status updates, send status and any additional fields
        const updateData = { status, ...additionalFields };
        response = await axios.patch(
          `${API_URL}appointments/${id}/`,
          updateData,
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
    const token = getToken();
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
    const token = getToken();
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
    const token = getToken();
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
  async (params = {}, { rejectWithValue }) => {
    // If no params provided, just return empty array (used in some contexts)
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

    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    // ENHANCED DEBUG: Log comprehensive debugging info
    console.log("🔍 ENHANCED DEBUG - fetchAvailableTherapists:");
    console.log("  Environment:", import.meta.env.MODE);
    console.log("  API_URL:", API_URL);
    console.log("  Has Token:", !!token);
    console.log("  Token Length:", token ? token.length : 0);
    console.log(
      "  Token Preview:",
      token ? token.substring(0, 10) + "..." : "None"
    );
    console.log("  Parameters:", { date, start_time, end_time });

    const url = `${API_URL}availabilities/available_therapists/?date=${date}&start_time=${start_time}&end_time=${end_time}`;
    console.log("  Full URL:", url);

    try {
      console.log(
        "📡 Making authenticated request to availability endpoint..."
      );
      const response = await axios.get(url, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "✅ fetchAvailableTherapists: Success, received",
        response.data.length,
        "therapists"
      );
      return response.data;
    } catch (error) {
      console.error("❌ fetchAvailableTherapists: Detailed Error Analysis:");
      console.error("  Error object:", error);
      console.error("  Error message:", error.message);
      console.error("  Error status:", error.response?.status);
      console.error("  Error data:", error.response?.data);
      console.error("  Error headers:", error.response?.headers);
      console.error("  Request config:", error.config);
      console.error("  Request URL from config:", error.config?.url);
      console.error("  Request headers from config:", error.config?.headers);

      // Special handling for 404 errors
      if (error.response?.status === 404) {
        console.error("🚨 404 ERROR DETECTED - This endpoint should exist!");
        console.error(
          "  Expected URL pattern: /api/scheduling/availabilities/available_therapists/"
        );
        console.error("  Actual URL attempted:", url);
        console.error("  API_URL base:", API_URL);

        // Test the base API URL
        try {
          const baseTest = await axios.get(
            `${API_URL.replace("/scheduling/", "/")}`
          );
          console.log("  Base API reachable:", baseTest.status);
        } catch (baseError) {
          console.error("  Base API test failed:", baseError.message);
        }
      }

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

    const token = getToken();
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

// Fetch all staff members (therapists and drivers)
export const fetchStaffMembers = createAsyncThunk(
  "scheduling/fetchStaffMembers",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchStaffMembers: Starting API call");

    try {
      const response = await axios.get(`${API_URL}staff/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchStaffMembers: Success, received",
        response.data.length,
        "staff members"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchStaffMembers: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not fetch staff members" }
      );
    }
  }
);

// Fetch availability for a specific staff member and date
export const fetchAvailability = createAsyncThunk(
  "scheduling/fetchAvailability",
  async (
    { staffId, date, forceRefresh = false },
    { rejectWithValue, getState }
  ) => {
    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    const cacheKey = `${staffId}-${date}`;
    const state = getState();
    const cachedData = state.scheduling.availabilityCache[cacheKey];

    // Use cache if available and not forcing refresh
    if (!forceRefresh && cachedData) {
      console.log(
        `📋 fetchAvailability: Using cached data for ${cacheKey}`,
        cachedData
      );
      return {
        data: cachedData,
        cached: true,
        cacheKey,
      };
    }

    console.log("fetchAvailability: Starting API call", {
      staffId,
      date,
      forceRefresh,
    });

    try {
      const response = await axios.get(`${API_URL}availabilities/`, {
        params: { user: staffId, date },
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      // Ensure response data is always an array
      const data = Array.isArray(response.data) ? response.data : [];

      console.log(
        "fetchAvailability: Success, received",
        data.length,
        "availability records for",
        cacheKey
      );

      return {
        data,
        cached: false,
        cacheKey,
      };
    } catch (error) {
      console.error(
        "fetchAvailability: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not fetch availability" }
      );
    }
  }
);

// Create new availability record
export const createAvailability = createAsyncThunk(
  "scheduling/createAvailability",
  async (availabilityData, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("createAvailability: Starting API call", availabilityData);

    try {
      const response = await axios.post(
        `${API_URL}availabilities/`,
        availabilityData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("createAvailability: Success", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "createAvailability: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not create availability" }
      );
    }
  }
);

// Update existing availability record
export const updateAvailability = createAsyncThunk(
  "scheduling/updateAvailability",
  async ({ id, ...availabilityData }, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("updateAvailability: Starting API call", {
      id,
      ...availabilityData,
    });

    try {
      const response = await axios.put(
        `${API_URL}availabilities/${id}/`,
        availabilityData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("updateAvailability: Success", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "updateAvailability: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not update availability" }
      );
    }
  }
);

// Delete availability record
export const deleteAvailability = createAsyncThunk(
  "scheduling/deleteAvailability",
  async (id, { rejectWithValue }) => {
    const token = getToken();
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("deleteAvailability: Starting API call", { id });

    try {
      await axios.delete(`${API_URL}availabilities/${id}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log("deleteAvailability: Success, ID:", id);
      return id; // Return the ID of the deleted availability
    } catch (error) {
      console.error(
        "deleteAvailability: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not delete availability" }
      );
    }
  }
);

// Fetch clients
export const fetchClients = createAsyncThunk(
  "scheduling/fetchClients",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}clients/`, {
        headers: { Authorization: `Token ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not fetch clients"));
    }
  }
);

// Fetch services
export const fetchServices = createAsyncThunk(
  "scheduling/fetchServices",
  async () => {
    const token = getToken();
    // No token check here, services can be public or fetched with fallback
    try {
      const response = await axios.get(`${API_URL}services/`, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      console.warn("API fetchServices failed, using fallback:", error.message);
      return FALLBACK_SERVICES; // Use fallback data on error
    }
  }
);

// Fetch appointments by week
export const fetchAppointmentsByWeek = createAsyncThunk(
  "scheduling/fetchAppointmentsByWeek",
  async (weekStartDate, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}appointments/by_week/`, {
        headers: { Authorization: `Token ${token}` },
        params: { week_start: weekStartDate },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not fetch appointments for this week")
      );
    }
  }
);

// Fetch notifications
export const fetchNotifications = createAsyncThunk(
  "scheduling/fetchNotifications",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");

    console.log("🔄 fetchNotifications: Starting API call...");

    try {
      const response = await axios.get(`${API_URL}notifications/`, {
        headers: { Authorization: `Token ${token}` },
      });

      console.log("✅ fetchNotifications: Success", {
        status: response.status,
        dataType: typeof response.data,
        hasResults: !!response.data?.results,
        dataKeys: Object.keys(response.data || {}),
        dataLength: Array.isArray(response.data)
          ? response.data.length
          : "not array",
      });

      // Ensure the response has the expected structure
      const notifications =
        response.data.notifications ||
        response.data.results ||
        response.data ||
        [];
      const unreadCount =
        response.data.unreadCount !== undefined
          ? response.data.unreadCount
          : response.data.unread_count !== undefined
          ? response.data.unread_count
          : Array.isArray(notifications)
          ? notifications.filter((n) => !n.is_read).length
          : 0;

      console.log("📊 fetchNotifications: Processed data", {
        notificationCount: Array.isArray(notifications)
          ? notifications.length
          : 0,
        unreadCount,
        sampleNotification: notifications[0] || "none",
      });

      return {
        notifications: Array.isArray(notifications) ? notifications : [],
        unreadCount,
      };
    } catch (error) {
      console.error("❌ fetchNotifications: Error", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
      });

      // If it's a 500 error, try to provide a fallback
      if (error.response?.status === 500) {
        console.log(
          "🔄 fetchNotifications: 500 error detected, returning empty fallback"
        );
        return {
          notifications: [],
          unreadCount: 0,
          error: "Server error - notifications temporarily unavailable",
        };
      }

      return rejectWithValue(
        handleApiError(error, "Could not fetch notifications")
      );
    }
  }
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  "scheduling/markNotificationAsRead",
  async (notificationId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}notifications/${notificationId}/mark_as_read/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not mark notification as read")
      );
    }
  }
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
  "scheduling/markAllNotificationsAsRead",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}notifications/mark_all_as_read/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not mark all notifications as read")
      );
    }
  }
);

// Mark notification as unread
export const markNotificationAsUnread = createAsyncThunk(
  "scheduling/markNotificationAsUnread",
  async (notificationId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}notifications/${notificationId}/mark_as_unread/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not mark notification as unread")
      );
    }
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  "scheduling/deleteNotification",
  async (notificationId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      await axios.delete(`${API_URL}notifications/${notificationId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      return notificationId; // Return the ID of the deleted notification
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not delete notification")
      );
    }
  }
);

// Delete all notifications
export const deleteAllNotifications = createAsyncThunk(
  "scheduling/deleteAllNotifications",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      await axios.delete(`${API_URL}notifications/delete_all/`, {
        headers: { Authorization: `Token ${token}` },
      });
      return; // No specific data needed on success
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not delete all notifications")
      );
    }
  }
);

// Delete read notifications
export const deleteReadNotifications = createAsyncThunk(
  "scheduling/deleteReadNotifications",
  async (_, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      await axios.delete(`${API_URL}notifications/delete_read/`, {
        headers: { Authorization: `Token ${token}` },
      });
      return; // No specific data needed on success
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not delete read notifications")
      );
    }
  }
);

// Therapist confirm appointment
export const therapistConfirm = createAsyncThunk(
  "scheduling/therapistConfirm",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not confirm appointment (therapist)")
      );
    }
  }
);

// Driver confirm appointment (general driver confirmation)
export const driverConfirm = createAsyncThunk(
  "scheduling/driverConfirm",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/driver_confirm/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not confirm appointment (driver)")
      );
    }
  }
);

// Confirm pickup (driver action)
export const confirmPickup = createAsyncThunk(
  "scheduling/confirmPickup",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/confirm_pickup/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not confirm pickup"));
    }
  }
);

// Reject pickup (driver action)
export const rejectPickup = createAsyncThunk(
  "scheduling/rejectPickup",
  async ({ appointmentId, reason }, { rejectWithValue }) => {
    // Destructure appointmentId and reason
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/reject_pickup/`,
        { reason }, // Send reason in the request body
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not reject pickup"));
    }
  }
);

// Thunk to mark therapist as arrived
export const markArrived = createAsyncThunk(
  "scheduling/markArrived",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/arrive_at_location/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not mark as arrived")
      );
    }
  }
);

// Thunk to start journey for an appointment
export const startJourney = createAsyncThunk(
  "scheduling/startJourney",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/start_journey/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not start journey"));
    }
  }
);

// Thunk to start session for an appointment
export const startSession = createAsyncThunk(
  "scheduling/startSession",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/start_session/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not start session"));
    }
  }
);

// Thunk to request payment for an appointment
export const requestPayment = createAsyncThunk(
  "scheduling/requestPayment",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/mark_awaiting_payment/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not request payment")
      );
    }
  }
);

// Thunk to request pickup for therapist
export const requestPickup = createAsyncThunk(
  "scheduling/requestPickup",
  async (params, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");

    // Handle both old format (appointmentId) and new format (object with params)
    let appointmentId, pickup_urgency, pickup_notes;
    if (typeof params === "object" && params.appointmentId) {
      ({
        appointmentId,
        pickup_urgency = "normal",
        pickup_notes = "",
      } = params);
    } else {
      // Backward compatibility for direct appointmentId calls
      appointmentId = params;
      pickup_urgency = "normal";
      pickup_notes = "";
    }

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/request_pickup/`,
        {
          pickup_urgency,
          pickup_notes,
        },
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not request pickup"));
    }
  }
);

// Thunk to complete an appointment
export const completeAppointment = createAsyncThunk(
  "scheduling/completeAppointment",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/complete/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not complete appointment")
      );
    }
  }
);

// Thunk to mark an appointment as paid
export const markAppointmentPaid = createAsyncThunk(
  "scheduling/markAppointmentPaid",
  async ({ appointmentId, paymentData }, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");

    console.log("🔍 markAppointmentPaid: Starting payment verification", {
      appointmentId,
      paymentData,
      endpoint: `${API_URL}appointments/${appointmentId}/mark_payment_received/`,
    });

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/mark_payment_received/`,
        {
          payment_method: paymentData?.method || "cash",
          payment_amount: parseFloat(paymentData?.amount) || 0,
          payment_notes: paymentData?.notes || "",
          receipt_hash: paymentData?.receiptHash || null,
          receipt_url: paymentData?.receiptUrl || null,
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      console.log("✅ markAppointmentPaid: Success", response.data);
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      console.error("❌ markAppointmentPaid: Error", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // If the new endpoint doesn't exist, fallback to the old one
      if (error.response?.status === 404) {
        console.log(
          "🔄 markAppointmentPaid: Falling back to mark_completed endpoint"
        );
        try {
          const fallbackResponse = await axios.post(
            `${API_URL}appointments/${appointmentId}/mark_completed/`,
            {
              payment_method: paymentData?.method || "cash",
              payment_amount: parseFloat(paymentData?.amount) || 0,
              payment_notes: paymentData?.notes || "",
              receipt_hash: paymentData?.receiptHash || null,
              receipt_url: paymentData?.receiptUrl || null,
            },
            { headers: { Authorization: `Token ${token}` } }
          );

          console.log(
            "✅ markAppointmentPaid: Fallback success",
            fallbackResponse.data
          );
          sendAppointmentUpdate(fallbackResponse.data.id);
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error(
            "❌ markAppointmentPaid: Fallback also failed",
            fallbackError
          );
          return rejectWithValue(
            handleApiError(fallbackError, "Could not mark appointment as paid")
          );
        }
      }

      return rejectWithValue(
        handleApiError(error, "Could not mark appointment as paid")
      );
    }
  }
);

// Complete return journey (driver action)
export const completeReturnJourney = createAsyncThunk(
  "scheduling/completeReturnJourney",
  async (appointmentId, { rejectWithValue }) => {
    const token = getToken();
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/complete_return_journey/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
      sendAppointmentUpdate(response.data.id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not complete return journey")
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

        // Ensure data is always an array to prevent undefined errors
        state.availabilities = Array.isArray(data) ? data : [];

        // Update cache if this is fresh data
        if (!cached) {
          state.availabilityCache[cacheKey] = Array.isArray(data) ? data : [];
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

        // Handle both successful response and fallback error case
        const payload = action.payload || {};
        state.notifications = Array.isArray(payload.notifications)
          ? payload.notifications
          : [];
        state.unreadNotificationCount =
          typeof payload.unreadCount === "number" ? payload.unreadCount : 0;

        // If there was a server error but we got a fallback response
        if (payload.error) {
          state.error = payload.error;
        } else {
          state.error = null;
        }

        console.log("✅ Redux: fetchNotifications fulfilled", {
          notificationCount: state.notifications.length,
          unreadCount: state.unreadNotificationCount,
          hasArray: Array.isArray(state.notifications),
          hasError: !!payload.error,
          isFallback: !!payload.error,
        });
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load notifications";

        // Provide empty arrays as fallback to prevent UI errors
        if (!Array.isArray(state.notifications)) {
          state.notifications = [];
        }
        if (typeof state.unreadNotificationCount !== "number") {
          state.unreadNotificationCount = 0;
        }

        console.error("❌ Redux: fetchNotifications rejected", {
          payload: action.payload,
          error: action.error,
          fallbackProvided: true,
        });
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
      })
      // therapistConfirm
      .addCase(therapistConfirm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(therapistConfirm.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Therapist confirmation successful.";
      })
      .addCase(therapistConfirm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // markArrived
      .addCase(markArrived.pending, (state) => {
        state.loading = true;
      })
      .addCase(markArrived.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        // Also update todayAppointments and upcomingAppointments if the appointment exists there
        const todayIndex = state.todayAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (todayIndex !== -1) {
          state.todayAppointments[todayIndex] = action.payload;
        }
        const upcomingIndex = state.upcomingAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (upcomingIndex !== -1) {
          state.upcomingAppointments[upcomingIndex] = action.payload;
        }
      })
      .addCase(markArrived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // startJourney
      .addCase(startJourney.pending, (state) => {
        state.loading = true;
      })
      .addCase(startJourney.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        const todayIndex = state.todayAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (todayIndex !== -1) {
          state.todayAppointments[todayIndex] = action.payload;
        }
        const upcomingIndex = state.upcomingAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (upcomingIndex !== -1) {
          state.upcomingAppointments[upcomingIndex] = action.payload;
        }
      })
      .addCase(startSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // driverConfirm
      .addCase(driverConfirm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(driverConfirm.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Driver confirmation successful.";
      })
      .addCase(driverConfirm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // confirmPickup
      .addCase(confirmPickup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmPickup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Pickup confirmed successfully.";
      })
      .addCase(confirmPickup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // rejectPickup
      .addCase(rejectPickup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejectPickup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Pickup rejected successfully.";
      })
      .addCase(rejectPickup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // markAppointmentPaid
      .addCase(markAppointmentPaid.pending, (state) => {
        state.loading = true;
      })
      .addCase(markAppointmentPaid.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        const todayIndex = state.todayAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (todayIndex !== -1) {
          state.todayAppointments[todayIndex] = action.payload;
        }
        const upcomingIndex = state.upcomingAppointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (upcomingIndex !== -1) {
          state.upcomingAppointments[upcomingIndex] = action.payload;
        }
      })
      .addCase(markAppointmentPaid.rejected, (state, action) => {
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
