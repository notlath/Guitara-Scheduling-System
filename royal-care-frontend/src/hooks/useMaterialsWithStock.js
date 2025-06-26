import { useQuery } from "@tanstack/react-query";
import { fetchMaterialsWithStock } from "../services/materialsWithStockApi";

export const useMaterialsWithStock = (serviceId, options = {}) => {
  return useQuery({
    queryKey: ["materials-with-stock", serviceId],
    queryFn: () => fetchMaterialsWithStock(serviceId),
    enabled: !!serviceId,
    staleTime: 0, // Always consider data stale
    gcTime: 5 * 60 * 1000, // Keep data for 5 minutes to prevent loading states during refetch
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    networkMode: 'always', // Always hit network, but keep previous data during refetch
    ...options,
  });
};
