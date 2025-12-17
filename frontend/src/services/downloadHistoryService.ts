import api from '@/lib/axios';
import type { Image } from '@/types/image';

export interface DownloadHistoryItem {
    _id: string;
    image: Image;
    downloadedAt: string;
    date: string; // YYYY-MM-DD format
}

export interface DownloadHistoryResponse {
    success: boolean;
    downloads: DownloadHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export const downloadHistoryService = {
    /**
     * Get user's download history
     * @param page - Page number (default: 1)
     * @param limit - Items per page (default: 20)
     */
    async getDownloadHistory(page: number = 1, limit: number = 20): Promise<DownloadHistoryResponse> {
        const response = await api.get<DownloadHistoryResponse>('/users/me/download-history', {
            params: { page, limit },
        });
        return response.data;
    },
};

