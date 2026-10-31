/**
 * Reusable Pagination Controls
 * Standardizes table/catalog pagination across customer and admin views.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-secondary border-opacity-25 flex-wrap gap-2">
      <div className="text-secondary small">
        Page <strong className="text-white">{currentPage}</strong> of{" "}
        <strong className="text-white">{totalPages}</strong>
        {totalItems !== undefined && (
          <span className="ms-1">({totalItems} total records)</span>
        )}
      </div>

      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-secondary-cinema btn-sm px-3"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <i className="fa-solid fa-chevron-left me-1"></i> Prev
        </button>
        <button
          type="button"
          className="btn btn-secondary-cinema btn-sm px-3"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next <i className="fa-solid fa-chevron-right ms-1"></i>
        </button>
      </div>
    </div>
  );
}
