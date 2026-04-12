import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import './Pagination.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);
  if (currentPage <= 2) end = Math.min(totalPages, 5);
  if (currentPage >= totalPages - 1) start = Math.max(1, totalPages - 4);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="app-pagination">
      <span className="app-pagination-info">
        Tổng: <strong>{totalItems}</strong> bản ghi · Trang <strong>{currentPage}</strong>/<strong>{totalPages}</strong>
      </span>
      <div className="app-pagination-controls">
        <button
          type="button"
          className="app-pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="Trang đầu"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className="app-pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={`app-pagination-btn ${pageNumber === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          className="app-pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="app-pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Trang cuối"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
