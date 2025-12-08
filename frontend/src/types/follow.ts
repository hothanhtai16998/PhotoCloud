export interface FollowStatus {
	success: boolean;
	isFollowing: boolean;
	isFollowedBy: boolean;
}

export interface FollowCounts {
	success: boolean;
	following: number;
	followers: number;
}

export interface FollowUser {
	_id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	followedAt: string;
}

export interface FollowingListResponse {
	success: boolean;
	following: FollowUser[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface FollowersListResponse {
	success: boolean;
	followers: FollowUser[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface FollowActionResponse {
	success: boolean;
	message: string;
}

export interface UserFollowStatsResponse {
	success: boolean;
	stats: {
		followers: number;
		following: number;
		isFollowing: boolean;
	};
}

