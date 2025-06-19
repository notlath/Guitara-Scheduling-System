/**
 * PERFORMANCE BREAKTHROUGH: Virtualized pagination for massive performance gains
 * Combines virtual scrolling with smart pagination for optimal performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ITEM_HEIGHT = 200; // Estimated height per appointment card
const BUFFER_SIZE = 5; // Items to render outside viewport

/**
 * Ultra-optimized virtualized pagination hook
 */
export const useVirtualizedPagination = (
  items = [],
  itemsPerPage = 10,
  containerHeight = 600
) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const [isVirtualized, setIsVirtualized] = useState(false);

  const scrollPositionRef = useRef(0);
  const containerRef = useRef();

  // PERFORMANCE: Decide between pagination and virtualization based on data size
  const shouldVirtualize = items.length > 50;

  // PERFORMANCE: Memoized pagination calculations
  const paginationData = useMemo(() => {
    if (shouldVirtualize && isVirtualized) {
      // Virtual scrolling mode
      const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
      const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
      const bufferedStart = Math.max(0, startIndex - BUFFER_SIZE);
      const bufferedEnd = Math.min(
        items.length,
        startIndex + visibleCount + BUFFER_SIZE
      );

      const virtualItems = items
        .slice(bufferedStart, bufferedEnd)
        .map((item, index) => ({
          ...item,
          virtualIndex: bufferedStart + index,
          offsetY: (bufferedStart + index) * ITEM_HEIGHT,
        }));

      return {
        currentItems: virtualItems,
        currentPage: 1,
        totalPages: 1,
        totalItems: items.length,
        startIndex: bufferedStart + 1,
        endIndex: bufferedEnd,
        hasNextPage: false,
        hasPrevPage: false,
        pageRange: [],
        isVirtualized: true,
        totalHeight: items.length * ITEM_HEIGHT,
        visibleRange: { start: bufferedStart, end: bufferedEnd },
      };
    } else {
      // Standard pagination mode
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentItems = items.slice(startIndex, endIndex);

      // Smart page range calculation
      const getPageRange = () => {
        if (totalPages <= 7) {
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (
          let i = Math.max(2, currentPage - delta);
          i <= Math.min(totalPages - 1, currentPage + delta);
          i++
        ) {
          range.push(i);
        }

        if (currentPage - delta > 2) {
          rangeWithDots.push(1, "...");
        } else {
          rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
          rangeWithDots.push("...", totalPages);
        } else if (totalPages > 1) {
          rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
      };

      return {
        currentItems,
        currentPage,
        totalPages,
        totalItems,
        startIndex: startIndex + 1,
        endIndex: Math.min(endIndex, totalItems),
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        pageRange: totalPages > 1 ? getPageRange() : [],
        isVirtualized: false,
        totalHeight: 0,
        visibleRange: null,
      };
    }
  }, [
    items,
    itemsPerPage,
    currentPage,
    scrollTop,
    containerHeight,
    shouldVirtualize,
    isVirtualized,
  ]);

  // PERFORMANCE: Optimized navigation functions with stable references
  const goToPage = useCallback(
    (page) => {
      const pageNumber = Math.max(1, Math.min(page, paginationData.totalPages));
      setCurrentPage(pageNumber);
    },
    [paginationData.totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (paginationData.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [paginationData.hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (paginationData.hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [paginationData.hasPrevPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(paginationData.totalPages);
  }, [paginationData.totalPages]);

  // PERFORMANCE: Optimized scroll handler with throttling
  const handleScroll = useCallback(
    (e) => {
      if (!shouldVirtualize || !isVirtualized) return;

      const newScrollTop = e.target.scrollTop;
      scrollPositionRef.current = newScrollTop;

      // Throttle scroll updates
      requestAnimationFrame(() => {
        if (scrollPositionRef.current === newScrollTop) {
          setScrollTop(newScrollTop);
        }
      });
    },
    [shouldVirtualize, isVirtualized]
  );

  // PERFORMANCE: Toggle between pagination and virtualization
  const toggleVirtualization = useCallback(() => {
    setIsVirtualized((prev) => !prev);
    setScrollTop(0);
    setCurrentPage(1);
  }, []);

  // PERFORMANCE: Auto-enable virtualization for large datasets
  useEffect(() => {
    if (shouldVirtualize && !isVirtualized && items.length > 100) {
      setIsVirtualized(true);
    }
  }, [shouldVirtualize, isVirtualized, items.length]);

  // PERFORMANCE: Reset on item changes
  useEffect(() => {
    setCurrentPage(1);
    setScrollTop(0);
  }, [items.length]);

  return {
    ...paginationData,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    handleScroll,
    toggleVirtualization,
    shouldVirtualize,
    containerRef,

    // Additional utilities
    resetPagination: useCallback(() => {
      setCurrentPage(1);
      setScrollTop(0);
    }, []),

    setItemsPerPage: useCallback((newItemsPerPage) => {
      setCurrentPage(1);
      return newItemsPerPage;
    }, []),
  };
};

export default useVirtualizedPagination;
