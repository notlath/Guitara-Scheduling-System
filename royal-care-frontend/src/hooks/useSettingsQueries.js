/**
 * TanStack Query hooks for Settings Data Page
 * Replaces custom useSettingsData hoo  therapists: async (page = 1, pageSize = DEFAULT_PA  operators: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/operator  services: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/service/?page=${page}&page_size=${pageSize}`;
    // TODO: Backend doesn't support search yet - temporarily disabled
    // if (search.trim()) {
    //   url += `&search=${encodeURIComponent(search)}`;
    // }
    
    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    
    // Apply frontend filtering as fallback until backend supports search
    let filteredItems = items;
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filteredItems = items.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const description = (item.description || "").toLowerCase();
        
        return name.includes(searchLower) ||
               description.includes(searchLower);
      });
    }
    
    const mappedItems = filteredItems.map((item) => ({ge}&page_size=${pageSize}`;
    // TODO: Backend doesn't support search yet - temporarily disabled
    // if (search.trim()) {
    //   url += `&search=${encodeURIComponent(search)}`;
    // }
    
    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    
    // Apply frontend filtering as fallback until backend supports search
    let filteredItems = items;
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filteredItems = items.filter((item) => {
        const firstName = (item.first_name || "").toLowerCase();
        const lastName = (item.last_name || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const phoneNumber = (item.phone_number || "").toLowerCase();
        const employeeId = (item.employee_id || "").toLowerCase();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               email.includes(searchLower) ||
               phoneNumber.includes(searchLower) ||
               employeeId.includes(searchLower);
      });
    }
    
    const mappedItems = filteredItems.map((item) => ({arch = "") => {
    let url = `/registration/register/therapist/?page=${page}&page_size=${pageSize}`;
    // TODO: Backend doesn't support search yet - temporarily disabled
    // if (search.trim()) {
    //   url += `&search=${encodeURIComponent(search)}`;
    // }
    
    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    
    // Apply frontend filtering as fallback until backend supports search
    let filteredItems = items;
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filteredItems = items.filter((item) => {
        const firstName = (item.first_name || "").toLowerCase();
        const lastName = (item.last_name || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const phoneNumber = (item.phone_number || "").toLowerCase();
        const employeeId = (item.employee_id || "").toLowerCase();
        
        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               email.includes(searchLower) ||
               phoneNumber.includes(searchLower) ||
               employeeId.includes(searchLower);
      });
    }
    
    const mappedItems = filteredItems.map((item) => ({er React Query implementation
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import { api } from "../services/api";

// Default page size for settings data
const DEFAULT_PAGE_SIZE = 12;

/**
 * Custom API fetcher functions for each settings data type
 */
const settingsApiFetchers = {
  therapists: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/therapist/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    // Handle both old format (direct array) and new format (with results)
    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => ({
      Username: item.username,
      Name: `${capitalizeName(item.first_name) || ""} ${
        capitalizeName(item.last_name) || ""
      }`.trim(),
      Email: item.email,
      Contact: item.phone_number || "-",
      Specialization: item.specialization || "-",
      Pressure: item.pressure
        ? item.pressure.charAt(0).toUpperCase() + item.pressure.slice(1)
        : "-",
    }));

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },

  drivers: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/driver/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => ({
      Username: item.username,
      Name: `${capitalizeName(item.first_name) || ""} ${
        capitalizeName(item.last_name) || ""
      }`.trim(),
      Email: item.email,
      Contact: item.phone_number || "-",
      Specialization: item.motorcycle_plate || "N/A",
      Pressure: "N/A",
    }));

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },

  operators: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/operator/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => {
      const firstName = capitalizeName(item.first_name || "");
      const lastName = capitalizeName(item.last_name || "");
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

      return {
        Username: item.username || "N/A",
        Name: fullName,
        Email: item.email || "N/A",
        Contact: item.phone_number || "N/A",
        Specialization: "N/A",
        Pressure: "N/A",
      };
    });

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },

  clients: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/client/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => ({
      Name: `${capitalizeName(item.first_name) || ""} ${
        capitalizeName(item.last_name) || ""
      }`.trim(),
      Email: item.email || "-",
      Address: item.address || "-",
      Contact: item.phone_number || "-",
      Notes: item.notes || "-",
    }));

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },

  services: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/service/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => {
      let materials = "-";

      if (Array.isArray(item.materials) && item.materials.length > 0) {
        materials = item.materials
          .map((mat) => {
            if (typeof mat === "object" && mat.name) {
              return mat.name;
            } else if (typeof mat === "string") {
              return mat;
            }
            return null;
          })
          .filter(Boolean)
          .join(", ");
      }

      return {
        Name: item.name,
        Description: item.description || "-",
        Duration:
          item.duration !== undefined && item.duration !== null
            ? `${item.duration} min`
            : "-",
        Price:
          item.price !== undefined && item.price !== null
            ? `₱${item.price}`
            : "-",
        Materials: materials,
      };
    });

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },

  materials: async (page = 1, pageSize = DEFAULT_PAGE_SIZE, search = "") => {
    let url = `/registration/register/material/?page=${page}&page_size=${pageSize}`;
    if (search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await api.get(url);
    const data = response.data;

    const items = data.results || (Array.isArray(data) ? data : []);
    const mappedItems = items.map((item) => ({
      Name: item.name,
      Description: item.description || "-",
    }));

    return {
      data: mappedItems,
      pagination: {
        currentPage: data.current_page || page,
        totalPages:
          data.total_pages ||
          Math.ceil((data.count || mappedItems.length) / pageSize),
        totalItems: data.count || mappedItems.length,
        hasNext: data.has_next || false,
        hasPrevious: data.has_previous || false,
      },
    };
  },
};

// Helper function to capitalize names properly
const capitalizeName = (name) => {
  if (!name || typeof name !== "string") return "";

  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * TanStack Query hook for fetching settings data by tab
 */
export const useSettingsData = (
  tabName,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  searchTerm = ""
) => {
  const tabNameLower = tabName.toLowerCase();

  return useQuery({
    queryKey: queryKeys.registration[tabNameLower]?.list(
      page,
      pageSize,
      searchTerm
    ) || ["registration", tabNameLower, "list", page, pageSize, searchTerm],
    queryFn: () => {
      const fetcher = settingsApiFetchers[tabNameLower];
      if (!fetcher) {
        throw new Error(`No fetcher available for tab: ${tabName}`);
      }
      return fetcher(page, pageSize, searchTerm);
    },
    staleTime: searchTerm ? 1 * 60 * 1000 : 5 * 60 * 1000, // Shorter stale time for search results
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!tabName, // Only fetch when tabName is provided
  });
};

/**
 * Hook for prefetching adjacent tabs
 */
export const usePrefetchSettingsData = () => {
  const queryClient = useQueryClient();

  const prefetchTab = (
    tabName,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    searchTerm = ""
  ) => {
    const tabNameLower = tabName.toLowerCase();
    const fetcher = settingsApiFetchers[tabNameLower];

    if (!fetcher) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.registration[tabNameLower]?.list(
        page,
        pageSize,
        searchTerm
      ) || ["registration", tabNameLower, "list", page, pageSize, searchTerm],
      queryFn: () => fetcher(page, pageSize, searchTerm),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchTab };
};

/**
 * Mutation hooks for creating new entries
 */
export const useCreateSettingsEntry = (tabName) => {
  const queryClient = useQueryClient();
  const tabNameLower = tabName.toLowerCase();

  return useMutation({
    mutationFn: async (data) => {
      // Import the API functions dynamically based on tab
      const {
        registerTherapist,
        registerDriver,
        registerOperator,
        registerClient,
        registerService,
        registerMaterial,
      } = await import("../services/api");

      switch (tabNameLower) {
        case "therapists":
          return registerTherapist(data);
        case "drivers":
          return registerDriver(data);
        case "operators":
          return registerOperator(data);
        case "clients":
          return registerClient(data);
        case "services":
          return registerService(data);
        case "materials":
          return registerMaterial(data);
        default:
          throw new Error(`No mutation available for tab: ${tabName}`);
      }
    },
    onSuccess: () => {
      // Invalidate all queries for this tab to refresh the data
      queryClient.invalidateQueries({
        queryKey: queryKeys.registration[tabNameLower]?.all || [
          "registration",
          tabNameLower,
        ],
      });

      // Also invalidate the general registration queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.registration.all,
      });
    },
    onError: (error) => {
      console.error(`Error creating ${tabName} entry:`, error);
    },
  });
};

/**
 * Hook for invalidating settings data cache
 */
export const useInvalidateSettingsData = () => {
  const queryClient = useQueryClient();

  const invalidateTab = (tabName) => {
    const tabNameLower = tabName.toLowerCase();
    queryClient.invalidateQueries({
      queryKey: queryKeys.registration[tabNameLower]?.all || [
        "registration",
        tabNameLower,
      ],
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.registration.all,
    });
  };

  return { invalidateTab, invalidateAll };
};

/**
 * Hook for fetching all tabs' data for backup purposes
 */
export const useBackupAllData = () => {
  const fetchAllTabsData = async () => {
    const allTabs = [
      "therapists",
      "drivers",
      "operators",
      "clients",
      "services",
      "materials",
    ];
    const allData = {};
    let totalRecords = 0;

    // Fetch data for each tab
    for (const tabName of allTabs) {
      const tabNameLower = tabName.toLowerCase();
      const fetcher = settingsApiFetchers[tabNameLower];

      if (fetcher) {
        try {
          // Fetch all pages for this tab
          let page = 1;
          let hasMoreData = true;
          let tabData = [];

          while (hasMoreData) {
            const response = await fetcher(page, 1000); // Large page size to get all data

            if (response?.data && Array.isArray(response.data)) {
              tabData = [...tabData, ...response.data];

              // Check if there's more data
              const totalPages = Math.ceil(
                (response.total || response.data.length) / 1000
              );
              hasMoreData = page < totalPages && response.data.length === 1000;
              page++;
            } else {
              hasMoreData = false;
            }
          }

          allData[tabName] = tabData;
          totalRecords += tabData.length;
        } catch (error) {
          console.error(`Error fetching ${tabName} data:`, error);
          allData[tabName] = [];
        }
      } else {
        allData[tabName] = [];
      }
    }

    return { allData, totalRecords, dataTypes: allTabs };
  };

  return { fetchAllTabsData };
};
