import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  is2FARequired: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
      // Clear localStorage when logging out
      localStorage.removeItem("user");
      localStorage.removeItem("knoxToken");
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
