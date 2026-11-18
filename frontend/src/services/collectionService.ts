import api from '@/lib/axios';
import type {
	Collection,
	CreateCollectionData,
	UpdateCollectionData,
	CollectionResponse,
} from '@/types/collection';

export interface FailedCollectionImage { id: string; title: string; }

export function readFailedCollectionImages(value: unknown): FailedCollectionImage[] | null {
    if (!Array.isArray(value)) return null;
    const result: FailedCollectionImage[] = [];
    const ids = new Set<string>();
    for (const entry of value) {
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' ||
            !/^[a-f0-9]{24}$/.test(entry.id) || typeof entry.title !== 'string' || ids.has(entry.id)) return null;
        ids.add(entry.id);
        result.push({ id: entry.id, title: entry.title });
    }
    return result;
}

export const collectionService = {
	/**
	 * Get all collections for the authenticated user
	 */
	getUserCollections: async (signal?: AbortSignal, scope: 'mine' | 'browse' = 'mine'): Promise<Collection[]> => {
		const response = await api.get<CollectionResponse>('/collections', {
			signal,
            params: { scope },
            timeout: 15000,
		});
		if (response.data.success && Array.isArray(response.data.collections)) {
			return response.data.collections;
		}
		throw new Error('Failed to fetch collections');
	},

	/**
	 * Get a single collection by ID
	 */
	getCollectionById: async (collectionId: string, signal?: AbortSignal): Promise<Collection> => {
		const response = await api.get<CollectionResponse>(`/collections/${collectionId}`, { signal, timeout: 15000 });
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error('Failed to fetch collection');
	},

	/**
	 * Create a new collection
	 */
	createCollection: async (data: CreateCollectionData): Promise<Collection> => {
		const response = await api.post<CollectionResponse>('/collections', data);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to create collection');
	},

	/**
	 * Update a collection
	 */
	updateCollection: async (
		collectionId: string,
		data: UpdateCollectionData
	): Promise<Collection> => {
		const response = await api.patch<CollectionResponse>(`/collections/${collectionId}`, data);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to update collection');
	},

	/**
	 * Delete a collection
	 */
	deleteCollection: async (collectionId: string): Promise<void> => {
		const response = await api.delete<CollectionResponse>(`/collections/${collectionId}`);
		if (!response.data.success) {
			throw new Error(response.data.message || 'Failed to delete collection');
		}
	},

	/**
	 * Add image to collection
	 */
	addImageToCollection: async (
		collectionId: string,
		imageId: string
	): Promise<Collection> => {
		const response = await api.post<CollectionResponse>(
			`/collections/${collectionId}/images`,
			{ imageId }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to add image to collection');
	},

	/**
	 * Remove image from collection
	 */
	removeImageFromCollection: async (
		collectionId: string,
		imageId: string
	): Promise<Collection> => {
		const response = await api.delete<CollectionResponse>(
			`/collections/${collectionId}/images/${imageId}`
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to remove image from collection');
	},

	/**
	 * Track collection share - Create notification for collection owner
	 */
	trackCollectionShare: async (collectionId: string): Promise<void> => {
		try {
			await api.post(`/collections/${collectionId}/share`, {}, {
				withCredentials: true,
			});
		} catch (error) {
			// Silently fail - don't interrupt sharing flow if notification fails
			console.error('Failed to track collection share:', error);
		}
	},

	/**
	 * Get collections that contain a specific image
	 */
	getCollectionsContainingImage: async (imageId: string): Promise<Collection[]> => {
		const response = await api.get<CollectionResponse>(
			`/collections/containing/${imageId}`
		);
		if (response.data.success && response.data.collections) {
			return response.data.collections;
		}
		throw new Error('Failed to fetch collections');
	},

	/**
	 * Reorder images in a collection
	 */
	reorderCollectionImages: async (
		collectionId: string,
		imageIds: string[]
	): Promise<Collection> => {
		const response = await api.patch<CollectionResponse>(
			`/collections/${collectionId}/images/reorder`,
			{ imageIds }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to reorder images');
	},

	/**
	 * Export collection as ZIP file
	 */
    exportCollection: async (collectionId: string, imageIds?: string[]): Promise<{
        blob: Blob; total: number; downloaded: number; failed: FailedCollectionImage[];
    }> => {
        const response = await api.post(`/collections/${collectionId}/export`, imageIds ? { imageIds } : {}, {
            responseType: 'blob',
        });
        const form = await new Response(response.data, {
            headers: { 'Content-Type': String(response.headers['content-type'] || '') },
        }).formData();
        const report = form.get('report');
        const blob = form.get('archive');
        if (typeof report !== 'string' || report.length > 1024 * 1024 || !(blob instanceof Blob) || !blob.size) {
            throw new Error('Không đọc được kết quả tải. Vui lòng thử lại.');
        }
        const details: unknown = JSON.parse(report);
        if (!details || typeof details !== 'object' || !('total' in details) || !('downloaded' in details) || !('failed' in details)) {
            throw new Error('Kết quả tải không hợp lệ.');
        }
        const { total, downloaded } = details;
        const failed = readFailedCollectionImages(details.failed);
        if (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 1 ||
            typeof downloaded !== 'number' || !Number.isSafeInteger(downloaded) || downloaded < 1 ||
            !failed || downloaded + failed.length !== total) throw new Error('Số lượng ảnh tải về không hợp lệ.');
        return { blob, total, downloaded, failed };
    },

	/**
	 * Add collaborator to collection
	 */
	addCollaborator: async (
		collectionId: string,
		userEmail: string,
		permission: 'view' | 'edit' | 'admin' = 'view'
	): Promise<Collection> => {
		const response = await api.post<CollectionResponse>(
			`/collections/${collectionId}/collaborators`,
			{ userEmail, permission }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to add collaborator');
	},

	/**
	 * Remove collaborator from collection
	 */
	removeCollaborator: async (
		collectionId: string,
		collaboratorId: string
	): Promise<Collection> => {
		const response = await api.delete<CollectionResponse>(
			`/collections/${collectionId}/collaborators/${collaboratorId}`
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to remove collaborator');
	},

	/**
	 * Update collaborator permission
	 */
	updateCollaboratorPermission: async (
		collectionId: string,
		collaboratorId: string,
		permission: 'view' | 'edit' | 'admin'
	): Promise<Collection> => {
		const response = await api.patch<CollectionResponse>(
			`/collections/${collectionId}/collaborators/${collaboratorId}/permission`,
			{ permission }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to update collaborator permission');
	},
};


