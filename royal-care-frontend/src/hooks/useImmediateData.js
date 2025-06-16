/**
 * Smart hook for immediate data display patterns
 * Provides cached data immediately while fetching fresh data in background
 */

import { useCallback, useEffect, useState } from "react";
import { useDataManager } from "./useDataManager";

/**
 * Hook for immediate data display with progressive loading
 * Shows cached data instantly, then updates with fresh data
 *
 * @param {string} componentName - Component identifier
 * @param {Array} dataTypes - Data types to fetch
 * @param {Object} options - Additional options
 * @returns {Object} Data and loading states optimized for immediate display
 */
export const useImmediateData = (
  componentName,
  dataTypes = [],
  options = {}
) => {
  const [displayData, setDisplayData] = useState({
    appointments: [],
    todayAppointments: [],
    upcomingAppointments: [],
    notifications: [],
    isComplete: false,
    lastUpdated: null,
  });

  const [progressiveLoading, setProgressiveLoading] = useState({
    initialLoad: true,
    hasShownData: false,
    backgroundRefresh: false,
  });

  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    isStaleData,
    error,
    forceRefresh,
    refreshIfStale,
  } = useDataManager(componentName, dataTypes, options);

  // Update display data when new data arrives
  useEffect(() => {
    const newData = {
      appointments,
      todayAppointments,
      upcomingAppointments,
      notifications,
      isComplete: !loading && !isRefreshing,
      lastUpdated: Date.now(),
    };

    // Always update display data when we have new data
    if (hasImmediateData || hasAnyData) {
      setDisplayData(newData);

      if (!progressiveLoading.hasShownData) {
        setProgressiveLoading((prev) => ({
          ...prev,
          hasShownData: true,
          initialLoad: false,
        }));
      }
    }

    // Track background refresh state
    setProgressiveLoading((prev) => ({
      ...prev,
      backgroundRefresh: isRefreshing && hasAnyData,
    }));
  }, [
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    isRefreshing,
    hasImmediateData,
    hasAnyData,
    progressiveLoading.hasShownData,
  ]);

  // Auto-refresh stale data in background
  useEffect(() => {
    if (isStaleData && hasAnyData) {
      console.log(
        `🔄 ${componentName}: Auto-refreshing stale data in background`
      );
      refreshIfStale();
    }
  }, [isStaleData, hasAnyData, refreshIfStale, componentName]);

  // Smart refresh function with immediate feedback
  const smartRefresh = useCallback(
    async (showImmediate = false) => {
      if (showImmediate) {
        setProgressiveLoading((prev) => ({ ...prev, backgroundRefresh: true }));
      }

      try {
        await forceRefresh();
      } finally {
        setProgressiveLoading((prev) => ({
          ...prev,
          backgroundRefresh: false,
        }));
      }
    },
    [forceRefresh]
  );

  return {
    // Data optimized for immediate display
    data: displayData,

    // Smart loading states
    isInitialLoading:
      progressiveLoading.initialLoad && !progressiveLoading.hasShownData,
    isRefreshing: progressiveLoading.backgroundRefresh,
    showSkeleton: progressiveLoading.initialLoad && !hasAnyData,
    hasData: progressiveLoading.hasShownData,
    isComplete: displayData.isComplete,

    // Data quality indicators
    isStale: isStaleData,
    lastUpdated: displayData.lastUpdated,

    // Error state
    error,

    // Actions
    refresh: smartRefresh,
    forceRefresh,

    // Debug info
    dataSource: hasImmediateData ? "cache" : "fresh",
    metrics: {
      hasShownData: progressiveLoading.hasShownData,
      initialLoad: progressiveLoading.initialLoad,
      backgroundRefresh: progressiveLoading.backgroundRefresh,
    },
  };
};

/**
 * Hook for optimistic loading pattern
 * Shows partial data immediately while loading complete data
 */
export const useOptimisticLoading = (componentName, dataType, options = {}) => {
  const { minimumFields = [], ...restOptions } = options;

  const fullData = useImmediateData(componentName, [dataType], restOptions);

  const [optimisticState, setOptimisticState] = useState({
    partialData: [],
    isPartial: false,
    missingFields: [],
  });

  // Check if we have partial data that can be shown immediately
  useEffect(() => {
    if (fullData.hasData && fullData.data[dataType]) {
      const items = fullData.data[dataType];

      if (items.length > 0 && minimumFields.length > 0) {
        // Check if we have at least the minimum required fields
        const firstItem = items[0];
        const missingFields = minimumFields.filter(
          (field) => !(field in firstItem)
        );

        setOptimisticState({
          partialData: items,
          isPartial: missingFields.length > 0,
          missingFields,
        });
      } else {
        setOptimisticState({
          partialData: items,
          isPartial: false,
          missingFields: [],
        });
      }
    }
  }, [fullData.hasData, fullData.data, dataType, minimumFields]);

  return {
    ...fullData,
    // Optimistic data access
    partialData: optimisticState.partialData,
    isPartialData: optimisticState.isPartial,
    missingFields: optimisticState.missingFields,

    // Show loading only if no partial data available
    showLoading:
      fullData.isInitialLoading && optimisticState.partialData.length === 0,
  };
};

/**
 * Hook for route-based data prefetching
 * Automatically prefetches data when route changes
 */
export const useRoutePrefetch = () => {
  const prefetchData = useCallback((route, dataTypes = []) => {
    // Import dataManager dynamically to avoid circular dependencies
    import("../services/dataManager.js").then(({ default: dataManager }) => {
      console.log(
        `🚀 Route prefetch: Prefetching data for ${route}:`,
        dataTypes
      );

      dataTypes.forEach((dataType) => {
        // Check if data is stale or missing
        const cached = dataManager.cache.get(dataType);
        if (!cached || !dataManager.isCacheValid(dataType)) {
          dataManager.fetchDataType(dataType).catch((error) => {
            console.warn(
              `⚠️ Route prefetch failed for ${dataType}:`,
              error.message
            );
          });
        }
      });
    });
  }, []);

  return { prefetchData };
};

export default useImmediateData;
