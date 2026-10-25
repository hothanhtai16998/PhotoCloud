import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { bookingService } from '@/services/bookingService';
import type { Booking, BookingStatus } from '@/types/booking';
import { getErrorMessage } from '@/lib/utils';
import './MyBookings.css';
import { DataLoading } from '@/components/user/DataLoading';

const labels: Record<BookingStatus, string> = { pending: 'Chờ xử lý', reviewing: 'Đang xem xét', needs_information: 'Cần bổ sung', confirmed: 'Đã xác nhận', rescheduled: 'Đã đổi lịch', completed: 'Hoàn thành', cancelled_by_client: 'Đã hủy', cancelled_by_photographer: 'Đã hủy', rejected: 'Từ chối', expired: 'Hết hạn' };

export function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    bookingService.getMine().then((data) => { if (active) setBookings(data.bookings); }).catch((error: unknown) => toast.error(getErrorMessage(error, 'Không thể tải lịch đặt'))).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <DataLoading message="Đang tải lịch đặt" size="compact" />;
  return <section className="my-bookings"><div className="my-bookings-heading"><div><p className="profile-section-eyebrow">BOOKINGS</p><h2>Lịch đặt của tôi</h2><p>Theo dõi các yêu cầu chụp ảnh và trạng thái xác nhận.</p></div><Link to="/booking" className="my-bookings-new">Đặt lịch mới</Link></div>{bookings.length === 0 ? <div className="my-bookings-empty"><CalendarDays size={25} /><p>Bạn chưa có yêu cầu đặt lịch nào.</p><Link to="/booking">Khám phá các gói chụp</Link></div> : <div className="my-bookings-list">{bookings.map((booking) => <Link className="my-booking-card" to={`/booking/${booking._id}`} key={booking._id}><div className="my-booking-card-top"><strong>{booking.bookingCode}</strong><span className={`my-booking-status booking-status-${booking.status}`}>{labels[booking.status]}</span></div><h3>{booking.packageSnapshot.name}</h3><div className="my-booking-meta"><span><CalendarDays size={15} /> {new Date(booking.requestedDate).toLocaleDateString('vi-VN')}</span><span><Clock3 size={15} /> {booking.requestedTimeSlot}</span><span><MapPin size={15} /> {booking.location.address}</span></div><span className="my-booking-detail">Xem chi tiết <ChevronRight size={16} /></span></Link>)}</div>}</section>;
}
