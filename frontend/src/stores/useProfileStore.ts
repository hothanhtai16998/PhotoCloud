import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import axios from 'axios';
import { userService } from '@/services/userService';
import { followService } from '@/services/followService';
import { userStatsService } from '@/services/userStatsService';
import { collectionService } from '@/services/collectionService';
import type { ProfileState } from '@/types/store';

export const useProfileStore = create(
	immer<ProfileState>((set) => ({
		profileUser: null,
		profileUserLoading: false,
		followStats: {
			followers: 0,
			following: 0,
			isFollowing: false,
		},
		userStats: null,
		collections: [],
		collectionsLoading: false,
		collectionsCount: 0,

		fetchProfileUser: async (username?: string, userId?: string, signal?: AbortSignal) => {
			if (username) {
				set((state) => {
					state.profileUser = null;
					state.profileUserLoading = true;
				});

				try {
					const userData = await userService.getUserByUsername(username, signal);
					set((state) => {
						state.profileUser = userData;
						state.profileUserLoading = false;
					});
				} catch (error) {
					// Ignore cancelled requests
					if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
						return;
					}
					console.error('Failed to fetch user:', error);
					set((state) => {
						state.profileUserLoading = false;
					});
					toast.error('Không tìm thấy người dùng');
					throw error;
				}
			} else if (userId) {
				set((state) => {
					state.profileUser = null;
					state.profileUserLoading = true;
				});

				try {
					const userData = await userService.getUserById(userId, signal);
					set((state) => {
						state.profileUser = userData;
						state.profileUserLoading = false;
					});
				} catch (error) {
					// Ignore cancelled requests
					if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
						return;
					}
					console.error('Failed to fetch user:', error);
					set((state) => {
						state.profileUserLoading = false;
					});
					toast.error('Không tìm thấy người dùng');
					throw error;
				}
			} else {
				// Viewing own profile - clear profileUser
				set((state) => {
					state.profileUser = null;
					state.profileUserLoading = false;
				});
			}
		},

		fetchFollowStats: async (userId: string, signal?: AbortSignal) => {
			try {
				const response = await followService.getUserFollowStats(userId, signal);
				set((state) => {
					state.followStats = response.stats;
				});
			} catch (error) {
				// Ignore cancelled requests
				if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
					return;
				}
				console.error('Failed to fetch follow stats:', error);
			}
		},

		fetchUserStats: async (userId: string, signal?: AbortSignal) => {
			try {
				const stats = await userStatsService.getUserStats(userId, signal);
				set((state) => {
					state.userStats = stats;
				});
			} catch (error) {
				// Ignore cancelled requests
				if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
					return;
				}
				console.error('Failed to fetch user stats:', error);
			}
		},

	fetchCollections: async (_userId: string, signal?: AbortSignal) => {
		set((state) => {
			state.collectionsLoading = true;
		});

		try {
			// TODO: Add endpoint to fetch other users' collections
			// For now, only fetch own collections (getUserCollections doesn't accept userId)
			// This is a known limitation - collections are only visible for own profile
			const data = await collectionService.getUserCollections(signal);
			set((state) => {
				state.collections = data;
				state.collectionsCount = data.length;
				state.collectionsLoading = false;
			});
		} catch (error) {
			// Ignore cancelled requests
			if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
				return;
			}
			console.error('Failed to fetch collections:', error);
			set((state) => {
				state.collectionsLoading = false;
			});
		}
	},

		clearProfile: () => {
			set((state) => {
				state.profileUser = null;
				state.followStats = {
					followers: 0,
					following: 0,
					isFollowing: false,
				};
				state.userStats = null;
				state.collections = [];
				state.collectionsCount = 0;
			});
		},
	}))
);

