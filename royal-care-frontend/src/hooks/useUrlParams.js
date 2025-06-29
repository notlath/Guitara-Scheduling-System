import { useCallback, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Shared URL parameter management for dashboard views
 * Eliminates duplication of search params logic across dashboards
 */
export const useUrlParams = (
  validViewValues = [],
  validFilterValues = [],
  defaultView = "today"
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Helper function to validate URL parameters
  const validateUrlParam = useCallback((param, validValues, defaultValue) => {
    if (!param || typeof param !== "string") return defaultValue;
    return validValues.includes(param) ? param : defaultValue;
  }, []);

  // Get raw values from URL
  const rawView = searchParams.get("view");
  const rawFilter = searchParams.get("filter");
  const rawPage = searchParams.get("page");

  // Validate and get current values
  const currentView =
    validViewValues.length > 0
      ? validateUrlParam(rawView, validViewValues, defaultView)
      : rawView || defaultView;

  const currentFilter =
    validFilterValues.length > 0
      ? validateUrlParam(rawFilter, validFilterValues, "all")
      : rawFilter || "all";

  const currentPage = Math.max(1, parseInt(rawPage || "1", 10));

  // Check for validation warnings
  useEffect(() => {
    const warnings = [];
    if (
      rawView &&
      validViewValues.length > 0 &&
      !validViewValues.includes(rawView)
    ) {
      warnings.push(`Invalid view "${rawView}" reset to "${defaultView}"`);
    }
    if (
      rawFilter &&
      validFilterValues.length > 0 &&
      !validFilterValues.includes(rawFilter)
    ) {
      warnings.push(`Invalid filter "${rawFilter}" reset to "all"`);
    }
    if (rawPage) {
      const parsedPage = parseInt(rawPage, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        warnings.push(`Invalid page "${rawPage}" reset to "1"`);
      }
    }
    setValidationWarnings(warnings);
  }, [
    rawView,
    rawFilter,
    rawPage,
    validViewValues,
    validFilterValues,
    defaultView,
  ]);

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

  const setFilter = useCallback(
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

  return {
    currentView,
    currentFilter,
    currentPage,
    validationWarnings,
    setView,
    setFilter,
    setPage,
  };
};
