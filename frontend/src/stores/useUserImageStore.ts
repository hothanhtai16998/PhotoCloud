import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import axios from 'axios';
import { imageService } from '@/services/imageService';
import type { UserImageState } from '@/types/store';
import type { Image } from '@/types/image';

export const useUserImageStore = create(
	immer<UserImageState>((set, get) => ({
		images: [],
		loading: false,
		photosCount: 0,
		illustrationsCount: 0,
		imageTypes: new Map<string, 'portrait' | 'landscape'>(),
		pagination: null,

		fetchUserImages: async (userId: string, refresh = false, signal?: AbortSignal, page = 1) => {
			set((state) => {
				state.loading = true;
			});

			try {
				const response = await imageService.fetchUserImages(
					userId,
					{
						page,
						limit: 20, // Load 20 images per page for better performance, infinite scroll will load more
						...(refresh ? { _refresh: true } : {}),
					},
					signal
				);

				const userImages = response.images || [];

				set((state) => {
					if (page === 1 || refresh) {
						// Replace images for first page or refresh
						state.images = userImages;
					} else {
						// Append images for subsequent pages
						const existingIds = new Set(state.images.map(img => img._id));
						const newImages = userImages.filter(img => !existingIds.has(img._id));
						state.images = [...state.images, ...newImages];
					}
					state.pagination = response.pagination || null;
					state.loading = false;

					// Count photos and illustrations efficiently (single pass)
					let photosCount = 0;
					let illustrationsCount = 0;
					
					for (const img of userImages) {
						const categoryName =
							typeof img.imageCategory === 'string'
								? img.imageCategory
								: img.imageCategory?.name;
						
						if (categoryName) {
							const lowerName = categoryName.toLowerCase();
							if (lowerName.includes('illustration') || lowerName.includes('svg')) {
								illustrationsCount++;
							} else {
								photosCount++;
							}
						}
					}

					state.photosCount = photosCount;
					state.illustrationsCount = illustrationsCount;
				});
			} catch (error) {
				// Ignore cancelled requests
				if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
					return;
				}
				console.error('Failed to fetch user images:', error);
				set((state) => {
					state.loading = false;
				});
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

		// Add images optimistically (for immediate UI update after upload)
		// Optimized for performance - only processes new images, not entire array
		addImagesOptimistically: (newImages: Image[]) => {
			set((state) => {
				// Filter out duplicates by _id (O(n) where n = existing images)
				const existingIds = new Set(state.images.map((img) => img._id));
				const uniqueNewImages = newImages.filter((img) => !existingIds.has(img._id));
				
				if (uniqueNewImages.length === 0) return; // No new images to add
				
				// Helper to check if image is illustration (reused)
				const isIllustration = (img: Image): boolean => {
					const categoryName =
						typeof img.imageCategory === 'string'
							? img.imageCategory
							: img.imageCategory?.name;
					return !!(
						categoryName &&
						(categoryName.toLowerCase().includes('illustration') ||
							categoryName.toLowerCase().includes('svg'))
					);
				};
				
				// Count new photos and illustrations (only new images, O(m) where m = new images)
				let newPhotosCount = 0;
				let newIllustrationsCount = 0;
				for (const img of uniqueNewImages) {
					if (isIllustration(img)) {
						newIllustrationsCount++;
					} else {
						const categoryName =
							typeof img.imageCategory === 'string'
								? img.imageCategory
								: img.imageCategory?.name;
						if (categoryName) {
							newPhotosCount++;
						}
					}
				}
				
				// Prepend new images (they're already newest from finalization)
				// No need to sort entire array - new images are already sorted by creation time
				state.images = [...uniqueNewImages, ...state.images];
				
				// Update counts incrementally (much faster than recalculating all)
				state.photosCount += newPhotosCount;
				state.illustrationsCount += newIllustrationsCount;
			});
		},

		clearImages: () => {
			set((state) => {
				state.images = [];
				state.photosCount = 0;
				state.illustrationsCount = 0;
				state.imageTypes.clear();
				state.pagination = null;
			});
		},
	}))
);

