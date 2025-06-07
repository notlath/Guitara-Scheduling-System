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
export const validateToken = async () => {
  try {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      return { valid: false, reason: 'NO_TOKEN' };
    }
    
    // Try to validate with a simple API call instead of a specific validate endpoint
    // In case the validate-token endpoint doesn't exist, use the user profile endpoint
    const response = await axios.get("http://localhost:8000/api/auth/user/", {
      headers: {
        Authorization: token.startsWith("Token ") ? token : `Token ${token}`,
      },
    });
    
    return { valid: true, user: response.data };
  } catch (error) {
    // Check if it's a disabled account error
    if (error.response?.status === 403) {
      const errorCode = error.response?.data?.error;
      if (errorCode && errorCode.includes('DISABLED')) {
        return { 
          valid: false, 
          reason: 'ACCOUNT_DISABLED',
          errorCode: errorCode,
          message: error.response?.data?.message 
        };
      }
    }
    
    // Handle 404 or other errors - just mark token as invalid
    return { 
      valid: false, 
      reason: error.response?.status === 404 ? 'ENDPOINT_NOT_FOUND' : 'INVALID_TOKEN',
      message: error.response?.data?.message || 'Token validation failed'
    };
  }
};
