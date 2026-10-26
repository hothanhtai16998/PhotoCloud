import type { BookingTimeSlot } from '@/types/booking';

export function timeSlotForHour(time: string): BookingTimeSlot {
    if (!time) return 'flexible';
    const hour = Number(time.slice(0, 2));
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}
export function formatRequestedTime(booking: { requestedStartTime?: string; requestedTimeSlot: BookingTimeSlot }): string {
    return booking.requestedStartTime || ({ morning: 'Buổi sáng', afternoon: 'Buổi chiều', evening: 'Buổi tối', flexible: 'Linh hoạt' })[booking.requestedTimeSlot];
}
