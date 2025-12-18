import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface UserFollowCountState {
	// Map of userId -> { followersCount, followingCount }
	followCounts: Map<string, { followersCount: number; followingCount: number }>;
	
	// Update follow counts for a user
	updateFollowCounts: (userId: string, counts: { followersCount?: number; followingCount?: number }) => void;
	
	// Increment followers count
	incrementFollowers: (userId: string) => void;
	
	// Decrement followers count
	decrementFollowers: (userId: string) => void;
	
	// Increment following count
	incrementFollowing: (userId: string) => void;
	
	// Decrement following count
	decrementFollowing: (userId: string) => void;
	
	// Get follow counts for a user
	getFollowCounts: (userId: string) => { followersCount: number; followingCount: number } | null;
	
	// Clear all counts (useful for cleanup)
	clearCounts: () => void;
}

export const useUserFollowCountStore = create(
	immer<UserFollowCountState>((set, get) => ({
		followCounts: new Map<string, { followersCount: number; followingCount: number }>(),

		updateFollowCounts: (userId: string, counts: { followersCount?: number; followingCount?: number }) => {
			set((state) => {
				const current = state.followCounts.get(userId) || { followersCount: 0, followingCount: 0 };
				state.followCounts.set(userId, {
					followersCount: counts.followersCount !== undefined ? Math.max(0, counts.followersCount) : current.followersCount,
					followingCount: counts.followingCount !== undefined ? Math.max(0, counts.followingCount) : current.followingCount,
				});
			});
		},

		incrementFollowers: (userId: string) => {
			set((state) => {
				const current = state.followCounts.get(userId) || { followersCount: 0, followingCount: 0 };
				state.followCounts.set(userId, {
					...current,
					followersCount: current.followersCount + 1,
				});
			});
		},

		decrementFollowers: (userId: string) => {
			set((state) => {
				const current = state.followCounts.get(userId) || { followersCount: 0, followingCount: 0 };
				state.followCounts.set(userId, {
					...current,
					followersCount: Math.max(0, current.followersCount - 1),
				});
			});
		},

		incrementFollowing: (userId: string) => {
			set((state) => {
				const current = state.followCounts.get(userId) || { followersCount: 0, followingCount: 0 };
				state.followCounts.set(userId, {
					...current,
					followingCount: current.followingCount + 1,
				});
			});
		},

		decrementFollowing: (userId: string) => {
			set((state) => {
				const current = state.followCounts.get(userId) || { followersCount: 0, followingCount: 0 };
				state.followCounts.set(userId, {
					...current,
					followingCount: Math.max(0, current.followingCount - 1),
				});
			});
		},

		getFollowCounts: (userId: string) => {
			return get().followCounts.get(userId) || null;
		},

		clearCounts: () => {
			set((state) => {
				state.followCounts.clear();
			});
		},
	}))
);


