import { get, post, patch, del } from '@/lib/api';
import type { Booking, BookingPackage, BookingPayload } from '@/types/booking';
import type { BookingWorkspace } from '@/types/bookingWorkspace';
import type { BookingPolicy, BookingReview } from '@/types/bookingFinal';
import type { Pagination } from '@/types/common';

interface PackagesResponse { success: boolean; packages: BookingPackage[] }
interface BookingResponse { success: boolean; booking: Booking; message?: string }
interface BookingsResponse { success: boolean; bookings: Booking[]; pagination: Pagination }
export interface BookingAvailability { timezone: string; weekly: Array<{ weekday: number; enabled: boolean; startTime: string; endTime: string }>; blockedDates: Array<{ date: string; reason?: string }> }

export const bookingService = {
  async getPackages() {
    const response = await get<PackagesResponse>('/bookings/packages');
    return response.data;
  },
  async create(payload: BookingPayload) {
    const response = await post<BookingResponse>('/bookings', payload);
    return response.data;
  },
  async getMine(page = 1) {
    const response = await get<BookingsResponse>('/bookings/mine', { params: { page, limit: 20 } });
    return response.data;
  },
  async getMineById(bookingId: string) {
    const response = await get<BookingResponse>(`/bookings/mine/${bookingId}`);
    return response.data;
  },
  async cancel(bookingId: string, reason?: string) {
    const response = await patch<BookingResponse>(`/bookings/mine/${bookingId}/cancel`, { reason });
    return response.data;
  },
  async getWorkspace(bookingId: string) {
    const response = await get<{ success: boolean; workspace: BookingWorkspace }>(`/bookings/mine/${bookingId}/workspace`);
    return response.data;
  },
  async acceptContract(bookingId: string) {
    const response = await post<{ success: boolean; workspace: BookingWorkspace }>(`/bookings/mine/${bookingId}/contract/accept`);
    return response.data;
  },
  async submitQuestionnaire(bookingId: string, data: Record<string, unknown>) {
    const response = await patch<{ success: boolean; workspace: BookingWorkspace }>(`/bookings/mine/${bookingId}/questionnaire`, data);
    return response.data;
  },
  async requestReschedule(bookingId: string, data: { requestedDate: string; requestedTimeSlot: string; note?: string; reason?: 'personal' | 'weather' }) {
    const response = await post<BookingResponse>(`/bookings/mine/${bookingId}/reschedule`, data);
    return response.data;
  },
  async getAvailability() {
    const response = await get<{ success: boolean; availability: BookingAvailability }>('/bookings/admin/availability');
    return response.data;
  },
  async updateAvailability(data: BookingAvailability) {
    const response = await patch<{ success: boolean; availability: BookingAvailability }>('/bookings/admin/availability', data);
    return response.data;
  },
  async getAdmin(params: { page?: number; status?: string; limit?: number; search?: string } = {}) {
    const response = await get<BookingsResponse>('/bookings/admin', { params: { page: 1, limit: 50, ...params } });
    return response.data;
  },
  async updateAdmin(bookingId: string, data: { status: string; note?: string; confirmedDate?: string; confirmedStartTime?: string; confirmedEndTime?: string; dismissReschedule?: boolean }) {
    const response = await patch<BookingResponse>(`/bookings/admin/${bookingId}`, data);
    return response.data;
  },
  async getAdminPackages() {
    const response = await get<{ success: boolean; packages: BookingPackage[] }>('/bookings/admin/packages');
    return response.data;
  },
  async createAdminPackage(data: Omit<BookingPackage, '_id'>) {
    const response = await post<{ success: boolean; package: BookingPackage }>('/bookings/admin/packages', data);
    return response.data;
  },
  async getReview(bookingId: string) { const response = await get<{ success: boolean; review: BookingReview | null }>(`/bookings/mine/${bookingId}/review`); return response.data; },
  async createReview(bookingId: string, data: { rating: number; title?: string; comment?: string }) { const response = await post<{ success: boolean; review: BookingReview }>(`/bookings/mine/${bookingId}/review`, data); return response.data; },
  async getPolicy() { const response = await get<{ success: boolean; policy: BookingPolicy }>('/bookings/admin/policy'); return response.data; },
  async updatePolicy(data: BookingPolicy) { const response = await patch<{ success: boolean; policy: BookingPolicy }>('/bookings/admin/policy', data); return response.data; },
  async getAdminReviews() { const response = await get<{ success: boolean; reviews: BookingReview[] }>('/bookings/admin/reviews'); return response.data; },
  async replyReview(id: string, reply: string, visible = true) { const response = await patch<{ success: boolean; review: BookingReview }>(`/bookings/admin/reviews/${id}`, { reply, visible }); return response.data; },
  async updateAdminPackage(id: string, data: Omit<BookingPackage, '_id'>) {
    const response = await patch<{ success: boolean; package: BookingPackage }>(`/bookings/admin/packages/${id}`, data);
    return response.data;
  },
  async archiveAdminPackage(id: string) {
    const response = await del<{ success: boolean; package: BookingPackage }>(`/bookings/admin/packages/${id}`);
    return response.data;
  },
};

