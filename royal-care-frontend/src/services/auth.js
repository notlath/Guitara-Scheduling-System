// src/services/auth.js
import axios from "axios";

const API_URL = "http://localhost:8000/api/auth/";

export const login = async (username, password) => {
  try {
    const response = await axios.post(API_URL + "login/", { username, password });
    return response;
  } catch (error) {
    // Handle specific disabled account errors
    if (error.response?.status === 403) {
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message;
      
      if (errorCode === 'ACCOUNT_DISABLED') {
        throw new Error('Your account has been disabled. Please contact your administrator for assistance.');
      }
      
      if (errorCode === 'THERAPIST_DISABLED' || errorCode === 'THERAPIST_INACTIVE') {
        throw new Error('Your therapist account is currently inactive. Please contact your supervisor for assistance.');
      }
      
      if (errorCode === 'DRIVER_DISABLED' || errorCode === 'DRIVER_INACTIVE') {
        throw new Error('Your driver account is currently inactive. Please contact your supervisor for assistance.');
      }
      
      if (errorCode === 'OPERATOR_DISABLED' || errorCode === 'OPERATOR_INACTIVE') {
        throw new Error('Your operator account is currently inactive. Please contact your administrator for assistance.');
      }
      
      // Generic disabled account message
      if (errorMessage && errorMessage.toLowerCase().includes('disabled')) {
        throw new Error('Your account has been disabled. Please contact support for assistance.');
      }
    }
    
    // Handle other error statuses
    if (error.response?.status === 401) {
      throw new Error('Invalid username or password. Please try again.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Too many login attempts. Please try again later.');
    }
    
    // Default error message
    throw new Error(error.response?.data?.message || error.response?.data?.error || 'Login failed. Please try again.');
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
      return { valid: false, reason: 'NO_TOKEN' };
    }
    
    // For now, we'll skip actual validation since the appropriate endpoint doesn't exist
    // Instead, we'll just return valid: true to allow normal flow
    // The real validation will happen when the user actually tries to access protected resources
    console.log("Token validation skipped - endpoint not available");
    return { 
      valid: true, 
      reason: 'VALIDATION_SKIPPED',
      message: 'Token validation endpoint not available, assuming valid'
    };
    
  } catch (error) {
    // If there are any errors, just assume the token is valid
    // This prevents blocking the app startup
    console.log("Token validation error:", error.message);
    return { 
      valid: true, 
      reason: 'VALIDATION_ERROR',
      message: 'Token validation failed, assuming valid'
    };
  }
};
