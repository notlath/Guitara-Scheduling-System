import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  is2FARequired: false,
  isAuthLoading: true, // Add loading state to prevent premature redirects
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action) {
      state.user = action.payload;
      state.isAuthLoading = false; // Authentication complete
    },
    logout(state) {
      state.user = null;
      state.isAuthLoading = false; // Clear loading state
      // Clear localStorage when logging out
      localStorage.removeItem("user");
      localStorage.removeItem("knoxToken");
    },
    setAuthLoading(state, action) {
      state.isAuthLoading = action.payload;
    },
    authInitialized(state) {
      state.isAuthLoading = false; // Mark auth as initialized (even if no user)
    },
  },
});

export const { login, logout, setAuthLoading, authInitialized } =
  authSlice.actions;
export default authSlice.reducer;
