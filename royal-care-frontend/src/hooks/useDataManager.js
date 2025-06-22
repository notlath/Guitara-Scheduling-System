/**
 * Legacy useDataManager hook - DEPRECATED
 *
 * This hook has been migrated to TanStack Query for better performance.
 * This file exists only for backward compatibility.
 *
 * Please migrate to TanStack Query hooks instead:
 * import { useEnhancedDashboardData } from "./useEnhancedDashboardData";
 * import { useOperatorDashboardData, useTherapistDashboardData, useDriverDashboardData } from "./useDashboardQueries";
 */

// import { useOptimizedData } from "./useOptimizedData"; // Removed - migrated to TanStack Query

/**
 * @deprecated Use TanStack Query hooks instead (useEnhancedDashboardData, useDashboardQueries)
 */
export const useDataManager = (componentName, dataTypes = [], options = {}) => {
  console.warn(
    `⚠️ useDataManager is deprecated. Component "${componentName}" should migrate to TanStack Query hooks for better performance.`
  );

  console.warn(
    "Migration guide: Use useEnhancedDashboardData or specific dashboard hooks from useDashboardQueries"
  );

  throw new Error(
    "useDataManager has been removed. Please migrate to TanStack Query hooks."
  );
};

export default useDataManager;
