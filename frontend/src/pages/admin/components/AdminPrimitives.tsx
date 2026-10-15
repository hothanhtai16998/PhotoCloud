import type { ReactNode } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export function AdminHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-subtitle">{description}</p>
      </div>
      <div className="admin-page-actions">{children}</div>
    </header>
  );
}

export function AdminFeedback({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  if (!error) return null;
  return (
    <div className="admin-feedback" role="alert">
      <AlertCircle size={19} />
      <span>{error}</span>
      <button className="admin-btn" onClick={retry}>
        <RefreshCw size={15} />
        Thử lại
      </button>
    </div>
  );
}

export function AdminPagination({
  page,
  pages,
  total,
  loading,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="admin-pagination" aria-label="Phân trang">
      <span>
        {total.toLocaleString('vi-VN')} kết quả · Trang {page} /{' '}
        {Math.max(1, pages)}
      </span>
      <div>
        <button
          className="admin-btn"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
          Trước
        </button>
        <button
          className="admin-btn"
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Sau
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export function AdminEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-empty">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
