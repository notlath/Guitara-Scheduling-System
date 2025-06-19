/**
 * Intelligent caching system for Operator Dashboard
 * Provides smart invalidation and background sync capabilities
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
    'critical-appointments',
    'overdue-appointments', 
    'payment-pending',
    'driver-requests',
    'active-sessions'
  ],
  standard: [
    'appointments',
    'drivers',
    'notifications',
    'stats'
  ],
  static: [
    'user-preferences',
    'system-config',
    'service-types'
  ]
};

/**
 * Intelligent caching hook with smart invalidation
 */
export const useIntelligentCaching = () => {
  const queryClient = useQueryClient();
  const backgroundSyncRef = useRef();

  // Get cache configuration for a query
  const getCacheConfig = useCallback((queryKey) => {
    const category = Object.entries(QUERY_CATEGORIES).find(([, queries]) => 
      queries.some(q => queryKey.includes(q))
    )?.[0] || 'standard';
    
    return CACHE_CONFIG[category];
  }, []);

  // Smart invalidation based on data relationships
  const invalidateRelatedData = useCallback((type) => {
    const invalidationMap = {
      appointment: {
        queries: ['appointments', 'stats', 'notifications', 'critical-appointments'],
        condition: (queryKey) => {
          // Invalidate all appointment-related queries
          return queryKey.some(key => 
            typeof key === 'string' && 
            (key.includes('appointment') || key.includes('stats'))
          );
        }
      },
      driver: {
        queries: ['drivers', 'driver-requests', 'pickup-requests'],
        condition: (queryKey) => {
          return queryKey.some(key => 
            typeof key === 'string' && key.includes('driver')
          );
        }
      },
      payment: {
        queries: ['payments', 'payment-pending', 'stats'],
        condition: (queryKey) => {
          return queryKey.some(key => 
            typeof key === 'string' && 
            (key.includes('payment') || key.includes('stats'))
          );
        }
      },
      notification: {
        queries: ['notifications'],
        condition: (queryKey) => {
          return queryKey.some(key => 
            typeof key === 'string' && key.includes('notification')
          );
        }
      }
    };

    const config = invalidationMap[type];
    if (!config) return;

    // Invalidate specific queries
    config.queries.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });

    // Invalidate queries matching condition
    const cache = queryClient.getQueryCache();
    cache.getAll().forEach(query => {
      if (config.condition(query.queryKey)) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
      }
    });

    // Trigger immediate refetch for critical data
    if (QUERY_CATEGORIES.critical.some(q => config.queries.includes(q))) {
      config.queries.forEach(queryKey => {
        queryClient.refetchQueries({ queryKey: [queryKey] });
      });
    }
  }, [queryClient]);

  // Background sync for critical data
  const startBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
    }

    backgroundSyncRef.current = setInterval(() => {
      // Prefetch critical data in background
      QUERY_CATEGORIES.critical.forEach(queryKey => {
        queryClient.prefetchQuery({
          queryKey: [queryKey],
          ...CACHE_CONFIG.critical
        });
      });
    }, CACHE_CONFIG.critical.refetchInterval);

    return () => {
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
      }
    };
  }, [queryClient]);

  // Stop background sync
  const stopBackgroundSync = useCallback(() => {
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
      backgroundSyncRef.current = null;
    }
  }, []);

  // Optimistic updates with rollback capability
  const performOptimisticUpdate = useCallback(async (
    queryKey, 
    updateFn, 
    mutationPromise
  ) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update
    queryClient.setQueryData(queryKey, updateFn);

    try {
      // Perform actual mutation
      const result = await mutationPromise;
      
      // Update with real data
      queryClient.setQueryData(queryKey, result);
      
      return result;
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(queryKey, previousData);
      throw error;
    }
  }, [queryClient]);

  // Batch operations to reduce cache thrashing
  const batchCacheOperations = useCallback((operations) => {
    return queryClient.getQueryCache().subscribe(() => {
      operations.forEach(op => op());
    });
  }, [queryClient]);

  // Memory management - clear stale data
  const clearStaleData = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const now = Date.now();
    
    cache.getAll().forEach(query => {
      const config = getCacheConfig(query.queryKey);
      const isStale = now - query.state.dataUpdatedAt > config.cacheTime;
      
      if (isStale && !query.getObserversCount()) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient, getCacheConfig]);

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
    
    // Utility functions
    isQueryStale: (queryKey) => {
      const query = queryClient.getQueryState(queryKey);
      const config = getCacheConfig(queryKey);
      return query ? Date.now() - query.dataUpdatedAt > config.staleTime : true;
    },
    
    prefetchCriticalData: () => {
      QUERY_CATEGORIES.critical.forEach(queryKey => {
        queryClient.prefetchQuery({
          queryKey: [queryKey],
          ...CACHE_CONFIG.critical
        });
      });
    }
  };
};

export default useIntelligentCaching;
