/**
 * TanStack Query hooks for static/semi-static data
 * Replaces manual caching for clients, services, staff
 */

import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import {
  fetchClients,
  fetchServices,
  fetchStaffMembers,
} from "../features/scheduling/schedulingSlice";
import { queryKeys } from "../lib/queryClient";
import { isValidToken } from "../utils/authUtils";

/**
 * Hook for fetching clients
 * Replaces: optimizedDataManager.fetchDataType('clients')
 */
export const useClients = (options = {}) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: async () => {
      const result = await dispatch(fetchClients()).unwrap();
      return result;
    },
    enabled: isValidToken(),
    staleTime: 20 * 60 * 1000, // 20 minutes (your current clients TTL)
    gcTime: 60 * 60 * 1000, // 1 hour cache time
    ...options,
  });
};

/**
 * Hook for fetching services
 * Replaces: optimizedDataManager.fetchDataType('services')
 */
export const useServices = (options = {}) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.services.all,
    queryFn: async () => {
      const result = await dispatch(fetchServices()).unwrap();
      return result;
    },
    // Services can be fetched without auth (has fallback)
    enabled: true,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (your current services TTL)
    gcTime: 4 * 60 * 60 * 1000, // 4 hours cache time
    ...options,
  });
};

/**
 * Hook for fetching all staff members
 * Replaces: optimizedDataManager.fetchDataType('staffMembers')
 */
export const useStaffMembers = (options = {}) => {
  const dispatch = useDispatch();

  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: async () => {
      const result = await dispatch(fetchStaffMembers()).unwrap();
      return result;
    },
    enabled: isValidToken(),
    staleTime: 60 * 60 * 1000, // 1 hour (your current staffMembers TTL)
    gcTime: 2 * 60 * 60 * 1000, // 2 hours cache time
    ...options,
  });
};

/**
 * Hook for fetching therapists only
 * Replaces: optimizedDataManager.fetchDataType('therapists')
 */
export const useTherapists = (options = {}) => {
  const staffQuery = useStaffMembers(options);

  return {
    ...staffQuery,
    data: staffQuery.data?.filter((staff) => staff.role === "therapist") || [],
  };
};

/**
 * Hook for fetching drivers only
 * Replaces: optimizedDataManager.fetchDataType('drivers')
 */
export const useDrivers = (options = {}) => {
  const staffQuery = useStaffMembers(options);

  return {
    ...staffQuery,
    data: staffQuery.data?.filter((staff) => staff.role === "driver") || [],
  };
};

/**
 * Client search hook with debouncing
 * Replaces: Complex client search logic in LazyClientSearch
 */
export const useClientSearch = (searchTerm, options = {}) => {
  const { minSearchLength = 2 } = options;

  const clientsQuery = useClients();

  // Filter clients based on search term
  const filteredClients =
    clientsQuery.data?.filter((client) => {
      if (!searchTerm || searchTerm.length < minSearchLength) {
        return false;
      }

      const searchLower = searchTerm.toLowerCase();
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const email = client.email?.toLowerCase() || "";
      const phone = client.phone_number || "";

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchTerm)
      );
    }) || [];

  return {
    clients: filteredClients,
    allClients: clientsQuery.data || [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    refetch: clientsQuery.refetch,
    hasSearchTerm: searchTerm && searchTerm.length >= minSearchLength,
  };
};

/**
 * Combined hook for form data
 * Replaces: Multiple dispatches in AppointmentForm useEffect
 */
export const useFormStaticData = () => {
  const clientsQuery = useClients();
  const servicesQuery = useServices();
  const staffQuery = useStaffMembers();

  return {
    // Data
    clients: clientsQuery.data || [],
    services: servicesQuery.data || [],
    staffMembers: staffQuery.data || [],
    therapists:
      staffQuery.data?.filter((staff) => staff.role === "therapist") || [],
    drivers: staffQuery.data?.filter((staff) => staff.role === "driver") || [],

    // Loading states
    isLoadingClients: clientsQuery.isLoading,
    isLoadingServices: servicesQuery.isLoading,
    isLoadingStaff: staffQuery.isLoading,
    isLoadingAny:
      clientsQuery.isLoading || servicesQuery.isLoading || staffQuery.isLoading,

    // Error states
    clientsError: clientsQuery.error,
    servicesError: servicesQuery.error,
    staffError: staffQuery.error,
    hasAnyError: !!(
      clientsQuery.error ||
      servicesQuery.error ||
      staffQuery.error
    ),

    // Data ready state
    isReady: !!(clientsQuery.data && servicesQuery.data && staffQuery.data),

    // Refetch functions
    refetchAll: () => {
      clientsQuery.refetch();
      servicesQuery.refetch();
      staffQuery.refetch();
    },
  };
};
