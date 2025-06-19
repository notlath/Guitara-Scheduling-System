/**
 * Legacy useDataManager hook - DEPRECATED
 *
 * This hook has been replaced by useOptimizedData for better performance.
 * This file exists only for backward compatibility.
 *
 * Please migrate to useOptimizedData instead:
 * import { useOptimizedData } from "./useOptimizedData";
 */

import { useOptimizedData } from "./useOptimizedData";

/**
 * @deprecated Use useOptimizedData instead
 */
export const useDataManager = (componentName, dataTypes = [], options = {}) => {
  console.warn(
    `⚠️ useDataManager is deprecated. Component "${componentName}" should migrate to useOptimizedData for better performance.`
  );

  return useOptimizedData(componentName, dataTypes, options);
};

export default useDataManager;
