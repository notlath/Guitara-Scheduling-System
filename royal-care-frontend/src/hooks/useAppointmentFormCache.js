import { useCallback, useMemo, useState } from "react";

/**
 * Centralized cache hook for AppointmentForm data
 * Provides caching for clients, therapists, and drivers with different strategies
 */
export const useAppointmentFormCache = () => {
  const [cacheData, setCacheData] = useState({
    clients: {
      data: [],
      lastFetch: null,
      searchResults: new Map(), // Cache for search queries
      totalCount: 0,
      hasMore: true,
    },
    therapists: {
      data: [],
      lastFetch: null,
      availabilityCache: new Map(), // Cache by date/time/service
    },
    drivers: {
      data: [],
      lastFetch: null,
      availabilityCache: new Map(), // Cache by date/time
    },
  });

  // Cache TTL settings
  const CACHE_TTL = useMemo(
    () => ({
      clients: 5 * 60 * 1000, // 5 minutes for client data
      therapists: 2 * 60 * 1000, // 2 minutes for therapist availability
      drivers: 2 * 60 * 1000, // 2 minutes for driver availability
    }),
    []
  );

  // Helper to check if cache is valid
  const isCacheValid = useCallback((lastFetch, ttl) => {
    if (!lastFetch) return false;
    return Date.now() - lastFetch < ttl;
  }, []);

  // Generate cache key for availability
  const getAvailabilityKey = useCallback((date, startTime, services = "") => {
    return `${date}_${startTime}_${services}`;
  }, []);

  // Client caching methods
  const clientCache = useMemo(
    () => ({
      // Get cached clients for search
      getSearchResults: (query, page = 1) => {
        const key = `${query.toLowerCase()}_${page}`;
        const cached = cacheData.clients.searchResults.get(key);

        if (cached && isCacheValid(cached.timestamp, CACHE_TTL.clients)) {
          return cached.data;
        }
        return null;
      },

      // Cache search results
      setSearchResults: (query, page, data, hasMore = true) => {
        const key = `${query.toLowerCase()}_${page}`;
        setCacheData((prev) => ({
          ...prev,
          clients: {
            ...prev.clients,
            searchResults: new Map(prev.clients.searchResults).set(key, {
              data,
              hasMore,
              timestamp: Date.now(),
            }),
          },
        }));
      },

      // Clear client cache
      clear: () => {
        setCacheData((prev) => ({
          ...prev,
          clients: {
            data: [],
            lastFetch: null,
            searchResults: new Map(),
            totalCount: 0,
            hasMore: true,
          },
        }));
      },

      // Get all cached clients
      getAll: () => {
        if (isCacheValid(cacheData.clients.lastFetch, CACHE_TTL.clients)) {
          return cacheData.clients.data;
        }
        return null;
      },

      // Set all clients
      setAll: (data, totalCount = data.length) => {
        setCacheData((prev) => ({
          ...prev,
          clients: {
            ...prev.clients,
            data,
            totalCount,
            lastFetch: Date.now(),
          },
        }));
      },
    }),
    [cacheData.clients, isCacheValid, CACHE_TTL.clients]
  );

  // Therapist caching methods
  const therapistCache = useMemo(
    () => ({
      // Get available therapists for specific date/time/service
      getAvailable: (date, startTime, services) => {
        const key = getAvailabilityKey(date, startTime, services);
        const cached = cacheData.therapists.availabilityCache.get(key);

        if (cached && isCacheValid(cached.timestamp, CACHE_TTL.therapists)) {
          return cached.data;
        }
        return null;
      },

      // Cache available therapists
      setAvailable: (date, startTime, services, data) => {
        const key = getAvailabilityKey(date, startTime, services);
        setCacheData((prev) => ({
          ...prev,
          therapists: {
            ...prev.therapists,
            availabilityCache: new Map(prev.therapists.availabilityCache).set(
              key,
              {
                data,
                timestamp: Date.now(),
              }
            ),
          },
        }));
      },

      // Clear therapist cache
      clear: () => {
        setCacheData((prev) => ({
          ...prev,
          therapists: {
            data: [],
            lastFetch: null,
            availabilityCache: new Map(),
          },
        }));
      },

      // Get all therapists
      getAll: () => {
        if (
          isCacheValid(cacheData.therapists.lastFetch, CACHE_TTL.therapists)
        ) {
          return cacheData.therapists.data;
        }
        return null;
      },

      // Set all therapists
      setAll: (data) => {
        setCacheData((prev) => ({
          ...prev,
          therapists: {
            ...prev.therapists,
            data,
            lastFetch: Date.now(),
          },
        }));
      },
    }),
    [
      cacheData.therapists,
      isCacheValid,
      CACHE_TTL.therapists,
      getAvailabilityKey,
    ]
  );

  // Driver caching methods
  const driverCache = useMemo(
    () => ({
      // Get available drivers for specific date/time
      getAvailable: (date, startTime) => {
        const key = getAvailabilityKey(date, startTime);
        const cached = cacheData.drivers.availabilityCache.get(key);

        if (cached && isCacheValid(cached.timestamp, CACHE_TTL.drivers)) {
          return cached.data;
        }
        return null;
      },

      // Cache available drivers
      setAvailable: (date, startTime, data) => {
        const key = getAvailabilityKey(date, startTime);
        setCacheData((prev) => ({
          ...prev,
          drivers: {
            ...prev.drivers,
            availabilityCache: new Map(prev.drivers.availabilityCache).set(
              key,
              {
                data,
                timestamp: Date.now(),
              }
            ),
          },
        }));
      },

      // Clear driver cache
      clear: () => {
        setCacheData((prev) => ({
          ...prev,
          drivers: {
            data: [],
            lastFetch: null,
            availabilityCache: new Map(),
          },
        }));
      },

      // Get all drivers
      getAll: () => {
        if (isCacheValid(cacheData.drivers.lastFetch, CACHE_TTL.drivers)) {
          return cacheData.drivers.data;
        }
        return null;
      },

      // Set all drivers
      setAll: (data) => {
        setCacheData((prev) => ({
          ...prev,
          drivers: {
            ...prev.drivers,
            data,
            lastFetch: Date.now(),
          },
        }));
      },
    }),
    [cacheData.drivers, isCacheValid, CACHE_TTL.drivers, getAvailabilityKey]
  );

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    setCacheData({
      clients: {
        data: [],
        lastFetch: null,
        searchResults: new Map(),
        totalCount: 0,
        hasMore: true,
      },
      therapists: {
        data: [],
        lastFetch: null,
        availabilityCache: new Map(),
      },
      drivers: {
        data: [],
        lastFetch: null,
        availabilityCache: new Map(),
      },
    });
  }, []);

  // Get cache statistics for debugging
  const getCacheStats = useCallback(() => {
    return {
      clients: {
        totalCached: cacheData.clients.data.length,
        searchQueriesCached: cacheData.clients.searchResults.size,
        lastFetch: cacheData.clients.lastFetch,
        isValid: isCacheValid(cacheData.clients.lastFetch, CACHE_TTL.clients),
      },
      therapists: {
        totalCached: cacheData.therapists.data.length,
        availabilityCached: cacheData.therapists.availabilityCache.size,
        lastFetch: cacheData.therapists.lastFetch,
        isValid: isCacheValid(
          cacheData.therapists.lastFetch,
          CACHE_TTL.therapists
        ),
      },
      drivers: {
        totalCached: cacheData.drivers.data.length,
        availabilityCached: cacheData.drivers.availabilityCache.size,
        lastFetch: cacheData.drivers.lastFetch,
        isValid: isCacheValid(cacheData.drivers.lastFetch, CACHE_TTL.drivers),
      },
    };
  }, [cacheData, isCacheValid, CACHE_TTL]);

  return {
    clientCache,
    therapistCache,
    driverCache,
    clearAllCaches,
    getCacheStats,
    CACHE_TTL,
  };
};

export default useAppointmentFormCache;
