import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import type { CollectionsListState } from '@/types/store';
import type { Collection } from '@/types/collection';
import type { ApiErrorResponse } from '@/types/errors';

export const useCollectionsListStore = create(
	immer<CollectionsListState>((set, get) => ({
		collections: [],
		filteredCollections: [],
		loading: false,
		deletingId: null,
		searchQuery: '',
		showPublicOnly: false,
		sortBy: 'newest',
		selectedTag: null,

		fetchCollections: async () => {
			set((state) => {
				state.loading = true;
			});

			try {
				const data = await collectionService.getUserCollections();
				set((state) => {
					state.collections = data;
					// Apply current filters
					get().applyFilters(data);
					state.loading = false;
				});
			} catch (error: unknown) {
				console.error('Failed to load collections:', error);
				set((state) => {
					state.loading = false;
				});
				toast.error('Không thể tải danh sách bộ sưu tập');
				throw error;
			}
		},

		deleteCollection: async (collectionId: string) => {
			set((state) => {
				state.deletingId = collectionId;
			});

			try {
				await collectionService.deleteCollection(collectionId);
				set((state) => {
					state.collections = state.collections.filter((c) => c._id !== collectionId);
					// Reapply filters
					get().applyFilters(state.collections);
					state.deletingId = null;
				});
				toast.success('Đã xóa bộ sưu tập');
			} catch (error: unknown) {
				console.error('Failed to delete collection:', error);
				set((state) => {
					state.deletingId = null;
				});
				toast.error('Không thể xóa bộ sưu tập. Vui lòng thử lại.');
				throw error;
			}
		},

		updateCollection: async (
			collectionId: string,
			data: { name?: string; description?: string; isPublic?: boolean; tags?: string[] }
		) => {
			try {
				const updated = await collectionService.updateCollection(collectionId, data);
				set((state) => {
					state.collections = state.collections.map((c) =>
						c._id === collectionId ? updated : c
					);
					// Reapply filters
					get().applyFilters(state.collections);
				});
			} catch (error: unknown) {
				console.error('Failed to update collection:', error);
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ||
					'Không thể cập nhật. Vui lòng thử lại.';
				toast.error(message);
				throw error;
			}
		},

		setSearchQuery: (query: string) => {
			set((state) => {
				state.searchQuery = query;
				get().applyFilters(state.collections);
			});
		},

		setShowPublicOnly: (show: boolean) => {
			set((state) => {
				state.showPublicOnly = show;
				get().applyFilters(state.collections);
			});
		},

		setSortBy: (sortBy: 'newest' | 'oldest' | 'name' | 'images') => {
			set((state) => {
				state.sortBy = sortBy;
				get().applyFilters(state.collections);
			});
		},

		setSelectedTag: (tag: string | null) => {
			set((state) => {
				state.selectedTag = tag;
				get().applyFilters(state.collections);
			});
		},

		clearFilters: () => {
			set((state) => {
				state.searchQuery = '';
				state.showPublicOnly = false;
				state.selectedTag = null;
				get().applyFilters(state.collections);
			});
		},

		refreshCollections: async () => {
			await get().fetchCollections();
		},

		// Internal helper to apply filters
		applyFilters: (collectionsToFilter: Collection[]) => {
			set((state) => {
				let filtered = [...collectionsToFilter];

				// Search filter
				if (state.searchQuery.trim()) {
					const query = state.searchQuery.toLowerCase().trim();
					filtered = filtered.filter(
						(collection) =>
							collection.name.toLowerCase().includes(query) ||
							collection.description?.toLowerCase().includes(query) ||
							collection.tags?.some((tag) => tag.toLowerCase().includes(query))
					);
				}

				// Tag filter
				if (state.selectedTag) {
					filtered = filtered.filter((collection) =>
						collection.tags?.includes(state.selectedTag!)
					);
				}

				// Public filter
				if (state.showPublicOnly) {
					filtered = filtered.filter((collection) => collection.isPublic);
				}

				// Sort
				filtered.sort((a, b) => {
					switch (state.sortBy) {
						case 'newest':
							return (
								new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
							);
						case 'oldest':
							return (
								new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
							);
						case 'name':
							return a.name.localeCompare(b.name);
						case 'images':
							return (b.imageCount || 0) - (a.imageCount || 0);
						default:
							return 0;
					}
				});

				state.filteredCollections = filtered;
			});
		},
	}))
);





