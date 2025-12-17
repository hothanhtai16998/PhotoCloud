import type { Image } from './image';
import type { User } from './user';

export interface CollectionCollaborator {
	user: User;
	permission: 'view' | 'edit' | 'admin';
	invitedBy?: User;
	invitedAt?: string;
}

export interface Collection {
	_id: string;
	name: string;
	description?: string;
	createdBy: User | string;
	images: Image[] | string[];
	imageCount?: number;
	isPublic: boolean;
	coverImage?: Image | string | null;
	views?: number;
	tags?: string[];
	collaborators?: CollectionCollaborator[];
	createdAt: string;
	updatedAt: string;
}

export interface CreateCollectionData {
	name: string;
	description?: string;
	isPublic?: boolean;
	tags?: string[];
}

export interface UpdateCollectionData {
	name?: string;
	description?: string;
	isPublic?: boolean;
	coverImage?: string | null;
	tags?: string[];
}

export interface CollectionResponse {
	success: boolean;
	collection?: Collection;
	collections?: Collection[];
	message?: string;
}


