import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
// TANSTACK QUERY: Import TanStack Query hooks for data management
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAttendance,
  checkIn,
  checkOut,
  getTodayAttendanceStatus,
} from "../features/attendance/attendanceSlice";
import { logout } from "../features/auth/authSlice";
import { updateAppointmentStatus } from "../features/scheduling/schedulingSlice";
// TANSTACK QUERY: Import TanStack Query optimized hooks
import LayoutRow from "../globals/LayoutRow";
import PageLayout from "../globals/PageLayout";
import TabSwitcher from "../globals/TabSwitcher";
import { useOperatorDashboardData } from "../hooks/useDashboardQueries";
import { useInstantUpdates } from "../hooks/useInstantUpdates";
// ✅ REFACTORED: Use common dashboard utilities for shared logic
import { usePhilippineTime } from "../hooks/usePhilippineTime";
import { getUserDisplayName } from "../utils/userUtils";
// PERFORMANCE: Stable filtering imports to prevent render loops
import ServerPagination from "./ServerPagination";
// OPTIMIZED: Replace old data hooks with optimized versions
import { useOptimizedButtonLoading } from "../hooks/useOperatorPerformance";
import useSyncEventHandlers from "../hooks/useSyncEventHandlers";
import styles from "../pages/SettingsDataPage/SettingsDataPage.module.css";
import syncService from "../services/syncService";
import { LoadingButton } from "./common/LoadingComponents";
import MinimalLoadingIndicator from "./common/MinimalLoadingIndicator";
import {
  useAttendanceActions,
  useAttendanceRecords,
} from "./contexts/AttendanceContext";
import StatusDropdown from "./StatusDropdown";
// API error handling utilities
import {
  createAdBlockerFriendlyConfig,
  getRetryDelay,
  getUserFriendlyErrorMessage,
  isBlockedByClient,
  shouldRetryRequest,
  sleep,
} from "../utils/apiRequestUtils";

import "../globals/TabSwitcher.css";
import "../styles/DriverCoordination.css";
import "../styles/EnhancedAppointmentCards.css";
import "../styles/ErrorHandling.css";
import "../styles/OperatorDashboard.css";
import "../styles/Performance.css";
import "../styles/UrgencyIndicators.css";
import PostServiceMaterialModal from "./scheduling/PostServiceMaterialModal";

// ✅ ROBUST FILTERING: Valid values for URL parameters
const VALID_VIEW_VALUES = Object.freeze([
  "rejected",
  "pending",
  "timeout",
  "payment",
  "all",
  "notifications",
  "driver",
  "workflow",
  "sessions",
  "pickup",
]);

const VALID_FILTER_VALUES = Object.freeze([
  "all",
  "today",
  "upcoming",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "awaiting_payment",
  "overdue",
]);

// ✅ ROBUST FILTERING: Validation helpers
const validateUrlParam = (param, validValues, defaultValue) => {
  if (!param || typeof param !== "string") return defaultValue;
  return validValues.includes(param) ? param : defaultValue;
};

import { useAutoWebSocketCacheSync } from "../hooks/useWebSocketCacheSync";
import { queryKeys } from "../lib/queryClient";

const OperatorDashboard = () => {
  // ✅ TANSTACK QUERY MIGRATION COMPLETE
  //
  // BEFORE: Custom data fetching with useEffect, manual caching, and complex state management
  // AFTER: TanStack Query with automatic caching, background refetching, and optimistic updates
  //
  // Key improvements:
  // - Replaced per-tab data fetching with unified TanStack Query hooks
  // - Added optimistic updates for instant UI feedback
  // - Automatic cache invalidation across all tabs
  // - Real-time updates via WebSocket integration
  // - Enhanced error handling with retry logic
  // - Server-side pagination support
  // - Background refetching on window focus
  // - Improved loading states and error recovery

  // TANSTACK QUERY: Initialize TanStack Query client for cache management
  const queryClient = useQueryClient();

  // Initialize real-time cache sync via WebSocket
  useAutoWebSocketCacheSync();

  // TANSTACK QUERY: Replace custom data fetching with TanStack Query optimized hook
  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    attendanceRecords: dashboardAttendanceRecords,
    loading: dashboardLoading,
    error: dashboardError,
    // Unused but available: hasData, forceRefresh, isRefetching, queryStates, lastUpdated
  } = useOperatorDashboardData();

  // Initialize instant updates for optimistic UI feedback
  const {
    updateAppointmentInstantly,
    markPaymentPaidInstantly,
    reviewRejectionInstantly,
    autoCancelOverdueInstantly,
  } = useInstantUpdates();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Attendance state for operator's own check-in/check-out
  const {
    todayStatus,
    isCheckedIn,
    checkInTime,
    checkOutTime,
    checkInLoading,
    checkOutLoading,
    error: attendanceError,
    checkInError,
    checkOutError,
  } = useSelector((state) => state.attendance);

  // ✅ REFACTORED: Use common user utility for consistent user data handling
  const user = JSON.parse(localStorage.getItem("user")) || {}; // fallback if not present
  const userName = getUserDisplayName(user, "Operator");

  // Use shared Philippine time and greeting hook
  const { systemTime, greeting } = usePhilippineTime();

  // Set up sync event handlers to update Redux state
  useSyncEventHandlers();
  // URL search params for view persistence
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ ROBUST FILTERING: Validate URL parameters against allowed values
  const rawView = searchParams.get("view");
  const rawFilter = searchParams.get("filter");
  const rawPage = searchParams.get("page");

  const currentView = validateUrlParam(rawView, VALID_VIEW_VALUES, "rejected");
  const _currentFilter = validateUrlParam(
    rawFilter,
    VALID_FILTER_VALUES,
    "all"
  );
  const currentPage = Math.max(1, parseInt(rawPage || "1", 10));

  // Track validation warnings for user feedback
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Check for invalid URL parameters and warn user
  // OPTIMIZATION: useCallback for stable validation, and only update if changed
  const validateWarnings = useCallback(() => {
    const warnings = [];
    if (rawView && !VALID_VIEW_VALUES.includes(rawView)) {
      warnings.push(`Invalid view "${rawView}" reset to "rejected"`);
    }
    if (rawFilter && !VALID_FILTER_VALUES.includes(rawFilter)) {
      warnings.push(`Invalid filter "${rawFilter}" reset to "all"`);
    }
    return warnings;
  }, [rawView, rawFilter]);

  useEffect(() => {
    const newWarnings = validateWarnings();
    setValidationWarnings((prev) => {
      if (
        prev.length === newWarnings.length &&
        prev.every((w, i) => w === newWarnings[i])
      ) {
        return prev;
      }
      return newWarnings;
    });
  }, [validateWarnings]);

  // Fetch operator's attendance status on component mount
  useEffect(() => {
    dispatch(getTodayAttendanceStatus());
  }, [dispatch]);

  // ✅ STEP 1: Memoized view/filter/page setters with stable callbacks
  const setView = useCallback(
    (newView) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("view", newView);
      // Reset page when changing views
      newSearchParams.set("page", "1");
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams]
  );

  // Filter and page management
  const _setFilter = useCallback(
    (newFilter) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("filter", newFilter);
      newSearchParams.set("page", "1"); // Reset to first page
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const setPage = useCallback(
    (page) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("page", page.toString());
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams]
  );
  // Modal states - memoized to prevent unnecessary re-renders
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    appointmentId: null,
    rejectionReason: "",
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [autoCancelLoading, setAutoCancelLoading] = useState(false);
  // Payment verification modal state
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    appointmentId: null,
    appointmentDetails: null,
  });
  const [paymentData, setPaymentData] = useState({
    method: "cash",
    amount: "",
    notes: "",
    receiptFile: null,
    receiptHash: "",
    receiptUrl: "",
    isUploading: false,
    uploadError: "",
  });

  // Post-service material modal state
  const [materialModal, setMaterialModal] = useState({
    isOpen: false,
    appointmentId: null,
    materials: [],
    isSubmitting: false,
  });
  // Post-service material modal handlers
  const handleMaterialModalSubmit = async (materialStatus) => {
    setMaterialModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // Process each material's status
      for (const material of materialModal.materials) {
        const isEmpty = materialStatus[material.id];

        if (isEmpty !== undefined) {
          const response = await fetch(
            `/api/inventory/items/${material.id}/update_material_status/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              },
              body: JSON.stringify({
                is_empty: isEmpty,
                quantity: material.quantity_used,
                notes: `Post-service update for appointment #${materialModal.appointmentId}`,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to update material ${material.name}`);
          }
        }
      }

      // Success - close modal and show success message
      alert("Material status updated successfully!");
      setMaterialModal({
        isOpen: false,
        appointmentId: null,
        materials: [],
        isSubmitting: false,
      });
    } catch (error) {
      console.error("Error updating material status:", error);
      alert(`Error updating material status: ${error.message}`);
      setMaterialModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleMaterialModalClose = () => {
    setMaterialModal({
      isOpen: false,
      appointmentId: null,
      materials: [],
      isSubmitting: false,
    });
  };
  const {
    attendanceRecords,
    loading: attendanceLoading,
    selectedDate,
  } = useAttendanceRecords();

  const { setSelectedDate, forceRefreshAttendance } = useAttendanceActions(); // Driver coordination state
  const [driverAssignment, setDriverAssignment] = useState({
    availableDrivers: [],
    busyDrivers: [],
    pendingPickups: [],
  });

  // ✅ TANSTACK QUERY: Replace per-tab data fetching with unified TanStack Query approach
  const [paginationInfo, setPaginationInfo] = useState({
    count: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 8, // Server-side pagination with 8 items per page
    hasNext: false,
    hasPrevious: false,
  });

  // Helper function to get authentication token
  const getToken = () => localStorage.getItem("knoxToken");

  // Helper function to get the correct API base URL
  const getBaseURL = () => {
    if (import.meta.env.PROD) {
      return "https://charismatic-appreciation-production.up.railway.app/api";
    }
    return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  };

  // Enhanced fetch function with ad blocker protection and retry logic
  const enhancedFetch = useCallback(
    async (url, options = {}, retryCount = 0) => {
      const maxRetries = 2;

      try {
        // Create ad blocker friendly configuration
        const config = createAdBlockerFriendlyConfig({
          ...options,
          headers: {
            Authorization: `Token ${getToken()}`,
            ...options.headers,
          },
        });

        const response = await fetch(url, config);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`❌ Fetch error for ${url}:`, error);

        // Check if we should retry
        if (shouldRetryRequest(error, retryCount, maxRetries)) {
          const delay = getRetryDelay(retryCount);
          console.log(
            `🔄 Retrying request to ${url} in ${delay}ms (attempt ${
              retryCount + 1
            }/${maxRetries})`
          );

          await sleep(delay);
          return enhancedFetch(url, options, retryCount + 1);
        }

        // Provide user-friendly error messages
        const friendlyMessage = getUserFriendlyErrorMessage(error);

        if (isBlockedByClient(error)) {
          console.warn("🚫 Request blocked by ad blocker or browser extension");
          // Show user-friendly notification about ad blocker
          console.log(
            "💡 To fix this: Please check your ad blocker settings or try disabling extensions"
          );
        }

        // Re-throw with enhanced error information
        const enhancedError = new Error(friendlyMessage);
        enhancedError.originalError = error;
        enhancedError.isBlocked = isBlockedByClient(error);
        throw enhancedError;
      }
    },
    []
  );

  // ✅ TANSTACK QUERY: Individual tab data queries with server-side pagination
  const rejectedAppointmentsQuery = useQuery({
    queryKey: ["operator", "rejected", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/rejected/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );
    },
    enabled: currentView === "rejected",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  // ✅ SEPARATE QUERY: Always fetch rejection statistics for the overview
  const rejectionStatsQuery = useQuery({
    queryKey: ["operator", "rejection-stats"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/rejected/?page=1&page_size=100`
      );
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
  });

  const pendingAppointmentsQuery = useQuery({
    queryKey: ["operator", "pending", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/pending/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );
    },
    enabled: currentView === "pending",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const timeoutAppointmentsQuery = useQuery({
    queryKey: ["operator", "timeout", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/timeout/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );
    },
    enabled: currentView === "timeout",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const paymentAppointmentsQuery = useQuery({
    queryKey: ["operator", "payment", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      console.log("🔍 Fetching payment appointments...", {
        currentPage,
        pageSize: paginationInfo.pageSize,
        url: `${getBaseURL()}/scheduling/appointments/awaiting_payment/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`,
      });

      const result = await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/awaiting_payment/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );

      console.log("✅ Payment appointments result:", {
        hasResult: !!result,
        isArray: Array.isArray(result),
        hasResults: !!result?.results,
        resultsLength: result?.results?.length,
        directLength: Array.isArray(result) ? result.length : 0,
        result: result,
      });

      return result;
    },
    enabled: currentView === "payment",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const allAppointmentsQuery = useQuery({
    queryKey: ["operator", "all", currentPage],
    queryFn: async () => {
      // Always fetch directly from API for "All Appointments" to avoid pagination issues
      // This ensures we get consistent server-side pagination
      const token = getToken();
      if (!token) throw new Error("Authentication required");

      console.log("🔄 All Appointments Query: Fetching from API", {
        currentPage,
        pageSize: paginationInfo.pageSize,
        url: `${getBaseURL()}/scheduling/appointments/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`,
      });

      const result = await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );

      console.log("✅ All Appointments Query: API result", {
        hasResults: !!result?.results,
        resultsCount: result?.results?.length || 0,
        totalCount: result?.count || 0,
        totalPages: result?.total_pages || 0,
        currentPage: result?.current_page || 1,
        hasNext: result?.has_next || false,
        hasPrevious: result?.has_previous || false,
      });

      return result;
    },
    enabled: currentView === "all",
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const activeSessionsQuery = useQuery({
    queryKey: ["operator", "sessions", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/active_sessions/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );
    },
    enabled: currentView === "sessions",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const pickupRequestsQuery = useQuery({
    queryKey: ["operator", "pickup", currentPage],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/appointments/pickup_requests/?page=${currentPage}&page_size=${
          paginationInfo.pageSize
        }`
      );
    },
    enabled: currentView === "pickup",
    staleTime: 0,
    cacheTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const notificationsQuery = useQuery({
    queryKey: ["operator", "notifications", currentPage],
    queryFn: async () => {
      // Use the TanStack Query data when available
      if (notifications && notifications.length > 0) {
        return notifications;
      }

      // Fallback to direct API call
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      console.log("🔔 Fetching notifications...");
      const data = await enhancedFetch(
        `${getBaseURL()}/scheduling/notifications/?is_read=false`
      );
      console.log("🔔 Notifications fetched:", data);
      return data;
    },
    enabled: currentView === "notifications",
    staleTime: 0,
    cacheTime: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });

  const driverCoordinationQuery = useQuery({
    queryKey: ["operator", "driver"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Authentication required");
      return await enhancedFetch(
        `${getBaseURL()}/scheduling/staff/?role=driver`
      );
    },
    enabled: currentView === "driver",
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const workflowDataQuery = useQuery({
    queryKey: ["operator", "workflow"],
    queryFn: async () => {
      // Return mock workflow data with expected structure
      return {
        totalAppointments: appointments?.length || 0,
        inProgress:
          appointments?.filter((apt) => apt.status === "in_progress")?.length ||
          0,
        completed:
          appointments?.filter((apt) => apt.status === "completed")?.length ||
          0,
        workflows: [],
        todayAppointments: todayAppointments || [],
        activeSessions:
          appointments?.filter((apt) => apt.status === "session_started") || [],
        upcomingAppointments: upcomingAppointments || [],
      };
    },
    enabled: currentView === "workflow",
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // ✅ TANSTACK QUERY: Get current tab data and loading states
  const getCurrentTabQuery = () => {
    switch (currentView) {
      case "rejected":
        return rejectedAppointmentsQuery;
      case "pending":
        return pendingAppointmentsQuery;
      case "timeout":
        return timeoutAppointmentsQuery;
      case "payment":
        return paymentAppointmentsQuery;
      case "all":
        return allAppointmentsQuery;
      case "sessions":
        return activeSessionsQuery;
      case "pickup":
        return pickupRequestsQuery;
      case "notifications":
        return notificationsQuery;
      case "driver":
        return driverCoordinationQuery;
      case "workflow":
        return workflowDataQuery;
      default:
        return { data: null, isLoading: false, error: null };
    }
  };

  const currentTabQuery = getCurrentTabQuery();
  const tabData = currentTabQuery?.data;
  const tabLoading = currentTabQuery?.isLoading || false;
  const tabError = currentTabQuery?.error;
  // ✅ TANSTACK QUERY: Update pagination info when tab data changes
  useEffect(() => {
    console.log("🔍 Pagination Info Update - Debug:", {
      currentView,
      tabData: {
        exists: !!tabData,
        type: typeof tabData,
        isArray: Array.isArray(tabData),
        hasResults: !!tabData?.results,
        resultsLength: tabData?.results?.length,
        count: tabData?.count,
        totalPages: tabData?.total_pages,
        currentPage: tabData?.current_page,
        pageSize: tabData?.page_size,
        hasNext: tabData?.has_next,
        hasPrevious: tabData?.has_previous,
      },
    });

    if (tabData && typeof tabData === "object") {
      if (tabData.results && Array.isArray(tabData.results)) {
        // Paginated response from DRF
        const safeTotalPages = Math.max(1, tabData.total_pages || 1);
        const safeCount = Math.max(0, tabData.count || 0);
        const safeCurrentPage = Math.max(1, tabData.current_page || 1);
        const safePageSize = Math.max(1, tabData.page_size || 8);

        console.log("📄 Setting paginated pagination info:", {
          count: safeCount,
          totalPages: safeTotalPages,
          currentPage: safeCurrentPage,
          pageSize: safePageSize,
          hasNext: tabData.has_next || false,
          hasPrevious: tabData.has_previous || false,
        });

        setPaginationInfo({
          count: safeCount,
          totalPages: safeTotalPages,
          currentPage: safeCurrentPage,
          pageSize: safePageSize,
          hasNext: tabData.has_next || false,
          hasPrevious: tabData.has_previous || false,
        });
      } else if (Array.isArray(tabData)) {
        // Direct array response (for non-paginated views)
        const dataLength = tabData.length;
        console.log("📄 Setting array pagination info:", {
          count: dataLength,
          totalPages: 1,
          currentPage: 1,
          pageSize: Math.max(1, dataLength),
          hasNext: false,
          hasPrevious: false,
        });

        setPaginationInfo({
          count: dataLength,
          totalPages: 1,
          currentPage: 1,
          pageSize: Math.max(1, dataLength),
          hasNext: false,
          hasPrevious: false,
        });
      } else {
        // Other data types - set default pagination
        console.log("📄 Setting default pagination info for unknown data type");
        setPaginationInfo({
          count: 0,
          totalPages: 1,
          currentPage: 1,
          pageSize: 8,
          hasNext: false,
          hasPrevious: false,
        });
      }
    } else {
      // No data or null data
      console.log("📄 Setting empty pagination info");
      setPaginationInfo({
        count: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: 8,
        hasNext: false,
        hasPrevious: false,
      });
    }
  }, [tabData, currentView]);

  // ✅ TANSTACK QUERY: Refresh current tab data
  const refreshCurrentTab = useCallback(() => {
    console.log("� Refreshing current tab data via TanStack Query...");

    // Invalidate current tab query to trigger refetch
    queryClient.invalidateQueries(["operator", currentView]);

    // Also invalidate related dashboard data
    if (
      [
        "rejected",
        "pending",
        "timeout",
        "payment",
        "all",
        "sessions",
        "pickup",
      ].includes(currentView)
    ) {
      queryClient.invalidateQueries(queryKeys.appointments.all);
    }

    console.log("✅ Tab refresh completed");
  }, [currentView, queryClient]);

  // 🚀 ULTRA-PERFORMANCE: Optimized button loading management
  const { buttonLoading, setActionLoading, forceClearLoading } =
    useOptimizedButtonLoading(); // 🚀 ULTRA-PERFORMANCE: Simplified dashboard tabs without counts
  const dashboardTabs = useMemo(() => {
    return [
      { id: "rejected", label: "Rejection Reviews" },
      { id: "pending", label: "Pending Acceptance" },
      { id: "timeout", label: "Timeout Monitoring" },
      { id: "payment", label: "Payment Verification" },
      { id: "all", label: "All Appointments" },
      // { id: "notifications", label: "Notifications" }, // Removed as requested
      { id: "driver", label: "Driver Coordination" },
      { id: "workflow", label: "Service Workflow" },
      { id: "sessions", label: "Active Sessions" },
      { id: "pickup", label: "Pickup Requests" },
    ];
  }, []); // The optimized data manager handles background refreshes automatically
  // ✅ SIMPLIFIED: Remove unused timeout and driver variables since we're using per-tab data fetching
  // ✅ SIMPLIFIED: Basic driver data loading (if needed for driver tab)
  const loadDriverData = useCallback(async () => {
    if (currentView === "driver" && tabData) {
      // Process driver data from tabData if needed
      setDriverAssignment({
        availableDrivers: Array.isArray(tabData)
          ? tabData.filter((d) => d.status === "available")
          : [],
        busyDrivers: Array.isArray(tabData)
          ? tabData.filter((d) => d.status === "busy")
          : [],
        pendingPickups: [],
      });
    }
  }, [currentView, tabData]);
  // ✅ SIMPLIFIED: Load driver data when on driver tab
  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  // Listen for real-time driver updates via sync service
  useEffect(() => {
    const handleDriverUpdate = (data) => {
      if (currentView === "driver") {
        // Simple driver update handling
        console.log("Driver update received:", data);
        // Could refresh driver data here if needed
      }
    }; // Subscribe to driver-related events
    const unsubscribe = syncService.subscribe(
      "driver_update",
      handleDriverUpdate
    );
    return () => unsubscribe();
  }, [currentView]);

  // ✅ FIXED: Calculate rejection stats from rejection statistics query
  const tabStats = useMemo(() => {
    // Get rejection statistics from the dedicated rejection stats query
    const rejectedData = rejectionStatsQuery.data
      ? Array.isArray(rejectionStatsQuery.data)
        ? rejectionStatsQuery.data
        : rejectionStatsQuery.data?.results || []
      : [];

    if (Array.isArray(rejectedData)) {
      const totalRejections = rejectedData.length;
      const therapistRejections = rejectedData.filter(
        (apt) =>
          apt.rejection_reason &&
          apt.rejection_reason.toLowerCase().includes("therapist")
      ).length;
      const driverRejections = rejectedData.filter(
        (apt) =>
          apt.rejection_reason &&
          apt.rejection_reason.toLowerCase().includes("driver")
      ).length;
      const pendingReviews = rejectedData.filter(
        (apt) => apt.status === "rejected" && !apt.review_completed
      ).length;

      return {
        rejectionStats: {
          total: totalRejections,
          therapist: therapistRejections,
          driver: driverRejections,
          pending: pendingReviews,
        },
      };
    }

    return {
      rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
    };
  }, [rejectionStatsQuery.data]);

  // ✅ SIMPLIFIED: Create filtered data based on current tab data
  const processedTabData = useMemo(() => {
    console.log("🔍 Processing Tab Data:", {
      currentView,
      tabData: {
        exists: !!tabData,
        type: typeof tabData,
        isArray: Array.isArray(tabData),
        hasResults: !!tabData?.results,
        resultsLength: tabData?.results?.length,
        directArrayLength: Array.isArray(tabData)
          ? tabData.length
          : "not array",
      },
    });

    if (!tabData) {
      console.log("❌ No tabData available");
      return { appointments: [], filteredAppointments: [] };
    }

    // Handle paginated responses (DRF standard format)
    if (
      tabData &&
      typeof tabData === "object" &&
      tabData.results &&
      Array.isArray(tabData.results)
    ) {
      console.log(
        "✅ Processing paginated response:",
        tabData.results.length,
        "items"
      );
      return {
        appointments: tabData.results,
        filteredAppointments: tabData.results,
      };
    }

    // Handle direct arrays (non-paginated responses)
    if (Array.isArray(tabData)) {
      console.log(
        "✅ Processing direct array response:",
        tabData.length,
        "items"
      );

      // For appointment-based tabs, return the array directly
      if (
        currentView !== "attendance" &&
        currentView !== "notifications" &&
        currentView !== "driver" &&
        currentView !== "workflow"
      ) {
        return { appointments: tabData, filteredAppointments: tabData };
      }
    }

    // For non-appointment views (notifications, attendance, driver, workflow), return as-is
    console.log("✅ Processing non-appointment view data");
    return { appointments: tabData || [], filteredAppointments: tabData || [] };
  }, [tabData, currentView]);

  // Helper function to display therapist information (single or multiple)
  const renderTherapistInfo = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      return (
        <p>
          <strong>Therapists:</strong>{" "}
          {appointment.therapists_details.map((therapist, index) => (
            <span key={therapist.id}>
              {therapist.first_name} {therapist.last_name}
              {therapist.specialization && ` (${therapist.specialization})`}
              {index < appointment.therapists_details.length - 1 && ", "}
            </span>
          ))}
        </p>
      );
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return (
        <p>
          <strong>Therapist:</strong>{" "}
          {appointment.therapist_details?.first_name || "Unknown"}{" "}
          {appointment.therapist_details?.last_name || "Therapist"}
          {appointment.therapist_details?.specialization &&
            ` (${appointment.therapist_details.specialization})`}
        </p>
      );
    }

    return (
      <p>
        <strong>Therapist:</strong> No therapist assigned
      </p>
    );
  };
  // Helper function to get therapist acceptance status
  const getTherapistAcceptanceStatus = (appointment) => {
    // Handle multiple therapists
    if (
      appointment.therapists_details &&
      appointment.therapists_details.length > 0
    ) {
      const acceptedCount = appointment.therapists_details.filter(
        (_, index) =>
          appointment.therapists_accepted &&
          appointment.therapists_accepted[index]
      ).length;
      const totalCount = appointment.therapists_details.length;

      if (acceptedCount === totalCount) {
        return (
          <span className="acceptance-indicator accepted">All accepted ✓</span>
        );
      } else if (acceptedCount > 0) {
        return (
          <span className="acceptance-indicator partial">
            {acceptedCount}/{totalCount} accepted ⏳
          </span>
        );
      } else {
        return <span className="acceptance-indicator pending">Pending ⏳</span>;
      }
    }

    // Handle single therapist (legacy support)
    if (appointment.therapist_details) {
      return appointment.therapist_accepted ? (
        <span className="acceptance-indicator accepted">Accepted ✓</span>
      ) : (
        <span className="acceptance-indicator pending">Pending ⏳</span>
      );
    }

    return (
      <span className="acceptance-indicator no-therapist">No therapist</span>
    );
  };

  // Helper function to get urgency level for visual display
  const getUrgencyLevel = (appointment) => {
    // Only "pending" status appointments get urgency indicators
    if (appointment.status !== "pending") {
      return null;
    }

    if (!appointment.date || !appointment.start_time) {
      return "normal";
    }

    const now = new Date();
    const appointmentDateTime = new Date(
      `${appointment.date}T${appointment.start_time}`
    );
    const timeDiff = appointmentDateTime - now;
    const minutesUntilAppointment = timeDiff / (1000 * 60);

    // Time-based urgency calculation for pending appointments only
    // - Appointments starting in < 30 minutes: Critical
    // - Appointments starting in < 1 hour and 20 minutes: High
    // - Appointments starting in <= 2 hours and 20 minutes: Medium
    // - Appointments starting in > 2 hours and 20 minutes: Normal

    if (minutesUntilAppointment <= 30) {
      return "critical";
    } else if (minutesUntilAppointment <= 80) {
      // 1 hour 20 minutes
      return "high";
    } else if (minutesUntilAppointment <= 140) {
      // 2 hours 20 minutes
      return "medium";
    } else {
      return "normal";
    }
  };

  // Helper function to get urgency badge
  const _getUrgencyBadge = (urgencyLevel) => {
    const badges = {
      critical: {
        icon: "🚨",
        label: "Critical",
        className: "urgency-critical",
      },
      high: { icon: "🔥", label: "High", className: "urgency-high" },
      medium: { icon: "⚠️", label: "Medium", className: "urgency-medium" },
      normal: { icon: "⚪", label: "Normal", className: "urgency-normal" },
    };
    return badges[urgencyLevel] || badges.normal;
  };

  const handleLogout = () => {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/");
  };

  const handleReviewRejection = (appointment) => {
    setReviewModal({
      isOpen: true,
      appointmentId: appointment.id,
      rejectionReason: appointment.rejection_reason || "",
    });
    setReviewNotes("");
  };
  const handleReviewSubmit = async (decision) => {
    const actionKey = `review_${reviewModal.appointmentId}_${decision}`;
    try {
      setActionLoading(actionKey, true);

      // ✅ TANSTACK QUERY: Use optimistic updates for instant UI feedback
      await reviewRejectionInstantly(
        reviewModal.appointmentId,
        decision,
        reviewNotes
      );

      // Auto-invalidate current tab data
      await queryClient.invalidateQueries(["operator", currentView]);

      setReviewModal({
        isOpen: false,
        appointmentId: null,
        rejectionReason: "",
      });
      setReviewNotes("");
    } catch (error) {
      console.error("Failed to review rejection:", error);
      alert("Failed to review rejection. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };
  const handleReviewCancel = () => {
    setReviewModal({ isOpen: false, appointmentId: null, rejectionReason: "" });
    setReviewNotes("");
  };
  const handleAutoCancelOverdue = async () => {
    if (
      !window.confirm(
        "This will auto-cancel all overdue appointments and disable therapists who didn't respond. Continue?"
      )
    ) {
      return;
    }

    setAutoCancelLoading(true);
    try {
      // ✅ TANSTACK QUERY: Use optimistic updates for instant UI feedback
      await autoCancelOverdueInstantly();

      // Auto-invalidate all related data
      await Promise.all([
        queryClient.invalidateQueries(["operator"]),
        queryClient.invalidateQueries(queryKeys.appointments.all),
      ]);

      alert("Successfully processed overdue appointments");
    } catch (error) {
      console.error("Failed to process overdue appointments:", error);
      alert("Failed to process overdue appointments. Please try again.");
    } finally {
      setAutoCancelLoading(false);
    }
  };
  const _handleStartAppointment = async (appointmentId) => {
    const actionKey = `start_${appointmentId}`;
    try {
      setActionLoading(actionKey, true);

      // Validate appointmentId before proceeding
      if (!appointmentId || appointmentId === "undefined") {
        throw new Error("Invalid appointment ID provided");
      }

      // ✅ TANSTACK QUERY: Use optimistic updates for instant UI feedback
      await updateAppointmentInstantly(appointmentId, {
        status: "in_progress",
        action: "start_appointment",
      });

      // Auto-invalidate current tab data
      await queryClient.invalidateQueries(["operator", currentView]);
    } catch (error) {
      console.error("Failed to start appointment:", error);

      // Better error messaging
      let errorMessage = "Failed to start appointment. Please try again.";
      if (error.message && error.message.includes("Invalid appointment ID")) {
        errorMessage =
          "Invalid appointment selected. Please refresh the page and try again.";
      } else if (
        error.message &&
        error.message !== "Failed to start appointment"
      ) {
        errorMessage = `Failed to start appointment: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setActionLoading(actionKey, false);
    }
  }; // Payment verification handler
  const handlePaymentVerification = (appointment) => {
    // Calculate total amount from services with proper number handling
    const totalAmount =
      appointment?.services_details?.reduce((total, service) => {
        const price = Number(service.price) || 0;
        return total + price;
      }, 0) || 0;

    setPaymentModal({
      isOpen: true,
      appointmentId: appointment.id,
      appointmentDetails: appointment,
    });
    setPaymentData({
      method: "cash",
      amount: Math.round(totalAmount).toString(), // Round to nearest whole number
      notes: "",
    });
  };
  const handleMarkPaymentPaid = async () => {
    const actionKey = `payment_${paymentModal.appointmentId}`;

    console.log("🔍 handleMarkPaymentPaid: Starting with data:", {
      actionKey,
      appointmentId: paymentModal.appointmentId,
      paymentData,
      currentButtonLoading: buttonLoading[actionKey],
    });

    // Validate payment data
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      console.log(
        "❌ handleMarkPaymentPaid: Invalid payment amount",
        paymentData.amount
      );
      alert("Please enter a valid payment amount (whole numbers only).");
      return;
    }

    try {
      console.log(
        "🔄 handleMarkPaymentPaid: Setting loading state to true for",
        actionKey
      );
      setActionLoading(actionKey, true);

      // Safety timeout to clear loading state after 30 seconds
      const safetyTimeout = setTimeout(() => {
        console.log(
          "🚨 handleMarkPaymentPaid: Safety timeout triggered, clearing loading state"
        );
        forceClearLoading(actionKey);
      }, 30000);

      // Pass the appointment ID as a number, not an object
      const appointmentId = parseInt(paymentModal.appointmentId, 10);

      // Ensure payment amount is properly formatted as a number
      const processedPaymentData = {
        ...paymentData,
        amount: parseFloat(paymentData.amount) || 0, // Ensure it's a number
      };

      console.log(
        "🔍 handleMarkPaymentPaid: Using optimistic payment verification",
        {
          appointmentId,
          originalPaymentData: paymentData,
          processedPaymentData,
          actionKey,
        }
      );

      // ✅ TANSTACK QUERY: Use optimistic updates for instant UI feedback
      await markPaymentPaidInstantly(appointmentId, processedPaymentData);

      console.log("✅ handleMarkPaymentPaid: Payment verification successful");

      // Clear the safety timeout since operation completed successfully
      clearTimeout(safetyTimeout);

      // Auto-invalidate current tab data
      await queryClient.invalidateQueries(["operator", currentView]);

      // Close modal and refresh data
      setPaymentModal({
        isOpen: false,
        appointmentId: null,
        appointmentDetails: null,
      });
      setPaymentData({
        method: "cash",
        amount: "",
        notes: "",
        receiptFile: null,
        receiptHash: "",
        receiptUrl: "",
        isUploading: false,
        uploadError: "",
      });
      console.log(
        "✅ handleMarkPaymentPaid: TanStack Query handles cache refresh automatically"
      );

      alert("Payment marked as received successfully!");
    } catch (error) {
      console.error("❌ handleMarkPaymentPaid: Error occurred:", error);

      // Show more detailed error information
      const errorMessage =
        error?.message || error?.error || error || "Unknown error occurred";
      alert(`Failed to mark payment as paid: ${errorMessage}`);
    } finally {
      console.log(
        "🔄 handleMarkPaymentPaid: Setting loading state to false for",
        actionKey
      );
      setActionLoading(actionKey, false);

      // Add a small delay to ensure state update completes
      setTimeout(() => {
        console.log("🔍 handleMarkPaymentPaid: Loading state after cleanup:", {
          actionKey,
          isLoading: buttonLoading[actionKey],
        });
      }, 100);
    }
  };
  const handlePaymentModalCancel = () => {
    // Clear any payment-related loading states when modal is cancelled
    const appointmentId = paymentModal.appointmentId;
    if (appointmentId) {
      const paymentActionKey = `payment_${appointmentId}`;
      console.log(
        "🔄 handlePaymentModalCancel: Clearing loading state for",
        paymentActionKey
      );
      setActionLoading(paymentActionKey, false);
    }

    setPaymentModal({
      isOpen: false,
      appointmentId: null,
      appointmentDetails: null,
    });
    setPaymentData({
      method: "cash",
      amount: "",
      notes: "",
      receiptFile: null,
      receiptHash: "",
      receiptUrl: "",
      isUploading: false,
      uploadError: "",
    });
  };

  // Handle receipt file upload
  const handleReceiptFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Show loading state
      setPaymentData((prev) => ({
        ...prev,
        isUploading: true,
        uploadError: "",
      }));

      // Import the receipt service
      const { receiptService } = await import("../services/receiptService");

      // Upload receipt and get hash
      const appointmentId = parseInt(paymentModal.appointmentId, 10);
      const result = await receiptService.uploadGCashReceipt(
        file,
        appointmentId
      );

      console.log("✅ Receipt uploaded successfully:", result);

      // Update payment data with receipt information
      setPaymentData((prev) => ({
        ...prev,
        receiptFile: file,
        receiptHash: result.hash,
        receiptUrl: result.publicUrl,
        isUploading: false,
      }));
    } catch (error) {
      console.error("❌ Receipt upload failed:", error);
      setPaymentData((prev) => ({
        ...prev,
        isUploading: false,
        uploadError: error.message || "Failed to upload receipt",
      }));
    }
  }; // Driver coordination functions - Pure FIFO system (no proximity filtering)
  const handleAssignDriverPickup = useCallback(
    async (therapistId, driverId = null) => {
      // Helper function to get urgency level based on request time
      const getUrgencyLevel = (requestTime) => {
        if (!requestTime) return "normal";
        const waitTime = (new Date() - new Date(requestTime)) / (1000 * 60); // minutes
        return waitTime > 20 ? "urgent" : "normal"; // Reduced to 20 minutes for Pasig City
      };
      try {
        // Get current pending pickup requests from appointments
        const currentPendingPickups = (tabData || [])
          .filter((apt) => apt.status === "pickup_requested")
          .map((apt) => ({
            id: apt.therapist,
            name: apt.therapist_details
              ? `${apt.therapist_details?.first_name || "Unknown"} ${
                  apt.therapist_details?.last_name || "Therapist"
                }`
              : "Unknown Therapist",
            location: apt.location,
            appointment_id: apt.id,
            urgency: getUrgencyLevel(apt.pickup_request_time),
            session_end_time: apt.session_end_time,
            requested_at: apt.pickup_request_time,
          }));

        const therapist = currentPendingPickups.find(
          (t) => t.id === therapistId
        );

        if (!therapist) {
          alert("Invalid therapist selection");
          return;
        }

        // Pure FIFO driver selection - get the driver who became available first
        let driver;
        if (driverId) {
          // Manual assignment: use specific driver
          driver = driverAssignment.availableDrivers.find(
            (d) => d.id === driverId
          );
        } else {
          // Auto-assignment: Pure FIFO - first available driver based on last drop-off or availability time
          const availableDriversSorted = driverAssignment.availableDrivers.sort(
            (a, b) => {
              // Use last_drop_off_time if available, otherwise use available_since
              const timeA = new Date(
                a.last_drop_off_time || a.last_available_at || a.available_since
              );
              const timeB = new Date(
                b.last_drop_off_time || b.last_available_at || b.available_since
              );
              return timeA - timeB;
            }
          );
          driver = availableDriversSorted[0];

          // Show FIFO selection details
          const queuePosition =
            availableDriversSorted.findIndex((d) => d.id === driver.id) + 1;
          console.log(
            `🎯 FIFO Assignment: Selected driver ${driver.first_name} ${driver.last_name} (Position #${queuePosition} in queue)`
          );
        }
        if (!driver) {
          alert("No drivers available for assignment");
          return;
        }

        // Fixed estimated arrival time - no proximity calculations
        const estimatedTime = 20; // Standard 20 minutes for all assignments
        const estimatedArrival = new Date();
        estimatedArrival.setMinutes(
          estimatedArrival.getMinutes() + estimatedTime
        );

        // Calculate queue position for detailed FIFO information
        const sortedDrivers = driverAssignment.availableDrivers.sort((a, b) => {
          const timeA = new Date(
            a.last_drop_off_time || a.last_available_at || a.available_since
          );
          const timeB = new Date(
            b.last_drop_off_time || b.last_available_at || b.available_since
          );
          return timeA - timeB;
        });
        const queuePosition =
          sortedDrivers.findIndex((d) => d.id === driver.id) + 1;

        // Update appointment status with detailed FIFO information
        await dispatch(
          updateAppointmentStatus({
            id: therapist.appointment_id,
            status: "driver_assigned_pickup",
            driver: driver.id,
            notes: `Driver assigned for pickup via FIFO Algorithm (Queue Position: #${queuePosition}) - ETA: ${estimatedTime} minutes`,
          })
        ).unwrap();

        // Move driver from available to busy
        setDriverAssignment((prev) => ({
          ...prev,
          availableDrivers: prev.availableDrivers.filter(
            (d) => d.id !== driver.id
          ),
          busyDrivers: [
            ...prev.busyDrivers.filter((d) => d.id !== driver.id),
            {
              ...driver,
              current_task: `Picking up ${therapist.name}`,
              current_location: `En route to ${therapist.location}`,
            },
          ],
          pendingPickups: prev.pendingPickups.filter(
            (t) => t.id !== therapistId
          ),
        }));

        // Broadcast assignment with FIFO indicator
        syncService.broadcast("driver_assigned_pickup", {
          driver_id: driver.id,
          therapist_id: therapistId,
          appointment_id: therapist.appointment_id,
          estimated_arrival: estimatedArrival.toISOString(),
          driver_name: `${driver.first_name} ${driver.last_name}`,
          therapist_name: therapist.name,
          pickup_location: therapist.location,
          estimated_time: estimatedTime,
          assignment_method: "FIFO",
        }); // ✅ PERFORMANCE FIX: Use targeted refresh instead of global forceRefresh
        refreshCurrentTab();

        // Show success notification with FIFO details
        alert(
          `✅ FIFO Assignment Successful!\n\nDriver: ${driver.first_name} ${driver.last_name}\nQueue Position: #${queuePosition}\nTherapist: ${therapist.name}\nLocation: ${therapist.location}\nETA: ${estimatedTime} minutes`
        );
      } catch (error) {
        console.error("Failed to assign driver:", error);
        alert("Failed to assign driver. Please try again.");
      }
    },
    [
      dispatch,
      setDriverAssignment,
      refreshCurrentTab,
      driverAssignment.availableDrivers,
      tabData,
    ]
  );
  const _handleUrgentPickupRequest = async (therapistId) => {
    try {
      // For urgent requests, still use FIFO but assign immediately
      const availableDrivers = driverAssignment.availableDrivers;

      if (availableDrivers.length === 0) {
        alert("No drivers currently available for urgent pickup");
        return;
      }

      // Pure FIFO - use first available driver regardless of location
      const firstAvailableDriver = availableDrivers.sort(
        (a, b) => new Date(a.available_since) - new Date(b.available_since)
      )[0];

      await handleAssignDriverPickup(therapistId, firstAvailableDriver.id);
    } catch (error) {
      console.error("Failed to process urgent pickup request:", error);
      alert("Failed to process urgent pickup request");
    }
  };

  const _getTimeElapsed = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  };
  // Helper functions for FIFO coordination
  const _getDriverFIFOPosition = (driver) => {
    const sorted = driverAssignment.availableDrivers.sort(
      (a, b) => new Date(a.available_since) - new Date(b.available_since)
    );
    return sorted.findIndex((d) => d.id === driver.id) + 1;
  };
  // Smart FIFO auto-assignment function
  const handleAutoAssignPickupRequest = useCallback(
    async (pickupRequest) => {
      try {
        console.log(
          "🤖 Auto-assigning pickup request using FIFO:",
          pickupRequest
        );

        // Get available drivers sorted by FIFO (earliest available first)
        const availableDrivers = driverAssignment.availableDrivers
          .filter((driver) => driver.status === "available")
          .sort((a, b) => {
            const timeA = new Date(a.last_available_at || a.available_since);
            const timeB = new Date(b.last_available_at || b.available_since);
            return timeA - timeB; // Earliest first (FIFO)
          });

        if (availableDrivers.length === 0) {
          console.log("❌ No drivers available for auto-assignment");
          return false;
        }

        // Get the first available driver (FIFO)
        const nextDriver = availableDrivers[0];

        console.log(
          `✅ Auto-assigning driver ${nextDriver.first_name} ${nextDriver.last_name} (FIFO position: 1)`
        );

        // Auto-assign the driver
        await handleAssignDriverPickup(
          pickupRequest.therapist_id,
          nextDriver.id
        );

        // Broadcast auto-assignment notification
        syncService.broadcast("auto_assignment_completed", {
          pickup_request: pickupRequest,
          assigned_driver: nextDriver,
          assignment_method: "FIFO",
          assignment_time: new Date().toISOString(),
          message: `Driver ${nextDriver.first_name} ${nextDriver.last_name} auto-assigned via FIFO`,
        });

        return true;
      } catch (error) {
        console.error("Failed to auto-assign pickup request:", error);
        return false;
      }
    },
    [driverAssignment.availableDrivers, handleAssignDriverPickup]
  );
  // Listen for pickup requests and auto-assign drivers
  useEffect(() => {
    const handlePickupRequest = async (data) => {
      console.log("🚖 Pickup request received:", data);

      // Auto-assign driver if available
      if (data.therapist_id) {
        const assigned = await handleAutoAssignPickupRequest({
          therapist_id: data.therapist_id,
          appointment_id: data.appointment_id,
          location: data.location,
          urgency: data.pickup_urgency || "normal",
          timestamp: data.timestamp,
        });

        if (assigned) {
          // Notify therapist that driver has been assigned
          syncService.broadcast("pickup_auto_assigned", {
            therapist_id: data.therapist_id,
            appointment_id: data.appointment_id,
            assignment_method: "auto_fifo",
            message: "Driver automatically assigned for pickup",
          });
        }
      }
    };

    // Subscribe to pickup request events
    const unsubscribePickup = syncService.subscribe(
      "pickup_requested",
      handlePickupRequest
    );

    return () => {
      unsubscribePickup();
    };
  }, [handleAutoAssignPickupRequest]); // Re-subscribe when auto-assignment function changes
  // ✅ PERFORMANCE FIX: Use optimized attendance refresh instead of manual fetch
  const handleFetchAttendanceRecords = useCallback(async () => {
    try {
      await forceRefreshAttendance(selectedDate);
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
    }
  }, [forceRefreshAttendance, selectedDate]);

  const handleApproveAttendance = async (attendanceId) => {
    const actionKey = `approve_${attendanceId}`;
    try {
      setActionLoading(actionKey, true);
      await dispatch(approveAttendance(attendanceId)).unwrap();

      // ✅ TANSTACK QUERY: Invalidate attendance-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance", "records"] }),
        queryClient.invalidateQueries({ queryKey: ["operator", "attendance"] }),
      ]);

      // Refresh attendance records
      await handleFetchAttendanceRecords();
    } catch (error) {
      console.error("Failed to approve attendance:", error);
      alert("Failed to approve attendance. Please try again.");
    } finally {
      setActionLoading(actionKey, false);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Operator's check-in/check-out handlers
  const handleOperatorCheckIn = () => {
    dispatch(checkIn());
  };

  const handleOperatorCheckOut = () => {
    dispatch(checkOut());
  };

  // Format time for display
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return "--:--";

    try {
      // If it's already a full datetime string, parse it directly
      if (timeString.includes("T") || timeString.includes(" ")) {
        return new Date(timeString).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's just a time string (HH:MM:SS), create a proper date
      const [hours, minutes] = timeString.split(":").map(Number);
      const today = new Date();
      const dateTime = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes
      );
      return dateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", timeString, error);
      return timeString;
    }
  };

  // ✅ PERFORMANCE FIX: No need to manually fetch on tab switch - data is cached
  // The useOptimizedAttendance hook automatically handles data fetching and caching
  // Remove the effect that was causing unnecessary refetches

  // Render attendance management view
  const renderAttendanceView = () => {
    const getStatusColor = (status) => {
      switch (status) {
        case "present":
          return "#28a745";
        case "late":
          return "#ffc107";
        case "absent":
          return "#dc3545";
        case "pending_approval":
          return "#007bff";
        default:
          return "#6c757d";
      }
    };

    const getStatusBadge = (status) => {
      const configs = {
        present: { icon: "✅", label: "Present" },
        late: { icon: "⏰", label: "Late" },
        absent: { icon: "❌", label: "Absent" },
        pending_approval: { icon: "⏳", label: "Pending Approval" },
      };
      const config = configs[status] || { icon: "❓", label: "Unknown" };
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: getStatusColor(status),
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {config.icon} {config.label}
        </span>
      );
    };
    const formatTime = (timeString) => {
      if (!timeString) return "--:--";

      // If it's already a full datetime string, parse it directly
      if (timeString.includes("T") || timeString.includes(" ")) {
        return new Date(timeString).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }

      // If it's just a time string (HH:MM:SS), create a proper date
      try {
        const [hours, minutes, seconds] = timeString.split(":").map(Number);

        // Validate the time components
        if (
          isNaN(hours) ||
          isNaN(minutes) ||
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59
        ) {
          console.error("Invalid time format:", timeString);
          return timeString; // Return original string if invalid
        }

        const today = new Date();
        const dateTime = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          seconds || 0
        );
        return dateTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch (error) {
        console.error("Error formatting time:", timeString, error);
        return timeString; // Return original string on error
      }
    };

    return (
      <div className="attendance-management-panel">
        <div className="attendance-header">
          <div className="date-selector">
            <label htmlFor="attendance-date">Select Date:</label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="date-input"
            />
            <LoadingButton
              onClick={handleFetchAttendanceRecords}
              loading={attendanceLoading}
              className="refresh-btn"
            >
              Refresh
            </LoadingButton>
          </div>

          {/* Operator's own attendance controls */}
          <div className="operator-attendance-controls">
            <div className="operator-attendance-status">
              <span className="operator-status-label">My Attendance:</span>
              {todayStatus ? (
                <div className="operator-times">
                  <span className="check-time">
                    In:{" "}
                    {checkInTime ? formatTimeForDisplay(checkInTime) : "--:--"}
                  </span>
                  <span className="check-time">
                    Out:{" "}
                    {checkOutTime
                      ? formatTimeForDisplay(checkOutTime)
                      : "--:--"}
                  </span>
                </div>
              ) : (
                <span className="no-record">No record today</span>
              )}
            </div>

            {/* Error display */}
            {(attendanceError || checkInError || checkOutError) && (
              <div
                className="attendance-error"
                style={{
                  color: "#dc3545",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                {attendanceError || checkInError || checkOutError}
              </div>
            )}

            <div className="operator-attendance-buttons">
              <LoadingButton
                onClick={handleOperatorCheckIn}
                loading={checkInLoading}
                disabled={isCheckedIn}
                className="check-in-btn"
                size="small"
              >
                {isCheckedIn ? "Checked In" : "Check In"}
              </LoadingButton>
              <LoadingButton
                onClick={handleOperatorCheckOut}
                loading={checkOutLoading}
                disabled={!isCheckedIn || !!checkOutTime}
                className="check-out-btn"
                size="small"
              >
                {checkOutTime ? "Checked Out" : "Check Out"}
              </LoadingButton>
            </div>
          </div>
        </div>

        {/* Minimal loading indicator for attendance data */}
        <MinimalLoadingIndicator
          show={attendanceLoading}
          position="center-right"
          size="micro"
          variant="ghost"
          tooltip="Loading attendance records..."
          pulse={true}
          fadeIn={true}
        />

        {attendanceRecords.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-check"></i>
            <p>No attendance records found for {selectedDate}</p>
          </div>
        ) : (
          <div className="attendance-records">
            <div className="attendance-summary">
              <div className="summary-stats">
                <div className="stat-card present">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "present")
                        .length
                    }
                  </span>
                  <span className="stat-label">Present</span>
                </div>
                <div className="stat-card late">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "late")
                        .length
                    }
                  </span>
                  <span className="stat-label">Late</span>
                </div>
                <div className="stat-card absent">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter((r) => r.status === "absent")
                        .length
                    }
                  </span>
                  <span className="stat-label">Absent</span>
                </div>
                <div className="stat-card pending">
                  <span className="stat-number">
                    {
                      attendanceRecords.filter(
                        (r) => r.status === "pending_approval"
                      ).length
                    }
                  </span>
                  <span className="stat-label">Pending Approval</span>
                </div>
              </div>
            </div>

            <div className="attendance-list">
              {attendanceRecords.map((record) => (
                <div key={record.id} className="attendance-card">
                  <div className="attendance-info">
                    <div className="staff-details">
                      <h4>
                        {record.staff_member.first_name}{" "}
                        {record.staff_member.last_name}
                      </h4>
                      <span className="role-badge">
                        {record.staff_member.role}
                      </span>
                    </div>
                    <div className="time-details">
                      <div className="time-row">
                        <span className="label">Check-in:</span>
                        <span className="value">
                          {record.check_in_time
                            ? formatTime(record.check_in_time)
                            : "Not checked in"}
                        </span>
                      </div>
                      <div className="time-row">
                        <span className="label">Check-out:</span>
                        <span className="value">
                          {record.check_out_time
                            ? formatTime(record.check_out_time)
                            : "Not checked out"}
                        </span>
                      </div>
                      {record.hours_worked && (
                        <div className="time-row">
                          <span className="label">Hours worked:</span>
                          <span className="value">{record.hours_worked}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="attendance-status">
                    {getStatusBadge(record.status)}
                    {record.status === "pending_approval" && (
                      <LoadingButton
                        onClick={() => handleApproveAttendance(record.id)}
                        loading={buttonLoading[`approve_${record.id}`]}
                        className="approve-btn"
                        size="small"
                      >
                        Approve
                      </LoadingButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="attendance-guidelines">
          <h4>Attendance Rules</h4>
          <ul>
            <li>
              <strong>Present:</strong> Check-in before 1:15 PM
            </li>
            <li>
              <strong>Late:</strong> Check-in after 1:15 PM but before 1:30 AM
              (next day)
            </li>
            <li>
              <strong>Absent:</strong> No check-in recorded by 1:30 AM (next
              day)
            </li>
            <li>
              <strong>Pending Approval:</strong> Requires operator review
            </li>
          </ul>
        </div>
      </div>
    );
  };

  // ✅ PERFORMANCE: Old implementations removed - using ultra-optimized versions above

  // Helper functions for status badge mapping
  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "status-pending",
      confirmed: "status-confirmed",
      driver_confirmed: "status-confirmed",
      therapist_confirmed: "status-confirmed",
      rejected: "status-rejected",
      cancelled: "status-cancelled",
      auto_cancelled: "status-overdue",
      completed: "status-completed",
      in_progress: "status-confirmed",
      awaiting_payment: "status-warning",
      pickup_requested: "status-pending",
      overdue: "status-overdue",
      timeout: "status-overdue",
      journey_started: "status-confirmed",
      arrived: "status-confirmed",
      dropped_off: "status-confirmed",
      session_started: "status-confirmed",
      payment_requested: "status-warning",
      payment_completed: "status-completed",
    };

    return statusMap[status] || "status-pending";
  };
  const getStatusDisplayText = (status) => {
    // Debug logging
    console.log("📊 Status badge debug - Input status:", status);
    console.log("📊 Status badge debug - Type:", typeof status);
    console.log("📊 Status badge debug - Is undefined?", status === undefined);
    console.log("📊 Status badge debug - Is null?", status === null);
    console.log("📊 Status badge debug - Is empty string?", status === "");

    const statusTextMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      driver_confirmed: "Driver Confirmed",
      therapist_confirmed: "Therapist Confirmed",
      rejected: "Rejected",
      cancelled: "Cancelled",
      auto_cancelled: "Auto Cancelled",
      completed: "Completed",
      in_progress: "In Progress",
      awaiting_payment: "Awaiting Payment",
      pickup_requested: "Pickup Requested",
      overdue: "Overdue",
      timeout: "Timeout",
      journey_started: "Journey Started",
      arrived: "Arrived",
      dropped_off: "Dropped Off",
      session_started: "Session Started",
      payment_requested: "Payment Requested",
      payment_completed: "Payment Completed",
    };

    const result =
      statusTextMap[status] ||
      status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, " ") ||
      "Unknown Status";

    console.log("📊 Status badge debug - Output text:", result);
    console.log("📊 Status badge debug - Result length:", result.length);
    return result;
  };

  // ✅ STANDARDIZED APPOINTMENT CARD RENDERING
  // All appointment rendering functions now use consistent structure:
  // - .appointment-card container with urgency level classes
  // - .appointment-header with <h3> client name and .status-badges container
  // - .appointment-details with <p><strong>Label:</strong> value</p> format
  // - .appointment-actions for action buttons
  // - Consistent urgency badges and operator-specific information preserved

  const renderRejectedAppointments = () => {
    // ✅ FIXED: Use rejected appointments query data directly
    const rejectedAppointments = rejectedAppointmentsQuery.data
      ? Array.isArray(rejectedAppointmentsQuery.data)
        ? rejectedAppointmentsQuery.data
        : rejectedAppointmentsQuery.data?.results || []
      : [];

    if (!rejectedAppointments || rejectedAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-times-circle"></i>
          <p>No rejected appointments to review</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {rejectedAppointments.map((appointment) => {
          const urgencyLevel = getUrgencyLevel(appointment);
          const status = appointment.status || "";

          return (
            <div
              key={appointment.id}
              className={`appointment-card rejected ${urgencyLevel}`}
            >
              <div className="appointment-header">
                <h3>
                  Appointment #{appointment.id} -{" "}
                  {appointment.client_details?.first_name || "Unknown"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h3>
                <div className="status-badges">
                  <StatusDropdown
                    appointment={appointment}
                    currentStatus={status}
                    isOperator={true}
                    onStatusChange={(newStatus, updatedAppointment) => {
                      console.log(
                        `Status changed to ${newStatus} for appointment ${updatedAppointment?.id}`
                      );
                    }}
                  />
                  {urgencyLevel && urgencyLevel !== "normal" && (
                    <span className={`urgency-badge urgency-${urgencyLevel}`}>
                      {urgencyLevel.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Date:</strong>{" "}
                  {appointment.date
                    ? new Date(appointment.date).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                  {appointment.end_time || "N/A"}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location || "N/A"}
                </p>
                {renderTherapistInfo(appointment)}

                <div className="acceptance-status">
                  <strong>Acceptance Status:</strong>{" "}
                  {getTherapistAcceptanceStatus(appointment)}
                </div>

                {appointment.rejection_reason && (
                  <div className="rejection-reason">
                    <strong>Rejection Reason:</strong>
                    <p>{appointment.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="appointment-actions">
                <LoadingButton
                  onClick={() => handleReviewRejection(appointment)}
                  className="review-button"
                >
                  Review Rejection
                </LoadingButton>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const renderPendingAcceptanceAppointments = () => {
    // ✅ FIXED: Use pending appointments query data directly
    const pendingAppointments = pendingAppointmentsQuery.data
      ? Array.isArray(pendingAppointmentsQuery.data)
        ? pendingAppointmentsQuery.data
        : pendingAppointmentsQuery.data?.results || []
      : [];

    if (!pendingAppointments || pendingAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-clock"></i>
          <p>No appointments pending acceptance</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        <div className="appointments-container">
          {pendingAppointments.map((appointment) => {
            const urgencyLevel = getUrgencyLevel(appointment);
            const status = appointment.status || "";
            const acceptanceStatus = getTherapistAcceptanceStatus(appointment);

            return (
              <div
                key={appointment.id}
                className={`appointment-card pending ${urgencyLevel}`}
              >
                <div className="appointment-header">
                  <h3>
                    Appointment #{appointment.id} -{" "}
                    {appointment.client_details?.first_name || "Unknown"}{" "}
                    {appointment.client_details?.last_name || ""}
                  </h3>
                  <div className="status-badges">
                    <StatusDropdown
                      appointment={appointment}
                      currentStatus={status}
                      isOperator={true}
                      onStatusChange={(newStatus, updatedAppointment) => {
                        console.log(
                          `Status changed to ${newStatus} for appointment ${updatedAppointment?.id}`
                        );
                      }}
                    />
                    {urgencyLevel && urgencyLevel !== "normal" && (
                      <span className={`urgency-badge urgency-${urgencyLevel}`}>
                        {urgencyLevel.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="appointment-details">
                  <p>
                    <strong>Date:</strong>{" "}
                    {appointment.date
                      ? new Date(appointment.date).toLocaleDateString()
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                    {appointment.end_time || "N/A"}
                  </p>
                  <p>
                    <strong>Location:</strong> {appointment.location || "N/A"}
                  </p>
                  {renderTherapistInfo(appointment)}

                  <div className="acceptance-status">
                    <strong>Acceptance Status:</strong> {acceptanceStatus}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Server-side Pagination */}
        <ServerPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          hasNext={paginationInfo.hasNext}
          hasPrevious={paginationInfo.hasPrevious}
          onPageChange={setPage}
          className="appointments-pagination"
        />
      </div>
    );
  };
  const renderTimeoutMonitoring = () => {
    const timeoutData =
      currentView === "timeout" && Array.isArray(tabData) ? tabData : [];
    const overdueAppointments = timeoutData;
    const approachingDeadlineAppointments = []; // Can be filtered from the same data if needed

    const overdueCount = overdueAppointments.length;
    const approachingCount = approachingDeadlineAppointments.length;

    return (
      <div className="timeout-monitoring-panel">
        {/* Auto-cancel controls */}
        <div className="timeout-controls">
          <h3>Automatic Actions</h3>
          <div className="auto-cancel-section">
            <p>
              Auto-cancel overdue appointments and disable non-responsive
              therapists
            </p>
            <LoadingButton
              onClick={handleAutoCancelOverdue}
              loading={autoCancelLoading}
              className="auto-cancel-button"
              disabled={overdueCount === 0}
            >
              Auto-Cancel Overdue ({overdueCount})
            </LoadingButton>
          </div>
        </div>

        {/* Overdue appointments */}
        {overdueCount > 0 && (
          <div className="overdue-section">
            <h4>Overdue Appointments ({overdueCount})</h4>
            <div className="appointments-list">
              {" "}
              {overdueAppointments.map((appointment) => {
                // Simple timeout display without complex countdown
                return (
                  <div
                    key={appointment.id}
                    className="appointment-card overdue"
                  >
                    <div className="appointment-header">
                      <h3>
                        Appointment #{appointment.id} -{" "}
                        {appointment.client_details?.first_name || "Unknown"}{" "}
                        {appointment.client_details?.last_name || ""}
                      </h3>
                      <div className="status-badges">
                        {" "}
                        <span className="status-badge status-overdue">
                          Overdue
                        </span>
                      </div>
                    </div>
                    <div className="appointment-details">
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Time:</strong> {appointment.start_time || "N/A"}
                      </p>
                      {renderTherapistInfo(appointment)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approaching deadline appointments */}
        {approachingCount > 0 && (
          <div className="approaching-deadline-section">
            <h4>Approaching Deadline ({approachingCount})</h4>
            <div className="appointments-list">
              {" "}
              {approachingDeadlineAppointments.map((appointment) => {
                // Simple approaching deadline display
                return (
                  <div
                    key={appointment.id}
                    className="appointment-card approaching-deadline"
                  >
                    <div className="appointment-header">
                      <h3>
                        Appointment #{appointment.id} -{" "}
                        {appointment.client_details?.first_name || "Unknown"}{" "}
                        {appointment.client_details?.last_name || ""}
                      </h3>
                      <div className="status-badges">
                        {" "}
                        <span className="status-badge status-warning">
                          Approaching Deadline
                        </span>
                        <span className="countdown-badge warning">
                          Time remaining available
                        </span>
                      </div>
                    </div>
                    <div className="appointment-details">
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.date
                          ? new Date(appointment.date).toLocaleDateString()
                          : "N/A"}
                      </p>
                      <p>
                        <strong>Time:</strong> {appointment.start_time || "N/A"}
                      </p>
                      {renderTherapistInfo(appointment)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {overdueCount === 0 && approachingCount === 0 && (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <p>All appointments are on track! No timeout issues detected.</p>
          </div>
        )}

        {/* Server-side Pagination */}
        {(overdueCount > 0 || approachingCount > 0) &&
          paginationInfo.totalPages > 1 && (
            <ServerPagination
              currentPage={paginationInfo.currentPage}
              totalPages={paginationInfo.totalPages}
              hasNext={paginationInfo.hasNext}
              hasPrevious={paginationInfo.hasPrevious}
              onPageChange={setPage}
              className="appointments-pagination"
            />
          )}
      </div>
    );
  };
  const renderPaymentVerificationView = () => {
    // Handle both paginated (with results field) and direct array responses
    const awaitingPaymentAppointments = Array.isArray(tabData)
      ? tabData
      : tabData?.results || [];

    console.log("🔍 Payment Verification View Debug:", {
      tabData: tabData,
      isTabDataArray: Array.isArray(tabData),
      hasResults: !!tabData?.results,
      resultsLength: tabData?.results?.length,
      awaitingPaymentAppointments: awaitingPaymentAppointments,
      appointmentsLength: awaitingPaymentAppointments.length,
      tabDataType: typeof tabData,
      tabDataKeys: tabData ? Object.keys(tabData) : null,
    });

    if (awaitingPaymentAppointments.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-credit-card"></i>
          <p>No payments awaiting verification</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {awaitingPaymentAppointments.map((appointment) => {
          const urgencyLevel = getUrgencyLevel(appointment);
          const status = appointment.status || "";

          // Calculate total amount
          const totalAmount =
            appointment?.services_details?.reduce((total, service) => {
              const price = Number(service.price) || 0;
              return total + price;
            }, 0) || 0;

          return (
            <div
              key={appointment.id}
              className={`appointment-card payment-pending ${urgencyLevel}`}
            >
              <div className="appointment-header">
                <h3>
                  Appointment #{appointment.id} -{" "}
                  {appointment.client_details?.first_name || "Unknown"}{" "}
                  {appointment.client_details?.last_name || ""}
                </h3>
                <div className="status-badges">
                  <StatusDropdown
                    appointment={appointment}
                    currentStatus={status}
                    isOperator={true}
                    onStatusChange={(newStatus, updatedAppointment) => {
                      console.log(
                        `Status changed to ${newStatus} for appointment ${updatedAppointment?.id}`
                      );
                    }}
                  />
                  {urgencyLevel && urgencyLevel !== "normal" && (
                    <span className={`urgency-badge urgency-${urgencyLevel}`}>
                      {urgencyLevel.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="appointment-details">
                <p>
                  <strong>Date:</strong>{" "}
                  {appointment.date
                    ? new Date(appointment.date).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <strong>Time:</strong> {appointment.start_time || "N/A"} -{" "}
                  {appointment.end_time || "N/A"}
                </p>
                <p>
                  <strong>Location:</strong> {appointment.location || "N/A"}
                </p>

                {renderTherapistInfo(appointment)}

                <p>
                  <strong>Services:</strong>{" "}
                  {Array.isArray(appointment.services_details)
                    ? appointment.services_details.map((s) => s.name).join(", ")
                    : "N/A"}
                </p>

                <p>
                  <strong>Total Amount:</strong>{" "}
                  <span className="total-amount">
                    ₱{totalAmount.toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="appointment-actions">
                <LoadingButton
                  onClick={() => handlePaymentVerification(appointment)}
                  loading={buttonLoading[`payment_${appointment.id}`]}
                  className="payment-button"
                >
                  Verify Payment
                </LoadingButton>
              </div>
            </div>
          );
        })}

        {/* Server-side Pagination */}
        <ServerPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          hasNext={paginationInfo.hasNext}
          hasPrevious={paginationInfo.hasPrevious}
          onPageChange={setPage}
          className="appointments-pagination"
        />
      </div>
    );
  };

  // Render appointment action buttons based on status
  const renderAppointmentActions = (appointment) => {
    const status = appointment.status;

    switch (status) {
      case "driver_confirmed":
        return (
          <LoadingButton
            onClick={() => _handleStartAppointment(appointment.id)}
            loading={buttonLoading[`start_${appointment.id}`]}
            className="start-button"
          >
            Start Appointment
          </LoadingButton>
        );

      case "awaiting_payment":
        return (
          <LoadingButton
            onClick={() => handlePaymentVerification(appointment)}
            loading={buttonLoading[`payment_${appointment.id}`]}
            className="payment-button"
          >
            Verify Payment
          </LoadingButton>
        );

      case "rejected":
        return (
          <LoadingButton
            onClick={() => handleReviewRejection(appointment)}
            className="review-button"
          >
            Review Rejection
          </LoadingButton>
        );

      default:
        return null;
    }
  };

  const renderAllAppointments = () => {
    const appointments = processedTabData.filteredAppointments || [];

    console.log("🔍 Render All Appointments Debug:", {
      currentView,
      tabLoading,
      tabError: !!tabError,
      tabData: {
        exists: !!tabData,
        type: typeof tabData,
        isArray: Array.isArray(tabData),
        hasResults: !!tabData?.results,
        resultsCount: tabData?.results?.length,
        directArrayLength: Array.isArray(tabData)
          ? tabData.length
          : "not array",
      },
      processedTabData: {
        exists: !!processedTabData,
        appointmentsLength: processedTabData?.appointments?.length,
        filteredAppointmentsLength:
          processedTabData?.filteredAppointments?.length,
      },
      appointments: {
        length: appointments.length,
        isArray: Array.isArray(appointments),
      },
      paginationInfo: {
        count: paginationInfo.count,
        totalPages: paginationInfo.totalPages,
        currentPage: paginationInfo.currentPage,
        pageSize: paginationInfo.pageSize,
        hasNext: paginationInfo.hasNext,
        hasPrevious: paginationInfo.hasPrevious,
      },
    });

    return (
      <div className="appointments-list">
        {/* Appointments List */}
        <div className="appointments-container">
          {tabLoading ? (
            <div className="loading-message">Loading appointments...</div>
          ) : tabError ? (
            <div
              className={`error-message ${
                tabError.isBlocked ? "blocked-error" : ""
              }`}
            >
              {tabError.isBlocked ? (
                <div className="blocked-request-error">
                  <h4>🚫 Unable to Load Appointments</h4>
                  <p>Your browser or an extension is blocking the request.</p>
                  <p>
                    <strong>
                      Please check your ad blocker settings and try again.
                    </strong>
                  </p>
                </div>
              ) : (
                <div>
                  <h4>❌ Error loading appointments</h4>
                  <p>{tabError.message || tabError}</p>
                  <button onClick={refreshCurrentTab} className="retry-btn">
                    🔄 Retry
                  </button>
                </div>
              )}
            </div>
          ) : appointments.length === 0 ? (
            <div className="no-appointments">
              <div className="empty-state">
                <i className="fas fa-calendar-alt"></i>
                <h3>No appointments found</h3>
                <p>There are currently no appointments to display.</p>
                <button onClick={refreshCurrentTab} className="refresh-btn">
                  🔄 Refresh Data
                </button>
              </div>
            </div>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appointment) => {
                const urgencyLevel = getUrgencyLevel(appointment);

                // Determine card classes based on status and urgency
                let cardClasses = "appointment-card";

                // Apply urgency styling only for pending appointments
                if (appointment.status === "pending" && urgencyLevel) {
                  cardClasses += ` ${urgencyLevel}`;
                }

                // Apply overdue styling for auto-cancelled appointments
                if (appointment.status === "auto_cancelled") {
                  cardClasses += " overdue";
                }

                return (
                  <div key={appointment.id} className={cardClasses}>
                    <div className="appointment-header">
                      <h3>
                        {appointment.client_details?.first_name}{" "}
                        {appointment.client_details?.last_name}
                      </h3>
                      <div className="status-badges">
                        <StatusDropdown
                          appointment={appointment}
                          currentStatus={appointment.status}
                          isOperator={true}
                          onStatusChange={(newStatus, updatedAppointment) => {
                            console.log(
                              `Status changed to ${newStatus} for appointment ${updatedAppointment?.id}`
                            );
                          }}
                        />
                        {/* Only show urgency badge for pending appointments */}
                        {appointment.status === "pending" &&
                          urgencyLevel &&
                          urgencyLevel !== "normal" && (
                            <span
                              className={`urgency-badge urgency-${urgencyLevel}`}
                            >
                              {urgencyLevel.toUpperCase()}
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="appointment-details">
                      <p>
                        <strong>Appointment ID:</strong> #{appointment.id}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {appointment.formatted_date || appointment.date}
                      </p>
                      <p>
                        <strong>Time:</strong>{" "}
                        {appointment.formatted_start_time ||
                          appointment.start_time}
                        {appointment.formatted_end_time &&
                          ` - ${appointment.formatted_end_time}`}
                      </p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {appointment.location || "Not specified"}
                      </p>

                      {/* Client Information */}
                      {appointment.client_details && (
                        <div className="client-info">
                          <p>
                            <strong>Client Phone:</strong>{" "}
                            {appointment.client_details.phone_number || "N/A"}
                          </p>
                          <p>
                            <strong>Client Address:</strong>{" "}
                            {appointment.client_details.address || "N/A"}
                          </p>
                        </div>
                      )}

                      {/* Therapist Information */}
                      {renderTherapistInfo(appointment)}

                      {/* Driver Information */}
                      {appointment.driver_details && (
                        <p>
                          <strong>Driver:</strong>{" "}
                          {appointment.driver_details?.first_name || "Unknown"}{" "}
                          {appointment.driver_details?.last_name || "Driver"}
                          {appointment.driver_details?.motorcycle_plate &&
                            ` (${appointment.driver_details.motorcycle_plate})`}
                        </p>
                      )}

                      {/* Services Information */}
                      {appointment.services_details &&
                        appointment.services_details.length > 0 && (
                          <div className="services-info">
                            <p>
                              <strong>Services:</strong>{" "}
                              {appointment.services_details
                                .map((service) => service.name)
                                .join(", ")}
                            </p>
                            <p>
                              <strong>Total Price:</strong> ₱
                              {appointment.total_price || 0}
                            </p>
                            <p>
                              <strong>Total Duration:</strong>{" "}
                              {appointment.total_duration || 0} minutes
                            </p>
                          </div>
                        )}

                      {/* Acceptance Status */}
                      {getTherapistAcceptanceStatus(appointment)}

                      {/* Additional Notes */}
                      {appointment.notes && (
                        <p>
                          <strong>Notes:</strong> {appointment.notes}
                        </p>
                      )}
                    </div>
                    <div className="appointment-actions">
                      {/* Add action buttons based on appointment status */}
                      {renderAppointmentActions(appointment)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Server-side Pagination - Only show if totalPages > 1 */}
        {paginationInfo.totalPages > 1 && (
          <ServerPagination
            currentPage={paginationInfo.currentPage}
            totalPages={paginationInfo.totalPages}
            hasNext={paginationInfo.hasNext}
            hasPrevious={paginationInfo.hasPrevious}
            onPageChange={setPage}
            className="appointments-pagination"
          />
        )}

        {/* Debug Information (only in development) */}
        {import.meta.env.DEV && (
          <div
            className="debug-info"
            style={{
              position: "fixed",
              bottom: "10px",
              right: "10px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "12px",
              zIndex: 9999,
              maxWidth: "300px",
            }}
          >
            <strong>Debug - All Appointments:</strong>
            <br />
            Data: {appointments.length} items
            <br />
            Page: {paginationInfo.currentPage}/{paginationInfo.totalPages}
            <br />
            Total: {paginationInfo.count} appointments
            <br />
            Loading: {tabLoading ? "Yes" : "No"}
            <br />
            Error: {tabError ? "Yes" : "No"}
          </div>
        )}
      </div>
    );
  };
  const renderNotifications = () => {
    // ✅ FIXED: Use tabData directly since notifications are fetched directly, not in a nested property
    const notifications = Array.isArray(tabData) ? tabData : [];

    console.log("🔔 Rendering notifications:", {
      tabData,
      notificationsArray: notifications,
      count: notifications.length,
      currentView,
    });

    // Show loading state
    if (tabLoading) {
      return (
        <div className="loading-state">
          <MinimalLoadingIndicator
            show={true}
            position="center"
            size="medium"
            tooltip="Loading notifications..."
          />
        </div>
      );
    }

    // Show error state
    if (tabError) {
      return (
        <div
          className={`error-state ${tabError.isBlocked ? "blocked-error" : ""}`}
        >
          {tabError.isBlocked ? (
            <div className="blocked-request-error">
              <h4>🚫 Unable to Load Notifications</h4>
              <p>Your browser or an extension is blocking the request.</p>
              <p>
                <strong>Please check your ad blocker settings.</strong>
              </p>
            </div>
          ) : (
            <>
              <i className="fas fa-exclamation-triangle"></i>
              <p>Error loading notifications: {tabError.message || tabError}</p>
            </>
          )}
          <button onClick={refreshCurrentTab} className="retry-btn">
            Retry
          </button>
        </div>
      );
    }

    // Show empty state
    if (notifications.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-bell"></i>
          <p>No unread notifications</p>
          <p className="empty-subtitle">You're all caught up!</p>
        </div>
      );
    }
    return (
      <div className="notifications-list">
        <div className="notifications-header">
          <h3>Unread Notifications ({notifications.length})</h3>
          <button onClick={refreshCurrentTab} className="refresh-btn">
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>

        <div className="notifications-container">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${
                notification.type || notification.notification_type || "info"
              } ${notification.is_read ? "read" : "unread"}`}
            >
              <div className="notification-header">
                <div className="notification-icon">
                  {notification.type === "appointment" && (
                    <i className="fas fa-calendar"></i>
                  )}
                  {notification.type === "payment" && (
                    <i className="fas fa-money-bill"></i>
                  )}
                  {notification.type === "driver" && (
                    <i className="fas fa-car"></i>
                  )}
                  {!notification.type && <i className="fas fa-bell"></i>}
                </div>
                <h4>
                  {notification.title ||
                    notification.message?.substring(0, 50) ||
                    "Notification"}
                </h4>
                <span className="notification-time">
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
              <div className="notification-content">
                <p>{notification.message}</p>
                {notification.appointment_id && (
                  <div className="notification-details">
                    <span className="appointment-link">
                      Appointment #{notification.appointment_id}
                    </span>
                  </div>
                )}
              </div>
              {!notification.is_read && (
                <div className="notification-actions">
                  <button
                    className="mark-read-btn"
                    onClick={() => {
                      // TODO: Implement mark as read functionality
                      console.log(
                        "Mark notification as read:",
                        notification.id
                      );
                    }}
                  >
                    Mark as Read
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Server-side Pagination */}
        <ServerPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          hasNext={paginationInfo.hasNext}
          hasPrevious={paginationInfo.hasPrevious}
          onPageChange={setPage}
          className="appointments-pagination"
        />
      </div>
    );
  };
  const renderDriverCoordinationPanel = () => {
    const drivers = Array.isArray(tabData) ? tabData : [];
    const availableDrivers = drivers.filter((d) => d.status !== "busy") || [];
    const busyDrivers = drivers.filter((d) => d.status === "busy") || [];
    const pickupRequests = tabData?.pickupRequests || [];

    return (
      <div className="driver-coordination-panel">
        <div className="driver-stats">
          <div className="stat-card available">
            <span className="stat-number">{availableDrivers.length}</span>
            <span className="stat-label">Available Drivers</span>
          </div>
          <div className="stat-card busy">
            <span className="stat-number">{busyDrivers.length}</span>
            <span className="stat-label">Busy Drivers</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-number">{pickupRequests.length}</span>
            <span className="stat-label">Pending Pickups</span>
          </div>
        </div>{" "}
        <div className="driver-sections">
          <div className="available-drivers-section">
            <h3>Available Drivers</h3>
            {availableDrivers.length === 0 ? (
              <p>No drivers currently available</p>
            ) : (
              <div className="drivers-list">
                {availableDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card available">
                    <div className="driver-info">
                      <h4>
                        {driver.first_name} {driver.last_name}
                      </h4>
                      <p>
                        <strong>Vehicle:</strong> {driver.vehicle_type}
                      </p>
                      <p>
                        <strong>Last Location:</strong> {driver.last_location}
                      </p>
                      <p>
                        <strong>Available Since:</strong>{" "}
                        {new Date(driver.available_since).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="busy-drivers-section">
            <h3>Busy Drivers</h3>
            {busyDrivers.length === 0 ? (
              <p>No drivers currently busy</p>
            ) : (
              <div className="drivers-list">
                {busyDrivers.map((driver) => (
                  <div key={driver.id} className="driver-card busy">
                    <div className="driver-info">
                      <h4>
                        {driver.first_name} {driver.last_name}
                      </h4>
                      <p>
                        <strong>Current Task:</strong> {driver.current_task}
                      </p>
                      <p>
                        <strong>Vehicle:</strong> {driver.vehicle_type}
                      </p>
                      <p>
                        <strong>Location:</strong> {driver.current_location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderServiceWorkflowView = () => {
    const workflowData = tabData || {};
    const todayAppointments = workflowData.todayAppointments || [];
    const activeSessions = workflowData.activeSessions || [];
    const upcomingAppointments = workflowData.upcomingAppointments || [];

    return (
      <div className="service-workflow-panel">
        <div className="workflow-stats">
          <div className="stat-card">
            <span className="stat-number">{todayAppointments.length}</span>
            <span className="stat-label">Today's Appointments</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{activeSessions.length}</span>
            <span className="stat-label">Active Sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{upcomingAppointments.length}</span>
            <span className="stat-label">Upcoming</span>
          </div>
        </div>
        <div className="workflow-content">
          <p>
            Service workflow overview and management tools will be displayed
            here.
          </p>
        </div>
      </div>
    );
  };
  const renderActiveSessionsView = () => {
    // Handle both paginated (with results field) and direct array responses
    const activeSessions = Array.isArray(tabData)
      ? tabData
      : tabData?.results || [];

    if (activeSessions.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-user-md"></i>
          <p>No active therapy sessions</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {activeSessions.map((session) => (
          <div key={session.id} className="appointment-card active-session">
            <div className="appointment-header">
              <h3>
                Session #{session.id} - {session.client_details?.first_name}{" "}
                {session.client_details?.last_name}
              </h3>
              <span className="status-badge active">Active Session</span>
            </div>
            <div className="appointment-details">
              <p>
                <strong>Started:</strong>{" "}
                {new Date(session.session_started_at).toLocaleString()}
              </p>
              <p>
                <strong>Location:</strong> {session.location}
              </p>
              {renderTherapistInfo(session)}
              <p>
                <strong>Services:</strong>{" "}
                {session.services_details?.map((s) => s.name).join(", ")}
              </p>
            </div>
          </div>
        ))}

        {/* Server-side Pagination */}
        <ServerPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          hasNext={paginationInfo.hasNext}
          hasPrevious={paginationInfo.hasPrevious}
          onPageChange={setPage}
          className="appointments-pagination"
        />
      </div>
    );
  };
  const renderPickupRequestsView = () => {
    // Handle both paginated (with results field) and direct array responses
    const pickupRequests = Array.isArray(tabData)
      ? tabData
      : tabData?.results || [];

    if (pickupRequests.length === 0) {
      return (
        <div className="empty-state">
          <i className="fas fa-car"></i>
          <p>No pickup requests pending</p>
        </div>
      );
    }

    return (
      <div className="appointments-list">
        {pickupRequests.map((request) => (
          <div key={request.id} className="appointment-card pickup-request">
            <div className="appointment-header">
              <h3>Pickup Request - {request.therapist_name}</h3>
              <div className="status-badges">
                <span
                  className={`urgency-badge urgency-${
                    request.urgency || "normal"
                  }`}
                >
                  {request.urgency === "urgent" ? "🚨 URGENT" : "⏰ Normal"}
                </span>
              </div>
            </div>
            <div className="appointment-details">
              <p>
                <strong>Location:</strong> {request.location}
              </p>
              <p>
                <strong>Requested:</strong>{" "}
                {new Date(request.requested_at).toLocaleString()}
              </p>
              <p>
                <strong>Session Ended:</strong>{" "}
                {new Date(request.session_end_time).toLocaleString()}
              </p>
            </div>
            <div className="appointment-actions">
              {driverAssignment.availableDrivers.length > 0 ? (
                <div className="driver-assignment">
                  <select
                    onChange={(e) =>
                      e.target.value &&
                      handleAssignDriverPickup(
                        request.therapist_id,
                        parseInt(e.target.value)
                      )
                    }
                  >
                    <option value="">Select Driver</option>
                    {driverAssignment.availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name} -{" "}
                        {driver.vehicle_type}
                      </option>
                    ))}
                  </select>
                  <LoadingButton
                    onClick={() =>
                      handleAssignDriverPickup(request.therapist_id)
                    }
                    className="auto-assign-button"
                  >
                    Auto-Assign (FIFO)
                  </LoadingButton>
                </div>
              ) : (
                <p className="no-drivers">No drivers available</p>
              )}
            </div>
          </div>
        ))}

        {/* Server-side Pagination */}
        <ServerPagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          hasNext={paginationInfo.hasNext}
          hasPrevious={paginationInfo.hasPrevious}
          onPageChange={setPage}
          className="appointments-pagination"
        />
      </div>
    );
  };
  // Render the tab switcher at the top of the dashboard

  return (
    <PageLayout>
      {/* TanStack Query Debugger - Remove this after debugging
      <TanStackQueryDebugger /> */}

      <div className={`operator-dashboard`}>
        <LayoutRow
          title={`${greeting}, ${userName}!`}
          subtitle={<>Today is {systemTime}</>}
        >
          <div className="action-buttons">
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </LayoutRow>
        {/* OPTIMIZED: Simplified loading indicator */}
        <MinimalLoadingIndicator
          show={tabLoading}
          hasData={tabData !== null}
          position="bottom-left"
          size="small"
          variant="subtle"
          tooltip={
            tabData !== null
              ? "Refreshing dashboard data..."
              : "Loading dashboard data..."
          }
          pulse={true}
          fadeIn={true}
        />{" "}
        {/* Enhanced error handling with user-friendly messages */}
        {tabError && !tabData && (
          <div
            className={`error-message ${
              tabError.isBlocked ? "blocked-error" : ""
            }`}
          >
            {tabError.isBlocked ? (
              <div className="blocked-request-error">
                <h4>🚫 Request Blocked</h4>
                <p>
                  <strong>{tabError.message}</strong>
                </p>
                <div className="error-help">
                  <p>
                    <strong>How to fix this:</strong>
                  </p>
                  <ul>
                    <li>
                      Check your ad blocker settings and whitelist this site
                    </li>
                    <li>Temporarily disable browser extensions</li>
                    <li>Try refreshing the page</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="retry-button"
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Retry
                </button>
              </div>
            ) : (
              <div className="general-error">
                <h4>❌ Error Loading Data</h4>
                <p>
                  {typeof tabError === "object"
                    ? tabError.message ||
                      tabError.error ||
                      JSON.stringify(tabError)
                    : tabError}
                </p>
                <button
                  onClick={refreshCurrentTab}
                  className="retry-button"
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Try Again
                </button>
              </div>
            )}
          </div>
        )}
        {/* ✅ ROBUST FILTERING: Display validation warnings and errors */}{" "}
        {validationWarnings.length > 0 && (
          <div
            className="validation-warnings"
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
              padding: "12px",
              margin: "10px 0",
              color: "#856404",
            }}
          >
            <h5 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
              ⚠️ Parameter Validation Issues:
            </h5>
            <ul style={{ margin: "0", paddingLeft: "20px" }}>
              {validationWarnings.map((warning, index) => (
                <li key={index} style={{ fontSize: "13px" }}>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Statistics Dashboard - Only show for rejected view */}
        <div className="stats-dashboard">
          <div className="stats-card">
            <h4>Rejection Overview</h4>
            <div className="stats-grid">
              <div className="operator-stat-item">
                <span className="operator-stat-number">
                  {tabStats.rejectionStats.total}
                </span>
                <span className="operator-stat-label">Total Rejections</span>
              </div>
              <div className="operator-stat-item operator-therapist-stat">
                <span className="operator-stat-number">
                  {tabStats.rejectionStats.therapist}
                </span>
                <span className="operator-stat-label">
                  Therapist Rejections
                </span>
              </div>
              <div className="operator-stat-item operator-driver-stat">
                <span className="operator-stat-number">
                  {tabStats.rejectionStats.driver}
                </span>
                <span className="operator-stat-label">Driver Rejections</span>
              </div>{" "}
              <div className="operator-stat-item operator-pending-stat">
                <span className="operator-stat-number">
                  {tabStats.rejectionStats.pending}
                </span>
                <span className="operator-stat-label">Pending Reviews</span>
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-container">
          <TabSwitcher
            tabs={dashboardTabs}
            activeTab={currentView}
            onTabChange={setView}
          />
          <div
            className={`dashboard-content ${
              paymentModal.isOpen || reviewModal.isOpen ? "faded" : ""
            }`}
          >
            {" "}
            {/* 🔥 PERFORMANCE MONITOR: Real-time performance tracking */}
            {/* <PerformanceMonitor
            componentName="OperatorDashboard"
            enabled={import.meta.env.DEV || false}
          /> */}
            {currentView === "rejected" && (
              <div className="rejected-appointments">
                <h2>Rejection Reviews</h2>
                {renderRejectedAppointments()}
              </div>
            )}
            {currentView === "pending" && (
              <div className="pending-appointments">
                <h2>Pending Acceptance Appointments</h2>
                {renderPendingAcceptanceAppointments()}
              </div>
            )}{" "}
            {currentView === "timeout" && (
              <div className="timeout-monitoring">
                <h2>Timeout Monitoring</h2>
                {renderTimeoutMonitoring()}
              </div>
            )}
            {currentView === "payment" && (
              <div className="payment-verification">
                <h2>Payment Verification</h2>
                {renderPaymentVerificationView()}
              </div>
            )}
            {currentView === "all" && (
              <div className="all-appointments">
                <h2>All Appointments</h2>
                {renderAllAppointments()}
              </div>
            )}{" "}
            {currentView === "notifications" && (
              <div className="notifications">
                <h2>Notifications</h2>
                {renderNotifications()}
              </div>
            )}{" "}
            {currentView === "driver" && (
              <div className="driver-coordination">
                <h2>Driver Coordination Center</h2>
                {renderDriverCoordinationPanel()}
              </div>
            )}
            {currentView === "workflow" && (
              <div className="service-workflow">
                <h2>Service Workflow Overview</h2>
                {renderServiceWorkflowView()}
              </div>
            )}
            {currentView === "sessions" && (
              <div className="active-sessions">
                <h2>Active Therapy Sessions</h2>
                {renderActiveSessionsView()}
              </div>
            )}{" "}
            {currentView === "pickup" && (
              <div className="pickup-requests">
                <h2>Therapist Pickup Requests</h2>
                {renderPickupRequestsView()}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* End of operator-dashboard */}

      {/* Payment Verification Modal */}
      {paymentModal.isOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles.modal}>
            <div className={styles["modal-header"]}>
              <h3>Verify Payment Received</h3>
              <button
                className={styles["close-btn"]}
                onClick={handlePaymentModalCancel}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="appointment-summary">
              <h4>Appointment #{paymentModal.appointmentId}</h4>
              <div className="summary-details">
                <p>
                  <strong>Client:</strong>{" "}
                  {paymentModal.appointmentDetails?.client_details?.first_name
                    ? `${
                        paymentModal.appointmentDetails.client_details
                          .first_name
                      } ${
                        paymentModal.appointmentDetails.client_details
                          .last_name || ""
                      }`.trim()
                    : paymentModal.appointmentDetails?.client ||
                      "Unknown Client"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(
                    paymentModal.appointmentDetails?.date
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Services:</strong>{" "}
                  {paymentModal.appointmentDetails?.services_details
                    ?.map((s) => s.name)
                    .join(", ") || "N/A"}
                </p>{" "}
                <p>
                  <strong>Total Amount:</strong> ₱
                  {(() => {
                    const total =
                      paymentModal.appointmentDetails?.services_details?.reduce(
                        (total, service) => {
                          const price = Number(service.price) || 0;
                          return total + price;
                        },
                        0
                      ) || 0;
                    return total.toFixed(2);
                  })()}
                </p>
              </div>
            </div>
            <div className={styles["modal-form"]}>
              <div className="form-group">
                <label htmlFor="paymentMethod">Payment Method:</label>{" "}
                <select
                  id="paymentMethod"
                  value={paymentData.method}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      method: e.target.value,
                      // Reset receipt data when switching payment methods
                      receiptFile: null,
                      receiptHash: "",
                      receiptUrl: "",
                      uploadError: "",
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="paymentAmount">Amount Received:</label>
                <input
                  type="number"
                  id="paymentAmount"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, amount: e.target.value })
                  }
                  placeholder="Enter amount received (whole numbers only)"
                  min="0"
                  step="1"
                  pattern="[0-9]*"
                  onInput={(e) => {
                    // Ensure only integers are allowed
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                  }}
                />
              </div>{" "}
              {/* GCash Receipt Upload */}
              {paymentData.method === "gcash" && (
                <div
                  className="form-group"
                  style={{
                    backgroundColor: "#f0f8ff",
                    border: "2px solid #3498db",
                    padding: "15px",
                    borderRadius: "8px",
                    marginTop: "15px",
                  }}
                >
                  <label
                    htmlFor="receiptFile"
                    style={{
                      color: "#2c3e50",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    📄 GCash Receipt Upload{" "}
                    <span style={{ color: "#e74c3c" }}>*</span>
                  </label>
                  <div style={{ marginTop: "0.5rem" }}>
                    <input
                      type="file"
                      id="receiptFile"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleReceiptFileChange}
                      disabled={paymentData.isUploading}
                      required
                    />
                    {paymentData.isUploading && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.9rem",
                          color: "#555",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(0,0,0,.1)",
                            borderTopColor: "#3498db",
                            borderRadius: "50%",
                            marginRight: "8px",
                            animation: "spin 1s ease-in-out infinite",
                          }}
                        ></span>
                        Uploading...
                      </div>
                    )}
                    {paymentData.receiptHash && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          background: "#f5f5f5",
                          padding: "8px",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <p
                          style={{
                            color: "#2ecc71",
                            marginBottom: "4px",
                            fontWeight: "500",
                          }}
                        >
                          ✓ Receipt verified
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: "#555",
                            fontFamily: "monospace",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{ fontWeight: "500", marginRight: "8px" }}
                          >
                            SHA-256:
                          </span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}
                            title={paymentData.receiptHash}
                          >
                            {paymentData.receiptHash.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                    )}
                    {paymentData.uploadError && (
                      <p
                        style={{
                          color: "#e74c3c",
                          marginTop: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {paymentData.uploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="paymentNotes">Notes (optional):</label>
                <textarea
                  id="paymentNotes"
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
                  }
                  placeholder="Add any notes about the payment..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <LoadingButton
                  className="verify-button"
                  onClick={handleMarkPaymentPaid}
                  loading={
                    buttonLoading[`payment_${paymentModal.appointmentId}`]
                  }
                  loadingText="Processing..."
                >
                  Mark as Paid
                </LoadingButton>
                <LoadingButton
                  className="cancel-button"
                  onClick={handlePaymentModalCancel}
                  variant="secondary"
                >
                  Cancel
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Review Rejection Modal */}
      {reviewModal.isOpen && (
        <div className="modal-overlay">
          <div className="review-modal">
            <h3>Review Appointment Rejection</h3>
            <div className="rejection-details">
              <p>
                <strong>Rejection Reason:</strong>
              </p>
              <p className="rejection-reason-text">
                {reviewModal.rejectionReason}
              </p>
            </div>
            <div className="review-notes">
              <label htmlFor="reviewNotes">Review Notes (optional):</label>
              <textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any additional notes about your decision..."
                rows={3}
              />
            </div>{" "}
            <div className="modal-actions">
              <LoadingButton
                className="accept-button"
                onClick={() => handleReviewSubmit("accept")}
                loading={
                  buttonLoading[`review_${reviewModal.appointmentId}_accept`]
                }
                loadingText="Processing..."
              >
                Accept Rejection
              </LoadingButton>
              <LoadingButton
                className="deny-button"
                onClick={() => handleReviewSubmit("deny")}
                loading={
                  buttonLoading[`review_${reviewModal.appointmentId}_deny`]
                }
                loadingText="Processing..."
              >
                Deny Rejection
              </LoadingButton>
              <LoadingButton
                className="cancel-button"
                onClick={handleReviewCancel}
                variant="secondary"
              >
                Cancel
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
      {/* Post-Service Material Modal */}
      <PostServiceMaterialModal
        isOpen={materialModal.isOpen}
        onClose={handleMaterialModalClose}
        materials={materialModal.materials}
        onSubmit={handleMaterialModalSubmit}
        isSubmitting={materialModal.isSubmitting}
      />
      {/* End of PageLayout */}
    </PageLayout>
  );
};

export default OperatorDashboard;
