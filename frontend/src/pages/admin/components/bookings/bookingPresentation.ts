import { getAdminIntlLocale, adminText } from '@/pages/admin/adminLocale';
import type { BookingStatus } from '@/types/booking';
export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: adminText("Chờ xử lý"),
  reviewing: adminText("Đang xem xét"),
  needs_information: adminText("Cần bổ sung"),
  confirmed: adminText("Đã xác nhận"),
  rescheduled: adminText("Đã đổi lịch"),
  completed: adminText("Hoàn thành"),
  cancelled_by_client: adminText("Khách đã hủy"),
  cancelled_by_photographer: adminText("Studio đã hủy"),
  rejected: adminText("Đã từ chối"),
  expired: adminText("Hết hạn"),
};
export const bookingTimeLabels: Record<string, string> = {
  morning: adminText("Buổi sáng"),
  afternoon: adminText("Buổi chiều"),
  evening: adminText("Buổi tối"),
  flexible: adminText("Linh hoạt"),
};
export function bookingTone(status: BookingStatus) {
  if (['confirmed', 'rescheduled'].includes(status)) return 'confirmed';
  if (status === 'completed') return 'completed';
  if (['pending', 'reviewing', 'needs_information'].includes(status))
    return 'pending';
  return 'closed';
}
export function bookingNextStatuses(status: BookingStatus): BookingStatus[] {
  if (['pending', 'reviewing', 'needs_information'].includes(status))
    return (
      [
        'reviewing',
        'needs_information',
        'confirmed',
        'rejected',
      ] as BookingStatus[]
    ).filter((s) => s !== status);
  if (['confirmed', 'rescheduled'].includes(status))
    return (
      [
        'rescheduled',
        'completed',
        'cancelled_by_photographer',
      ] as BookingStatus[]
    );
  return [];
}
export function bookingDate(date?: string) {
  if (!date) return adminText("Chưa xác định");
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? adminText("Chưa xác định")
    : parsed.toLocaleDateString(getAdminIntlLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
}
export const bookingMoney = (value: number) =>
  new Intl.NumberFormat(getAdminIntlLocale(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
