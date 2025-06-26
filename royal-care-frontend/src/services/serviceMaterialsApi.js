import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const fetchServicesWithMaterials = async () => {
  const response = await axios.get(`${API_BASE}/registration/register/service/`);
  return response.data;
};
