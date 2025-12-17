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
				limit: 20, // Load 20 images per page for better performance, infinite scroll will load more
			});

				set((state) => {
					if (page === 1) {
						// Replace images for first page
						state.images = response.images || [];
					} else {
						// Append images for subsequent pages
						const existingIds = new Set(state.images.map(img => img._id));
						const newImages = (response.images || []).filter(img => !existingIds.has(img._id));
						state.images = [...state.images, ...newImages];
					}
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

