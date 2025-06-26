import axios from "axios";
import { getToken } from "../utils/tokenManager";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Create axios instance with auth
const axiosAuth = axios.create();
axiosAuth.interceptors.request.use((config) => {
  const token = getToken();
  if (token && token !== "undefined" && token.trim() !== "") {
    config.headers["Authorization"] = `Token ${token}`;
  } else {
    delete config.headers["Authorization"];
  }
  
  // Add only standard cache-busting headers that won't trigger CORS preflight
  config.headers["Cache-Control"] = "no-cache";
  
  return config;
});

export const fetchInventoryItems = async () => {
  // Add cache-busting parameter to ensure fresh data
  const cacheBuster = `?_t=${Date.now()}`;
  const response = await axiosAuth.get(`${API_BASE}/inventory/${cacheBuster}`);
  // Handle both paginated and non-paginated responses
  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return Array.isArray(response.data) ? response.data : [];
};
