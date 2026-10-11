import { get, post, patch, del } from '@/lib/api';
import type { Booking, BookingPackage, BookingPayload } from '@/types/booking';
import type { Pagination } from '@/types/common';

interface PackagesResponse { success: boolean; packages: BookingPackage[] }
interface BookingResponse { success: boolean; booking: Booking; message?: string }
interface BookingsResponse { success: boolean; bookings: Booking[]; pagination: Pagination }

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
  async getAdmin(params: { page?: number; status?: string } = {}) {
    const response = await get<BookingsResponse>('/bookings/admin', { params: { page: 1, limit: 50, ...params } });
    return response.data;
  },
  async updateAdmin(bookingId: string, data: { status: string; note?: string; confirmedDate?: string; confirmedStartTime?: string; confirmedEndTime?: string }) {
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
  async updateAdminPackage(id: string, data: Omit<BookingPackage, '_id'>) {
    const response = await patch<{ success: boolean; package: BookingPackage }>(`/bookings/admin/packages/${id}`, data);
    return response.data;
  },
  async archiveAdminPackage(id: string) {
    const response = await del<{ success: boolean; package: BookingPackage }>(`/bookings/admin/packages/${id}`);
    return response.data;
  },
};
