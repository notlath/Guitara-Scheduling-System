import { getToken } from './tokenManager';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Shared logout utility that calls the backend API to log the logout event
 * and then clears all local state.
 * 
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} navigate - React Router navigate function  
 * @param {Object} queryClient - TanStack Query client
 * @param {Object} profileCache - Profile cache utility
 * @param {Function} logout - Redux logout action
 */
export const performLogout = async (dispatch, navigate, queryClient, profileCache, logout) => {
  try {
    // Call logout API to log the event on backend
    const token = getToken();
    
    if (token) {
      console.log("🔄 Calling backend logout API...");
      
      await fetch(
        `${API_BASE_URL}/auth/logout/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log("✅ Backend logout successful");
    }
  } catch (error) {
    console.warn("⚠️ Backend logout failed:", error);
    // Continue with client-side logout even if API call fails
  }

  // Clear localStorage
  localStorage.removeItem("knoxToken");
  localStorage.removeItem("user");

  // Clear TanStack Query cache to prevent residual data between users
  queryClient.clear();

  // Clear all additional caches to prevent cross-user data leakage
  try {
    // Clear profile cache
    profileCache.clear();

    // Clear any other browser storage
    sessionStorage.clear();

    console.log("🧹 All caches cleared successfully on logout");
  } catch (error) {
    console.warn("⚠️ Some caches could not be cleared:", error);
  }

  // Clear Redux state
  dispatch(logout());

  // Navigate to login
  navigate("/");
};
