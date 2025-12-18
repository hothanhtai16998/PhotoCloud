import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ImageFavoriteCountState {
	// Map of imageId -> favoriteCount
	favoriteCounts: Map<string, number>;
	
	// Update favorite count for an image
	updateFavoriteCount: (imageId: string, count: number) => void;
	
	// Increment favorite count
	incrementFavoriteCount: (imageId: string) => void;
	
	// Decrement favorite count
	decrementFavoriteCount: (imageId: string) => void;
	
	// Get favorite count for an image (returns 0 if not found)
	getFavoriteCount: (imageId: string) => number;
	
	// Clear all counts (useful for cleanup)
	clearCounts: () => void;
}

export const useImageFavoriteCountStore = create(
	immer<ImageFavoriteCountState>((set, get) => ({
		favoriteCounts: new Map<string, number>(),

		updateFavoriteCount: (imageId: string, count: number) => {
			set((state) => {
				state.favoriteCounts.set(imageId, Math.max(0, count));
			});
		},

		incrementFavoriteCount: (imageId: string) => {
			set((state) => {
				const current = state.favoriteCounts.get(imageId) || 0;
				state.favoriteCounts.set(imageId, current + 1);
			});
		},

		decrementFavoriteCount: (imageId: string) => {
			set((state) => {
				const current = state.favoriteCounts.get(imageId) || 0;
				state.favoriteCounts.set(imageId, Math.max(0, current - 1));
			});
		},

		getFavoriteCount: (imageId: string) => {
			return get().favoriteCounts.get(imageId) ?? 0;
		},

		clearCounts: () => {
			set((state) => {
				state.favoriteCounts.clear();
			});
		},
	}))
);

