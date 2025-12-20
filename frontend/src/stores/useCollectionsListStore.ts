import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { collectionService } from '@/services/collectionService';
import type { CollectionsListState } from '@/types/store';
import type { Collection } from '@/types/collection';
import type { ApiErrorResponse } from '@/types/errors';

// Unsplash-style: 5 minutes stale threshold
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

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
		hasLoaded: false,
		lastFetchedAt: null,

		fetchCollections: async () => {
			const currentState = get();
			// Only set loading if we don't have data yet (prevents flash when navigating)
			const shouldShowLoading = !currentState.hasLoaded && currentState.collections.length === 0;
			
			if (shouldShowLoading) {
				set((state) => {
					state.loading = true;
				});
			}

			try {
				const data = await collectionService.getUserCollections();
				
				// Update collections first
				set((state) => {
					state.collections = data;
					state.hasLoaded = true;
					state.lastFetchedAt = Date.now();
					state.loading = false;
				});
				
				// Then apply filters (outside of set to avoid nested updates)
				get().applyFilters(data);
			} catch (error: unknown) {
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
						collection.tags && Array.isArray(collection.tags) && collection.tags.includes(state.selectedTag!)
					);
				}

				// Public filter
				if (state.showPublicOnly) {
					filtered = filtered.filter((collection) => collection.isPublic === true);
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

		resetLoading: () => {
			set((state) => {
				// If we have collections, ensure loading is false and hasLoaded is true
				// This prevents flash and unnecessary fetches when navigating with cached data
				if (state.collections.length > 0) {
					state.loading = false;
					if (!state.hasLoaded) {
						state.hasLoaded = true;
					}
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
				const data = await collectionService.getUserCollections();
				
				set((state) => {
					state.collections = data;
					state.lastFetchedAt = Date.now();
					// Don't set loading - this is a silent background refresh
				});
				
				// Apply filters after update
				get().applyFilters(data);
			} catch {
				// Silent fail - keep showing cached data
			}
		},

		// Optimistic update: Add collection to list immediately
		addCollection: (collection: Collection) => {
			set((state) => {
				// Check if already exists (prevent duplicates)
				const exists = state.collections.some(c => c._id === collection._id);
				if (exists) {
					return; // Already in list
				}

				// Add to beginning (most recent first)
				state.collections = [collection, ...state.collections];
				
				// Reapply filters to include new collection
				get().applyFilters(state.collections);
			});
		},
	}))
);

// Listen to collection creation events globally (even when CollectionsPage is not mounted)
// This ensures optimistic updates work from anywhere in the app
if (typeof window !== 'undefined') {
	window.addEventListener('collectionCreated', ((event: CustomEvent<{ 
		collection: Collection;
	}>) => {
		const { collection } = event.detail || {};
		if (!collection?._id) return;

		const store = useCollectionsListStore.getState();
		
		// Add collection to list
		store.addCollection(collection);
	}) as EventListener);
}





