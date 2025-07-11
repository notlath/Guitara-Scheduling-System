/**
 * Performance Optimization Hooks - TanStack Query Compatible
 * Essential React performance optimization utilities
 *
 * NOTE: Data fetching hooks have been migrated to TanStack Query
 * This file contains only the performance optimization hooks that are still needed
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";

/**
 * Optimized Redux selector with memoization and shallow comparison by default
 * Prevents unnecessary re-renders from Redux state changes
 *
 * IMPORTANT: This is still needed even with TanStack Query because:
 * - Redux state (auth, UI state, settings) still needs optimization
 * - TanStack Query only handles server state, not client state
 */
export const useOptimizedSelector = (selector, equalityFn = shallowEqual) => {
  // Always call hooks in the same order - create stable references first
  const stableEmptyArray = useMemo(() => [], []);
  const stableEmptyObject = useMemo(() => ({}), []);

  // Create a more robust memoized selector with deeper stability
  const memoizedSelector = useMemo(() => {
    let lastResult = null;
    let lastState = null;

    return (state) => {
      // Handle case where state is null/undefined
      if (!state) {
        return null;
      }

      // Quick reference check - if state hasn't changed at all, return last result
      if (state === lastState && lastResult !== null) {
        return lastResult;
      }

      try {
        const result = selector(state);

        // Ensure we return stable references for objects and arrays
        if (typeof result === "object" && result !== null) {
          // For arrays, ensure they're not empty arrays that change reference
          if (Array.isArray(result) && result.length === 0) {
            const stableResult = stableEmptyArray;
            lastResult = stableResult;
            lastState = state;
            return stableResult;
          }
          // For objects, ensure empty objects are stable
          if (!Array.isArray(result) && Object.keys(result).length === 0) {
            const stableResult = stableEmptyObject;
            lastResult = stableResult;
            lastState = state;
            return stableResult;
          }
        }

        // Cache the result for next time
        lastResult = result;
        lastState = state;
        return result;
      } catch (error) {
        console.error("Selector execution failed:", error);
        return lastResult || null;
      }
    };
  }, [selector, stableEmptyArray, stableEmptyObject]);

  // Always call useSelector - handle errors within the selector
  try {
    return useSelector(memoizedSelector, equalityFn);
  } catch (error) {
    console.error("useOptimizedSelector failed:", error);
    // Return null as fallback to prevent crashes
    return null;
  }
};

/**
 * Enhanced debounced state hook with immediate value access
 * Still needed for form inputs, search, and UI interactions
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
 * Essential for preventing unnecessary re-renders in complex components
 */
export const useStableCallback = (callback) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args) => callbackRef.current(...args), []);
};

/**
 * Deep comparison memoization hook
 * Useful for complex object dependencies
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
 * Enhanced to work well with TanStack Query DevTools
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
            }) - Check TanStack Query DevTools for data fetching performance`
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
 * REMOVED: useOptimizedDataFetch - Replaced by TanStack Query
 * Use useQuery from @tanstack/react-query instead
 *
 * Migration guide:
 * OLD: const { data, loading, error } = useOptimizedDataFetch(fetchFn, cacheKey, deps);
 * NEW: const { data, isLoading: loading, error } = useQuery({
 *        queryKey: [cacheKey, ...deps],
 *        queryFn: fetchFn,
 *        staleTime: 30000 // 30 seconds
 *      });
 */

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
 * Essential for performance when rendering large appointment lists
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
 * Works well with TanStack Query for WebSocket updates
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
 * UI-specific performance hooks that complement TanStack Query
 */

/**
 * Optimized button loading state hook
 * Prevents button spam and provides smooth loading UX
 */
export const useOptimizedButtonLoading = () => {
  const [loadingButtons, setLoadingButtons] = useState(new Set());

  const setButtonLoading = useCallback((buttonId, isLoading) => {
    setLoadingButtons((prev) => {
      const newSet = new Set(prev);
      if (isLoading) {
        newSet.add(buttonId);
      } else {
        newSet.delete(buttonId);
      }
      return newSet;
    });
  }, []);

  const isButtonLoading = useCallback(
    (buttonId) => {
      return loadingButtons.has(buttonId);
    },
    [loadingButtons]
  );

  const createButtonHandler = useCallback(
    (buttonId, asyncAction) => {
      return async (...args) => {
        if (isButtonLoading(buttonId)) return; // Prevent double-click

        setButtonLoading(buttonId, true);
        try {
          await asyncAction(...args);
        } finally {
          setButtonLoading(buttonId, false);
        }
      };
    },
    [isButtonLoading, setButtonLoading]
  );

  return {
    setButtonLoading,
    isButtonLoading,
    createButtonHandler,
    loadingButtons: Array.from(loadingButtons),
  };
};

/**
 * Optimized countdown hook for appointment timers
 */
export const useOptimizedCountdown = (initialCountdowns = {}) => {
  const [countdowns, setCountdowns] = useState(initialCountdowns);
  const intervalsRef = useRef(new Map());

  const manageTimer = useCallback((id, seconds, onComplete) => {
    // Clear existing timer if any
    if (intervalsRef.current.has(id)) {
      clearInterval(intervalsRef.current.get(id));
    }

    // Set initial countdown
    setCountdowns((prev) => ({ ...prev, [id]: seconds }));

    // Start new timer
    const intervalId = setInterval(() => {
      setCountdowns((prev) => {
        const current = prev[id];
        if (current <= 1) {
          clearInterval(intervalId);
          intervalsRef.current.delete(id);
          onComplete?.();
          const { [id]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: current - 1 };
      });
    }, 1000);

    intervalsRef.current.set(id, intervalId);
  }, []);

  const stopTimer = useCallback((id) => {
    if (intervalsRef.current.has(id)) {
      clearInterval(intervalsRef.current.get(id));
      intervalsRef.current.delete(id);
    }
    setCountdowns((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      // Cleanup all timers on unmount
      intervals.forEach((intervalId) => clearInterval(intervalId));
      intervals.clear();
    };
  }, []);

  return {
    countdowns,
    manageTimer,
    stopTimer,
  };
};

/**
 * REMOVED: usePerformanceDiagnostic - Modified for TanStack Query
 * Performance diagnostics should now include TanStack Query metrics
 */

// Export all hooks that are still needed
export default {
  useOptimizedSelector,
  useDebouncedState,
  useStableCallback,
  useDeepMemo,
  useThrottledEffect,
  usePerformanceTracker,
  useStableValue,
  useSmartMemo,
  useBatchedUpdates,
  useVirtualList,
  useOptimizedSubscription,
  useOptimizedState,
  useOptimizedButtonLoading,
  useOptimizedCountdown,
  isDevelopmentMode,
};
