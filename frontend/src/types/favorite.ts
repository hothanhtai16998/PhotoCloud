import type { Image } from './image';

export interface FavoriteResponse {
	success: boolean;
	isFavorited: boolean;
	message: string;
}

export interface FavoritesCheckResponse {
	success: boolean;
	favorites: Record<string, boolean>;
}

export interface FavoritesListResponse {
	success: boolean;
	images: Image[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

