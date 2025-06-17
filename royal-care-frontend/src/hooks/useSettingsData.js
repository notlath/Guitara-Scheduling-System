/**
 * Specialized hook for SettingsDataPage immediate data display
 * Manages multiple data types (tabs) with caching and background refresh
 * Enhanced to work with the central DataManager for consistency
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook for settings data management with immediate display and caching
 * Prevents unnecessary reloads when switching between tabs
 */
export const useSettingsData = (fetchers = {}) => {
  // Cache for all tab data with timestamps
  const dataCache = useRef(new Map());
  const fetchPromises = useRef(new Map());

  // State for UI
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});
  const [tableData, setTableData] = useState({
    Therapists: [],
    Drivers: [],
    Operators: [],
    Clients: [],
    Services: [],
    Materials: [],
  });

  // Cache TTL (30 seconds) - aligned with DataManager
  const CACHE_TTL = 30000;
  const STALE_THRESHOLD = 0.8; // Consider stale at 80% of TTL

  /**
   * Check if cached data exists and is fresh
   */
  const getCacheStatus = useCallback((tabName) => {
    const cached = dataCache.current.get(tabName);
    if (!cached) {
      return { hasCache: false, isStale: false, age: 0 };
    }

    const age = Date.now() - cached.timestamp;
    const isStale = age > CACHE_TTL * STALE_THRESHOLD;
    const isExpired = age > CACHE_TTL;

    return {
      hasCache: true,
      isStale,
      isExpired,
      age,
      data: cached.data,
    };
  }, []);

  /**
   * Get immediate data from cache if available
   */
  const getImmediateData = useCallback(
    (tabName) => {
      const { hasCache, data } = getCacheStatus(tabName);
      return hasCache ? data : [];
    },
    [getCacheStatus]
  );

  /**
   * Check if tab has any data (cached or current)
   */
  const hasDataForTab = useCallback(
    (tabName) => {
      const { hasCache } = getCacheStatus(tabName);
      const currentData = tableData[tabName];
      return hasCache || (Array.isArray(currentData) && currentData.length > 0);
    },
    [getCacheStatus, tableData]
  );

  /**
   * Fetch data for a specific tab with caching
   */
  const fetchTabData = useCallback(
    async (tabName, options = {}) => {
      const { forceRefresh = false, background = false } = options;

      // Check cache first
      const cacheStatus = getCacheStatus(tabName);

      // Return cached data immediately if available and not forcing refresh
      if (!forceRefresh && cacheStatus.hasCache && !cacheStatus.isExpired) {
        // Update table data with cached data
        setTableData((prev) => ({
          ...prev,
          [tabName]: cacheStatus.data,
        }));

        // If data is stale but not expired, trigger background refresh
        if (cacheStatus.isStale) {
          console.log(
            `🔄 SettingsData: Auto-refreshing stale ${tabName} data in background`
          );
          // Trigger background refresh without loading indicators
          fetchTabData(tabName, { forceRefresh: true, background: true });
        }

        return cacheStatus.data;
      }

      // Prevent duplicate requests
      if (fetchPromises.current.has(tabName)) {
        return fetchPromises.current.get(tabName);
      }

      // Set loading state only if not background refresh
      if (!background) {
        setLoadingStates((prev) => ({ ...prev, [tabName]: true }));
      }
      setErrors((prev) => ({ ...prev, [tabName]: null }));

      const fetchPromise = (async () => {
        try {
          const fetcher = fetchers[tabName];
          if (!fetcher) {
            throw new Error(`No fetcher available for ${tabName}`);
          }

          console.log(`📡 SettingsData: Fetching ${tabName} data...`);
          const startTime = Date.now();
          const data = await fetcher();
          const fetchTime = Date.now() - startTime;

          // Performance logging
          if (fetchTime > 3000) {
            console.warn(
              `⚠️ SettingsData: Slow fetch for ${tabName}: ${fetchTime}ms`
            );
          } else {
            console.log(
              `✅ SettingsData: ${tabName} fetched in ${fetchTime}ms`
            );
          }

          // Cache the data with performance metadata
          dataCache.current.set(tabName, {
            data: Array.isArray(data) ? data : [],
            timestamp: Date.now(),
            fetchTime,
            size: data?.length || 0,
          });

          // Update table data
          setTableData((prev) => ({
            ...prev,
            [tabName]: Array.isArray(data) ? data : [],
          }));

          console.log(
            `✅ SettingsData: ${tabName} data loaded (${
              data?.length || 0
            } items)`
          );
          return data;
        } catch (error) {
          console.error(`❌ SettingsData: Error fetching ${tabName}:`, error);
          setErrors((prev) => ({
            ...prev,
            [tabName]: error.message || `Failed to load ${tabName} data`,
          }));

          // Return cached data if available, otherwise empty array
          const fallbackData = getImmediateData(tabName);
          setTableData((prev) => ({
            ...prev,
            [tabName]: fallbackData,
          }));

          return fallbackData;
        } finally {
          setLoadingStates((prev) => ({ ...prev, [tabName]: false }));
          fetchPromises.current.delete(tabName);
        }
      })();

      fetchPromises.current.set(tabName, fetchPromise);
      return fetchPromise;
    },
    [fetchers, getCacheStatus, getImmediateData]
  );

  /**
   * Load data for a tab with immediate cache display
   */
  const loadTabData = useCallback(
    (tabName) => {
      // First, show cached data immediately if available
      const immediateData = getImmediateData(tabName);
      if (immediateData.length > 0) {
        setTableData((prev) => ({
          ...prev,
          [tabName]: immediateData,
        }));
      }

      // Then fetch fresh data
      return fetchTabData(tabName);
    },
    [getImmediateData, fetchTabData]
  );

  /**
   * Refresh data for a tab
   */
  const refreshTabData = useCallback(
    (tabName) => {
      return fetchTabData(tabName, { forceRefresh: true });
    },
    [fetchTabData]
  );

  /**
   * Check if tab is currently loading (excluding background refreshes)
   */
  const isTabLoading = useCallback(
    (tabName) => {
      return Boolean(loadingStates[tabName]);
    },
    [loadingStates]
  );

  /**
   * Check if tab has error
   */
  const getTabError = useCallback(
    (tabName) => {
      return errors[tabName] || null;
    },
    [errors]
  );

  /**
   * Check if tab data is stale
   */
  const isTabDataStale = useCallback(
    (tabName) => {
      const { isStale } = getCacheStatus(tabName);
      return isStale;
    },
    [getCacheStatus]
  );

  /**
   * Prefetch data for multiple tabs
   */
  const prefetchTabs = useCallback(
    (tabNames) => {
      return Promise.allSettled(
        tabNames.map((tabName) => fetchTabData(tabName, { background: true }))
      );
    },
    [fetchTabData]
  );

  /**
   * Clear cache for specific tab or all tabs
   */
  const clearCache = useCallback((tabName = null) => {
    if (tabName) {
      dataCache.current.delete(tabName);
      console.log(`🗑️ SettingsData: Cleared cache for ${tabName}`);
    } else {
      dataCache.current.clear();
      console.log(`🗑️ SettingsData: Cleared all cache`);
    }
  }, []);

  /**
   * Get cache statistics for debugging
   */
  const getCacheStats = useCallback(() => {
    const stats = {};
    dataCache.current.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      stats[key] = {
        items: value.data?.length || 0,
        age: age,
        isStale: age > CACHE_TTL * STALE_THRESHOLD,
        isExpired: age > CACHE_TTL,
      };
    });
    return stats;
  }, []);

  // Cleanup on unmount and memory management
  useEffect(() => {
    const promises = fetchPromises.current;

    // Auto-cleanup stale cache entries every 5 minutes
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, cached] of dataCache.current.entries()) {
        const age = now - cached.timestamp;
        // Remove cache entries older than 10 minutes
        if (age > CACHE_TTL * 20) {
          // 20x TTL = 10 minutes
          dataCache.current.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `🧹 SettingsData: Cleaned ${cleanedCount} stale cache entries`
        );
      }
    }, 300000); // Every 5 minutes

    return () => {
      // Cancel any pending requests
      promises.clear();
      clearInterval(cleanupInterval);
    };
  }, []);

  return {
    // Data
    tableData,
    setTableData, // Expose setTableData for infinite scroll

    // Loading states
    isTabLoading,
    loadingStates,

    // Error handling
    getTabError,
    errors,

    // Data management
    loadTabData,
    refreshTabData,
    hasDataForTab,
    getImmediateData,

    // Cache management
    isTabDataStale,
    prefetchTabs,
    clearCache,
    getCacheStats,

    // Utilities
    getCacheStatus,
  };
};

export default useSettingsData;
