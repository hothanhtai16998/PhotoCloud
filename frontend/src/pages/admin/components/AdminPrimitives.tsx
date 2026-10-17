import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
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
  useAdminLocale();
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
  useAdminLocale();
  if (!error) return null;
  return (
    <div className="admin-feedback" role="alert">
      <AlertCircle size={19} />
      <span>{adminText(error)}</span>
      <button className="admin-btn" onClick={retry}>
        <RefreshCw size={15} />
         {adminText("Thử lại")} </button>
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
  useAdminLocale();
  return (
    <nav className="admin-pagination" aria-label={adminText("Phân trang")}>
      <span>
        {total.toLocaleString(getAdminIntlLocale())}  {adminText("kết quả · Trang")} {page} /{' '}
        {Math.max(1, pages)}
      </span>
      <div>
        <button
          className="admin-btn"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
           {adminText("Trước")} </button>
        <button
          className="admin-btn"
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          {adminText("Sau")}
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
  useAdminLocale();
  return (
    <div className="admin-empty">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
