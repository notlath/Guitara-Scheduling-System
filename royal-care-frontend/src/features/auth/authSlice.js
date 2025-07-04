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

      // Clear sessionStorage to remove any temporary data
      try {
        sessionStorage.clear();
      } catch (error) {
        console.warn("Could not clear sessionStorage:", error);
      }
    },
    setAuthLoading(state, action) {
      state.isAuthLoading = action.payload;
    },
    authInitialized(state) {
      state.isAuthLoading = false; // Mark auth as initialized (even if no user)
    },
    updateUserProfile(state, action) {
      // Update user profile data
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update localStorage with new user data
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
  },
});

export const {
  login,
  logout,
  setAuthLoading,
  authInitialized,
  updateUserProfile,
} = authSlice.actions;
export default authSlice.reducer;
