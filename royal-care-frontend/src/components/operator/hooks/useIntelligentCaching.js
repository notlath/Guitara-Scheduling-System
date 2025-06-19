/**
 * Intelligent caching system for Operator Dashboard
 * Custom implementation without external dependencies
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Cache configuration
const CACHE_CONFIG = {
  // Critical data that needs frequent updates
  critical: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  },
  // Standard data
  standard: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 60 * 1000, // 1 minute
  },
  // Static data that rarely changes
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false, // No auto-refetch
  },
};

// Query categories and their cache behavior
const QUERY_CATEGORIES = {
  critical: [
    "critical-appointments",
    "overdue-appointments",
    "payment-pending",
    "driver-requests",
    "active-sessions",
  ],
  standard: ["appointments", "drivers", "notifications", "stats"],
  static: ["user-preferences", "system-config", "service-types"],
};

// Simple in-memory cache implementation
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.subscribers = new Map();
  }

  set(key, data) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
    this.notifySubscribers(key, data);
  }

  get(key) {
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.notifySubscribers(key, null);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  isStale(key, staleTime) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > staleTime;
  }

  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const keySubscribers = this.subscribers.get(key);
      if (keySubscribers) {
        keySubscribers.delete(callback);
        if (keySubscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  notifySubscribers(key, data) {
    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach((callback) => callback(data));
    }
  }

  cleanup(cacheTime) {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > cacheTime) {
        this.delete(key);
      }
    }
  }
}

// Global cache instance
const globalCache = new CacheManager();

/**
 * Intelligent caching hook with smart invalidation
 */
export const useIntelligentCaching = () => {
  const [, forceUpdate] = useState({});
  const backgroundSyncRef = useRef();
  const subscribersRef = useRef(new Set());

  // Force re-render
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Get cache configuration for a query
  const getCacheConfig = useCallback((queryKey) => {
    const category =
      Object.entries(QUERY_CATEGORIES).find(([, queries]) =>
        queries.some((q) => queryKey.includes(q))
      )?.[0] || "standard";

    return CACHE_CONFIG[category];
  }, []);

  // Smart invalidation based on data relationships
  const invalidateRelatedData = useCallback(
    (type) => {
      const invalidationMap = {
        appointment: [
          "appointments",
          "stats",
          "notifications",
          "critical-appointments",
        ],
        driver: ["drivers", "driver-requests", "pickup-requests"],
        payment: ["payments", "payment-pending", "stats"],
        notification: ["notifications"],
      };

      const queriesToInvalidate = invalidationMap[type] || [];

      queriesToInvalidate.forEach((queryKey) => {
        globalCache.delete(queryKey);
      });

      triggerUpdate();
    },
    [triggerUpdate]
  );

  // Background sync for critical data
  const startBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
    }

    backgroundSyncRef.current = setInterval(() => {
      // Mark critical data as stale to trigger refetch
      QUERY_CATEGORIES.critical.forEach((queryKey) => {
        if (globalCache.has(queryKey)) {
          const config = getCacheConfig([queryKey]);
          if (globalCache.isStale(queryKey, config.staleTime)) {
            globalCache.delete(queryKey);
          }
        }
      });
      triggerUpdate();
    }, CACHE_CONFIG.critical.refetchInterval);

    return () => {
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
      }
    };
  }, [getCacheConfig, triggerUpdate]);

  // Stop background sync
  const stopBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
      backgroundSyncRef.current = null;
    }
  }, []);

  // Optimistic updates with rollback capability
  const performOptimisticUpdate = useCallback(
    async (queryKey, updateFn, mutationPromise) => {
      // Snapshot previous value
      const previousData = globalCache.get(queryKey);

      try {
        // Optimistically update
        if (previousData) {
          const optimisticData = updateFn(previousData);
          globalCache.set(queryKey, optimisticData);
        }

        // Perform actual mutation
        const result = await mutationPromise;

        // Update with real data
        globalCache.set(queryKey, result);

        return result;
      } catch (error) {
        // Rollback on error
        if (previousData) {
          globalCache.set(queryKey, previousData);
        } else {
          globalCache.delete(queryKey);
        }
        throw error;
      }
    },
    []
  );

  // Batch operations to reduce cache thrashing
  const batchCacheOperations = useCallback(
    (operations) => {
      // Execute all operations without triggering updates
      operations.forEach((op) => op());
      // Trigger single update at the end
      triggerUpdate();
    },
    [triggerUpdate]
  );

  // Memory management - clear stale data
  const clearStaleData = useCallback(() => {
    const staleKeys = [];

    for (const [key] of globalCache.cache.entries()) {
      const config = getCacheConfig([key]);
      if (globalCache.isStale(key, config.cacheTime)) {
        staleKeys.push(key);
      }
    }

    staleKeys.forEach((key) => globalCache.delete(key));

    if (staleKeys.length > 0) {
      triggerUpdate();
    }
  }, [getCacheConfig, triggerUpdate]);

  // Cache data
  const cacheData = useCallback((key, data) => {
    globalCache.set(key, data);
  }, []);

  // Get cached data
  const getCachedData = useCallback((key) => {
    return globalCache.get(key);
  }, []);

  // Check if data is cached and fresh
  const isFresh = useCallback(
    (key) => {
      if (!globalCache.has(key)) return false;
      const config = getCacheConfig([key]);
      return !globalCache.isStale(key, config.staleTime);
    },
    [getCacheConfig]
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    const cleanup = startBackgroundSync();

    // Periodic cleanup of stale data
    const cleanupInterval = setInterval(clearStaleData, 5 * 60 * 1000); // 5 minutes

    return () => {
      cleanup?.();
      clearInterval(cleanupInterval);
      stopBackgroundSync();
    };
  }, [startBackgroundSync, stopBackgroundSync, clearStaleData]);

  return {
    getCacheConfig,
    invalidateRelatedData,
    startBackgroundSync,
    stopBackgroundSync,
    performOptimisticUpdate,
    batchCacheOperations,
    clearStaleData,
    cacheData,
    getCachedData,
    isFresh,

    // Utility functions
    isQueryStale: (queryKey) => {
      const config = getCacheConfig(queryKey);
      return globalCache.isStale(queryKey, config.staleTime);
    },

    prefetchCriticalData: () => {
      // Mark critical queries for refresh
      QUERY_CATEGORIES.critical.forEach((queryKey) => {
        if (globalCache.has(queryKey)) {
          globalCache.delete(queryKey);
        }
      });
      triggerUpdate();
    },

    // Subscribe to cache changes
    subscribe: (key, callback) => {
      const unsubscribe = globalCache.subscribe(key, callback);
      subscribersRef.current.add(unsubscribe);
      return unsubscribe;
    },
  };
};

export default useIntelligentCaching;
