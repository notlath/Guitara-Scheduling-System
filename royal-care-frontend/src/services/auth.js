// src/services/auth.js
import axios from "axios";

const API_URL = "http://localhost:8000/api/auth/";

export const login = async (username, password) => {
  try {
    const response = await axios.post(API_URL + "login/", {
      username,
      password,
    });
    return response;
  } catch (error) {
    // Handle specific disabled account errors
    if (error.response?.status === 403) {
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message;

      if (errorCode === "ACCOUNT_DISABLED") {
        throw new Error(
          "Your account has been disabled. Please contact your administrator for assistance."
        );
      }

      if (
        errorCode === "THERAPIST_DISABLED" ||
        errorCode === "THERAPIST_INACTIVE"
      ) {
        throw new Error(
          "Your therapist account is currently inactive. Please contact your supervisor for assistance."
        );
      }

      if (errorCode === "DRIVER_DISABLED" || errorCode === "DRIVER_INACTIVE") {
        throw new Error(
          "Your driver account is currently inactive. Please contact your supervisor for assistance."
        );
      }

      if (
        errorCode === "OPERATOR_DISABLED" ||
        errorCode === "OPERATOR_INACTIVE"
      ) {
        throw new Error(
          "Your operator account is currently inactive. Please contact your administrator for assistance."
        );
      }

      // Generic disabled account message
      if (errorMessage && errorMessage.toLowerCase().includes("disabled")) {
        throw new Error(
          "Your account has been disabled. Please contact support for assistance."
        );
      }
    }

    // Handle other error statuses
    if (error.response?.status === 401) {
      throw new Error("Invalid username or password. Please try again.");
    }

    if (error.response?.status === 429) {
      throw new Error("Too many login attempts. Please try again later.");
    }

    // Default error message
    throw new Error(
      error.response?.data?.message ||
        error.response?.data?.error ||
        "Login failed. Please try again."
    );
  }
};

export const register = (userData) => {
  return axios.post(API_URL + "register/", userData);
};

// Function to validate if the current token is still valid
// This is optional and used only to prevent infinite loops with disabled accounts
export const validateToken = async () => {
  try {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return { valid: false, reason: "NO_TOKEN" };
    }

    // For now, we'll skip actual validation since the appropriate endpoint doesn't exist
    // Instead, we'll just return valid: true to allow normal flow
    // The real validation will happen when the user actually tries to access protected resources
    console.log("Token validation skipped - endpoint not available");
    return {
      valid: true,
      reason: "VALIDATION_SKIPPED",
      message: "Token validation endpoint not available, assuming valid",
    };
  } catch (error) {
    // If there are any errors, just assume the token is valid
    // This prevents blocking the app startup
    console.log("Token validation error:", error.message);
    return {
      valid: true,
      reason: "VALIDATION_ERROR",
      message: "Token validation failed, assuming valid",
    };
  }
};

// Function to check if a specific user account is active
// Used to poll account status for recently disabled users
export const checkAccountStatus = async (username) => {
  try {
    const response = await axios.post("http://localhost:8000/api/auth/check-account-status/", {
      username,
    });
    
    return {
      success: true,
      isActive: response.data.is_active,
      message: response.data.message || "Account status checked successfully",
    };
  } catch (error) {
    // Handle specific error responses
    if (error.response?.status === 404) {
      return {
        success: false,
        isActive: false,
        message: "Account not found",
      };
    }
    
    if (error.response?.status === 403) {
      return {
        success: false,
        isActive: false,
        message: "Account is disabled",
      };
    }
    
    // Network or other errors
    return {
      success: false,
      isActive: false,
      message: error.response?.data?.message || "Unable to check account status",
    };
  }
};

// Function to start polling account status for a disabled user
// Returns a promise that resolves when the account becomes active
export const pollAccountStatus = (username, onStatusChange, maxAttempts = 60, intervalMs = 5000) => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const status = await checkAccountStatus(username);
        
        // Notify caller of status change
        if (onStatusChange) {
          onStatusChange({
            attempt: attempts,
            maxAttempts,
            status: status.isActive ? 'active' : 'disabled',
            message: status.message,
          });
        }
        
        // If account is now active, resolve
        if (status.success && status.isActive) {
          clearInterval(pollInterval);
          resolve({
            success: true,
            message: "Account has been re-enabled",
            attempts,
          });
          return;
        }
        
        // If we've reached max attempts, stop polling
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          resolve({
            success: false,
            message: "Polling timeout - account still disabled",
            attempts,
          });
          return;
        }
        
      } catch (error) {
        console.error("Error polling account status:", error);
        
        // On error, continue polling unless we've reached max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          reject({
            success: false,
            message: "Polling failed due to errors",
            error: error.message,
            attempts,
          });
        }
      }
    }, intervalMs);
    
    // Return a cleanup function
    return () => clearInterval(pollInterval);
  });
};
