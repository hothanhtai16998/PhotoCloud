import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { downloadHistoryService, type DownloadHistoryItem } from '@/services/downloadHistoryService';
import { toast } from 'sonner';
import { t } from '@/i18n';

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
				// If we have data, ensure loading is false
				if (state.downloads.length > 0) {
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
	}))
);

