import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../features/auth/authSlice";
import { profileCache } from "../utils/profileCache";
import { performLogout } from "../utils/logoutUtils";
import { usePhilippineTime } from "./usePhilippineTime";
import { useAutoWebSocketCacheSync } from "./useWebSocketCacheSync";

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
  const handleLogout = async () => {
    await performLogout(dispatch, navigate, queryClient, profileCache, logout);
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
