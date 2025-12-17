import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import type { CollectionFavoriteState } from '@/types/store';

export const useCollectionFavoriteStore = create(
	immer<CollectionFavoriteState>((set) => ({
		favoriteStatuses: {},
		togglingFavoriteId: null,

		checkFavorites: async (collectionIds: string[]) => {
			if (collectionIds.length === 0) return;

			try {
				const favoritesResponse = await collectionFavoriteService.checkFavorites(collectionIds);
				set((state) => {
					state.favoriteStatuses = {
						...state.favoriteStatuses,
						...favoritesResponse.favorites,
					};
				});
			} catch (error) {
				console.error('Failed to check favorite statuses:', error);
			}
		},

		toggleFavorite: async (collectionId: string) => {
			set((state) => {
				state.togglingFavoriteId = collectionId;
			});

			try {
				const response = await collectionFavoriteService.toggleFavorite(collectionId);
				set((state) => {
					state.favoriteStatuses[collectionId] = response.isFavorited;
					state.togglingFavoriteId = null;
				});

				toast.success(
					response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
				);
			} catch (error: unknown) {
				console.error('Failed to toggle favorite:', error);
				set((state) => {
					state.togglingFavoriteId = null;
				});
				toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
				throw error;
			}
		},

		clearFavorites: () => {
			set((state) => {
				state.favoriteStatuses = {};
				state.togglingFavoriteId = null;
			});
		},
	}))
);





