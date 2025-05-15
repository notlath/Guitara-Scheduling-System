import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import schedulingReducer from "./features/scheduling/schedulingSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    scheduling: schedulingReducer,
  },
});

export default store;
