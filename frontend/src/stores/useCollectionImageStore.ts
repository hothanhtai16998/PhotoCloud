import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import type { CollectionImageState } from '@/types/store';
import type { Image } from '@/types/image';
import type { ApiErrorResponse } from '@/types/errors';

export const useCollectionImageStore = create(
	immer<CollectionImageState>((set) => ({
		images: [],
		imageTypes: new Map<string, 'portrait' | 'landscape'>(),
		draggedImageId: null,
		dragOverImageId: null,
		isReordering: false,
		selectionMode: false,
		selectedImageIds: new Set<string>(),
		isBulkRemoving: false,

		setImages: (images: Image[]) => {
			set((state) => {
				state.images = images;
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

		removeImage: (imageId: string) => {
			set((state) => {
				state.images = state.images.filter((img) => img._id !== imageId);
			});
		},

		reorderImages: async (collectionId: string, newOrder: string[]) => {
			set((state) => {
				state.isReordering = true;
				// Optimistically update UI
				const reorderedImages = newOrder
					.map((id) => state.images.find((img) => img._id === id))
					.filter((img): img is Image => img !== undefined);
				state.images = reorderedImages;
			});

			try {
				const updatedCollection = await collectionService.reorderCollectionImages(
					collectionId,
					newOrder
				);

				// Update images from the updated collection
				const imageArray = Array.isArray(updatedCollection.images)
					? updatedCollection.images.filter(
							(img): img is Image =>
								typeof img === 'object' && img !== null && '_id' in img
						)
					: [];

				set((state) => {
					state.images = imageArray;
					state.isReordering = false;
				});

				toast.success('Đã sắp xếp lại ảnh');
			} catch (error: unknown) {
				console.error('Failed to reorder images:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ||
					'Không thể sắp xếp lại ảnh. Vui lòng thử lại.';
				toast.error(message);

				// Reload collection to revert optimistic update
				try {
					const data = await collectionService.getCollectionById(collectionId);
					const imageArray = Array.isArray(data.images)
						? data.images.filter(
								(img): img is Image =>
									typeof img === 'object' && img !== null && '_id' in img
							)
						: [];

					set((state) => {
						state.images = imageArray;
						state.isReordering = false;
					});
				} catch (reloadError) {
					console.error('Failed to reload collection:', reloadError);
					set((state) => {
						state.isReordering = false;
					});
				}
			}
		},

		setImageType: (imageId: string, type: 'portrait' | 'landscape') => {
			set((state) => {
				if (!state.imageTypes.has(imageId)) {
					state.imageTypes.set(imageId, type);
				}
			});
		},

		setDraggedImageId: (imageId: string | null) => {
			set((state) => {
				state.draggedImageId = imageId;
			});
		},

		setDragOverImageId: (imageId: string | null) => {
			set((state) => {
				state.dragOverImageId = imageId;
			});
		},

		setIsReordering: (isReordering: boolean) => {
			set((state) => {
				state.isReordering = isReordering;
			});
		},

		toggleSelectionMode: () => {
			set((state) => {
				state.selectionMode = !state.selectionMode;
				if (!state.selectionMode) {
					state.selectedImageIds.clear();
				}
			});
		},

		toggleImageSelection: (imageId: string) => {
			set((state) => {
				if (state.selectedImageIds.has(imageId)) {
					state.selectedImageIds.delete(imageId);
				} else {
					state.selectedImageIds.add(imageId);
				}
			});
		},

		selectAllImages: () => {
			set((state) => {
				state.selectedImageIds = new Set(state.images.map((img) => img._id));
			});
		},

		deselectAllImages: () => {
			set((state) => {
				state.selectedImageIds.clear();
			});
		},

		bulkRemoveImages: async (collectionId: string, imageIds: string[]) => {
			if (imageIds.length === 0) return;

			set((state) => {
				state.isBulkRemoving = true;
			});

			try {
				// Remove images one by one
				await Promise.all(
					imageIds.map((imageId) =>
						collectionService.removeImageFromCollection(collectionId, imageId)
					)
				);

				// Reload collection to get updated images
				const updatedCollection = await collectionService.getCollectionById(collectionId);
				const imageArray = Array.isArray(updatedCollection.images)
					? updatedCollection.images.filter(
							(img): img is Image =>
								typeof img === 'object' && img !== null && '_id' in img
						)
					: [];

				set((state) => {
					state.images = imageArray;
					state.selectedImageIds.clear();
					state.selectionMode = false;
					state.isBulkRemoving = false;
				});

				toast.success(`Đã xóa ${imageIds.length} ảnh khỏi bộ sưu tập`);
			} catch (error: unknown) {
				console.error('Failed to remove images:', error);
				set((state) => {
					state.isBulkRemoving = false;
				});
				toast.error('Không thể xóa ảnh. Vui lòng thử lại.');
				throw error;
			}
		},

		clearSelection: () => {
			set((state) => {
				state.selectedImageIds.clear();
				state.selectionMode = false;
			});
		},
	}))
);

