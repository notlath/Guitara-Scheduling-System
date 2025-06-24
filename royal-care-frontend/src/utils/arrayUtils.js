/**
 * Array Utility Functions for Production Safety
 *
 * These functions prevent the "TypeError: m.filter is not a function" error
 * that occurs when trying to call array methods on non-array data.
 */

/**
 * Safely ensures data is an array before filtering
 * @param {any} data - Data that should be an array
 * @param {Function} filterFn - Filter function to apply
 * @returns {Array} - Filtered array or empty array if data is not an array
 */
export const safeFilter = (data, filterFn) => {
  if (!Array.isArray(data)) {
    console.warn(
      "⚠️ safeFilter: Data is not an array, returning empty array:",
      typeof data,
      data
    );
    return [];
  }
  return data.filter(filterFn);
};

/**
 * Safely ensures data is an array
 * @param {any} data - Data that should be an array
 * @param {Array} fallback - Fallback array to return if data is not an array
 * @returns {Array} - The original array or fallback array
 */
export const ensureArray = (data, fallback = []) => {
  if (!Array.isArray(data)) {
    console.warn(
      "⚠️ ensureArray: Data is not an array, returning fallback:",
      typeof data,
      data
    );
    return fallback;
  }
  return data;
};

/**
 * Safely maps over data with array validation
 * @param {any} data - Data that should be an array
 * @param {Function} mapFn - Map function to apply
 * @returns {Array} - Mapped array or empty array if data is not an array
 */
export const safeMap = (data, mapFn) => {
  if (!Array.isArray(data)) {
    console.warn(
      "⚠️ safeMap: Data is not an array, returning empty array:",
      typeof data,
      data
    );
    return [];
  }
  return data.map(mapFn);
};

/**
 * Safely gets length of data with array validation
 * @param {any} data - Data that should be an array
 * @returns {number} - Length of array or 0 if data is not an array
 */
export const safeLength = (data) => {
  if (!Array.isArray(data)) {
    console.warn(
      "⚠️ safeLength: Data is not an array, returning 0:",
      typeof data,
      data
    );
    return 0;
  }
  return data.length;
};
