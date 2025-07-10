// API Configuration
// This centralizes API URL configuration and removes hardcoded production URLs

export const getApiBaseUrl = () => {
  // In production, use the environment variable for the production URL
  // This prevents hardcoded URLs from being detected as secrets
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL_PROD || 
           import.meta.env.VITE_API_BASE_URL || 
           "http://localhost:8000/api";
  }
  
  // In development, use the environment variable or localhost
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
};

export const getWebSocketUrl = () => {
  // In production, use the environment variable for the production WebSocket URL
  if (import.meta.env.PROD) {
    const baseUrl = import.meta.env.VITE_WS_BASE_URL_PROD || 
                   import.meta.env.VITE_WS_BASE_URL || 
                   "ws://localhost:8000";
    return `${baseUrl}/ws/scheduling/appointments/`;
  }
  
  // In development, use the environment variable or localhost
  const baseUrl = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
  return `${baseUrl}/ws/scheduling/appointments/`;
};

// Default API base URL constant (backwards compatibility)
export const API_BASE_URL = getApiBaseUrl();
