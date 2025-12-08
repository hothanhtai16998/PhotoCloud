import api from '@/lib/api';
import type {
  IncrementViewResponse,
  IncrementDownloadResponse,
} from '@/types/image';

export const imageStatsService = {
  incrementView: async (imageId: string): Promise<IncrementViewResponse> => {
    const res = await api.patch(
      `/images/${imageId}/view`,
      {},
      {
        withCredentials: true,
      }
    );
    return res.data;
  },

  incrementDownload: async (
    imageId: string
  ): Promise<IncrementDownloadResponse> => {
    const res = await api.patch(
      `/images/${imageId}/download`,
      {},
      {
        withCredentials: true,
      }
    );
    return res.data;
  },
};





