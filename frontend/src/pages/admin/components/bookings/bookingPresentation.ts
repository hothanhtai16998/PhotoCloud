import type { BookingStatus } from '@/types/booking';
export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Chờ xử lý',
  reviewing: 'Đang xem xét',
  needs_information: 'Cần bổ sung',
  confirmed: 'Đã xác nhận',
  rescheduled: 'Đã đổi lịch',
  completed: 'Hoàn thành',
  cancelled_by_client: 'Khách đã hủy',
  cancelled_by_photographer: 'Studio đã hủy',
  rejected: 'Đã từ chối',
  expired: 'Hết hạn',
};
export const bookingTimeLabels: Record<string, string> = {
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
  flexible: 'Linh hoạt',
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
  if (!date) return 'Chưa xác định';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Chưa xác định'
    : parsed.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
}
export const bookingMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
