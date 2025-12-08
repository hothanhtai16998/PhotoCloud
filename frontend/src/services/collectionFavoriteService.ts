import api from '@/lib/axios';
import type { Collection } from '@/types/collection';

export interface CollectionFavoriteResponse {
	success: boolean;
	isFavorited: boolean;
	message: string;
}

export interface CollectionFavoritesCheckResponse {
	success: boolean;
	favorites: Record<string, boolean>;
}

export interface CollectionFavoritesListResponse {
	success: boolean;
	collections: Collection[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export const collectionFavoriteService = {
	/**
	 * Toggle favorite status for a collection
	 */
	toggleFavorite: async (collectionId: string): Promise<CollectionFavoriteResponse> => {
		const res = await api.post(`/collection-favorites/${collectionId}`, {}, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get user's favorite collections
	 */
	getFavoriteCollections: async (params?: {
		page?: number;
		limit?: number;
	}): Promise<CollectionFavoritesListResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.page) {
			queryParams.append('page', params.page.toString());
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/collection-favorites?${queryString}` : '/collection-favorites';

		const res = await api.get(url, {
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Check if multiple collections are favorited
	 */
	checkFavorites: async (collectionIds: string[]): Promise<CollectionFavoritesCheckResponse> => {
		// Ensure collectionIds is a non-empty array
		if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
			throw new Error('collectionIds must be a non-empty array');
		}
		
		// Validate MongoDB ObjectId format (24 hex characters)
		const isValidMongoId = (id: string): boolean => {
			return /^[0-9a-fA-F]{24}$/.test(String(id));
		};
		
		// Ensure all IDs are strings and valid MongoDB ObjectIds
		const stringIds = collectionIds
			.map(id => String(id).trim())
			.filter(id => id && isValidMongoId(id));
		
		if (stringIds.length === 0) {
			throw new Error('collectionIds must contain at least one valid MongoDB ObjectId');
		}
		
		const res = await api.post('/collection-favorites/check', { collectionIds: stringIds }, {
			withCredentials: true,
			headers: {
				'Content-Type': 'application/json',
			},
		});
		return res.data;
	},
};

