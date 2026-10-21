import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import type { CollectionState } from '@/types/store';
import type { ApiErrorResponse } from '@/types/errors';
import type { Image } from '@/types/image';
import { getAuthSessionVersion } from '@/utils/authSessionVersion';
import { useAuthStore } from '@/stores/useAuthStore';

let collectionRequest = 0;
let favoriteRevision = 0;
let detailController: AbortController | null = null;

export const useCollectionStore = create(
	immer<CollectionState>((set, get) => ({
		collection: null,
		loading: false,
		error: null,
		isFavorited: false,
		togglingFavorite: false,
		updatingCover: null,

		fetchCollection: async (collectionId: string) => {
   detailController?.abort();
   const controller = new AbortController();
   detailController = controller;
   const request = ++collectionRequest;
   const session = getAuthSessionVersion();
			const isCurrent = (): boolean => request === collectionRequest && session === getAuthSessionVersion();
			set((state) => {
				state.loading = true;
				state.error = null;
				state.togglingFavorite = false;
				state.updatingCover = null;
				if (state.collection?._id !== collectionId) {
					state.collection = null;
					state.isFavorited = false;
				}
			});

			try {
				const data = await collectionService.getCollectionById(collectionId, controller.signal);
    if (!isCurrent()) return;
				set((state) => {
					state.collection = data;
					state.loading = false;
				});

				// Check favorite status
				if (!useAuthStore.getState().accessToken) return;
				const revision = favoriteRevision;
				void collectionFavoriteService.checkFavorites([collectionId]).then(favoritesResponse => {
					set((state) => {
						if (isCurrent() && revision === favoriteRevision) state.isFavorited = favoritesResponse.favorites[collectionId] ?? false;
					});
				}).catch(error => {
					console.error('Failed to check favorite status:', error);
				});
			} catch (error: unknown) {
				if (!isCurrent()) return;
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					(navigator.onLine ? 'Không thể tải bộ sưu tập. Vui lòng thử lại.' : 'Bạn đang ngoại tuyến. Kết nối mạng rồi bấm Thử lại.');
				set((state) => {
					state.error = message;
					state.loading = false;
				});
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
			if (get().updatingCover) return;
			const request = collectionRequest;
			const session = getAuthSessionVersion();
			const isCurrent = (): boolean => request === collectionRequest && session === getAuthSessionVersion() && get().collection?._id === collectionId;
			set((state) => {
				state.updatingCover = imageId;
			});

			try {
				const updatedCollection = await collectionService.updateCollection(collectionId, {
					coverImage: imageId,
				});
				if (!isCurrent()) return;

				set((state) => {
					state.collection = updatedCollection;
					state.updatingCover = null;
				});

				toast.success('Đã đặt ảnh làm ảnh bìa');
			} catch (error: unknown) {
				if (!isCurrent()) return;
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
			const request = collectionRequest;
			const session = getAuthSessionVersion();
			const isCurrent = (): boolean => request === collectionRequest && session === getAuthSessionVersion() && get().collection?._id === collectionId;
			favoriteRevision++;

			set((state) => {
				state.togglingFavorite = true;
			});

			try {
				const response = await collectionFavoriteService.toggleFavorite(collectionId);
				if (!isCurrent()) return;
				set((state) => {
					state.isFavorited = response.isFavorited;
					state.togglingFavorite = false;
				});

				toast.success(
					response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
				);
			} catch (error: unknown) {
				if (!isCurrent()) return;
				console.error('Failed to toggle favorite:', error);
				set((state) => {
					state.togglingFavorite = false;
				});
				toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
				throw error;
			}
		},


		clearCollection: () => {
   detailController?.abort(); detailController = null;
   collectionRequest++;
			set((state) => {
				state.collection = null;
				state.error = null;
				state.isFavorited = false;
				state.updatingCover = null;
				state.togglingFavorite = false;
				state.loading = false;
			});
		},

		// Real-time update methods (called via WebSocket)
		addImageToCollection: (imageId: string, image: Image) => {
			set((state) => {
				if (state.collection) {
					// Add image to collection if not already present
					const imageIds = state.collection.images?.map((img) =>
						typeof img === 'object' ? img._id : img
					) || [];
					
					if (!imageIds.includes(imageId)) {
						const previous = state.collection.images || [];
						state.collection.images = previous.length > 0 && previous.every((item): item is string => typeof item === 'string')
							? [...previous, imageId]
							: [...previous.filter((item): item is Image => typeof item === 'object' && item !== null), image];
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
					const previous = state.collection.images || [];
					if (!previous.some(img => (typeof img === 'object' ? img._id : img) === imageId)) return;
					state.collection.images = previous.every((img): img is string => typeof img === 'string')
						? previous.filter(id => id !== imageId)
						: previous.filter((img): img is Image => typeof img === 'object' && img !== null && img._id !== imageId);
					
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
				if (state.collection?.images) {
					// Reorder images based on new order
					const order = new Map(imageIds.map((id, index) => [id, index]));
					state.collection.images.sort((a, b) =>
						(order.get(typeof a === 'string' ? a : a._id) ?? imageIds.length) -
						(order.get(typeof b === 'string' ? b : b._id) ?? imageIds.length));
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
							const image = state.collection.images?.find((img) => {
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


export function markCollectionOffline(): void {
 detailController?.abort(); detailController = null;
 collectionRequest++;
 useCollectionStore.setState({ loading: false, error: 'Bạn đang ngoại tuyến. Kết nối mạng rồi bấm Thử lại.' });
}
