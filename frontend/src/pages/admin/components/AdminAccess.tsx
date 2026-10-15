import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ADMIN_NAV } from '../adminNavigation';
export function AdminAccess({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { isSuperAdmin, hasPermission, isAdmin } = usePermissions();
  const item = ADMIN_NAV.find((i) => i.to === pathname);
  const allowed =
    item &&
    ('superOnly' in item
      ? isSuperAdmin()
      : 'adminOnly' in item
        ? isAdmin()
        : isSuperAdmin() || hasPermission(item.permission));
  if (!allowed)
    return (
      <div className="admin-empty">
        <h1>Bạn chưa có quyền xem mục này</h1>
        <p>
          Chọn một mục trong menu hoặc liên hệ quản trị viên để được cấp quyền
          phù hợp.
        </p>
        <Link to="/" className="admin-btn">
          Về website
        </Link>
      </div>
    );
  return children;
}
