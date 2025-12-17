import type { AdminRolePermissions } from '@/services/adminService';

export interface User {
	_id: string;
	username: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	phone?: string;
	location?: string;
	website?: string;
	instagram?: string;
	twitter?: string;
	facebook?: string;
	isOAuthUser?: boolean;
	isAdmin?: boolean;
	isSuperAdmin?: boolean;
	permissions?: AdminRolePermissions | null;
	createdAt?: string;
	updatedAt?: string;
}

// User Service Response Types
export interface ChangePasswordResponse {
	success: boolean;
	message?: string;
}

export interface UpdateProfileResponse {
	success: boolean;
	message?: string;
	user?: User;
}
