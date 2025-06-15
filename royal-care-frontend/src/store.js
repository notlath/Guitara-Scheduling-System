import { configureStore } from "@reduxjs/toolkit";
import attendanceReducer from "./features/attendance/attendanceSlice";
import authReducer from "./features/auth/authSlice";
import schedulingReducer from "./features/scheduling/schedulingSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    scheduling: schedulingReducer,
    attendance: attendanceReducer,
  },
});

export default store;
