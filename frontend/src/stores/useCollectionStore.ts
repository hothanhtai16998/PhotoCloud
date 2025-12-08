import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import { collectionVersionService } from '@/services/collectionVersionService';
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
		versions: [],
		loadingVersions: false,
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

		fetchVersions: async (collectionId: string) => {
			set((state) => {
				state.loadingVersions = true;
			});

			try {
				const versionsData = await collectionVersionService.getCollectionVersions(collectionId);
				set((state) => {
					state.versions = versionsData;
					state.loadingVersions = false;
				});
			} catch (error: unknown) {
				console.error('Failed to load versions:', error);
				set((state) => {
					state.loadingVersions = false;
				});
				toast.error('Không thể tải lịch sử phiên bản');
				throw error;
			}
		},

		restoreVersion: async (collectionId: string, versionNumber: number) => {
			try {
				const restoredCollection = await collectionVersionService.restoreCollectionVersion(
					collectionId,
					versionNumber
				);

				// Use type guard for safe type checking
				if (isCollection(restoredCollection)) {
					set((state) => {
						state.collection = restoredCollection;
					});
				} else {
					console.error('Restored collection has invalid format:', restoredCollection);
					throw new Error('Invalid collection data received');
				}

				// Reload versions
				await get().fetchVersions(collectionId);
				toast.success(`Đã khôi phục về phiên bản ${versionNumber}`);
			} catch (error: unknown) {
				console.error('Failed to restore version:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ??
					'Không thể khôi phục phiên bản. Vui lòng thử lại.';
				toast.error(message);
				throw error;
			}
		},

		clearCollection: () => {
			set((state) => {
				state.collection = null;
				state.error = null;
				state.isFavorited = false;
				state.versions = [];
				state.updatingCover = null;
			});
		},
	}))
);

