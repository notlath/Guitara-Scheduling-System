import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import {
  sendAppointmentCreate,
  sendAppointmentDelete,
  sendAppointmentUpdate,
} from "../../services/webSocketService";

// API URL based on environment
const API_URL =
  process.env.NODE_ENV === "production"
    ? "/api/scheduling/"
    : "http://localhost:8000/api/scheduling/";

// Async thunks for API calls

// Fetch all appointments
export const fetchAppointments = createAsyncThunk(
  "scheduling/fetchAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}appointments/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch appointments",
      );
    }
  },
);

// Fetch today's appointments
export const fetchTodayAppointments = createAsyncThunk(
  "scheduling/fetchTodayAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}appointments/today/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch today's appointments",
      );
    }
  },
);

// Fetch upcoming appointments
export const fetchUpcomingAppointments = createAsyncThunk(
  "scheduling/fetchUpcomingAppointments",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}appointments/upcoming/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch upcoming appointments",
      );
    }
  },
);

// Fetch appointments for a specific date
export const fetchAppointmentsByDate = createAsyncThunk(
  "scheduling/fetchAppointmentsByDate",
  async (date, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}appointments/?date=${date}`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch appointments for this date",
      );
    }
  },
);

// Create a new appointment
export const createAppointment = createAsyncThunk(
  "scheduling/createAppointment",
  async (appointmentData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.post(
        `${API_URL}appointments/`,
        appointmentData,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      // Notify via WebSocket
      if (response.data.id) {
        sendAppointmentCreate(response.data.id);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not create appointment",
      );
    }
  },
);

// Update an existing appointment
export const updateAppointment = createAsyncThunk(
  "scheduling/updateAppointment",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}appointments/${id}/`, data);
      // Notify via WebSocket
      sendAppointmentUpdate(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not update appointment",
      );
    }
  },
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
        error.response?.data || "Could not delete appointment",
      );
    }
  },
);

// Fetch available therapists for a specific date and time
export const fetchAvailableTherapists = createAsyncThunk(
  "scheduling/fetchAvailableTherapists",
  async ({ date, start_time, end_time }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(
        `${API_URL}availabilities/available_therapists/?date=${date}&start_time=${start_time}&end_time=${end_time}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch available therapists",
      );
    }
  },
);

// Fetch available drivers for a specific date and time
export const fetchAvailableDrivers = createAsyncThunk(
  "scheduling/fetchAvailableDrivers",
  async ({ date, start_time, end_time }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(
        `${API_URL}availabilities/available_drivers/?date=${date}&start_time=${start_time}&end_time=${end_time}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch available drivers",
      );
    }
  },
);

// Fetch all clients
export const fetchClients = createAsyncThunk(
  "scheduling/fetchClients",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}clients/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Could not fetch clients");
    }
  },
);

// Fetch all services
export const fetchServices = createAsyncThunk(
  "scheduling/fetchServices",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    try {
      const response = await axios.get(`${API_URL}services/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch services",
      );
    }
  },
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
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch appointments for this week",
      );
    }
  },
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
        error.response?.data || "Could not fetch staff members",
      );
    }
  },
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
        },
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch availability",
      );
    }
  },
);

// Create new availability
export const createAvailability = createAsyncThunk(
  "scheduling/createAvailability",
  async (availabilityData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}availabilities/`,
        availabilityData,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not create availability",
      );
    }
  },
);

// Update existing availability
export const updateAvailability = createAsyncThunk(
  "scheduling/updateAvailability",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}availabilities/${id}/`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not update availability",
      );
    }
  },
);

// Delete availability
export const deleteAvailability = createAsyncThunk(
  "scheduling/deleteAvailability",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}availabilities/${id}/`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not delete availability",
      );
    }
  },
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
        },
      );
      return {
        notifications: response.data,
        unreadCount: countResponse.data.count,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch notifications",
      );
    }
  },
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
  "scheduling/markNotificationAsRead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${API_URL}notifications/${id}/mark_as_read/`,
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not mark notification as read",
      );
    }
  },
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
        error.response?.data || "Could not mark all notifications as read",
      );
    }
  },
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
          (appt) => appt.id === action.payload.id,
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
          (appt) => appt.id !== action.payload,
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
        state.error = action.payload;
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
        state.error = action.payload;
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
          (n) => n.id === action.payload.id,
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
