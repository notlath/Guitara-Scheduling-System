/**
 * Server-side pagination utility functions for frontend API calls
 */
import { useCallback, useEffect, useState } from "react";

export const createApiUrl = (
  baseUrl,
  page = 1,
  pageSize = 15,
  filters = {}
) => {
  const url = new URL(baseUrl);
  url.searchParams.set("page", page.toString());
  url.searchParams.set("page_size", pageSize.toString());

  // Add additional filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value.toString());
    }
  });

  return url.toString();
};

export const handleApiResponse = async (response) => {
  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // Check if it's a paginated response from DRF
  if (data.results && typeof data.count === "number") {
    return {
      data: data.results,
      pagination: {
        count: data.count,
        totalPages:
          data.total_pages || Math.ceil(data.count / (data.page_size || 15)),
        currentPage: data.current_page || 1,
        pageSize: data.page_size || 15,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
        next: data.next,
        previous: data.previous,
      },
    };
  }

  // Non-paginated response
  return {
    data: Array.isArray(data) ? data : [data],
    pagination: {
      count: Array.isArray(data) ? data.length : 1,
      totalPages: 1,
      currentPage: 1,
      pageSize: Array.isArray(data) ? data.length : 1,
      hasNext: false,
      hasPrevious: false,
      next: null,
      previous: null,
    },
  };
};

export const fetchPaginatedAppointments = async (
  endpoint,
  page = 1,
  pageSize = 15,
  filters = {}
) => {
  const token = localStorage.getItem("knoxToken");
  if (!token) {
    throw new Error("Authentication required");
  }

  const url = createApiUrl(endpoint, page, pageSize, filters);

  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });

  return handleApiResponse(response);
};

// Pre-configured endpoints for different appointment views
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

export const appointmentEndpoints = {
  all: `${getBaseURL()}/scheduling/appointments/`,
  pending: `${getBaseURL()}/scheduling/appointments/pending/`,
  rejected: `${getBaseURL()}/scheduling/appointments/rejected/`,
  timeout: `${getBaseURL()}/scheduling/appointments/timeout/`,
  awaiting_payment: `${getBaseURL()}/scheduling/appointments/awaiting_payment/`,
  active_sessions: `${getBaseURL()}/scheduling/appointments/active_sessions/`,
  pickup_requests: `${getBaseURL()}/scheduling/appointments/pickup_requests/`,
};

// Hook for managing paginated appointment data
export const usePaginatedAppointments = (
  initialView = "all",
  initialPage = 1
) => {
  const [currentView, setCurrentView] = useState(initialView);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 15,
    hasNext: false,
    hasPrevious: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!appointmentEndpoints[currentView]) {
      setError("Invalid view selected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchPaginatedAppointments(
        appointmentEndpoints[currentView],
        currentPage,
        15
      );

      setData(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [currentView, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const changeView = (newView) => {
    setCurrentView(newView);
    setCurrentPage(1); // Reset to first page when changing views
  };

  const refresh = () => {
    fetchData();
  };

  return {
    data,
    pagination,
    loading,
    error,
    currentView,
    currentPage,
    changePage,
    changeView,
    refresh,
  };
};
