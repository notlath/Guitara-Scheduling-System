import { useMemo, useState } from "react";

/**
 * Custom hook for handling pagination logic
 * @param {Array} items - Array of items to paginate
 * @param {number} itemsPerPage - Number of items per page (default: 10)
 * @param {number} totalItemsCount - Optional total count for server-side pagination
 * @returns {Object} Pagination state and controls
 */
export const usePagination = (items = [], itemsPerPage = 10, totalItemsCount = null) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(totalItemsCount);

  // Allow external updates to total count (for server pagination)
  const setTotalCount = (count) => {
    if (count !== totalItems) {
      setTotalItems(count);
    }
  };

  // Calculate pagination values
  const paginationData = useMemo(() => {
    // Use provided totalItemsCount if available, otherwise use items length
    const effectiveTotalItems = totalItems !== null ? totalItems : items.length;
    const totalPages = Math.ceil(effectiveTotalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = items; // For server pagination, items already contains only the current page

    // Calculate page range for pagination controls
    const getPageRange = () => {
      const delta = 2; // Number of pages to show on each side of current page
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
      totalItems: effectiveTotalItems,
      startIndex: startIndex + 1, // 1-based for display
      endIndex: Math.min(endIndex, effectiveTotalItems), // Adjust for last page
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      pageRange: totalPages > 1 ? getPageRange() : [],
    };
  }, [items, itemsPerPage, currentPage, totalItems]);

  // Navigation functions
  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, paginationData.totalPages));
    setCurrentPage(pageNumber);
  };

  const goToNextPage = () => {
    if (paginationData.hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (paginationData.hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(paginationData.totalPages);
  };

  // Reset to first page when items change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    ...paginationData,
    goToPage,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    resetPagination,
    setItemsPerPage: (newItemsPerPage) => {
      setCurrentPage(1); // Reset to first page
      return newItemsPerPage;
    },
    setTotalItems: setTotalCount, // Allow setting total items count for server pagination
    currentPage, // Expose current page for server requests
    itemsPerPage, // Expose items per page for server requests
  };
};

export default usePagination;
