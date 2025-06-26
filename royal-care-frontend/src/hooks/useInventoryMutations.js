import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { getToken } from "../utils/tokenManager";

// Query key constants for consistency with other hooks
const INVENTORY_ITEMS = ["inventory-items"];
const MATERIALS_WITH_STOCK = ["materials-with-stock"];
const USAGE_LOGS = ["usage-logs"];

const API_BASE_URL = import.meta.env.PROD
  ? "https://charismatic-appreciation-production.up.railway.app/api"
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const INVENTORY_API_URL = `${API_BASE_URL}/inventory/`;

// Create axios instance with auth
const axiosAuth = axios.create();
axiosAuth.interceptors.request.use((config) => {
  const token = getToken();
  if (token && token !== "undefined" && token.trim() !== "") {
    config.headers["Authorization"] = `Token ${token}`;
  } else {
    delete config.headers["Authorization"];
  }
  return config;
});

// Update inventory item
const updateInventoryItem = async (updatedItem) => {
  const response = await axiosAuth.put(
    `${INVENTORY_API_URL}${updatedItem.id}/`,
    updatedItem
  );
  return response.data;
};

// Restock inventory item
const restockInventoryItem = async ({ itemId, amount, notes }) => {
  const response = await axiosAuth.post(
    `${INVENTORY_API_URL}${itemId}/restock/`,
    { amount, notes }
  );
  return response.data;
};

// Add new inventory item
const addInventoryItem = async (newItem) => {
  const response = await axiosAuth.post(INVENTORY_API_URL, newItem);
  return response.data;
};

// Hook for updating inventory items
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateInventoryItem,
    onSuccess: () => {
      // Invalidate queries to mark them as stale and trigger refetch
      // This keeps existing data visible during refetch
      queryClient.invalidateQueries({ queryKey: [INVENTORY_ITEMS] });
      queryClient.invalidateQueries({ queryKey: [MATERIALS_WITH_STOCK] });
    },
    onError: (error) => {
      console.error("Failed to update inventory item:", error);
    },
  });
};

// Hook for restocking inventory items
export const useRestockInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: restockInventoryItem,
    onSuccess: () => {
      // Invalidate queries to mark them as stale and trigger refetch
      // This keeps existing data visible during refetch
      queryClient.invalidateQueries({ queryKey: [INVENTORY_ITEMS] });
      queryClient.invalidateQueries({ queryKey: [MATERIALS_WITH_STOCK] });
      queryClient.invalidateQueries({ queryKey: [USAGE_LOGS] });
    },
    onError: (error) => {
      console.error("Failed to restock inventory item:", error);
    },
  });
};

// Hook for adding inventory items
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addInventoryItem,
    onSuccess: () => {
      // Invalidate queries to mark them as stale and trigger refetch
      // This keeps existing data visible during refetch
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["materials-with-stock"] });
    },
    onError: (error) => {
      console.error("Failed to add inventory item:", error);
    },
  });
};
