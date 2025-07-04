import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../features/auth/authSlice";
import { usePhilippineTime } from "./usePhilippineTime";
import { useAutoWebSocketCacheSync } from "./useWebSocketCacheSync";
import { profileCache } from "../utils/profileCache";

/**
 * Common dashboard functionality hook
 * Consolidates shared frontend logic across all dashboard components
 *
 * @param {string} defaultView - Default view when no URL param is set
 * @returns {Object} Common dashboard state and handlers
 */
export const useDashboardCommon = (defaultView = "today") => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // 🕐 Philippine time and greeting - shared across all dashboards
  const { systemTime, greeting } = usePhilippineTime();

  // 🔄 WebSocket cache sync - shared across all dashboards
  useAutoWebSocketCacheSync();

  // 🔗 URL view management - shared across all dashboards
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get("view") || defaultView;

  const setView = (newView) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("view", newView);
    setSearchParams(newSearchParams);
  };

  // 🚪 Logout handler - shared across all dashboards
  const handleLogout = () => {
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

  // 🔄 Button loading state management - shared across Driver & Therapist dashboards
  const [buttonLoading, setButtonLoading] = useState({});

  const setActionLoading = (actionKey, isLoading) => {
    setButtonLoading((prev) => ({
      ...prev,
      [actionKey]: isLoading,
    }));
  };

  return {
    // Time & greeting
    systemTime,
    greeting,

    // View management
    currentView,
    setView,

    // Authentication
    handleLogout,

    // Loading states
    buttonLoading,
    setActionLoading,
  };
};

export default useDashboardCommon;
