import { getAdminIntlLocale, adminText, useAdminLocale } from '@/pages/admin/adminLocale';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  RefreshCw,
  Images,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserStore } from '@/stores/useUserStore';
import { useAdminResource } from '../hooks/useAdminResource';
import { AdminHeading, AdminFeedback, AdminEmpty } from './AdminPrimitives';
import './AdminDashboard.css';
import { DashboardRecentImages } from './DashboardRecentImages';
function formatCount(value: number | undefined): string { return typeof value==='number' && Number.isFinite(value) && value>=0 ? value.toLocaleString(getAdminIntlLocale()) : '—'; }
export function AdminDashboard() {
  useAdminLocale();
  const user = useUserStore((s) => s.user);
  const { hasPermission, isSuperAdmin } = usePermissions();
  const can = (p: Parameters<typeof hasPermission>[0]) =>
    isSuperAdmin() || hasPermission(p);
  const loader = useCallback(async () => ({ ...await adminService.getDashboardStats(), loadedAt:new Date() }), []);
  const { data, loading, error, reload } = useAdminResource(loader);
  const updatedAt = data?.loadedAt;
  return (
    <section className="admin-dashboard">
      <AdminHeading
        title={adminText("Tổng quan")}
        description={
          adminText("Chào") + " " +
          (user?.displayName || user?.username || adminText("bạn")) +
          adminText(", cùng chăm chút PhotoCloud hôm nay.")
        }
      >
        <button
          className="admin-btn"
          disabled={loading}
          onClick={() => void reload()}
        >
          <RefreshCw size={16} />
          {loading ? adminText("Đang cập nhật…") : adminText("Làm mới")}
        </button>
      </AdminHeading>
      <AdminFeedback error={error} retry={() => void reload()} />
      <div className="dashboard-data-note" role="status"><span>{error && data ? adminText("Chưa thể cập nhật. Đang hiển thị dữ liệu lần tải thành công trước.") : updatedAt ? adminText("Cập nhật lúc {0}", { 0: updatedAt.toLocaleTimeString(getAdminIntlLocale()) }) : loading ? adminText("Đang tải số liệu…") : adminText("Chưa có dữ liệu thống kê")}</span><span>{adminText("Tổng toàn hệ thống · Không giới hạn thời gian")}</span></div>
      <div className="admin-overview-strip" aria-busy={loading} aria-label={adminText("Số liệu tổng quan")}>
        {[
          { label:adminText("Ảnh trong thư viện"), value:data?.stats.totalImages },
          { label:adminText("Thành viên"), value:data?.stats.totalUsers },
          { label:adminText("Danh mục"), value:data?.stats.totalCategories },
        ].map(metric=><div key={metric.label}><span>{metric.label}</span><strong>{data ? formatCount(metric.value) : loading ? '…' : '—'}</strong></div>)}
      </div>
      <div className="admin-dashboard-workspace">
        <section className="admin-recent-section">
          <div className="admin-section-heading">
            <div>
              <h2>{adminText("Ảnh tải lên gần đây")}</h2>
              <p>{adminText("Tối đa 6 ảnh mới nhất, gồm cả ảnh chưa xuất bản.")}</p>
            </div>
            {can('viewImages') && (
              <Link to="/admin/images">
                 {adminText("Xem thư viện")} <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
          {loading && !data ? (
            <div className="admin-skeleton tall" />
          ) : data?.recentImages?.length ? (
            <DashboardRecentImages images={data.recentImages} />
          ) : (
            !error && (
              <AdminEmpty
                title={adminText("Chưa có ảnh mới")}
                description={adminText("Các ảnh mới nhất sẽ được hiển thị ở đây.")}
              />
            )
          )}
        </section>
        <aside className="admin-today">
          <h2>{adminText("Không gian làm việc")}</h2>
          <p>{adminText("Đi thẳng đến công việc bạn cần xử lý.")}</p>
          {!can('moderateContent') && !isSuperAdmin() && !can('viewImages') && <p className="dashboard-no-shortcuts">{adminText("Tài khoản hiện chỉ có quyền xem tổng quan. Liên hệ quản trị viên nếu cần quyền xử lý công việc.")}</p>}
          <nav aria-label={adminText("Công việc nhanh")}>
            {can('moderateContent') && (
              <Link to="/admin/moderation">
                <ShieldCheck size={21} />
                <span>
                  <strong>{adminText("Duyệt ảnh mới")}</strong>
                  <small>{adminText("Kiểm tra nội dung trước khi xuất bản")}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            )}
            {isSuperAdmin() && (
              <Link to="/admin/bookings">
                <CalendarDays size={21} />
                <span>
                  <strong>{adminText("Lịch chụp & dịch vụ")}</strong>
                  <small>{adminText("Yêu cầu, lịch hẹn và gói chụp")}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            )}
            {can('viewImages') && (
              <Link to="/admin/images">
                <Images size={21} />
                <span>
                  <strong>{adminText("Quản lý thư viện")}</strong>
                  <small>{adminText("Sắp xếp và cập nhật ảnh")}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </section>
  );
}
