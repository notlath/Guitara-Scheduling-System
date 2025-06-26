import { useQuery } from "@tanstack/react-query";
import { fetchMaterialsWithStock } from "../services/materialsWithStockApi";

export const useMaterialsWithStock = (serviceId, options = {}) => {
  return useQuery({
    queryKey: ["materials-with-stock", serviceId],
    queryFn: () => fetchMaterialsWithStock(serviceId),
    enabled: !!serviceId, // Only run when serviceId exists
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes to reduce refetches
    gcTime: 5 * 60 * 1000, // Keep data for 5 minutes
    refetchOnWindowFocus: false, // Disable window focus refetch to reduce unnecessary calls
    refetchOnMount: true,
    networkMode: "always",
    ...options,
  });
};
