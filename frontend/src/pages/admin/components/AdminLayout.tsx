import { AdminLanguageSelect } from './AdminLanguageSelect';
import { adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Images, LogOut, Sun, Moon, Menu, X, ArrowUpRight } from 'lucide-react';
import { useUserStore } from '@/stores/useUserStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminRolePermissions } from '@/services/adminService';
import {
  getSiteTheme,
  setSiteTheme,
  subscribeSiteTheme,
} from '@/utils/siteTheme';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import './AdminLayout.css';
import '../AdminImagesPage.css';

import { ADMIN_NAV } from '../adminNavigation';
export function AdminLayout() {
  const locale = useAdminLocale();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { hasPermission, isSuperAdmin, isAdmin } = usePermissions();
  const theme = useSyncExternalStore(
    subscribeSiteTheme,
    getSiteTheme,
    () => 'light'
  );
  const dark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const items = ADMIN_NAV.filter((item) =>
    'superOnly' in item
      ? isSuperAdmin()
      : 'adminOnly' in item
        ? isAdmin()
        : isSuperAdmin() ||
          hasPermission(item.permission as keyof AdminRolePermissions)
  );
  const active = ADMIN_NAV.find((i) => i.to === location.pathname);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog || !open) return;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      toggle.current?.focus();
    };
  }, [open]);
  const nav = (
    <>
      <div className="admin-sidebar-intro">
        <span className="admin-studio-mark">
          <Images size={21} />
        </span>
        <div>
          <strong>PhotoCloud</strong>
          <span>{adminText("Không gian quản trị")}</span>
        </div>
      </div>
      <nav className="admin-layout-nav" aria-label={adminText("Điều hướng quản trị")}>
        {['Không gian làm việc', 'Studio', 'Quản lý'].map(
          (group) =>
            items.some((i) => i.group === group) && (
              <div className="admin-nav-group" key={group}>
                <p>{adminText(group)}</p>
                {items
                  .filter((i) => i.group === group)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin'}
                      className={({ isActive }) =>
                        'admin-layout-nav-item' + (isActive ? ' active' : '')
                      }
                    >
                      <item.icon size={19} />
                      <span>{adminText(item.label)}</span>
                    </NavLink>
                  ))}
              </div>
            )
        )}
      </nav>
      <Link to="/" className="admin-back-site">
         {adminText("Về website")} <ArrowUpRight size={17} />
      </Link>
    </>
  );
  return (
    <div className="admin-layout" lang={locale}>
      <a className="admin-skip-link" href="#admin-main">
         {adminText("Đến nội dung chính")} </a>
      <aside className="admin-layout-sidebar">{nav}</aside>
      <header className="admin-layout-topbar">
        <button
          ref={toggle}
          className="admin-layout-icon-btn admin-layout-sidebar-toggle"
          aria-label={adminText("Mở menu quản trị")}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
        <div className="admin-breadcrumb">
          <span>PhotoCloud</span>
          <span>/</span>
          <strong>{adminText(active?.label || adminText('Quản trị'))}</strong>
        </div>
        <div className="admin-layout-topbar-actions">
          <AdminLanguageSelect />
          <button
            className="admin-layout-icon-btn"
            onClick={() => setSiteTheme(dark ? 'light' : 'dark')}
            aria-label={
              dark ? adminText("Chuyển sang giao diện sáng") : adminText("Chuyển sang giao diện tối")
            }
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <span className="admin-topbar-divider" />
          <div className="admin-layout-user">
            <span className="admin-avatar">
              {(user?.displayName || user?.username || 'A')
                .slice(0, 1)
                .toUpperCase()}
            </span>
            <div>
              <strong>
                {user?.displayName || user?.username || adminText("Quản trị viên")}
              </strong>
              <small>
                {isSuperAdmin() ? adminText("Quản trị cấp cao") : adminText("Quản trị viên")}
              </small>
            </div>
          </div>
          <button
            className="admin-layout-icon-btn"
            disabled={signingOut}
            aria-label={adminText("Đăng xuất")}
            onClick={async () => {
              setSigningOut(true);
              try {
                await signOut();
              } finally {
                setSigningOut(false);
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <dialog
        ref={drawer}
        id="admin-mobile-nav"
        className="admin-mobile-drawer"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <button
          className="admin-layout-icon-btn admin-drawer-close"
          onClick={() => setOpen(false)}
          aria-label={adminText("Đóng menu")}
        >
          <X size={22} />
        </button>
        {nav}
      </dialog>
      <main id="admin-main" className="admin-layout-main" tabIndex={-1}>
        <div className="admin-content" key={location.pathname}>
          <AdminErrorBoundary scope={adminText("trang quản trị")}>
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>
    </div>
  );
}
