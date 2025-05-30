/**
 * API security utilities
 */

import { sanitizeObject } from "./sanitization";

/**
 * Sanitizes API request data before sending to the server
 * @param {object} data - The request data to sanitize
 * @param {Array} excludeFields - Fields to exclude from sanitization (e.g. passwords)
 * @returns {object} - The sanitized request data
 */
export const sanitizeRequest = (data, excludeFields = []) => {
  // Create a copy of the data to avoid mutating the original
  const sanitizedData = { ...data };

  // Skip sanitization for excluded fields
  excludeFields.forEach((field) => {
    if (sanitizedData[field] !== undefined) {
      const originalValue = data[field];
      const modifiedData = sanitizeObject(sanitizedData);
      modifiedData[field] = originalValue;
      return modifiedData;
    }
  });

  return sanitizeObject(sanitizedData);
};

/**
 * Create a sanitized API client wrapper
 * @param {object} apiClient - The API client to wrap
 * @returns {object} - A wrapped API client with sanitization
 */
export const createSanitizedApiClient = (apiClient) => {
  return {
    get: async (url, config) => apiClient.get(url, config),

    post: async (url, data, config) => {
      const sanitizedData = sanitizeRequest(data, ["password"]);
      return apiClient.post(url, sanitizedData, config);
    },

    put: async (url, data, config) => {
      const sanitizedData = sanitizeRequest(data, ["password"]);
      return apiClient.put(url, sanitizedData, config);
    },

    patch: async (url, data, config) => {
      const sanitizedData = sanitizeRequest(data, ["password"]);
      return apiClient.patch(url, sanitizedData, config);
    },

    delete: async (url, config) => apiClient.delete(url, config),
  };
};
