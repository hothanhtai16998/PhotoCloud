import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Images, Folder, Heart, Calendar, Users, UserPlus, RefreshCw, ArrowRight, Eye } from 'lucide-react';
import { useUserStore } from '@/stores/useUserStore';
import { useUserDashboard } from './hooks/useUserDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { UploadTrigger } from '@/components/UploadTrigger';
import './UserDashboardPage.css';

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    to: string;
    color?: 'default' | 'primary' | 'success' | 'warning';
}

/** Single stat card linking to a related page. */
const StatCard = memo(function StatCard({ label, value, icon, to, color = 'default' }: StatCardProps) {
    return (
        <Link to={to} className={`user-dash-stat tone-${color}`}>
            <div className="user-dash-stat-icon" aria-hidden="true">{icon}</div>
            <div className="user-dash-stat-body">
                <span className="user-dash-stat-value">{value.toLocaleString()}</span>
                <span className="user-dash-stat-label">{label}</span>
            </div>
            <ArrowRight size={16} className="user-dash-stat-arrow" aria-hidden="true" />
        </Link>
    );
});

export default memo(function UserDashboardPage() {
    const { user } = useUserStore();
    const { data, loading, error, refresh } = useUserDashboard();

    return (
        <div className="user-dashboard">
            {/* Header */}
            <header className="user-dash-header">
                <div>
                    <h1 className="user-dash-title">
                        xin chào, {user?.displayName || user?.username || 'bạn'}
                    </h1>
                    <p className="user-dash-subtitle">
                        Đây là tổng quan tài khoản của bạn.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refresh()}
                    disabled={loading}
                >
                    <RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" />
                    Làm mới
                </Button>
            </header>

            {error && (
                <div className="user-dash-error" role="alert">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={() => void refresh()}>
                        Thử lại
                    </Button>
                </div>
            )}

            {/* Stats grid */}
            <section aria-label="Thống kê" className="user-dash-stats">
                {loading && !data ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="user-dash-stat-placeholder">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <div className="user-dash-stat-body">
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Ảnh đã tải lên"
                            value={data?.totalImages ?? 0}
                            icon={<Images size={22} />}
                            to="/favorites/photos"
                            color="primary"
                        />
                        <StatCard
                            label="Bộ sưu tập"
                            value={data?.totalCollections ?? 0}
                            icon={<Folder size={22} />}
                            to="/favorites/collections"
                        />
                        <StatCard
                            label="Yêu thích"
                            value={data?.totalFavorites ?? 0}
                            icon={<Heart size={22} />}
                            to="/favorites"
                            color="success"
                        />
                        <StatCard
                            label="Lịch đặt chụp"
                            value={data?.totalBookings ?? 0}
                            icon={<Calendar size={22} />}
                            to="/profile/bookings"
                        />
                        <StatCard
                            label="Người theo dõi"
                            value={data?.totalFollowers ?? 0}
                            icon={<Users size={22} />}
                            to={`/users/${user?.username}`}
                        />
                        <StatCard
                            label="Đang theo dõi"
                            value={data?.totalFollowing ?? 0}
                            icon={<UserPlus size={22} />}
                            to={`/users/${user?.username}`}
                        />
                    </>
                )}
            </section>

            {/* Recent images */}
            <section aria-label="Ảnh gần đây" className="user-dash-section">
                <div className="user-dash-section-header">
                    <h2 className="user-dash-section-title">Ảnh gần đây</h2>
                    <Link to="/favorites/photos" className="user-dash-section-link">
                        Xem tất cả <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>

                {loading && !data ? (
                    <div className="user-dash-images-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-lg" />
                        ))}
                    </div>
                ) : data?.recentImages && data.recentImages.length > 0 ? (
                    <div className="user-dash-images-grid">
                        {data.recentImages.map((img) => (
                            <Link
                                key={img._id}
                                to={`/photos/${img._id}`}
                                className="user-dash-image-card"
                                aria-label={`Xem ảnh: ${img.title || 'Untitled'}`}
                            >
                                <div className="user-dash-image-thumb" aria-hidden="true">
                                    {img.thumbnailUrl || img.url ? (
                                        <img src={img.thumbnailUrl || img.url} alt="" loading="lazy" />
                                    ) : (
                                        <Images size={24} />
                                    )}
                                </div>
                                <div className="user-dash-image-info">
                                    <span className="user-dash-image-title">
                                        {img.title || 'Untitled'}
                                    </span>
                                    <span className="user-dash-image-meta">
                                        <Eye size={12} aria-hidden="true" />
                                        {(img.views ?? 0).toLocaleString()}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="user-dash-empty">
                        <Images size={32} aria-hidden="true" />
                        <p>Chưa có ảnh nào.</p>
                        <UploadTrigger onUploaded={refresh}>Tải ảnh đầu tiên</UploadTrigger>
                    </div>
                )}
            </section>

            {/* Recent bookings */}
            <section aria-label="Lịch đặt gần đây" className="user-dash-section">
                <div className="user-dash-section-header">
                    <h2 className="user-dash-section-title">Lịch đặt gần đây</h2>
                    <Link to="/profile/bookings" className="user-dash-section-link">
                        Xem tất cả <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                </div>

                {loading && !data ? (
                    <div className="user-dash-bookings-list">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="user-dash-booking-row">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        ))}
                    </div>
                ) : data?.recentBookings && data.recentBookings.length > 0 ? (
                    <div className="user-dash-bookings-list">
                        {data.recentBookings.map((bk) => (
                            <Link
                                key={bk._id}
                                to={`/bookings/${bk._id}`}
                                className="user-dash-booking-row"
                            >
                                <span className="user-dash-booking-name">{bk.packageName}</span>
                                <span className={`admin-badge ${bk.status === 'confirmed' ? 'ok' : bk.status === 'cancelled' ? 'danger' : ''}`}>
                                    {bk.status}
                                </span>
                                <span className="user-dash-booking-date">
                                    {bk.bookingDate
                                        ? new Date(bk.bookingDate).toLocaleDateString('vi-VN')
                                        : '—'}
                                </span>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="user-dash-empty">
                        <Calendar size={32} aria-hidden="true" />
                        <p>Chưa có lịch đặt nào.</p>
                        <Link to="/booking">
                            <Button size="sm">Đặt lịch chụp ngay</Button>
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
});
