import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';

// Guards wait for evidence. Connection failures never mean "signed out".
export function SessionGate({ admin = false }: { admin?: boolean }) {
  const { accessToken, isInitializing, sessionError } = useAuthStore();
  const { user, loading, error, fetchMe } = useUserStore();
  useEffect(() => {
    if (accessToken && !user && !loading && !error) void fetchMe();
  }, [accessToken, user, loading, error, fetchMe]);

  if (isInitializing || (!accessToken && sessionError)) return <p role="status">Đang chờ xác minh phiên đăng nhập…</p>;
  if (!accessToken) return <Navigate to="/signin" replace />;
  if (!user) {
    if (error) return <p role="status">Chưa tải được thông tin tài khoản. Vui lòng dùng nút Thử lại.</p>;
    return <p role="status">Đang tải thông tin tài khoản…</p>;
  }
  const canOpenAdmin = user.isAdmin || user.isSuperAdmin || Boolean(user.permissions && Object.keys(user.permissions).length);
  if (admin && !canOpenAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
