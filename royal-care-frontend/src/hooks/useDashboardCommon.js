import { useCallback, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import pageTitles from "../constants/pageTitles";
import { logout } from "../features/auth/authSlice";
import { usePhilippineTime } from "./usePhilippineTime";
import { useAutoWebSocketCacheSync } from "./useWebSocketCacheSync";
import useSyncEventHandlers from "./useSyncEventHandlers";

/**
 * Shared dashboard functionality for all role-based dashboards
 * Eliminates code duplication across OperatorDashboard, TherapistDashboard, and DriverDashboard
 */
export const useDashboardCommon = (userOrRole = "user", fallbackRole = null) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { systemTime, greeting } = usePhilippineTime();

  // Auto-setup WebSocket and sync handlers
  useAutoWebSocketCacheSync();
  useSyncEventHandlers();

  // Set page title
  useEffect(() => {
    document.title = pageTitles.dashboard;
  }, []);

  // Determine user and role from parameters
  const { user, role } = useMemo(() => {
    // If first parameter is a string, treat it as role and get user from localStorage
    if (typeof userOrRole === "string") {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return { user: storedUser, role: userOrRole };
    }
    // If first parameter is an object, treat it as user
    return { user: userOrRole || {}, role: fallbackRole || "user" };
  }, [userOrRole, fallbackRole]);

  // Extract user name with role fallback
  const userName = useMemo(() => {
    // Try first_name + last_name combination
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    
    // Try first_name only
    if (user?.first_name) {
      return user.first_name;
    }
    
    // Try last_name only
    if (user?.last_name) {
      return user.last_name;
    }
    
    // Try username
    if (user?.username) {
      return user.username;
    }
    
    // Try email (before @ symbol)
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    // Capitalize role as final fallback
    return role.charAt(0).toUpperCase() + role.slice(1);
  }, [user, role]);

  // Shared logout handler
  const handleLogout = useCallback(() => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  }, [dispatch, navigate]);

  return {
    user,
    userName,
    systemTime,
    greeting,
    handleLogout,
    navigate,
  };
};
