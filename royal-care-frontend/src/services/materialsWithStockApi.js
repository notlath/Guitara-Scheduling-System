import axios from "axios";
import { getToken } from "../utils/tokenManager";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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

export const fetchMaterialsWithStock = async (serviceId) => {
  console.log("🌐 fetchMaterialsWithStock called for serviceId:", serviceId);

  // Add cache-busting parameter to ensure fresh data
  const cacheBuster = `?_t=${Date.now()}`;
  const url = `${API_BASE}/registration/materials-with-stock/${serviceId}/${cacheBuster}`;

  console.log("🌐 Making request to URL:", url);

  try {
    const response = await axiosAuth.get(url);
    console.log("✅ Materials API response:", {
      status: response.status,
      data: response.data,
      dataType: typeof response.data,
      dataLength: Array.isArray(response.data)
        ? response.data.length
        : "not array",
    });

    // Extract results from the API response structure
    if (response.data && response.data.results) {
      console.log(
        "✅ Extracting materials from results:",
        response.data.results
      );
      return response.data.results;
    }

    // Fallback: if data is already an array, return it directly
    if (Array.isArray(response.data)) {
      console.log("✅ Materials data is already an array:", response.data);
      return response.data;
    }

    // If no results found, return empty array
    console.log("⚠️ No materials found, returning empty array");
    return [];
  } catch (error) {
    console.error("❌ Materials API error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: url,
    });
    throw error;
  }
};
