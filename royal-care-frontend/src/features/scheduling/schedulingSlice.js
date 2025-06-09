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

// Enhanced updateAppointmentStatus with optimistic updates and additional fields
export const updateAppointmentStatus = createAsyncThunk(
  "scheduling/updateAppointmentStatus",
  async ({ id, status, action, ...additionalFields }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
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
      } else if (status === "completed") {
        // Use the specific complete endpoint - only send additional fields for completion
        const updateData = { status, ...additionalFields };
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

// Fetch all staff members (therapists and drivers)
export const fetchStaffMembers = createAsyncThunk(
  "scheduling/fetchStaffMembers",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
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
  async ({ staffId, date }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchAvailability: Starting API call", { staffId, date });

    try {
      const response = await axios.get(`${API_URL}availabilities/`, {
        params: { staff_id: staffId, date },
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      // Ensure response data is always an array
      const data = Array.isArray(response.data) ? response.data : [];

      console.log(
        "fetchAvailability: Success, received",
        data.length,
        "availability records"
      );
      return data;
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
    const token = localStorage.getItem("knoxToken");
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
    const token = localStorage.getItem("knoxToken");
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
    const token = localStorage.getItem("knoxToken");
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
      console.log("deleteAvailability: Success");
      return id;
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

// Fetch notifications for the current user
export const fetchNotifications = createAsyncThunk(
  "scheduling/fetchNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchNotifications: Starting API call");

    try {
      const response = await axios.get(`${API_URL}notifications/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchNotifications: Success, received",
        response.data.length,
        "notifications"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchNotifications: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not fetch notifications" }
      );
    }
  }
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  "scheduling/markNotificationAsRead",
  async (notificationId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("markNotificationAsRead: Starting API call", {
      notificationId,
    });

    try {
      const response = await axios.patch(
        `${API_URL}notifications/${notificationId}/`,
        { is_read: true },
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("markNotificationAsRead: Success", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "markNotificationAsRead: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not mark notification as read" }
      );
    }
  }
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
  "scheduling/markAllNotificationsAsRead",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("markAllNotificationsAsRead: Starting API call");

    try {
      const response = await axios.post(
        `${API_URL}notifications/mark_all_read/`,
        {},
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("markAllNotificationsAsRead: Success");
      return response.data;
    } catch (error) {
      console.error(
        "markAllNotificationsAsRead: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || {
          error: "Could not mark all notifications as read",
        }
      );
    }
  }
);

// Mark notification as unread
export const markNotificationAsUnread = createAsyncThunk(
  "scheduling/markNotificationAsUnread",
  async (notificationId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("markNotificationAsUnread: Starting API call", {
      notificationId,
    });

    try {
      const response = await axios.patch(
        `${API_URL}notifications/${notificationId}/`,
        { is_read: false },
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("markNotificationAsUnread: Success", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "markNotificationAsUnread: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || {
          error: "Could not mark notification as unread",
        }
      );
    }
  }
);

// Delete read notifications
export const deleteReadNotifications = createAsyncThunk(
  "scheduling/deleteReadNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("deleteReadNotifications: Starting API call");

    try {
      const response = await axios.delete(
        `${API_URL}notifications/delete_read/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      console.log("deleteReadNotifications: Success");
      return response.data;
    } catch (error) {
      console.error(
        "deleteReadNotifications: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not delete read notifications" }
      );
    }
  }
);

// Fetch clients for appointments
export const fetchClients = createAsyncThunk(
  "scheduling/fetchClients",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchClients: Starting API call");

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
      return rejectWithValue(
        error.response?.data || { error: "Could not fetch clients" }
      );
    }
  }
);

// Fetch services for appointments
export const fetchServices = createAsyncThunk(
  "scheduling/fetchServices",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchServices: Starting API call");

    try {
      const response = await axios.get(`${API_URL}services/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchServices: Success, received",
        response.data.length,
        "services"
      );
      return response.data.length > 0 ? response.data : FALLBACK_SERVICES;
    } catch (error) {
      console.error(
        "fetchServices: Error, using fallback services",
        error.response?.data || error.message
      );
      return FALLBACK_SERVICES;
    }
  }
);

// Fetch appointments by week
export const fetchAppointmentsByWeek = createAsyncThunk(
  "scheduling/fetchAppointmentsByWeek",
  async (weekStart, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("fetchAppointmentsByWeek: Starting API call", { weekStart });

    try {
      const response = await axios.get(`${API_URL}appointments/by_week/`, {
        params: { week_start: weekStart },
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log(
        "fetchAppointmentsByWeek: Success, received",
        response.data.length,
        "appointments"
      );
      return response.data;
    } catch (error) {
      console.error(
        "fetchAppointmentsByWeek: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || {
          error: "Could not fetch appointments by week",
        }
      );
    }
  }
);

// Delete a specific notification
export const deleteNotification = createAsyncThunk(
  "scheduling/deleteNotification",
  async (notificationId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("deleteNotification: Starting API call", { notificationId });

    try {
      await axios.delete(`${API_URL}notifications/${notificationId}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log("deleteNotification: Success");
      return notificationId;
    } catch (error) {
      console.error(
        "deleteNotification: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not delete notification" }
      );
    }
  }
);

// Delete all notifications
export const deleteAllNotifications = createAsyncThunk(
  "scheduling/deleteAllNotifications",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue({ error: "Authentication required" });
    }

    console.log("deleteAllNotifications: Starting API call");

    try {
      const response = await axios.delete(
        `${API_URL}notifications/delete_all/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      console.log("deleteAllNotifications: Success");
      return response.data;
    } catch (error) {
      console.error(
        "deleteAllNotifications: Error",
        error.response?.data || error.message
      );
      return rejectWithValue(
        error.response?.data || { error: "Could not delete all notifications" }
      );
    }
  }
);

// Assign driver to pickup request
export const assignDriverToPickup = createAsyncThunk(
  "scheduling/assignDriverToPickup",
  async (
    { appointmentId, driverId, estimatedPickupTime },
    { rejectWithValue }
  ) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.patch(
        `${API_URL}appointments/${appointmentId}/`,
        {
          pickup_driver: driverId,
          assigned_driver: driverId,
          estimated_pickup_time: estimatedPickupTime,
          status: "driver_assigned_pickup",
          assignment_type: "manual",
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      // Broadcast assignment to all relevant parties
      syncService.broadcastWithImmediate("driver_assigned_pickup", {
        appointment: response.data,
        driverId,
        appointmentId,
        estimatedPickupTime,
      });

      return response.data;
    } catch (error) {
      console.error("Driver assignment error:", error);
      return rejectWithValue(
        handleApiError(error, "Could not assign driver to pickup")
      );
    }
  }
);

// Update driver status with photo verification
export const updateDriverStatusWithPhoto = createAsyncThunk(
  "scheduling/updateDriverStatusWithPhoto",
  async (
    { appointmentId, status, photo, location, notes },
    { rejectWithValue }
  ) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const formData = new FormData();
      formData.append("status", status);
      if (photo) formData.append("verification_photo", photo);
      if (location) formData.append("location_note", location);
      if (notes) formData.append("driver_notes", notes);

      const response = await axios.patch(
        `${API_URL}appointments/${appointmentId}/driver-status/`,
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Broadcast status update with photo verification
      syncService.broadcastWithImmediate("driver_status_update", {
        appointment: response.data,
        appointmentId,
        status,
        hasPhoto: !!photo,
        location,
        notes,
      });

      return response.data;
    } catch (error) {
      console.error("Driver status update error:", error);
      return rejectWithValue(
        handleApiError(error, "Could not update driver status")
      );
    }
  }
);

// Broadcast driver availability after drop-off
export const broadcastDriverAvailability = createAsyncThunk(
  "scheduling/broadcastDriverAvailability",
  async (
    { driverId, currentLocation, vehicleType, zone },
    { rejectWithValue }
  ) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}drivers/${driverId}/broadcast-availability/`,
        {
          status: "available_for_pickup",
          current_location: currentLocation,
          vehicle_type: vehicleType,
          preferred_zone: zone,
          timestamp: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      // Broadcast driver availability to operators
      syncService.broadcastWithImmediate("driver_available_for_pickup", {
        driverId,
        currentLocation,
        vehicleType,
        zone,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      console.error("Broadcast driver availability error:", error);
      return rejectWithValue(
        handleApiError(error, "Could not broadcast driver availability")
      );
    }
  }
);

// Request pickup assignment
export const requestPickupAssignment = createAsyncThunk(
  "scheduling/requestPickupAssignment",
  async ({ appointmentId, requestDetails }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/request-pickup/`,
        {
          ...requestDetails,
          status: "pickup_requested",
          timestamp: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      // Broadcast pickup request to operators
      syncService.broadcastWithImmediate("pickup_requested", {
        appointment: response.data,
        appointmentId,
        requestDetails,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      console.error("Request pickup assignment error:", error);
      return rejectWithValue(
        handleApiError(error, "Could not request pickup assignment")
      );
    }
  }
);

// Enhanced workflow action functions
export const therapistConfirm = createAsyncThunk(
  "scheduling/therapistConfirm",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/therapist_confirm/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not confirm appointment")
      );
    }
  }
);

export const driverConfirm = createAsyncThunk(
  "scheduling/driverConfirm",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/driver_confirm/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not confirm appointment")
      );
    }
  }
);

export const startJourney = createAsyncThunk(
  "scheduling/startJourney",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/start_journey/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not start journey"));
    }
  }
);

export const markArrived = createAsyncThunk(
  "scheduling/markArrived",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/arrive_at_location/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not mark arrival"));
    }
  }
);

export const startSession = createAsyncThunk(
  "scheduling/startSession",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/start_session/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not start session"));
    }
  }
);

export const requestPayment = createAsyncThunk(
  "scheduling/requestPayment",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/request_payment/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not request payment")
      );
    }
  }
);

export const completeAppointment = createAsyncThunk(
  "scheduling/completeAppointment",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/complete_appointment/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Could not complete appointment")
      );
    }
  }
);

export const requestPickup = createAsyncThunk(
  "scheduling/requestPickup",
  async (
    { appointmentId, pickup_urgency = "normal", pickup_notes = "" },
    { rejectWithValue }
  ) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/request_pickup/`,
        { pickup_urgency, pickup_notes },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );

      syncService.broadcastWithImmediate("appointment_updated_confirmed", {
        appointment: response.data,
        appointmentId,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Could not request pickup"));
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
        state.notifications = action.payload.notifications;
        state.unreadNotificationCount = action.payload.unreadCount;
        console.log("✅ Redux: fetchNotifications fulfilled", {
          notificationCount: action.payload.notifications?.length || 0,
          unreadCount: action.payload.unreadCount,
          hasArray: Array.isArray(action.payload.notifications),
        });
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error("❌ Redux: fetchNotifications rejected", {
          payload: action.payload,
          error: action.error,
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
        state.error = null;
      })
      .addCase(markArrived.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Marked arrival successfully.";
      })
      .addCase(markArrived.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // startJourney
      .addCase(startJourney.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startJourney.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Journey started successfully.";
      })
      .addCase(startJourney.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // startSession
      .addCase(startSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.appointments.findIndex(
          (appt) => appt.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.successMessage = "Session started successfully.";
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
