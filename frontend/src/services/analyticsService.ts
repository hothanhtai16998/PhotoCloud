import api from '@/lib/axios';

export interface AnalyticsSummary {
	totalImages: number;
	totalViews: number;
	totalDownloads: number;
	avgViewsPerImage: number;
	avgDownloadsPerImage: number;
	period: string;
}

export interface TimeSeriesData {
	date: string;
	value: number;
}

export interface PopularImage {
	_id: string;
	imageTitle: string;
	imageUrl: string;
	thumbnailUrl?: string;
	smallUrl?: string;
	views: number;
	downloads: number;
	totalEngagement: number;
	createdAt: string;
}

export interface GeographicData {
	location: string;
	imageCount: number;
	totalViews: number;
	totalDownloads: number;
}

export interface CategoryPerformance {
	category: string;
	imageCount: number;
	totalViews: number;
	totalDownloads: number;
	avgViews: number;
}

export interface UserAnalytics {
	summary: AnalyticsSummary;
	viewsOverTime: TimeSeriesData[];
	downloadsOverTime: TimeSeriesData[];
	mostPopularImages: PopularImage[];
	geographicDistribution: GeographicData[];
	bestPerformingCategories: CategoryPerformance[];
}

export const analyticsService = {
	/**
	 * Get analytics data for the current user
	 * @param days Number of days to analyze (default: 30, max: 365)
	 */
	getUserAnalytics: async (days?: number): Promise<UserAnalytics> => {
		const params = days ? { days } : {};
		const res = await api.get('/users/analytics', {
			params,
			withCredentials: true,
		});
		return res.data;
	},
};






