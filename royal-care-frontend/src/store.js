import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice"; // Replace with your actual reducer

const store = configureStore({
  reducer: {
    auth: authReducer, // Add your reducers here
  },
});

export default store;
