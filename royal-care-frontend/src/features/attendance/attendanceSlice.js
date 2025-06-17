import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { handleAuthenticationError } from "../../utils/authUtils";

// API URL based on environment
const API_URL =
  import.meta.env.MODE === "production"
    ? "/api/attendance/"
    : "http://localhost:8000/api/attendance/";

// Helper function to handle API errors consistently
const handleApiError = (error, fallbackMessage) => {
  if (handleAuthenticationError(error)) {
    return "Authentication failed";
  }

  if (error.response?.data) {
    const errorData = error.response.data;
    if (errorData.detail) {
      return errorData.detail;
    }
    if (typeof errorData === "string") {
      return errorData;
    }
  }

  return fallbackMessage;
};

// Async thunks for API calls

// Check in attendance
export const checkIn = createAsyncThunk(
  "attendance/checkIn",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.post(
        `${API_URL}check-in/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Failed to check in"));
    }
  }
);

// Check out attendance
export const checkOut = createAsyncThunk(
  "attendance/checkOut",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.post(
        `${API_URL}check-out/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Failed to check out"));
    }
  }
);

// Fetch attendance records for operator dashboard
export const fetchAttendanceRecords = createAsyncThunk(
  "attendance/fetchAttendanceRecords",
  async ({ date = null, staffId = null }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      let url = `${API_URL}records/`;
      const params = new URLSearchParams();

      if (date) params.append("date", date);
      if (staffId) params.append("staff_id", staffId);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Token ${token}` },
      });

      console.log("fetchAttendanceRecords API response:", response.data);
      if (response.data && response.data.length > 0) {
        console.log("Sample attendance record:", response.data[0]);
        console.log("Sample check-in time:", response.data[0].check_in_time);
        console.log("Sample check-out time:", response.data[0].check_out_time);
      }

      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch attendance records")
      );
    }
  }
);

// Get current user's attendance status for today
export const getTodayAttendanceStatus = createAsyncThunk(
  "attendance/getTodayAttendanceStatus",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.get(`${API_URL}today-status/`, {
        headers: { Authorization: `Token ${token}` },
      });
      console.log("getTodayAttendanceStatus API response:", response.data);
      console.log("Check-in time from API:", response.data.check_in_time);
      console.log("Check-out time from API:", response.data.check_out_time);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to fetch today's attendance status")
      );
    }
  }
);

// Approve attendance by operator
export const approveAttendance = createAsyncThunk(
  "attendance/approveAttendance",
  async (attendanceId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.post(
        `${API_URL}approve/${attendanceId}/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to approve attendance")
      );
    }
  }
);

// Generate attendance summary for all staff
export const generateAttendanceSummary = createAsyncThunk(
  "attendance/generateAttendanceSummary",
  async (date, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.get(`${API_URL}summary/`, {
        params: { date },
        headers: { Authorization: `Token ${token}` },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to generate attendance summary")
      );
    }
  }
);

// Update attendance status based on check-in time and rules
export const updateAttendanceStatus = createAsyncThunk(
  "attendance/updateAttendanceStatus",
  async (attendanceId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.post(
        `${API_URL}update-status/${attendanceId}/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to update attendance status")
      );
    }
  }
);

// Mark staff as absent (automated process)
export const markAsAbsent = createAsyncThunk(
  "attendance/markAsAbsent",
  async ({ staffId, date }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.post(
        `${API_URL}mark-absent/`,
        { staff_id: staffId, date },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Failed to mark as absent"));
    }
  }
);

// Update attendance record (for editing)
export const updateAttendanceRecord = createAsyncThunk(
  "attendance/updateAttendanceRecord",
  async ({ attendanceId, updateData }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.patch(
        `${API_URL}records/${attendanceId}/`,
        updateData,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        handleApiError(error, "Failed to update attendance record")
      );
    }
  }
);

// Add note to attendance record
export const addAttendanceNote = createAsyncThunk(
  "attendance/addAttendanceNote",
  async ({ attendanceId, notes }, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return rejectWithValue("Authentication required");
    }

    try {
      const response = await axios.patch(
        `${API_URL}records/${attendanceId}/`,
        { notes },
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(handleApiError(error, "Failed to add note"));
    }
  }
);

// Initial state
const initialState = {
  // Current user's attendance status
  todayStatus: null,
  isCheckedIn: false,
  checkInTime: null,
  checkOutTime: null,

  // Attendance records for operator view
  attendanceRecords: [],
  attendanceSummary: null,

  // Loading states
  loading: false,
  checkInLoading: false,
  checkOutLoading: false,
  approvalLoading: {},
  updateLoading: {},
  noteLoading: {},

  // Error states
  error: null,
  checkInError: null,
  checkOutError: null,
  updateError: null,
  noteError: null,

  // UI states
  lastRefresh: null,
};

// Attendance slice
const attendanceSlice = createSlice({
  name: "attendance",
  initialState,
  reducers: {
    clearAttendanceError: (state) => {
      state.error = null;
      state.checkInError = null;
      state.checkOutError = null;
      state.updateError = null;
      state.noteError = null;
    },
    resetAttendanceState: () => {
      return { ...initialState };
    },
    setApprovalLoading: (state, action) => {
      const { attendanceId, isLoading } = action.payload;
      state.approvalLoading[attendanceId] = isLoading;
    },
    setUpdateLoading: (state, action) => {
      const { attendanceId, isLoading } = action.payload;
      state.updateLoading[attendanceId] = isLoading;
    },
    setNoteLoading: (state, action) => {
      const { attendanceId, isLoading } = action.payload;
      state.noteLoading[attendanceId] = isLoading;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check in
      .addCase(checkIn.pending, (state) => {
        state.checkInLoading = true;
        state.checkInError = null;
      })
      .addCase(checkIn.fulfilled, (state, action) => {
        state.checkInLoading = false;
        state.isCheckedIn = true;
        state.checkInTime = action.payload.check_in_time;
        state.todayStatus = action.payload;
      })
      .addCase(checkIn.rejected, (state, action) => {
        state.checkInLoading = false;
        state.checkInError = action.payload;
      })

      // Check out
      .addCase(checkOut.pending, (state) => {
        state.checkOutLoading = true;
        state.checkOutError = null;
      })
      .addCase(checkOut.fulfilled, (state, action) => {
        state.checkOutLoading = false;
        state.checkOutTime = action.payload.check_out_time;
        state.todayStatus = action.payload;
        state.isCheckedIn = false;
      })
      .addCase(checkOut.rejected, (state, action) => {
        state.checkOutLoading = false;
        state.checkOutError = action.payload;
      })

      // Get today's status
      .addCase(getTodayAttendanceStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTodayAttendanceStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.todayStatus = action.payload;
        state.isCheckedIn = action.payload?.is_checked_in || false;
        state.checkInTime = action.payload?.check_in_time || null;
        state.checkOutTime = action.payload?.check_out_time || null;
      })
      .addCase(getTodayAttendanceStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch attendance records
      .addCase(fetchAttendanceRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRecords = action.payload;
        state.lastRefresh = new Date().toISOString();
      })
      .addCase(fetchAttendanceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Approve attendance
      .addCase(approveAttendance.fulfilled, (state, action) => {
        const updatedRecord = action.payload;
        const index = state.attendanceRecords.findIndex(
          (record) => record.id === updatedRecord.id
        );
        if (index !== -1) {
          state.attendanceRecords[index] = updatedRecord;
        }
        // Clear loading state
        delete state.approvalLoading[updatedRecord.id];
      })
      .addCase(approveAttendance.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Generate attendance summary
      .addCase(generateAttendanceSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateAttendanceSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceSummary = action.payload;
      })
      .addCase(generateAttendanceSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update attendance record
      .addCase(updateAttendanceRecord.pending, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;
        state.updateLoading[attendanceId] = true;
        state.updateError = null;
      })
      .addCase(updateAttendanceRecord.fulfilled, (state, action) => {
        const updatedRecord = action.payload;
        state.updateLoading[updatedRecord.id] = false;

        // Update the record in attendanceRecords if it exists
        const index = state.attendanceRecords.findIndex(
          (record) => record.id === updatedRecord.id
        );
        if (index !== -1) {
          state.attendanceRecords[index] = updatedRecord;
        }
      })
      .addCase(updateAttendanceRecord.rejected, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;
        state.updateLoading[attendanceId] = false;
        state.updateError = action.payload;
      })

      // Add attendance note
      .addCase(addAttendanceNote.pending, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;
        state.noteLoading[attendanceId] = true;
        state.noteError = null;
      })
      .addCase(addAttendanceNote.fulfilled, (state, action) => {
        const updatedRecord = action.payload;
        state.noteLoading[updatedRecord.id] = false;

        // Update the record in attendanceRecords if it exists
        const index = state.attendanceRecords.findIndex(
          (record) => record.id === updatedRecord.id
        );
        if (index !== -1) {
          state.attendanceRecords[index] = updatedRecord;
        }
      })
      .addCase(addAttendanceNote.rejected, (state, action) => {
        const attendanceId = action.meta.arg.attendanceId;
        state.noteLoading[attendanceId] = false;
        state.noteError = action.payload;
      });
  },
});

export const {
  clearAttendanceError,
  resetAttendanceState,
  setApprovalLoading,
  setUpdateLoading,
  setNoteLoading,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
