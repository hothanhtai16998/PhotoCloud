import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { Camera } from 'lucide-react';
import './SessionGate.css';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

function SessionStatus({ title, pending = true }: { title: string; pending?: boolean }) {
  return <main className="session-gate-screen">
    <div className="session-gate-status" role="status" aria-live="polite">
      <div className="session-gate-brand" aria-hidden="true"><Camera size={28} strokeWidth={1.5} /><span>PhotoCloud</span></div>
      <h1>{title}</h1>
      <p>{pending ? 'Vui lòng đợi trong giây lát.' : 'Vui lòng dùng nút Thử lại để tiếp tục.'}</p>
      {pending && <LoadingIndicator className="session-gate-loading" aria-hidden="true" />}
    </div>
  </main>;
}

// Guards wait for evidence. Connection failures never mean "signed out".
export function SessionGate({ admin = false }: { admin?: boolean }) {
  const { accessToken, isInitializing, sessionError } = useAuthStore();
  const { user, loading, error, fetchMe } = useUserStore();
  useEffect(() => {
    if (accessToken && !user && !loading && !error) void fetchMe();
  }, [accessToken, user, loading, error, fetchMe]);

  if (isInitializing) return <SessionStatus title="Đang xác minh phiên đăng nhập" />;
  if (!accessToken && sessionError) return <SessionStatus title="Chưa thể xác minh phiên đăng nhập" pending={false} />;
  if (!accessToken) return <Navigate to="/signin" replace />;
  if (!user) {
    if (error) return <SessionStatus title="Chưa tải được thông tin tài khoản" pending={false} />;
    return <SessionStatus title="Đang tải thông tin tài khoản" />;
  }
  const canOpenAdmin = user.isAdmin || user.isSuperAdmin || Boolean(user.permissions && Object.keys(user.permissions).length);
  if (admin && !canOpenAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
