import axios from "axios";

// Create the base Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Import sanitization utilities
import { sanitizeFormInput } from "../utils/formSanitization";

// Add JWT token and sanitize data in requests
api.interceptors.request.use(
  (config) => {
    // Special handling for auth endpoints
    if (config.url && config.url.includes("/auth/")) {
      // Log auth request details in development mode
      if (import.meta.env.MODE === "development") {
        console.log(`Auth Request [${config.method}] ${config.url}:`, {
          headers: config.headers,
          data: config.data,
        });
      }

      // Ensure data is properly formatted for Django REST
      if (config.method === "post" && config.data) {
        // Make sure we're sending a proper content type
        config.headers["Content-Type"] = "application/json";
      }

      return config;
    }

    // Sanitize request data for all non-auth endpoints
    if (config.data && typeof config.data === "object") {
      // Skip sanitization for these fields
      const skipFields = ["password", "token", "code", "email"];

      // Create a shallow copy of the data
      let sanitizedData = { ...config.data };

      // Store the values of fields to skip
      const skippedValues = {};
      skipFields.forEach((field) => {
        if (sanitizedData[field] !== undefined) {
          skippedValues[field] = sanitizedData[field];
        }
      });

      // Only aggressively sanitize the 'description' field
      if (sanitizedData.description) {
        sanitizedData.description = sanitizeFormInput(sanitizedData.description);
      }

      // For all other fields, preserve case and normal characters
      Object.keys(sanitizedData).forEach((key) => {
        if (
          !skipFields.includes(key) &&
          key !== "description" &&
          typeof sanitizedData[key] === "string"
        ) {
          // Only trim whitespace, do not lowercase or remove characters
          sanitizedData[key] = sanitizedData[key].trim();
        }
      });

      // Restore skipped fields
      Object.keys(skippedValues).forEach((field) => {
        sanitizedData[field] = skippedValues[field];
      });

      config.data = sanitizedData;
    }

    const token = localStorage.getItem("knoxToken");
    if (token) config.headers.Authorization = `Token ${token}`;
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptors for better error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses when in development
    if (import.meta.env.MODE === "development") {
      console.log(
        `API Success [${response.config.method}] ${response.config.url}:`,
        response.data
      );
    }
    return response;
  },
  (error) => {
    // Handle response errors
    if (error.response) {
      // Extract the most useful error message
      let errorMessage = "An unknown error occurred";

      if (error.response.data) {
        const data = error.response.data;

        // Handle different error formats from Django REST Framework
        if (data.non_field_errors && data.non_field_errors.length > 0) {
          errorMessage = data.non_field_errors[0];
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === "object") {
          // Try to extract first error message from any field
          const firstErrorKey = Object.keys(data)[0];
          if (firstErrorKey && Array.isArray(data[firstErrorKey])) {
            errorMessage = `${firstErrorKey}: ${data[firstErrorKey][0]}`;
          }
        }
      }

      // Log detailed error information
      console.error(
        `API Error [${error.config?.method}] ${error.config?.url}:`,
        {
          status: error.response.status,
          data: error.response.data,
          message: errorMessage,
          headers: error.response.headers,
        }
      );

      // Attach the extracted error message to the error object for easy access
      error.errorMessage = errorMessage;

      // Handle specific error status codes
      switch (error.response.status) {
        case 401:
          console.warn("Authentication error - you may need to log in again");
          break;
        case 403:
          console.warn("You don't have permission to access this resource");
          break;
        case 400:
          console.warn(
            "Invalid request format or validation error:",
            errorMessage
          );
          break;
      }
    } else if (error.request) {
      // Request made but no response received
      console.error("No response received:", error.request);
      error.errorMessage =
        "No response from server - please check your connection";
    } else {
      // Something else caused the error
      console.error("Error setting up request:", error.message);
      error.errorMessage = "Error connecting to server";
    }

    return Promise.reject(error);
  }
);

// Registration API functions
export const registerTherapist = (data) => api.post("/registration/register/therapist/", data);
export const registerDriver = (data) => api.post("/registration/register/driver/", data);
export const registerOperator = (data) => api.post("/registration/register/operator/", data);
export const registerMaterial = (data) => api.post("/registration/register/material/", data);
export const registerService = (data) => api.post("/registration/register/service/", data);
