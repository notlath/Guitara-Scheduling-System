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
    try {
      const response = await axios.get(`${API_URL}appointments/`);
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
    try {
      const response = await axios.get(`${API_URL}appointments/today/`);
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
    try {
      const response = await axios.get(`${API_URL}appointments/upcoming/`);
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
    try {
      const response = await axios.get(`${API_URL}appointments/?date=${date}`);
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
    try {
      const response = await axios.post(
        `${API_URL}appointments/`,
        appointmentData
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
    try {
      const response = await axios.put(`${API_URL}appointments/${id}/`, data);

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

      return id; // Return the ID for removing from state
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
  async ({ date, start_time, end_time }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}availabilities/available_therapists/?date=${date}&start_time=${start_time}&end_time=${end_time}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch available therapists"
      );
    }
  }
);

// Fetch available drivers for a specific date and time
export const fetchAvailableDrivers = createAsyncThunk(
  "scheduling/fetchAvailableDrivers",
  async ({ date, start_time, end_time }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}availabilities/available_drivers/?date=${date}&start_time=${start_time}&end_time=${end_time}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch available drivers"
      );
    }
  }
);

// Fetch all clients
export const fetchClients = createAsyncThunk(
  "scheduling/fetchClients",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}clients/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Could not fetch clients");
    }
  }
);

// Fetch all services
export const fetchServices = createAsyncThunk(
  "scheduling/fetchServices",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}services/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Could not fetch services"
      );
    }
  }
);

// Fetch appointments for a specific week
export const fetchAppointmentsByWeek = createAsyncThunk(
  "scheduling/fetchAppointmentsByWeek",
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}appointments/?date_after=${startDate}&date_before=${endDate}`
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
    try {
      const response = await axios.get(`${API_URL}staff/`);
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
    try {
      const response = await axios.get(
        `${API_URL}availabilities/?user=${staffId}&date=${date}`
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
    try {
      const response = await axios.post(
        `${API_URL}availabilities/`,
        availabilityData
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
    try {
      const response = await axios.put(`${API_URL}availabilities/${id}/`, data);
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
    try {
      await axios.delete(`${API_URL}availabilities/${id}/`);
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
    try {
      const response = await axios.get(`${API_URL}notifications/`);
      // Also get unread count
      const countResponse = await axios.get(
        `${API_URL}notifications/unread_count/`
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
        state.appointments = action.payload;
        state.loading = false;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch appointments";
      })

      // fetchTodayAppointments
      .addCase(fetchTodayAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayAppointments.fulfilled, (state, action) => {
        state.todayAppointments = action.payload;
        state.loading = false;
      })
      .addCase(fetchTodayAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch today's appointments";
      })

      // fetchUpcomingAppointments
      .addCase(fetchUpcomingAppointments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingAppointments.fulfilled, (state, action) => {
        state.upcomingAppointments = action.payload;
        state.loading = false;
      })
      .addCase(fetchUpcomingAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch upcoming appointments";
      })

      // fetchAppointmentsByDate
      .addCase(fetchAppointmentsByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsByDate.fulfilled, (state, action) => {
        const date = action.meta.arg;
        state.appointmentsByDate[date] = action.payload;
        state.loading = false;
      })
      .addCase(fetchAppointmentsByDate.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Could not fetch appointments for this date";
      })

      // createAppointment
      .addCase(createAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createAppointment.fulfilled, (state, action) => {
        state.appointments.push(action.payload);
        state.loading = false;
        state.successMessage = "Appointment created successfully";
      })
      .addCase(createAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not create appointment";
      })

      // updateAppointment
      .addCase(updateAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateAppointment.fulfilled, (state, action) => {
        const index = state.appointments.findIndex(
          (appointment) => appointment.id === action.payload.id
        );
        if (index !== -1) {
          state.appointments[index] = action.payload;
        }
        state.loading = false;
        state.successMessage = "Appointment updated successfully";
      })
      .addCase(updateAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not update appointment";
      })

      // deleteAppointment
      .addCase(deleteAppointment.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteAppointment.fulfilled, (state, action) => {
        state.appointments = state.appointments.filter(
          (appointment) => appointment.id !== action.payload
        );
        state.todayAppointments = state.todayAppointments.filter(
          (appointment) => appointment.id !== action.payload
        );
        state.upcomingAppointments = state.upcomingAppointments.filter(
          (appointment) => appointment.id !== action.payload
        );
        state.loading = false;
        state.successMessage = "Appointment deleted successfully";
      })
      .addCase(deleteAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not delete appointment";
      })

      // fetchAvailableTherapists
      .addCase(fetchAvailableTherapists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableTherapists.fulfilled, (state, action) => {
        state.availableTherapists = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableTherapists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch available therapists";
      })

      // fetchAvailableDrivers
      .addCase(fetchAvailableDrivers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableDrivers.fulfilled, (state, action) => {
        state.availableDrivers = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableDrivers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch available drivers";
      })

      // fetchClients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
        state.loading = false;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch clients";
      })

      // fetchServices
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.services = action.payload;
        state.loading = false;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch services";
      })

      // fetchAppointmentsByWeek
      .addCase(fetchAppointmentsByWeek.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointmentsByWeek.fulfilled, (state, action) => {
        state.weekAppointments = action.payload;
        state.loading = false;
      })
      .addCase(fetchAppointmentsByWeek.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Could not fetch appointments for this week";
      })

      // fetchStaffMembers
      .addCase(fetchStaffMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffMembers.fulfilled, (state, action) => {
        state.staffMembers = action.payload;
        state.loading = false;
      })
      .addCase(fetchStaffMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch staff members";
      })

      // fetchAvailability
      .addCase(fetchAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.availabilities = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch availability";
      })

      // createAvailability
      .addCase(createAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAvailability.fulfilled, (state, action) => {
        state.availabilities.push(action.payload);
        state.loading = false;
        state.successMessage = "Availability created successfully";
      })
      .addCase(createAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not create availability";
      })

      // updateAvailability
      .addCase(updateAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAvailability.fulfilled, (state, action) => {
        const index = state.availabilities.findIndex(
          (availability) => availability.id === action.payload.id
        );
        if (index !== -1) {
          state.availabilities[index] = action.payload;
        }
        state.loading = false;
        state.successMessage = "Availability updated successfully";
      })
      .addCase(updateAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not update availability";
      })

      // deleteAvailability
      .addCase(deleteAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAvailability.fulfilled, (state, action) => {
        state.availabilities = state.availabilities.filter(
          (availability) => availability.id !== action.payload
        );
        state.loading = false;
        state.successMessage = "Availability deleted successfully";
      })
      .addCase(deleteAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not delete availability";
      })

      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadNotificationCount = action.payload.unreadCount;
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not fetch notifications";
      })

      // markNotificationAsRead
      .addCase(markNotificationAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          (notification) => notification.id === action.payload.id
        );
        if (index !== -1) {
          state.notifications[index] = action.payload;
          if (state.unreadNotificationCount > 0) {
            state.unreadNotificationCount -= 1;
          }
        }
        state.loading = false;
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not mark notification as read";
      })

      // markAllNotificationsAsRead
      .addCase(markAllNotificationsAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((notification) => ({
          ...notification,
          is_read: true,
        }));
        state.unreadNotificationCount = 0;
        state.loading = false;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Could not mark all notifications as read";
      });
  },
});

// Export actions and reducer
export const { clearError, clearSuccessMessage } = schedulingSlice.actions;
export default schedulingSlice.reducer;
