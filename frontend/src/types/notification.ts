export interface Notification {
	_id: string;
	recipient: string;
	type: 
		| 'collection_invited' 
		| 'collection_image_added' 
		| 'collection_image_removed' 
		| 'collection_permission_changed' 
		| 'collection_removed'
		| 'image_favorited'
		| 'image_downloaded'
		| 'collection_favorited'
		| 'collection_shared'
		| 'upload_completed'
		| 'upload_failed'
		| 'upload_processing'
		| 'bulk_upload_completed'
		| 'collection_updated'
		| 'collection_cover_changed'
		| 'collection_reordered'
		| 'bulk_delete_completed'
		| 'bulk_add_to_collection'
		| 'image_featured'
		| 'image_removed'
		| 'account_verified'
		| 'account_warning'
		| 'account_banned'
		| 'profile_viewed'
		| 'profile_updated'
		| 'login_new_device'
		| 'password_changed'
		| 'email_changed'
		| 'two_factor_enabled'
		| 'system_announcement'
		| 'feature_update'
		| 'maintenance_scheduled'
		| 'terms_updated'
		| 'image_reported'
		| 'collection_reported'
		| 'user_reported'
		| 'user_followed'
		| 'user_unfollowed'
		| 'image_removed_admin'
		| 'user_banned_admin'
		| 'user_unbanned_admin';
	collection?: {
		_id: string;
		name: string;
		coverImage?: {
			_id: string;
			thumbnailUrl?: string;
			smallUrl?: string;
		};
	};
	actor?: {
		_id: string;
		username: string;
		displayName: string;
		avatarUrl?: string;
	};
	image?: {
		_id: string;
		imageTitle?: string;
		thumbnailUrl?: string;
		smallUrl?: string;
	};
	metadata?: {
		permission?: string;
		collectionName?: string;
		changes?: string[];
		imageCount?: number;
		deletedCount?: number;
		addedCount?: number;
		reason?: string;
		bannedBy?: string;
		unbannedBy?: string;
		changedFields?: string[];
		userAgent?: string;
		ipAddress?: string;
		successCount?: number;
		failedCount?: number;
		totalCount?: number;
		[key: string]: unknown;
	};
	isRead: boolean;
	readAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface NotificationsResponse {
	success: boolean;
	notifications: Notification[];
	unreadCount: number;
}

export interface UnreadCountResponse {
	success: boolean;
	unreadCount: number;
}

