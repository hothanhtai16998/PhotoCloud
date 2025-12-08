import api from '@/lib/axios';
import type { ChangePasswordResponse, UpdateProfileResponse } from '@/types/user';

export interface UserSearchResult {
	_id: string;
	username: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
}

import type { Image } from '@/types/image';

export interface PublicUser {
	_id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	location?: string;
	website?: string;
	instagram?: string;
	twitter?: string;
	facebook?: string;
	createdAt: string;
	pinnedImages?: Image[];
}

export const userService = {
	changePassword: async (
		password: string,
		newPassword: string,
		newPasswordMatch: string
	): Promise<ChangePasswordResponse> => {
		const res = await api.put<ChangePasswordResponse>(
			'/users/change-password',
			{
				password,
				newPassword,
				newPasswordMatch,
			},
			{ withCredentials: true }
		);
		return res.data;
	},

	updateProfile: async (
		formData: FormData
	): Promise<UpdateProfileResponse> => {
		const res = await api.put<UpdateProfileResponse>(
			'/users/change-info',
			formData,
			{
				withCredentials: true,
				headers: {
					'Content-Type':
						'multipart/form-data',
				},
			}
		);
		return res.data;
	},

	searchUsers: async (
		search: string,
		limit?: number
	): Promise<{ users: UserSearchResult[] }> => {
		const res = await api.get('/users/search', {
			params: { search, limit },
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get public user data by username
	 * @param username Username to fetch
	 * @param signal Optional AbortSignal for request cancellation
	 */
	getUserByUsername: async (username: string, signal?: AbortSignal): Promise<PublicUser> => {
		const res = await api.get(`/users/username/${username}`, {
			withCredentials: true,
			signal, // Pass abort signal for request cancellation
		});
		return res.data.user;
	},

	/**
	 * Get public user data by userId
	 * @param userId User ID to fetch
	 * @param signal Optional AbortSignal for request cancellation
	 */
	getUserById: async (userId: string, signal?: AbortSignal): Promise<PublicUser> => {
		const res = await api.get(`/users/${userId}`, {
			withCredentials: true,
			signal, // Pass abort signal for request cancellation
		});
		return res.data.user;
	},
};
