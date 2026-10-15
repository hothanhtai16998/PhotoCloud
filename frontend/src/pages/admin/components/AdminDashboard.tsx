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
export function AdminDashboard() {
  const user = useUserStore((s) => s.user);
  const { hasPermission, isSuperAdmin } = usePermissions();
  const can = (p: Parameters<typeof hasPermission>[0]) =>
    isSuperAdmin() || hasPermission(p);
  const loader = useCallback(() => adminService.getDashboardStats(), []);
  const { data, loading, error, reload } = useAdminResource(loader);
  return (
    <section className="admin-dashboard">
      <AdminHeading
        title="Tổng quan"
        description={
          'Chào ' +
          (user?.displayName || user?.username || 'bạn') +
          ', cùng chăm chút PhotoCloud hôm nay.'
        }
      >
        <button
          className="admin-btn"
          disabled={loading}
          onClick={() => void reload()}
        >
          <RefreshCw size={16} />
          Làm mới
        </button>
      </AdminHeading>
      <AdminFeedback error={error} retry={() => void reload()} />
      <div className="admin-overview-strip" aria-label="Số liệu tổng quan">
        <div>
          <span>Ảnh trong thư viện</span>
          <strong>
            {data
              ? data.stats.totalImages.toLocaleString('vi-VN')
              : loading
                ? '…'
                : '—'}
          </strong>
        </div>
        <div>
          <span>Thành viên</span>
          <strong>
            {data
              ? data.stats.totalUsers.toLocaleString('vi-VN')
              : loading
                ? '…'
                : '—'}
          </strong>
        </div>
        <div>
          <span>Danh mục</span>
          <strong>
            {data?.stats.totalCategories?.toLocaleString('vi-VN') ??
              (loading ? '…' : '—')}
          </strong>
        </div>
      </div>
      <div className="admin-dashboard-workspace">
        <section className="admin-recent-section">
          <div className="admin-section-heading">
            <div>
              <h2>Những khung hình mới</h2>
              <p>Các ảnh được tải lên gần đây nhất.</p>
            </div>
            {can('viewImages') && (
              <Link to="/admin/images">
                Xem thư viện
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
          {loading && !data ? (
            <div className="admin-skeleton tall" />
          ) : data?.recentImages.length ? (
            <div className="admin-recent-list">
              {data.recentImages.slice(0, 6).map((image) => (
                <div key={image._id} className="admin-recent-row">
                  <span className="admin-recent-photo">
                    {image.imageUrl ? (
                      <img src={image.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <Images size={22} />
                    )}
                  </span>
                  <div>
                    <strong>{image.imageTitle || 'Chưa đặt tên'}</strong>
                    <small>
                      {image.uploadedBy?.displayName ||
                        image.uploadedBy?.username ||
                        'Chưa rõ tác giả'}
                    </small>
                  </div>
                  <span className="admin-recent-date">
                    {new Date(image.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <AdminEmpty
                title="Chưa có ảnh mới"
                description="Các ảnh mới nhất sẽ được hiển thị ở đây."
              />
            )
          )}
        </section>
        <aside className="admin-today">
          <h2>Không gian làm việc</h2>
          <p>Đi thẳng đến công việc bạn cần xử lý.</p>
          <nav aria-label="Công việc nhanh">
            {can('moderateContent') && (
              <Link to="/admin/moderation">
                <ShieldCheck size={21} />
                <span>
                  <strong>Duyệt ảnh mới</strong>
                  <small>Kiểm tra nội dung trước khi xuất bản</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            )}
            {isSuperAdmin() && (
              <Link to="/admin/bookings">
                <CalendarDays size={21} />
                <span>
                  <strong>Lịch chụp & dịch vụ</strong>
                  <small>Yêu cầu, lịch hẹn và gói chụp</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            )}
            {can('viewImages') && (
              <Link to="/admin/images">
                <Images size={21} />
                <span>
                  <strong>Quản lý thư viện</strong>
                  <small>Sắp xếp và cập nhật ảnh</small>
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
