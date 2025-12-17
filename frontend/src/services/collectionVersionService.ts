import api from '@/lib/axios';
import type { Collection } from '@/types/collection';

export interface CollectionVersion {
    _id: string;
    collection: string;
    versionNumber: number;
    snapshot: {
        name: string;
        description?: string;
        isPublic: boolean;
        tags: string[];
        coverImage?: string | { _id: string; thumbnailUrl?: string; imageUrl?: string; imageTitle?: string };
        images: string[] | Array<{ _id: string; thumbnailUrl?: string; imageUrl?: string; imageTitle?: string }>;
        collaborators: Array<{
            user: string | { _id: string; username: string; displayName: string; avatarUrl?: string };
            permission: 'view' | 'edit' | 'admin';
            invitedBy?: string | { _id: string; username: string; displayName: string };
            invitedAt?: string;
        }>;
    };
    changes: {
        type: 'created' | 'updated' | 'image_added' | 'image_removed' | 'reordered' | 'collaborator_added' | 'collaborator_removed' | 'permission_changed';
        description?: string;
        fieldChanged?: string;
        oldValue?: unknown;
        newValue?: unknown;
        imageId?: string | { _id: string; thumbnailUrl?: string; imageTitle?: string };
        collaboratorId?: string | { _id: string; username: string; displayName: string; avatarUrl?: string };
    };
    changedBy: {
        _id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    note?: string;
    createdAt: string;
    updatedAt: string;
}

interface VersionsResponse {
    success: boolean;
    versions: CollectionVersion[];
}

interface VersionResponse {
    success: boolean;
    version: CollectionVersion;
}

export const collectionVersionService = {
    /**
     * Get version history for a collection
     */
    getCollectionVersions: async (collectionId: string): Promise<CollectionVersion[]> => {
        const response = await api.get<VersionsResponse>(
            `/collection-versions/collection/${collectionId}`,
            {
                withCredentials: true,
            }
        );
        return response.data.versions;
    },

    /**
     * Get a specific version by version number
     */
    getVersionByNumber: async (
        collectionId: string,
        versionNumber: number
    ): Promise<CollectionVersion> => {
        const response = await api.get<VersionResponse>(
            `/collection-versions/collection/${collectionId}/version/${versionNumber}`,
            {
                withCredentials: true,
            }
        );
        return response.data.version;
    },

    /**
     * Restore a collection to a specific version
     */
    restoreCollectionVersion: async (
        collectionId: string,
        versionNumber: number
    ): Promise<Collection> => {
        const response = await api.post<{ collection: Collection }>(
            `/collection-versions/collection/${collectionId}/version/${versionNumber}/restore`,
            {},
            {
                withCredentials: true,
            }
        );
        return response.data.collection as Collection;
    },
};

