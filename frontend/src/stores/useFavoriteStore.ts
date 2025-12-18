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

		// Optimistic update: Add image to favorites list immediately
		addImageToFavorites: (image: Image) => {
			set((state) => {
				// Only add if not already in the list
				const exists = state.images.some(img => img._id === image._id);
				if (!exists) {
					// Add to beginning (most recent first)
					state.images = [image, ...state.images];
					// Update pagination total
					if (state.pagination) {
						state.pagination.total = (state.pagination.total || 0) + 1;
						state.pagination.pages = Math.ceil(state.pagination.total / (state.pagination.limit || 20));
					} else {
						// Initialize pagination if it doesn't exist
						state.pagination = {
							page: 1,
							limit: 20,
							total: state.images.length,
							pages: Math.ceil(state.images.length / 20),
						};
					}
				}
			});
		},

		// Optimistic update: Remove image from favorites list immediately
		removeImageFromFavorites: (imageId: string) => {
			set((state) => {
				const normalizedId = String(imageId).trim();
				const beforeCount = state.images.length;
				
				// Filter out the image - compare as strings (handles ObjectId cases)
				state.images = state.images.filter(img => {
					const imgId = String(img._id).trim();
					// Match by full ID or last 12 characters (MongoDB ObjectId format)
					return imgId !== normalizedId && imgId.slice(-12) !== normalizedId.slice(-12);
				});
				
				const removed = beforeCount - state.images.length;
				
				// Update pagination if image was removed
				if (removed > 0 && state.pagination) {
					state.pagination.total = Math.max(0, state.pagination.total - removed);
					state.pagination.pages = Math.ceil(state.pagination.total / state.pagination.limit);
				}
			});
		},
	}))
);

// Listen to favorite toggle events globally (even when FavoritesPage is not mounted)
// This ensures optimistic updates work from anywhere in the app
if (typeof window !== 'undefined') {
	window.addEventListener('favoriteCacheUpdated', ((event: CustomEvent<{ 
		imageId: string; 
		isFavorited: boolean; 
		image?: Image;
	}>) => {
		const { imageId, isFavorited, image } = event.detail || {};
		if (!imageId) return;

		const store = useFavoriteStore.getState();
		
		if (isFavorited && image) {
			// Add image to favorites
			store.addImageToFavorites(image);
			const updatedStore = useFavoriteStore.getState();
			
			// Update sidebar thumbnail with the newly favorited image
			window.dispatchEvent(new CustomEvent('favoritesUpdated', {
				detail: { 
					thumbnailImage: image,
					total: updatedStore.pagination?.total || updatedStore.images.length
				}
			}));
		} else {
			// Remove image from favorites
			store.removeImageFromFavorites(String(imageId).trim());
			const updatedStore = useFavoriteStore.getState();
			
			// Update sidebar thumbnail with first remaining image or null
			window.dispatchEvent(new CustomEvent('favoritesUpdated', {
				detail: { 
					thumbnailImage: updatedStore.images[0] || null,
					total: updatedStore.pagination?.total || updatedStore.images.length
				}
			}));
		}
	}) as EventListener);
}

