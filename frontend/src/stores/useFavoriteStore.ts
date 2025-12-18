import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { favoriteService } from '@/services/favoriteService';
import type { FavoriteState } from '@/types/store';
import type { Image } from '@/types/image';

// Unsplash-style: 5 minutes stale threshold
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export const useFavoriteStore = create(
	immer<FavoriteState>((set, get) => ({
		images: [],
		loading: false,
		pagination: null,
		currentPage: 1,
		imageTypes: new Map<string, 'portrait' | 'landscape'>(),
		hasLoaded: false,
		lastFetchedAt: null,

		fetchFavorites: async (page = 1) => {
			const currentState = get();
			// Only set loading if we don't have data yet (prevents flash when navigating)
			const shouldShowLoading = page === 1 && !currentState.hasLoaded && currentState.images.length === 0;
			
			if (shouldShowLoading) {
				set((state) => {
					state.loading = true;
				});
			}

		try {
			const response = await favoriteService.getFavorites({
				page,
				limit: 20, // Load 20 images per page for better performance, infinite scroll will load more
			});

				set((state) => {
					if (page === 1) {
						// Replace images for first page
						state.images = response.images || [];
						state.hasLoaded = true;
						state.lastFetchedAt = Date.now();
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
				state.hasLoaded = false;
				state.lastFetchedAt = null;
			});
		},

		resetLoading: () => {
			set((state) => {
				// If we have images, ensure loading is false
				if (state.images.length > 0) {
					state.loading = false;
				}
			});
		},

		checkAndRefreshIfStale: async () => {
			const currentState = get();
			
			// Don't refresh if already loading or never loaded
			if (currentState.loading || !currentState.hasLoaded || !currentState.lastFetchedAt) {
				return;
			}
			
			// Check if data is stale (>5 minutes old)
			const age = Date.now() - currentState.lastFetchedAt;
			if (age <= STALE_THRESHOLD) {
				return;
			}
			
			// Silent background refresh - no loading state
			try {
				const response = await favoriteService.getFavorites({
					page: 1,
					limit: 20,
				});
				
				set((state) => {
					state.images = response.images || [];
					state.pagination = response.pagination || null;
					state.lastFetchedAt = Date.now();
					// Don't set loading - this is a silent background refresh
				});
			} catch (error) {
				// Silent fail - keep showing cached data
				console.error('Background refresh failed:', error);
			}
		},
	}))
);

