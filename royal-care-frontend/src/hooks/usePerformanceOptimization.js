/**
 * Performance Optimization Hooks
 * Comprehensive React performance optimization utilities
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";

/**
 * Optimized Redux selector with memoization and shallow comparison by default
 * Prevents unnecessary re-renders from Redux state changes
 */
export const useOptimizedSelector = (selector, equalityFn = shallowEqual) => {
  return useSelector(selector, equalityFn);
};

/**
 * Enhanced debounced state hook with immediate value access
 */
export const useDebouncedState = (initialValue, delay = 300) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [debouncedValue, setValue, value]; // Return immediate value too
};

/**
 * Stable callback hook that prevents unnecessary re-creations
 */
export const useStableCallback = (callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => callbackRef.current(...args), []);
};

/**
 * Deep comparison memoization hook
 */
export const useDeepMemo = (factory, dependencies) => {
  const ref = useRef();

  if (!ref.current || !deepEqual(ref.current.deps, dependencies)) {
    ref.current = {
      deps: dependencies,
      value: factory(),
    };
  }

  return ref.current.value;
};

// Helper for deep equality check with memoization
const deepEqualCache = new WeakMap();

const deepEqual = (a, b) => {
  // Early bailout for primitives, null or identical references
  if (a === b) return true;
  if (a == null || b == null) return false;

  // Early bailout for different types
  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) return false;

  // Special handling for primitive types for better performance
  if (typeA !== "object") return a === b;

  // Handle array type mismatch
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Check cache for this comparison
  let aCache = deepEqualCache.get(a);
  if (aCache) {
    const cachedResult = aCache.get(b);
    if (cachedResult !== undefined) return cachedResult;
  } else {
    aCache = new WeakMap();
    deepEqualCache.set(a, aCache);
  }

  // Store result as false initially to handle circular references
  aCache.set(b, false);

  let result = false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    result = true;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        result = false;
        break;
      }
    }
  } else if (a instanceof Date && b instanceof Date) {
    result = a.getTime() === b.getTime();
  } else if (a instanceof RegExp && b instanceof RegExp) {
    result = a.toString() === b.toString();
  } else {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      result = false;
    } else {
      result = true;
      for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
          result = false;
          break;
        }
      }
    }
  }

  // Update cache with correct result and return
  aCache.set(b, result);
  return result;
};

/**
 * Throttled effect hook with cleanup
 */
export const useThrottledEffect = (effect, dependencies, delay = 100) => {
  const lastRan = useRef(Date.now());
  const cleanupRef = useRef();

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;

    const handler = setTimeout(() => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = effect();
      lastRan.current = Date.now();
    }, Math.max(0, delay - timeSinceLastRun));

    return () => {
      clearTimeout(handler);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...dependencies]);
};

/**
 * Performance tracking hook with detailed metrics
 */
export const usePerformanceTracker = (componentName, options = {}) => {
  const {
    trackRenders = true,
    trackUpdates = true,
    slowRenderThreshold = 16,
    logLevel = "warn",
    enabledInProduction = false,
  } = options;

  // Skip expensive tracking in production unless explicitly enabled
  const shouldTrack = enabledInProduction || isDevelopmentMode();

  const renderCount = useRef(0);
  const updateCount = useRef(0);
  const startTime = useRef(performance.now());
  const mountTime = useRef(performance.now());
  const renderTimes = useRef([]);

  if (shouldTrack && trackRenders) {
    renderCount.current += 1;
  }

  useEffect(() => {
    if (!shouldTrack) return;

    if (trackUpdates) {
      updateCount.current += 1;
    }

    if (trackRenders) {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;

      renderTimes.current.push(renderTime);
      // Keep only last 10 render times
      if (renderTimes.current.length > 10) {
        renderTimes.current.shift();
      }

      if (renderTime > slowRenderThreshold) {
        const avgRenderTime =
          renderTimes.current.reduce((a, b) => a + b, 0) /
          renderTimes.current.length;

        if (logLevel === "warn") {
          console.warn(
            `🐌 ${componentName} slow render: ${renderTime.toFixed(
              2
            )}ms (avg: ${avgRenderTime.toFixed(2)}ms, render #${
              renderCount.current
            })`
          );
        }
      }

      startTime.current = performance.now();
    }
  });

  const getMetrics = useCallback(() => {
    const avgRenderTime =
      renderTimes.current.length > 0
        ? renderTimes.current.reduce((a, b) => a + b, 0) /
          renderTimes.current.length
        : 0;

    return {
      renderCount: renderCount.current,
      updateCount: updateCount.current,
      avgRenderTime: avgRenderTime.toFixed(2),
      totalLifetime: (performance.now() - mountTime.current).toFixed(2),
      recentRenderTimes: [...renderTimes.current],
    };
  }, []);

  return {
    renderCount: renderCount.current,
    updateCount: updateCount.current,
    getMetrics,
    logRenderInfo: () => {
      console.log(`📊 ${componentName} performance:`, getMetrics());
    },
  };
};

/**
 * Prevents unnecessary re-renders by stabilizing object/array references
 */
export const useStableValue = (value) => {
  const ref = useRef(value);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

/**
 * Smart memoization hook that only memoizes when necessary
 */
export const useSmartMemo = (factory, dependencies) => {
  const depsRef = useRef(dependencies);
  const valueRef = useRef();

  // Check if dependencies have actually changed
  const depsChanged = useMemo(() => {
    if (!depsRef.current || depsRef.current.length !== dependencies.length) {
      return true;
    }

    return dependencies.some(
      (dep, index) => !Object.is(dep, depsRef.current[index])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencies.length, ...dependencies]);

  if (depsChanged || valueRef.current === undefined) {
    valueRef.current = factory();
    depsRef.current = dependencies;
  }

  return valueRef.current;
};

/**
 * Optimized data fetching hook with intelligent caching and deduplication
 */
export const useOptimizedDataFetch = (fetchFn, cacheKey, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());
  const activeRequestRef = useRef(null);

  const optimizedFetch = useCallback(async () => {
    // Check cache first
    if (cacheKey && cacheRef.current.has(cacheKey)) {
      const cachedData = cacheRef.current.get(cacheKey);
      const cacheAge = Date.now() - cachedData.timestamp;

      // Use cache if it's fresh (less than 30 seconds old)
      if (cacheAge < 30000) {
        setData(cachedData.data);
        return cachedData.data;
      }
    }

    // If there's already an active request for this cache key, don't start another
    if (activeRequestRef.current === cacheKey) {
      return;
    }

    setLoading(true);
    activeRequestRef.current = cacheKey;

    try {
      const result = await fetchFn();

      // Store in cache
      if (cacheKey) {
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
      activeRequestRef.current = null;
    }
  }, [fetchFn, cacheKey]);

  useEffect(() => {
    optimizedFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimizedFetch, ...dependencies]);

  return { data, loading, error, refetch: optimizedFetch };
};

/**
 * Batch state updates hook to reduce re-renders
 */
export const useBatchedUpdates = () => {
  const batchRef = useRef([]);
  const timeoutRef = useRef(null);

  const batchUpdate = useCallback((updateFn) => {
    batchRef.current.push(updateFn);

    if (!timeoutRef.current) {
      // Use microtask to batch updates before next render
      timeoutRef.current = setTimeout(() => {
        // Apply all updates in a batch
        const updates = [...batchRef.current];
        batchRef.current = [];
        timeoutRef.current = null;

        // In React 18, batching happens automatically
        // Just apply all the updates in the same event loop tick
        updates.forEach((update) => update());
      }, 0);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return batchUpdate;
};

/**
 * Virtual list hook for large data sets - reduces DOM nodes
 */
export const useVirtualList = (items, containerHeight, itemHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  // Efficiently calculate visible range based on scroll position
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const bufferSize = 5; // Add buffer items for smoother scrolling
    const visibleCount =
      Math.ceil(containerHeight / itemHeight) + 2 * bufferSize;

    return {
      start: Math.max(0, startIndex - bufferSize),
      end: Math.min(items.length, startIndex + visibleCount),
    };
  }, [scrollTop, containerHeight, itemHeight, items.length]);

  // Only render visible items plus buffer
  const visibleItems = useMemo(() => {
    return items
      .slice(visibleRange.start, visibleRange.end)
      .map((item, index) => ({
        ...item,
        originalIndex: index + visibleRange.start,
        offsetY: (index + visibleRange.start) * itemHeight,
      }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  // Handle scroll with throttling
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // Debounce scrolling state
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    isScrolling,
    onScroll: handleScroll,
    visibleRange,
  };
};

/**
 * Efficient subscription management hook
 */
export const useOptimizedSubscription = (subscribe, dependencies = []) => {
  const subscriptionRef = useRef(null);
  const isSubscribedRef = useRef(false);

  const stableDeps = useStableValue(dependencies);

  useEffect(() => {
    // Clean up previous subscription if it exists
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
      isSubscribedRef.current = false;
    }

    // Setup new subscription
    try {
      subscriptionRef.current = subscribe();
      isSubscribedRef.current = true;
    } catch (error) {
      console.error("Subscription error:", error);
      isSubscribedRef.current = false;
    }

    // Cleanup on unmount or dependencies change
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current();
        } catch (cleanupError) {
          console.error("Subscription cleanup error:", cleanupError);
        }
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [subscribe, stableDeps]);

  return {
    isSubscribed: isSubscribedRef.current,
    unsubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    },
  };
};

/**
 * Optimized component state hook for complex objects
 */
export const useOptimizedState = (initialState) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const optimizedSetState = useCallback((updater) => {
    if (typeof updater === "function") {
      setState((currentState) => {
        const nextState = updater(currentState);

        // Only update state if it actually changed (using deep comparison)
        if (deepEqual(currentState, nextState)) {
          return currentState;
        }
        return nextState;
      });
    } else {
      // Only update if the new state is different
      setState((currentState) => {
        if (deepEqual(currentState, updater)) {
          return currentState;
        }
        return updater;
      });
    }
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  return [state, optimizedSetState, getState];
};

/**
 * Utility to check if app is running in development mode
 * Used to conditionally enable expensive debugging/monitoring
 */
export const isDevelopmentMode = () => {
  return (
    import.meta.env?.DEV === true ||
    import.meta.env?.MODE === "development" ||
    window.location.hostname === "localhost"
  );
};

/**
 * Hook to automatically run performance diagnostic after authentication
 */
export const usePerformanceDiagnostic = () => {
  const { user, isAuthenticated } = useOptimizedSelector((state) => ({
    user: state.auth.user,
    isAuthenticated: state.auth.isAuthenticated,
  }));

  const hasRunRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && !hasRunRef.current && isDevelopmentMode()) {
      // Run performance diagnostic after authentication in development mode
      const runDiagnostic = async () => {
        try {
          // Dynamic import to avoid circular dependencies
          const { runPerformanceDiagnostic } = await import(
            "../utils/performanceTestSuite"
          );
          console.log("🚀 Running post-login performance diagnostic...");
          await runPerformanceDiagnostic();
          hasRunRef.current = true;
        } catch (error) {
          console.warn("⚠️ Failed to run performance diagnostic:", error);
        }
      };

      // Small delay to let the authentication flow complete
      setTimeout(runDiagnostic, 1000);
    }
  }, [isAuthenticated, user]);

  // Reset flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      hasRunRef.current = false;
    }
  }, [isAuthenticated]);

  return {
    hasRunDiagnostic: hasRunRef.current,
  };
};
