import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { favoriteService } from '@/services/favoriteService';
import type { FavoriteState } from '@/types/store';
import type { Image } from '@/types/image';

export const useFavoriteStore = create(
	immer<FavoriteState>((set) => ({
		images: [],
		loading: false,
		pagination: null,
		currentPage: 1,
		imageTypes: new Map<string, 'portrait' | 'landscape'>(),

		fetchFavorites: async (page = 1) => {
			set((state) => {
				state.loading = true;
			});

			try {
				const response = await favoriteService.getFavorites({
					page,
					limit: 20,
				});

				set((state) => {
					state.images = response.images || [];
					state.pagination = response.pagination || null;
					state.currentPage = page;
					state.loading = false;
				});
			} catch (error) {
				console.error('Failed to fetch favorites:', error);
				set((state) => {
					state.loading = false;
				});
				throw error;
			}
		},

		setImageType: (imageId: string, type: 'portrait' | 'landscape') => {
			set((state) => {
				if (!state.imageTypes.has(imageId)) {
					state.imageTypes.set(imageId, type);
				}
			});
		},

		updateImage: (imageId: string, updatedImage: Image) => {
			set((state) => {
				const index = state.images.findIndex((img) => img._id === imageId);
				if (index !== -1) {
					state.images[index] = updatedImage;
				}
			});
		},

		clearFavorites: () => {
			set((state) => {
				state.images = [];
				state.pagination = null;
				state.currentPage = 1;
				state.imageTypes.clear();
			});
		},
	}))
);

