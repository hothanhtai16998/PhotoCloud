import api from '@/lib/axios';
import type { Image } from '@/types/image';

export interface PinnedImagesResponse {
	success: boolean;
	pinnedImages: Image[];
	message?: string;
}

export const pinnedImagesService = {
	/**
	 * Get user's pinned images
	 * @param userId Optional user ID (if not provided, gets own pinned images)
	 */
	getPinnedImages: async (userId?: string, signal?: AbortSignal): Promise<Image[]> => {
		const url = userId ? `/users/${userId}/pinned-images` : '/users/pinned-images';
		const res = await api.get<PinnedImagesResponse>(url, {
			withCredentials: true,
			signal,
		});
		return res.data.pinnedImages || [];
	},

	/**
	 * Pin an image to profile
	 * @param imageId Image ID to pin
	 */
	pinImage: async (imageId: string): Promise<Image[]> => {
		const res = await api.post<PinnedImagesResponse>(
			'/users/pinned-images',
			{ imageId },
			{ withCredentials: true }
		);
		return res.data.pinnedImages || [];
	},

	/**
	 * Unpin an image from profile
	 * @param imageId Image ID to unpin
	 */
	unpinImage: async (imageId: string): Promise<Image[]> => {
		const res = await api.delete<PinnedImagesResponse>(
			`/users/pinned-images/${imageId}`,
			{ withCredentials: true }
		);
		return res.data.pinnedImages || [];
	},

	/**
	 * Reorder pinned images
	 * @param imageIds Array of image IDs in desired order
	 */
	reorderPinnedImages: async (imageIds: string[]): Promise<Image[]> => {
		const res = await api.patch<PinnedImagesResponse>(
			'/users/pinned-images/reorder',
			{ imageIds },
			{ withCredentials: true }
		);
		return res.data.pinnedImages || [];
	},
};

