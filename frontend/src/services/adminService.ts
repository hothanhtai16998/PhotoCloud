import api from '@/lib/axios';
import type { AnalyticsData } from '@/types/admin';
import type { Coordinates, Pagination } from '@/types/common';

export interface DashboardStats {
    stats: {
        totalUsers: number;
        totalImages: number;
        categoryStats: Array<{ _id: string; count: number }>;
    };
    recentUsers: User[];
    recentImages: AdminImage[];
}

export interface User {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    bio?: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
    isBanned?: boolean;
    bannedAt?: string;
    banReason?: string;
    createdAt: string;
    imageCount?: number;
}

export interface AdminImage {
    _id: string;
    imageTitle: string;
    imageUrl: string;
    imageCategory: string | { _id: string; name: string; description?: string } | null;
    uploadedBy: {
        _id: string;
        username: string;
        displayName: string;
        email: string;
    };
    isModerated?: boolean;
    moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderatedAt?: string;
    moderationNotes?: string;
    createdAt: string;
}

export interface AdminRolePermissions {
    // User Management - Granular permissions
    viewUsers?: boolean;
    editUsers?: boolean;
    deleteUsers?: boolean;
    banUsers?: boolean;
    unbanUsers?: boolean;
    
    // Image Management - Granular permissions
    viewImages?: boolean;
    editImages?: boolean;
    deleteImages?: boolean;
    moderateImages?: boolean;
    
    // Category Management - Granular permissions
    viewCategories?: boolean;
    createCategories?: boolean;
    editCategories?: boolean;
    deleteCategories?: boolean;
    
    // Admin Management - Granular permissions
    viewAdmins?: boolean;
    createAdmins?: boolean;
    editAdmins?: boolean;
    deleteAdmins?: boolean;
    
    // Dashboard & Analytics
    viewDashboard?: boolean;
    viewAnalytics?: boolean;
    
    // Collections
    viewCollections?: boolean;
    manageCollections?: boolean;
    
    // Favorites Management
    manageFavorites?: boolean;
    
    // Content Moderation (general)
    moderateContent?: boolean;
    
    // System & Logs
    viewLogs?: boolean;
    exportData?: boolean;
    manageSettings?: boolean;
}

export interface AdminRole {
    _id: string;
    userId: User | string;
    role: 'super_admin' | 'admin' | 'moderator';
    permissions: AdminRolePermissions;
    grantedBy?: User;
    expiresAt?: string | null; // ISO date string, null means no expiration
    active?: boolean; // Default: true
    allowedIPs?: string[]; // Array of IP addresses or CIDR ranges
    createdAt?: string;
    updatedAt?: string;
}

export const adminService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        const res = await api.get('/admin/dashboard/stats', {
            withCredentials: true,
        });
        return res.data;
    },
    getSystemMetrics: async (): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        cpuUsage?: number;
        memoryUsage?: number;
        diskUsage?: number;
        responseTime?: number;
        errorRate?: number;
        databaseStatus?: 'connected' | 'disconnected';
        storageStatus?: 'connected' | 'disconnected';
        timestamp?: string;
    }> => {
        const res = await api.get('/admin/dashboard/metrics', {
            withCredentials: true,
        });
        return res.data;
    },

    getAllUsers: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ users: User[]; pagination: Pagination }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    getUserById: async (userId: string): Promise<{ user: User }> => {
        const res = await api.get(`/admin/users/${userId}`, {
            withCredentials: true,
        });
        return res.data;
    },

    updateUser: async (
        userId: string,
        data: {
            displayName?: string;
            email?: string;
            bio?: string;
        }
    ): Promise<{ user: User }> => {
        const res = await api.put(`/admin/users/${userId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/admin/users/${userId}`, {
            withCredentials: true,
        });
    },

    banUser: async (userId: string, reason?: string): Promise<{ user: User }> => {
        const res = await api.post(`/admin/users/${userId}/ban`, { reason }, {
            withCredentials: true,
        });
        return res.data;
    },

    unbanUser: async (userId: string): Promise<{ user: User }> => {
        const res = await api.post(`/admin/users/${userId}/unban`, {}, {
            withCredentials: true,
        });
        return res.data;
    },

    getAllImages: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        userId?: string;
    }): Promise<{ images: AdminImage[]; pagination: Pagination }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.userId) queryParams.append('userId', params.userId);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/images?${queryString}` : '/admin/images';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    updateImage: async (imageId: string, updates: {
        location?: string;
        coordinates?: Coordinates | null;
        imageTitle?: string;
        cameraModel?: string;
        imageCategory?: string | null;
    }): Promise<{ image: AdminImage }> => {
        const res = await api.put(`/admin/images/${imageId}`, updates, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteImage: async (imageId: string): Promise<void> => {
        await api.delete(`/admin/images/${imageId}`, {
            withCredentials: true,
        });
    },

    moderateImage: async (imageId: string, status: 'approved' | 'rejected' | 'flagged', notes?: string): Promise<{ image: AdminImage }> => {
        const res = await api.post(`/admin/images/${imageId}/moderate`, { status, notes }, {
            withCredentials: true,
        });
        return res.data;
    },

    // Admin Role Management
    getAllAdminRoles: async (): Promise<{ adminRoles: AdminRole[] }> => {
        const res = await api.get('/admin/roles', {
            withCredentials: true,
        });
        return res.data;
    },

    getAdminRole: async (userId: string): Promise<{ adminRole: AdminRole }> => {
        const res = await api.get(`/admin/roles/${userId}`, {
            withCredentials: true,
        });
        return res.data;
    },

    createAdminRole: async (data: {
        userId: string;
        role?: 'super_admin' | 'admin' | 'moderator';
        permissions?: AdminRolePermissions;
        expiresAt?: string | null; // ISO date string
        active?: boolean;
        allowedIPs?: string[];
    }): Promise<{ adminRole: AdminRole }> => {
        const res = await api.post('/admin/roles', data, {
            withCredentials: true,
        });
        return res.data;
    },

    updateAdminRole: async (
        userId: string,
        data: {
            role?: 'super_admin' | 'admin' | 'moderator';
            permissions?: AdminRolePermissions;
            expiresAt?: string | null; // ISO date string, null to clear
            active?: boolean;
            allowedIPs?: string[]; // Empty array to clear
        }
    ): Promise<{ adminRole: AdminRole }> => {
        const res = await api.put(`/admin/roles/${userId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteAdminRole: async (userId: string): Promise<void> => {
        await api.delete(`/admin/roles/${userId}`, {
            withCredentials: true,
        });
    },

    // Analytics
    getAnalytics: async (days?: number): Promise<AnalyticsData> => {
        const queryParams = new URLSearchParams();
        if (days) queryParams.append('days', days.toString());
        const queryString = queryParams.toString();
        const url = queryString ? `/admin/analytics?${queryString}` : '/admin/analytics';
        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    getRealtimeAnalytics: async (): Promise<{
        usersOnline: number;
        viewsPerSecond: Array<{ second: number; count: number }>;
        mostActivePages: Array<{ path: string; userCount: number }>;
    }> => {
        const res = await api.get('/admin/analytics/realtime', {
            withCredentials: true,
        });
        return res.data;
    },

    trackPageView: async (path: string): Promise<void> => {
        await api.post('/admin/analytics/track', { path }, {
            withCredentials: true,
        });
    },

    // Collections
    getAllCollections: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ collections: unknown[]; pagination: Pagination }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        const queryString = queryParams.toString();
        const url = queryString ? `/admin/collections?${queryString}` : '/admin/collections';
        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    updateCollection: async (collectionId: string, data: {
        name?: string;
        description?: string;
        isPublic?: boolean;
    }): Promise<{ collection: Record<string, unknown> }> => {
        const res = await api.put(`/admin/collections/${collectionId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteCollection: async (collectionId: string): Promise<void> => {
        await api.delete(`/admin/collections/${collectionId}`, {
            withCredentials: true,
        });
    },

    exportData: async (): Promise<Blob> => {
        const res = await api.get('/admin/export', {
            withCredentials: true,
            responseType: 'blob',
        });
        return res.data;
    },

    // Favorites Management
    getAllFavorites: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ favorites: unknown[]; pagination: Pagination }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/favorites?${queryString}` : '/admin/favorites';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteFavorite: async (userId: string, imageId: string): Promise<void> => {
        await api.delete(`/admin/favorites/${userId}/${imageId}`, {
            withCredentials: true,
        });
    },

    // Content Moderation
    getPendingContent: async (): Promise<{ content: unknown[] }> => {
        const res = await api.get('/admin/moderation/pending', {
            withCredentials: true,
        });
        return res.data;
    },

    approveContent: async (contentId: string): Promise<void> => {
        await api.post(`/admin/moderation/${contentId}/approve`, {}, {
            withCredentials: true,
        });
    },

    rejectContent: async (contentId: string, reason?: string): Promise<void> => {
        await api.post(`/admin/moderation/${contentId}/reject`, { reason }, {
            withCredentials: true,
        });
    },

    // System Logs
    getSystemLogs: async (params?: {
        page?: number;
        limit?: number;
        level?: string;
        search?: string;
    }): Promise<{ logs: unknown[]; pagination: Pagination }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.level) queryParams.append('level', params.level);
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/logs?${queryString}` : '/admin/logs';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    // Settings Management - Admin endpoint (requires auth)
    getSettings: async (): Promise<{ settings: Record<string, unknown> }> => {
        // Use admin endpoint to get full settings (requires auth)
        const res = await api.get('/admin/settings', {
            withCredentials: true, // Admin endpoint requires credentials
        });
        return res.data;
    },

    updateSettings: async (settings: Record<string, unknown>): Promise<{ settings: Record<string, unknown> }> => {
        const res = await api.put('/admin/settings', { settings }, {
            withCredentials: true,
        });
        return res.data;
    },

    createSystemAnnouncement: async (data: {
        type: 'system_announcement' | 'feature_update' | 'maintenance_scheduled' | 'terms_updated';
        title: string;
        message: string;
        recipientIds?: string[];
        scheduledDate?: string;
        expirationDate?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        targetRoles?: string[];
    }): Promise<{ success: boolean; message: string; recipientCount: number }> => {
        const res = await api.post('/admin/announcements', data, {
            withCredentials: true,
        });
        return res.data;
    },
};

