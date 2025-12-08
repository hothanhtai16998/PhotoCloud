import type { User } from './user';
import type { Image } from './image';
import type { Coordinates, Pagination } from './common';
import type { Collection } from './collection';
import type { CollectionVersion } from '@/services/collectionVersionService';
import type { PublicUser } from '@/services/userService';
import type { UserStats } from '@/services/userStatsService';

export type UploadImageData = {
	image: File;
	imageTitle: string;
	imageCategory: string;
	location?: string;
	coordinates?: Coordinates;
	cameraModel?: string;
	tags?: string[];
};

export interface AuthState {
	accessToken: string | null;
	loading: boolean;
	isInitializing: boolean;
	setAccessToken: (accessToken: string) => void;
	clearAuth: () => void;
	signUp: (
		username: string,
		password: string,
		email: string,
		firstName: string,
		lastName: string,
		phone?: string,
		bio?: string
	) => Promise<void>;
	signIn: (username: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	refresh: () => Promise<void>;
	initializeApp: () => Promise<void>;
}

export interface UserState {
	user: User | null;
	loading: boolean;
	fetchMe: () => Promise<void>;
	clearUser: () => void;
}

export interface ImageState {
	images: Image[];
	loading: boolean;
	error: string | null;
	uploadProgress: number;
	pagination: Pagination | null;
	currentSearch?: string;
	currentCategory?: string;
	currentLocation?: string;
	deletedImageIds: string[]; // Track deleted image IDs to filter them out
	uploadImage: (
		data: UploadImageData
	) => Promise<void>;
	fetchImages: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		location?: string;
		color?: string;
		tag?: string;
		_refresh?: boolean;
	}, signal?: AbortSignal) => Promise<void>;
	removeImage: (imageId: string) => void;
}

export interface CollectionState {
	collection: Collection | null;
	loading: boolean;
	error: string | null;
	isFavorited: boolean;
	togglingFavorite: boolean;
	versions: CollectionVersion[];
	loadingVersions: boolean;
	updatingCover: string | null;
	fetchCollection: (collectionId: string) => Promise<void>;
	updateCollection: (collectionId: string, data: { name?: string; description?: string; isPublic?: boolean; coverImage?: string | null; tags?: string[] }) => Promise<void>;
	deleteCollection: (collectionId: string) => Promise<void>;
	setCoverImage: (collectionId: string, imageId: string) => Promise<void>;
	toggleFavorite: (collectionId: string) => Promise<void>;
	fetchVersions: (collectionId: string) => Promise<void>;
	restoreVersion: (collectionId: string, versionNumber: number) => Promise<void>;
	clearCollection: () => void;
}

export interface CollectionImageState {
	images: Image[];
	imageTypes: Map<string, 'portrait' | 'landscape'>;
	draggedImageId: string | null;
	dragOverImageId: string | null;
	isReordering: boolean;
	selectionMode: boolean;
	selectedImageIds: Set<string>;
	isBulkRemoving: boolean;
	setImages: (images: Image[]) => void;
	updateImage: (imageId: string, updatedImage: Image) => void;
	removeImage: (imageId: string) => void;
	reorderImages: (collectionId: string, newOrder: string[]) => Promise<void>;
	setImageType: (imageId: string, type: 'portrait' | 'landscape') => void;
	setDraggedImageId: (imageId: string | null) => void;
	setDragOverImageId: (imageId: string | null) => void;
	setIsReordering: (isReordering: boolean) => void;
	toggleSelectionMode: () => void;
	toggleImageSelection: (imageId: string) => void;
	selectAllImages: () => void;
	deselectAllImages: () => void;
	bulkRemoveImages: (collectionId: string, imageIds: string[]) => Promise<void>;
	clearSelection: () => void;
}

export interface ProfileState {
	profileUser: PublicUser | null;
	profileUserLoading: boolean;
	followStats: {
		followers: number;
		following: number;
		isFollowing: boolean;
	};
	userStats: UserStats | null;
	collections: Collection[];
	collectionsLoading: boolean;
	collectionsCount: number;
	fetchProfileUser: (username?: string, userId?: string, signal?: AbortSignal) => Promise<void>;
	fetchFollowStats: (userId: string, signal?: AbortSignal) => Promise<void>;
	fetchUserStats: (userId: string, signal?: AbortSignal) => Promise<void>;
	fetchCollections: (userId: string, signal?: AbortSignal) => Promise<void>;
	clearProfile: () => void;
}

export interface UserImageState {
	images: Image[];
	loading: boolean;
	photosCount: number;
	illustrationsCount: number;
	imageTypes: Map<string, 'portrait' | 'landscape'>;
	fetchUserImages: (userId: string, refresh?: boolean, signal?: AbortSignal) => Promise<void>;
	setImageType: (imageId: string, type: 'portrait' | 'landscape') => void;
	updateImage: (imageId: string, updatedImage: Image) => void;
	clearImages: () => void;
}

export interface CollectionsListState {
	collections: Collection[];
	filteredCollections: Collection[];
	loading: boolean;
	deletingId: string | null;
	searchQuery: string;
	showPublicOnly: boolean;
	sortBy: 'newest' | 'oldest' | 'name' | 'images';
	selectedTag: string | null;
	fetchCollections: () => Promise<void>;
	deleteCollection: (collectionId: string) => Promise<void>;
	updateCollection: (collectionId: string, data: { name?: string; description?: string; isPublic?: boolean; tags?: string[] }) => Promise<void>;
	setSearchQuery: (query: string) => void;
	setShowPublicOnly: (show: boolean) => void;
	setSortBy: (sortBy: 'newest' | 'oldest' | 'name' | 'images') => void;
	setSelectedTag: (tag: string | null) => void;
	clearFilters: () => void;
	refreshCollections: () => Promise<void>;
	applyFilters: (collectionsToFilter: Collection[]) => void;
}

export interface CollectionFavoriteState {
	favoriteStatuses: Record<string, boolean>;
	togglingFavoriteId: string | null;
	checkFavorites: (collectionIds: string[]) => Promise<void>;
	toggleFavorite: (collectionId: string) => Promise<void>;
	clearFavorites: () => void;
}

export interface FavoriteState {
	images: Image[];
	loading: boolean;
	pagination: Pagination | null;
	currentPage: number;
	imageTypes: Map<string, 'portrait' | 'landscape'>;
	fetchFavorites: (page?: number) => Promise<void>;
	setImageType: (imageId: string, type: 'portrait' | 'landscape') => void;
	updateImage: (imageId: string, updatedImage: Image) => void;
	clearFavorites: () => void;
}