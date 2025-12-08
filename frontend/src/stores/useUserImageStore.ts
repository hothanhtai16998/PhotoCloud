import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import axios from 'axios';
import { imageService } from '@/services/imageService';
import type { UserImageState } from '@/types/store';
import type { Image } from '@/types/image';

export const useUserImageStore = create(
	immer<UserImageState>((set) => ({
		images: [],
		loading: false,
		photosCount: 0,
		illustrationsCount: 0,
		imageTypes: new Map<string, 'portrait' | 'landscape'>(),

		fetchUserImages: async (userId: string, refresh = false, signal?: AbortSignal) => {
			set((state) => {
				state.loading = true;
			});

			try {
				const response = await imageService.fetchUserImages(
					userId,
					{
						page: 1,
						limit: 30, // Load first 30 images only for initial render
						...(refresh ? { _refresh: true } : {}),
					},
					signal
				);

				const userImages = response.images || [];

				set((state) => {
					state.images = userImages;
					state.loading = false;

					// Count photos and illustrations
					const photos = userImages.filter((img) => {
						const categoryName =
							typeof img.imageCategory === 'string'
								? img.imageCategory
								: img.imageCategory?.name;
						return (
							categoryName &&
							!categoryName.toLowerCase().includes('illustration') &&
							!categoryName.toLowerCase().includes('svg')
						);
					});

					const illustrations = userImages.filter((img) => {
						const categoryName =
							typeof img.imageCategory === 'string'
								? img.imageCategory
								: img.imageCategory?.name;
						return (
							categoryName &&
							(categoryName.toLowerCase().includes('illustration') ||
								categoryName.toLowerCase().includes('svg'))
						);
					});

					state.photosCount = photos.length;
					state.illustrationsCount = illustrations.length;
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

		clearImages: () => {
			set((state) => {
				state.images = [];
				state.photosCount = 0;
				state.illustrationsCount = 0;
				state.imageTypes.clear();
			});
		},
	}))
);

