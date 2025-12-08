import api from '@/lib/axios';
import type { NotificationsResponse, UnreadCountResponse } from '@/types/notification';

// Re-export for backward compatibility
export type { Notification, NotificationsResponse, UnreadCountResponse } from '@/types/notification';

export const notificationService = {
	/**
	 * Get user's notifications
	 */
	getNotifications: async (params?: {
		unreadOnly?: boolean;
		limit?: number;
	}): Promise<NotificationsResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.unreadOnly) {
			queryParams.append('unreadOnly', 'true');
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/notifications?${queryString}` : '/notifications';

		const response = await api.get<NotificationsResponse>(url, {
			withCredentials: true,
		});
		return response.data;
	},

	/**
	 * Get unread notification count
	 */
	getUnreadCount: async (): Promise<number> => {
		const response = await api.get<UnreadCountResponse>('/notifications/unread-count', {
			withCredentials: true,
		});
		return response.data.unreadCount;
	},

	/**
	 * Mark notification as read
	 */
	markAsRead: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
		const response = await api.patch(
			`/notifications/${notificationId}/read`,
			{},
			{
				withCredentials: true,
			}
		);
		return response.data;
	},

	/**
	 * Mark all notifications as read
	 */
	markAllAsRead: async (): Promise<{ success: boolean }> => {
		const response = await api.patch(
			'/notifications/read-all',
			{},
			{
				withCredentials: true,
			}
		);
		return response.data;
	},

	/**
	 * Delete notification
	 */
	deleteNotification: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
		const response = await api.delete(`/notifications/${notificationId}`, {
			withCredentials: true,
		});
		return response.data;
	},
};

