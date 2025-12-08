import type { User } from './user';

// Re-export admin types from adminService for convenience
export type { AdminRolePermissions, AdminRole } from '@/services/adminService';

export interface DashboardStats {
  stats: {
    totalUsers: number;
    totalImages: number;
    categoryStats: Array<{ _id: string; count: number }>;
  };
  recentUsers: User[];
  recentImages: AdminImage[];
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

export interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  users: {
    total: number;
    new: number;
    banned: number;
  };
  images: {
    total: number;
    new: number;
    moderated: number;
    pendingModeration: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
  categories: Array<{
    _id: string;
    name: string;
    count: number;
  }>;
  dailyUploads: Array<{
    _id: string;
    count: number;
  }>;
  dailyUsers: Array<{
    _id: string;
    count: number;
  }>;
  dailyUsersComparison?: Array<{
    _id: string;
    count: number;
  }>;
  dailyPending: Array<{
    _id: string;
    count: number;
  }>;
  dailyPendingComparison?: Array<{
    _id: string;
    count: number;
  }>;
  dailyApproved?: Array<{
    _id: string;
    count: number;
  }>;
  dailyApprovedComparison?: Array<{
    _id: string;
    count: number;
  }>;
  dailyUploadsComparison?: Array<{
    _id: string;
    count: number;
  }>;
  topUploaders?: Array<{
    userId: string;
    username: string;
    displayName: string;
    uploadCount: number;
  }>;
  viewsOverTime?: Array<{
    date: string;
    value: number;
  }>;
  downloadsOverTime?: Array<{
    date: string;
    value: number;
  }>;
  totalViews?: number;
  totalDownloads?: number;
}

export interface RealtimeAnalyticsResponse {
  usersOnline: number;
  viewsPerSecond: Array<{ second: number; count: number }>;
  mostActivePages: Array<{ path: string; userCount: number }>;
}

export interface GetUsersResponse {
  users: User[];
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface GetUserResponse {
  user: User;
}

export interface UpdateUserResponse {
  user: User;
}

export interface GetAllCollectionsResponse {
  collections: Array<{
    _id: string;
    name: string;
    description?: string;
    createdBy: {
      _id: string;
      username: string;
      displayName: string;
    };
    images: string[];
    isPublic: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface GetAllFavoritesResponse {
  favorites: Array<{
    _id: string;
    user: {
      _id: string;
      displayName?: string;
      username?: string;
      email?: string;
    };
    image: {
      _id: string;
      imageTitle?: string;
    };
    createdAt: string;
  }>;
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
}

export interface GetSystemLogsResponse {
  logs: Array<{
    _id: string;
    timestamp: string;
    level?: string;
    message: string;
    userId?: string | { displayName?: string; username?: string };
  }>;
}

export interface GetPendingContentResponse {
  content: Array<{
    _id: string;
    title?: string;
    content?: string;
    uploadedBy?: { displayName?: string; username?: string };
    status?: string;
    createdAt: string;
  }>;
}

export interface GetSettingsResponse {
  settings: {
    siteName?: string;
    siteDescription?: string;
    maxUploadSize?: number;
    allowedFileTypes?: string[] | string;
    maintenanceMode?: boolean;
  };
}

