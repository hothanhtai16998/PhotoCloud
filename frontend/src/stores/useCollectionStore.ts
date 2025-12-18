import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import type { CollectionState } from '@/types/store';
import type { ApiErrorResponse } from '@/types/errors';
import { isCollection } from '@/utils/typeGuards';

export const useCollectionStore = create(
	immer<CollectionState>((set, get) => ({
		collection: null,
		loading: false,
		error: null,
		isFavorited: false,
		togglingFavorite: false,
		updatingCover: null,

		fetchCollection: async (collectionId: string) => {
			set((state) => {
				state.loading = true;
				state.error = null;
			});

			try {
				const data = await collectionService.getCollectionById(collectionId);
				set((state) => {
					state.collection = data;
					state.loading = false;
				});

				// Check favorite status
				try {
					const favoritesResponse = await collectionFavoriteService.checkFavorites([collectionId]);
					set((state) => {
						state.isFavorited = favoritesResponse.favorites[collectionId] ?? false;
					});
				} catch (error) {
					console.error('Failed to check favorite status:', error);
				}
			} catch (error: unknown) {
				console.error('Failed to load collection:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					'Không thể tải bộ sưu tập';
				set((state) => {
					state.error = message;
					state.loading = false;
				});
				toast.error(message);
				throw error;
			}
		},

		updateCollection: async (
			collectionId: string,
			data: {
				name?: string;
				description?: string;
				isPublic?: boolean;
				coverImage?: string | null;
				tags?: string[];
			}
		) => {
			try {
				const updatedCollection = await collectionService.updateCollection(collectionId, data);
				set((state) => {
					state.collection = updatedCollection;
				});
			} catch (error: unknown) {
				console.error('Failed to update collection:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					'Không thể cập nhật bộ sưu tập. Vui lòng thử lại.';
				toast.error(message);
				throw error;
			}
		},

		deleteCollection: async (collectionId: string) => {
			try {
				await collectionService.deleteCollection(collectionId);
				set((state) => {
					state.collection = null;
				});
			} catch (error: unknown) {
				console.error('Failed to delete collection:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					'Không thể xóa bộ sưu tập. Vui lòng thử lại.';
				toast.error(message);
				throw error;
			}
		},

		setCoverImage: async (collectionId: string, imageId: string) => {
			set((state) => {
				state.updatingCover = imageId;
			});

			try {
				const updatedCollection = await collectionService.updateCollection(collectionId, {
					coverImage: imageId,
				});

				set((state) => {
					state.collection = updatedCollection;
					state.updatingCover = null;
				});

				toast.success('Đã đặt ảnh làm ảnh bìa');
			} catch (error: unknown) {
				console.error('Failed to set cover image:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					'Không thể đặt ảnh bìa. Vui lòng thử lại.';
				set((state) => {
					state.updatingCover = null;
				});
				toast.error(message);
				throw error;
			}
		},

		toggleFavorite: async (collectionId: string) => {
			if (get().togglingFavorite) return;

			set((state) => {
				state.togglingFavorite = true;
			});

			try {
				const response = await collectionFavoriteService.toggleFavorite(collectionId);
				set((state) => {
					state.isFavorited = response.isFavorited;
					state.togglingFavorite = false;
				});

				toast.success(
					response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
				);
			} catch (error: unknown) {
				console.error('Failed to toggle favorite:', error);
				set((state) => {
					state.togglingFavorite = false;
				});
				toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
				throw error;
			}
		},


		clearCollection: () => {
			set((state) => {
				state.collection = null;
				state.error = null;
				state.isFavorited = false;
				state.updatingCover = null;
			});
		},

		// Real-time update methods (called via WebSocket)
		addImageToCollection: (imageId: string, image: any) => {
			set((state) => {
				if (state.collection) {
					// Add image to collection if not already present
					const imageIds = state.collection.images?.map((img: any) => 
						typeof img === 'object' ? img._id : img
					) || [];
					
					if (!imageIds.includes(imageId)) {
						state.collection.images = [...(state.collection.images || []), image];
						// Update imageCount if it exists
						if (state.collection.imageCount !== undefined) {
							state.collection.imageCount = (state.collection.imageCount || 0) + 1;
						}
					}
				}
			});
		},

		removeImageFromCollection: (imageId: string) => {
			set((state) => {
				if (state.collection) {
					// Remove image from collection
					state.collection.images = (state.collection.images || []).filter((img: any) => {
						const imgId = typeof img === 'object' ? img._id : img;
						return imgId !== imageId;
					});
					
					// Update imageCount if it exists
					if (state.collection.imageCount !== undefined) {
						state.collection.imageCount = Math.max(0, (state.collection.imageCount || 0) - 1);
					}
					
					// If removed image was cover, set new cover (first image or null)
					if (state.collection.coverImage) {
						const coverId = typeof state.collection.coverImage === 'object' 
							? state.collection.coverImage._id 
							: state.collection.coverImage;
						if (coverId === imageId) {
							state.collection.coverImage = state.collection.images.length > 0 
								? state.collection.images[0] 
								: null;
						}
					}
				}
			});
		},

		reorderCollectionImages: (imageIds: string[]) => {
			set((state) => {
				if (state.collection && state.collection.images) {
					// Reorder images based on new order
					const imageMap = new Map(
						state.collection.images.map((img: any) => {
							const imgId = typeof img === 'object' ? img._id : img;
							return [imgId, img];
						})
					);
					
					state.collection.images = imageIds
						.map(id => imageMap.get(id))
						.filter(Boolean);
				}
			});
		},

		updateCollectionMetadata: (updates: {
			name?: string;
			description?: string;
			coverImageId?: string | null;
		}) => {
			set((state) => {
				if (state.collection) {
					if (updates.name !== undefined) {
						state.collection.name = updates.name;
					}
					if (updates.description !== undefined) {
						state.collection.description = updates.description;
					}
					if (updates.coverImageId !== undefined) {
						if (updates.coverImageId === null) {
							state.collection.coverImage = null;
						} else {
							// Find the image in the collection
							const image = state.collection.images?.find((img: any) => {
								const imgId = typeof img === 'object' ? img._id : img;
								return imgId === updates.coverImageId;
							});
							if (image) {
								state.collection.coverImage = image;
							}
						}
					}
				}
			});
		},
	}))
);

