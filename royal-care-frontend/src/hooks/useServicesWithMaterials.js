import { useQuery } from "@tanstack/react-query";
import { fetchServicesWithMaterials } from "../services/serviceMaterialsApi";

export const useServicesWithMaterials = (options = {}) => {
  return useQuery({
    queryKey: ["services-with-materials"],
    queryFn: fetchServicesWithMaterials,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
    ...options,
  });
};
