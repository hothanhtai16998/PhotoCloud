import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ImageStatsState {
	// Map of imageId -> { views, downloads, dailyViews, dailyDownloads }
	imageStats: Map<string, {
		views: number;
		downloads: number;
		dailyViews?: Record<string, number>;
		dailyDownloads?: Record<string, number>;
	}>;
	
	// Update stats for an image
	updateStats: (imageId: string, stats: {
		views?: number;
		downloads?: number;
		dailyViews?: Record<string, number>;
		dailyDownloads?: Record<string, number>;
	}) => void;
	
	// Increment views
	incrementViews: (imageId: string) => void;
	
	// Increment downloads
	incrementDownloads: (imageId: string) => void;
	
	// Get stats for an image
	getStats: (imageId: string) => { views: number; downloads: number; dailyViews?: Record<string, number>; dailyDownloads?: Record<string, number> } | null;
	
	// Clear all stats (useful for cleanup)
	clearStats: () => void;
}

export const useImageStatsStore = create(
	immer<ImageStatsState>((set, get) => ({
		imageStats: new Map<string, {
			views: number;
			downloads: number;
			dailyViews?: Record<string, number>;
			dailyDownloads?: Record<string, number>;
		}>(),

		updateStats: (imageId: string, stats: {
			views?: number;
			downloads?: number;
			dailyViews?: Record<string, number>;
			dailyDownloads?: Record<string, number>;
		}) => {
			set((state) => {
				const current = state.imageStats.get(imageId) || { views: 0, downloads: 0 };
				state.imageStats.set(imageId, {
					views: stats.views !== undefined ? Math.max(0, stats.views) : current.views,
					downloads: stats.downloads !== undefined ? Math.max(0, stats.downloads) : current.downloads,
					dailyViews: stats.dailyViews !== undefined ? stats.dailyViews : current.dailyViews,
					dailyDownloads: stats.dailyDownloads !== undefined ? stats.dailyDownloads : current.dailyDownloads,
				});
			});
		},

		incrementViews: (imageId: string) => {
			set((state) => {
				const current = state.imageStats.get(imageId) || { views: 0, downloads: 0 };
				state.imageStats.set(imageId, {
					...current,
					views: current.views + 1,
				});
			});
		},

		incrementDownloads: (imageId: string) => {
			set((state) => {
				const current = state.imageStats.get(imageId) || { views: 0, downloads: 0 };
				state.imageStats.set(imageId, {
					...current,
					downloads: current.downloads + 1,
				});
			});
		},

		getStats: (imageId: string) => {
			return get().imageStats.get(imageId) || null;
		},

		clearStats: () => {
			set((state) => {
				state.imageStats.clear();
			});
		},
	}))
);


