import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { downloadHistoryService, type DownloadHistoryItem } from '@/services/downloadHistoryService';
import { toast } from 'sonner';
import { t } from '@/i18n';
import type { Image } from '@/types/image';

// Unsplash-style: 1 minute stale threshold (matches Unsplash behavior)
const STALE_THRESHOLD = 1 * 60 * 1000; // 1 minute

export interface DownloadHistoryState {
	downloads: DownloadHistoryItem[];
	loading: boolean;
	loadingMore: boolean;
	page: number;
	hasMore: boolean;
	total: number;
	hasLoaded: boolean;
	lastFetchedAt: number | null;
	fetchDownloads: (page?: number, append?: boolean) => Promise<void>;
	resetLoading: () => void;
	clearDownloads: () => void;
	checkAndRefreshIfStale: () => Promise<void>;
	addDownloadToHistory: (image: Image) => void;
}

export const useDownloadHistoryStore = create(
	immer<DownloadHistoryState>((set, get) => ({
		downloads: [],
		loading: false,
		loadingMore: false,
		page: 1,
		hasMore: false,
		total: 0,
		hasLoaded: false,
		lastFetchedAt: null,

		fetchDownloads: async (pageNum: number = 1, append: boolean = false) => {
			const currentState = get();
			
			// If we already have loaded data and this is page 1 without append, refresh silently (no loading state)
			// This prevents flash when navigating back to downloads page
			const isSilentRefresh = pageNum === 1 && !append && currentState.hasLoaded;
			
			// Only set loading if we don't have data yet (prevents flash when navigating)
			const shouldShowLoading = pageNum === 1 && !append && !currentState.hasLoaded && currentState.downloads.length === 0;
			
			if (shouldShowLoading && !isSilentRefresh) {
				set((state) => {
					state.loading = true;
				});
			} else if (pageNum > 1 || append) {
				set((state) => {
					state.loadingMore = true;
				});
			}

			try {
				const response = await downloadHistoryService.getDownloadHistory(pageNum, 20);
				
				set((state) => {
					if (append) {
						state.downloads = [...state.downloads, ...response.downloads];
					} else {
						state.downloads = response.downloads;
						state.lastFetchedAt = Date.now();
					}
					state.page = response.pagination.page;
					state.hasMore = response.pagination.hasMore;
					state.total = response.pagination.total;
					state.hasLoaded = true;
					state.loading = false;
					state.loadingMore = false;
				});
			} catch (error) {
				console.error('Failed to fetch download history:', error);
				toast.error(t('profile.downloadHistorySection.loadFailed') || 'Failed to load download history');
				set((state) => {
					state.loading = false;
					state.loadingMore = false;
				});
			}
		},

		resetLoading: () => {
			set((state) => {
				// If we have loaded data (hasLoaded), ensure loading is false
				// This prevents flash when navigating with cached data (even if empty)
				if (state.hasLoaded) {
					state.loading = false;
					state.loadingMore = false;
				}
			});
		},

		clearDownloads: () => {
			set((state) => {
				state.downloads = [];
				state.page = 1;
				state.hasMore = false;
				state.total = 0;
				state.hasLoaded = false;
				state.lastFetchedAt = null;
				state.loading = false;
				state.loadingMore = false;
			});
		},

		checkAndRefreshIfStale: async () => {
			const currentState = get();
			
			// Don't refresh if already loading or never loaded
			if (currentState.loading || currentState.loadingMore || !currentState.hasLoaded || !currentState.lastFetchedAt) {
				return;
			}
			
			// Check if data is stale (>1 minute old)
			const age = Date.now() - currentState.lastFetchedAt;
			if (age <= STALE_THRESHOLD) {
				return;
			}
			
			// Silent background refresh - no loading state
			try {
				const response = await downloadHistoryService.getDownloadHistory(1, 20);
				
				set((state) => {
					state.downloads = response.downloads;
					state.page = response.pagination.page;
					state.hasMore = response.pagination.hasMore;
					state.total = response.pagination.total;
					state.lastFetchedAt = Date.now();
					// Don't set loading - this is a silent background refresh
				});
			} catch (error) {
				// Silent fail - keep showing cached data
				console.error('Background refresh failed:', error);
			}
		},

		// Optimistic update: Add download to history immediately
		addDownloadToHistory: (image: Image) => {
			set((state) => {
				// Check if already exists (prevent duplicates)
				const exists = state.downloads.some(item => item.image._id === image._id);
				if (exists) {
					return; // Already in history
				}

				// Create new download history item
				const now = new Date();
				const dateStr = now.toISOString().split('T')[0] || now.toISOString().substring(0, 10); // YYYY-MM-DD format
				
				const newDownloadItem: DownloadHistoryItem = {
					_id: `temp-${Date.now()}`, // Temporary ID, will be replaced on next fetch
					image: image,
					downloadedAt: now.toISOString(),
					date: dateStr,
				};

				// Add to beginning (most recent first)
				state.downloads = [newDownloadItem, ...state.downloads];
				
				// Update total count (always increment, even if pagination not loaded yet)
				state.total = state.total + 1;

				// Dispatch event to update sidebar thumbnail immediately
				if (typeof window !== 'undefined') {
					window.dispatchEvent(new CustomEvent('downloadsUpdated', {
						detail: {
							thumbnailImage: image,
							total: state.total
						}
					}));
				}
			});
		},
	}))
);

// Listen to download events globally (even when DownloadHistoryPage is not mounted)
// This ensures optimistic updates work from anywhere in the app
if (typeof window !== 'undefined') {
	window.addEventListener('downloadCompleted', ((event: CustomEvent<{ 
		image: Image;
	}>) => {
		const { image } = event.detail || {};
		if (!image?._id) return;

		const store = useDownloadHistoryStore.getState();
		
		// Add image to download history
		store.addDownloadToHistory(image);
	}) as EventListener);
}

