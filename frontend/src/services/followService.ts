import api from '@/lib/axios';
import type {
	FollowStatus,
	FollowCounts,
	FollowingListResponse,
	FollowersListResponse,
	FollowActionResponse,
	UserFollowStatsResponse,
} from '@/types/follow';

// Re-export for backward compatibility
export type {
	FollowStatus,
	FollowCounts,
	FollowUser,
	FollowingListResponse,
	FollowersListResponse,
	FollowActionResponse,
	UserFollowStatsResponse,
} from '@/types/follow';

export const followService = {
	/**
	 * Follow a user
	 */
	followUser: async (userId: string): Promise<FollowActionResponse> => {
		const res = await api.post(`/follows/${userId}`, {}, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Unfollow a user
	 */
	unfollowUser: async (userId: string): Promise<FollowActionResponse> => {
		const res = await api.delete(`/follows/${userId}`, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get users that the current user is following
	 */
	getFollowing: async (params?: {
		page?: number;
		limit?: number;
	}): Promise<FollowingListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.page) {
			queryParams.append('page', params.page.toString());
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/follows/following?${queryString}` : '/follows/following';

		const res = await api.get(url, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get users that are following the current user
	 */
	getFollowers: async (params?: {
		page?: number;
		limit?: number;
	}): Promise<FollowersListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.page) {
			queryParams.append('page', params.page.toString());
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/follows/followers?${queryString}` : '/follows/followers';

		const res = await api.get(url, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get follow status for a specific user
	 */
	getFollowStatus: async (userId: string): Promise<FollowStatus> => {
		const res = await api.get(`/follows/${userId}/status`, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get follow counts for a user
	 */
	getFollowCounts: async (userId: string): Promise<FollowCounts> => {
		const res = await api.get(`/follows/${userId}/counts`);
		return res.data;
	},

	/**
	 * Get follow stats for a user (includes isFollowing status)
	 */
	getUserFollowStats: async (userId: string, signal?: AbortSignal): Promise<UserFollowStatsResponse> => {
		const res = await api.get(`/follows/${userId}/stats`, {
			withCredentials: true,
			signal, // Pass abort signal for request cancellation
		});
		return res.data;
	},

	/**
	 * Get users that a specific user is following
	 */
	getUserFollowing: async (userId: string, params?: {
		page?: number;
		limit?: number;
	}, signal?: AbortSignal): Promise<FollowingListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.page) {
			queryParams.append('page', params.page.toString());
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/follows/${userId}/following?${queryString}` : `/follows/${userId}/following`;

		const res = await api.get(url, {
			withCredentials: true,
			signal,
		});
		return res.data;
	},

	/**
	 * Get users that are following a specific user
	 */
	getUserFollowers: async (userId: string, params?: {
		page?: number;
		limit?: number;
	}, signal?: AbortSignal): Promise<FollowersListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.page) {
			queryParams.append('page', params.page.toString());
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/follows/${userId}/followers?${queryString}` : `/follows/${userId}/followers`;

		const res = await api.get(url, {
			withCredentials: true,
			signal,
		});
		return res.data;
	},
};
