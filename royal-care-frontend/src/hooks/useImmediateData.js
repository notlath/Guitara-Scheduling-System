/**
 * Simple hook for immediate data display
 * Provides data using the optimized data manager
 */

import { useCallback, useEffect, useState } from "react";
import { useOptimizedData } from "./useOptimizedData";

/**
 * Hook for immediate data display with optimized loading
 * Shows data immediately from cache or Redux state
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
  });

  const {
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    error,
    forceRefresh,
    hasData,
  } = useOptimizedData(componentName, dataTypes, options);

  // Update display data when new data arrives
  useEffect(() => {
    const newData = {
      appointments,
      todayAppointments,
      upcomingAppointments,
      notifications,
      isComplete: !loading,
      lastUpdated: Date.now(),
    };

    // Always update display data when we have new data
    if (hasData) {
      setDisplayData(newData);

      if (!progressiveLoading.hasShownData) {
        setProgressiveLoading((prev) => ({
          ...prev,
          hasShownData: true,
          initialLoad: false,
        }));
      }
    }
  }, [
    appointments,
    todayAppointments,
    upcomingAppointments,
    notifications,
    loading,
    hasData,
    progressiveLoading.hasShownData,
  ]);

  // Smart refresh function
  const smartRefresh = useCallback(
    async (showImmediate = false) => {
      try {
        await forceRefresh();
      } catch (error) {
        console.warn("Smart refresh failed:", error);
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
    showSkeleton: progressiveLoading.initialLoad && !hasData,
    hasData: progressiveLoading.hasShownData,
    isComplete: displayData.isComplete,

    // Error state
    error,

    // Actions
    refresh: smartRefresh,
    forceRefresh,

    // Debug info
    dataSource: hasData ? "optimized" : "loading",
    metrics: {
      hasShownData: progressiveLoading.hasShownData,
      initialLoad: progressiveLoading.initialLoad,
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
