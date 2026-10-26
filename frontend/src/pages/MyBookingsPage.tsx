import { formatRequestedTime } from '@/utils/bookingTime';
import { DataLoading } from '@/components/user/DataLoading';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Camera, Check, Clock3, MapPin, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import type { Booking, BookingStatus } from '@/types/booking';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { BRAND } from '@/constants/brand';
import { getErrorMessage } from '@/lib/utils';
import './MyBookingsPage.css';

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Chờ xử lý',
  reviewing: 'Đang xem xét',
  needs_information: 'Cần bổ sung',
  confirmed: 'Đã xác nhận',
  rescheduled: 'Đã đổi lịch',
  completed: 'Hoàn thành',
  cancelled_by_client: 'Đã hủy',
  cancelled_by_photographer: 'Studio đã hủy',
  rejected: 'Từ chối',
  expired: 'Hết hạn',
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return value;
  }
};

/** Tính số ngày còn lại đến buổi chụp (âm nếu đã qua). */
const daysUntil = (isoDate: string): number => {
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};


export default function MyBookingsPage() {
  useDocumentMeta({
    title: 'Lịch đặt của tôi',
    description: `Theo dõi các yêu cầu đặt lịch chụp ảnh tại ${BRAND.nameLong}.`,
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [rescheduleFor, setRescheduleFor] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('flexible');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let active = true;
    bookingService
      .getMine(1)
      .then((data) => { if (active) setBookings(data.bookings); })
      .catch((error: unknown) => toast.error(getErrorMessage(error, 'Không thể tải danh sách booking.')))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleReschedule = async (bookingId: string) => {
    if (!rescheduleDate) {
      toast.error('Vui lòng chọn ngày mới.');
      return;
    }
    setRescheduleSubmitting(true);
    try {
      const data = await bookingService.requestReschedule(bookingId, {
        requestedDate: rescheduleDate,
        requestedTimeSlot: rescheduleSlot as 'morning' | 'afternoon' | 'evening' | 'flexible',
      });
      setBookings((list) => list.map((b) => (b._id === bookingId ? data.booking : b)));
      setRescheduleFor(null);
      setRescheduleDate('');
      setRescheduleSlot('flexible');
      toast.success('Đã gửi yêu cầu đổi lịch.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Không thể gửi yêu cầu đổi lịch.'));
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming')
      return ['pending', 'reviewing', 'needs_information', 'confirmed', 'rescheduled'].includes(b.status);
    if (activeFilter === 'completed') return b.status === 'completed';
    if (activeFilter === 'cancelled')
      return ['cancelled_by_client', 'cancelled_by_photographer', 'rejected', 'expired'].includes(b.status);
    return true;
  });

  const counts = {
    all: bookings.length,
    upcoming: bookings.filter((b) =>
      ['pending', 'reviewing', 'needs_information', 'confirmed', 'rescheduled'].includes(b.status),
    ).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) =>
      ['cancelled_by_client', 'cancelled_by_photographer', 'rejected', 'expired'].includes(b.status),
    ).length,
  };

  return (
    <main className="my-bookings-page">
      <div className="my-bookings-wrap">
        <header className="my-bookings-header">
          <div>
            <p className="booking-eyebrow">LỊCH ĐẶT CỦA TÔI</p>
            <h1>Các yêu cầu đặt lịch của bạn</h1>
            <p className="my-bookings-subtitle">
              Theo dõi trạng thái, cập nhật thông tin và xem lịch sử các buổi chụp tại {BRAND.nameLong}.
            </p>
          </div>
          <Link to="/booking" className="booking-primary-button my-bookings-cta">
            <Plus size={17} /> Đặt lịch mới
          </Link>
        </header>

        <nav className="my-bookings-filters" aria-label="Lọc booking">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'upcoming', label: 'Sắp tới' },
            { key: 'completed', label: 'Hoàn thành' },
            { key: 'cancelled', label: 'Đã hủy' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className={`my-bookings-filter${activeFilter === item.key ? ' is-active' : ''}`}
              onClick={() => setActiveFilter(item.key as typeof activeFilter)}
            >
              {item.label}
              <span className="my-bookings-filter-count">{counts[item.key as keyof typeof counts]}</span>
            </button>
          ))}
        </nav>

        {loading ? (
          <DataLoading message="Đang tải lịch đặt" />
        ) : filtered.length === 0 ? (
          <div className="my-bookings-empty">
            <Camera size={48} aria-hidden />
            <h2>Chưa có lịch đặt nào</h2>
            <p>Bắt đầu bằng cách chọn gói chụp và gửi yêu cầu cho đội ngũ {BRAND.nameLong}.</p>
            <Link to="/packages" className="booking-primary-button">
              Khám phá gói chụp
            </Link>
          </div>
        ) : (
          <ul className="my-bookings-list">
            {filtered.map((booking) => {
              const days = daysUntil(booking.requestedDate);
              const showCountdown =
                days >= 0 &&
                (booking.status === 'confirmed' || booking.status === 'rescheduled');
              const showAwait = booking.status === 'pending' || booking.status === 'reviewing';
              const showRescheduleButton =
                rescheduleFor === booking._id ||
                booking.status === 'confirmed' ||
                booking.status === 'rescheduled';

              return (
                <li key={booking._id} className="my-bookings-card">
                  <div className="my-bookings-card-head">
                    <div>
                      <p className="my-bookings-code">{booking.bookingCode}</p>
                      <h3>{booking.packageSnapshot.name}</h3>
                    </div>
                    <span className={`booking-detail-status booking-status-${booking.status}`}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>

                  {(showCountdown || showAwait) && (
                    <div
                      className={`my-bookings-banner${showAwait ? ' my-bookings-banner--await' : ''}`}
                    >
                      {showCountdown ? (
                        <>
                          <Clock3 size={15} />
                          <span>
                            Còn <strong>{days}</strong> ngày đến buổi chụp
                            {days === 0 && ' — hôm nay!'}
                            {days === 1 && ' — mai'}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={15} />
                          <span>Chờ xác nhận — đội ngũ sẽ phản hồi trong 24h</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="my-bookings-card-info">
                    <div>
                      <CalendarDays size={15} />
                      <span>
                        <small>Ngày mong muốn</small>
                        <strong>{formatDate(booking.requestedDate)}</strong>
                      </span>
                    </div>
                    <div>
                      <Clock3 size={15} />
                      <span>
                        <small>Khung giờ</small>
                        <strong>{formatRequestedTime(booking)}</strong>
                      </span>
                    </div>
                    <div>
                      <MapPin size={15} />
                      <span>
                        <small>Địa điểm</small>
                        <strong>{booking.location.address || '—'}</strong>
                      </span>
                    </div>
                    <div>
                      <Check size={15} />
                      <span>
                        <small>Giá tham khảo</small>
                        <strong>{formatPrice(booking.packageSnapshot.basePrice)}</strong>
                      </span>
                    </div>
                  </div>

                  {showRescheduleButton && (
                    <div className="my-bookings-reschedule">
                      {rescheduleFor === booking._id ? (
                        <div className="my-bookings-reschedule-form">
                          <label>
                            Ngày mới
                            <input
                              type="date"
                              min={todayIso}
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                            />
                          </label>
                          <label>
                            Khung giờ
                            <select
                              value={rescheduleSlot}
                              onChange={(e) => setRescheduleSlot(e.target.value)}
                            >
                              <option value="morning">Buổi sáng</option>
                              <option value="afternoon">Buổi chiều</option>
                              <option value="evening">Buổi tối</option>
                              <option value="flexible">Linh hoạt</option>
                            </select>
                          </label>
                          <div className="my-bookings-reschedule-actions">
                            <button
                              type="button"
                              className="booking-primary-button"
                              onClick={() => handleReschedule(booking._id)}
                              disabled={rescheduleSubmitting}
                            >
                              {rescheduleSubmitting ? 'Đang gửi...' : 'Xác nhận đổi lịch'}
                            </button>
                            <button
                              type="button"
                              className="booking-secondary-button"
                              onClick={() => {
                                setRescheduleFor(null);
                                setRescheduleDate('');
                                setRescheduleSlot('flexible');
                              }}
                            >
                              Huỷ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="my-bookings-reschedule-btn"
                          onClick={() => setRescheduleFor(booking._id)}
                        >
                          <RefreshCw size={14} /> Yêu cầu đổi lịch
                        </button>
                      )}
                    </div>
                  )}

                  <div className="my-bookings-card-actions">
                    <Link to={`/booking/${booking._id}`} className="booking-secondary-button">
                      Xem chi tiết
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
