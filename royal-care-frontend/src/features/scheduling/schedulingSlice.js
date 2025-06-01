import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import {
  sendAppointmentCreate,
  sendAppointmentDelete,
  sendAppointmentUpdate,
} from "../../services/webSocketService";

// API URL based on environment
const API_URL =
  import.meta.env.MODE === "production"
    ? "/api/scheduling/"
    : "http://localhost:8000/api/scheduling/";

// Async thunks for API calls

// Fetch all appointments
export const fetchAppointments = createAsyncThunk(
  "scheduling/fetchAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.get(`${API_URL}appointments/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch appointments"
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
        error.response?.data || "Could not fetch today's appointments"
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
        error.response?.data || "Could not fetch upcoming appointments"
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
        error.response?.data || "Could not fetch appointments for this date"
      );
    }
  }
);

// Create a new appointment
export const createAppointment = createAsyncThunk(
  "scheduling/createAppointment",
  async (appointmentData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.post(
        `${API_URL}appointments/`,
        appointmentData,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      // Notify via WebSocket
      if (response.data.id) {
        sendAppointmentCreate(response.data.id);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not create appointment"
      );
    }
  }
);

// Update an existing appointment
export const updateAppointment = createAsyncThunk(
  "scheduling/updateAppointment",
  async ({ id, data }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      const response = await axios.put(`${API_URL}appointments/${id}/`, data, {
        headers: { Authorization: `Token ${token}` },
      });
      // Notify via WebSocket
      sendAppointmentUpdate(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not update appointment"
      );
    }
  }
);

// Delete an appointment
export const deleteAppointment = createAsyncThunk(
  "scheduling/deleteAppointment",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}appointments/${id}/`);
      // Notify via WebSocket
      sendAppointmentDelete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete appointment"
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
    price: 550.0,
    is_active: true,
  },
  {
    id: 3,
    name: "Dry Massage",
    description: "Performed without oils or lotions.",
    duration: 60,
    price: 450.0,
    is_active: true,
  },
  {
    id: 4,
    name: "Foot Massage",
    description: "Focused on the feet and lower legs.",
    duration: 60,
    price: 400.0,
    is_active: true,
  },
  {
    id: 5,
    name: "Hot Stone Service",
    description: "Uses heated stones for deep muscle relaxation.",
    duration: 90, // 1.5 hours
    price: 650.0,
    is_active: true,
  },
  {
    id: 6,
    name: "Ventosa",
    description: "Traditional cupping therapy to relieve muscle tension.",
    duration: 45, // 45 minutes
    price: 450.0,
    is_active: true,
  },
  {
    id: 7,
    name: "Hand Massage",
    description: "Focused on hands and arms.",
    duration: 45, // 45 minutes
    price: 350.0,
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
        "services"
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
  async ({ staffId, date }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(
        `${API_URL}availabilities/?user=${staffId}&date=${date}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch availability"
      );
    }
  }
);

// Create new availability
export const createAvailability = createAsyncThunk(
  "scheduling/createAvailability",
  async (availabilityData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    console.log("Token in createAvailability:", token); // Added for debugging
    if (!token) return rejectWithValue("Authentication required");
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
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not create availability"
      );
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
  async (id, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");
    try {
      await axios.delete(`${API_URL}availabilities/${id}/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
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
    try {
      await axios.post(`${API_URL}notifications/mark_all_as_read/`);
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not mark all notifications as read"
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
      // fetchAvailableTherapists
      .addCase(fetchAvailableTherapists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableTherapists.fulfilled, (state, action) => {
        state.loading = false;
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
        state.availabilities = action.payload;
      })
      .addCase(fetchAvailability.rejected, (state, action) => {
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
        if (notif) {
          notif.is_read = true;
          notif.notification_type = action.payload.notification_type;
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
      });
  },
});

export const { clearError, clearSuccessMessage } = schedulingSlice.actions;
export default schedulingSlice.reducer;
