import "./Pagination.css";

/**
 * Reusable Pagination Component
 * @param {Object} props - Pagination props
 * @param {number} props.currentPage - Current active page
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.startIndex - Start index for current page (1-based)
 * @param {number} props.endIndex - End index for current page
 * @param {boolean} props.hasNextPage - Whether there's a next page
 * @param {boolean} props.hasPrevPage - Whether there's a previous page
 * @param {Array} props.pageRange - Array of page numbers and ellipsis
 * @param {Function} props.goToPage - Function to go to specific page
 * @param {Function} props.goToNextPage - Function to go to next page
 * @param {Function} props.goToPrevPage - Function to go to previous page
 * @param {Function} props.goToFirstPage - Function to go to first page
 * @param {Function} props.goToLastPage - Function to go to last page
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showInfo - Whether to show pagination info text
 * @param {string} props.itemName - Name of items being paginated (default: "items")
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  hasNextPage,
  hasPrevPage,
  pageRange,
  goToPage,
  goToNextPage,
  goToPrevPage,
  goToFirstPage,
  goToLastPage,
  className = "",
  showInfo = true,
  itemName = "items",
}) => {
  // Don't render if there's only one page or no items
  if (totalPages <= 1 || totalItems === 0) return null;

  const handlePageClick = (page) => {
    if (page !== "..." && page !== currentPage) {
      goToPage(page);
    }
  };

  return (
    <div className={`pagination-container ${className}`}>
      {/* Pagination Info */}
      {showInfo && (
        <div className="pagination-info">
          Showing {startIndex}-{endIndex} of {totalItems} {itemName}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="pagination-controls">
        {/* First Page Button */}
        <button
          className="pagination-btn pagination-btn-first"
          onClick={goToFirstPage}
          disabled={!hasPrevPage}
          title="First Page"
        >
          ««
        </button>

        {/* Previous Page Button */}
        <button
          className="pagination-btn pagination-btn-prev"
          onClick={goToPrevPage}
          disabled={!hasPrevPage}
          title="Previous Page"
        >
          ‹
        </button>

        {/* Page Numbers */}
        <div className="pagination-numbers">
          {pageRange.map((page, index) => (
            <button
              key={`${page}-${index}`}
              className={`pagination-btn pagination-btn-number ${
                page === currentPage ? "active" : ""
              } ${page === "..." ? "ellipsis" : ""}`}
              onClick={() => handlePageClick(page)}
              disabled={page === "..." || page === currentPage}
              title={page === "..." ? "" : `Go to page ${page}`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Page Button */}
        <button
          className="pagination-btn pagination-btn-next"
          onClick={goToNextPage}
          disabled={!hasNextPage}
          title="Next Page"
        >
          ›
        </button>

        {/* Last Page Button */}
        <button
          className="pagination-btn pagination-btn-last"
          onClick={goToLastPage}
          disabled={!hasNextPage}
          title="Last Page"
        >
          »»
        </button>
      </div>
    </div>
  );
};

export default Pagination;
