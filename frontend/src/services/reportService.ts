import api from '@/lib/axios';

export type ReportType = 'image' | 'collection' | 'user';
export type ReportReason = 
    | 'inappropriate_content'
    | 'spam'
    | 'copyright_violation'
    | 'harassment'
    | 'fake_account'
    | 'other';

export interface Report {
    _id: string;
    reporter: string;
    type: ReportType;
    targetId: string;
    reason: ReportReason;
    description?: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    reviewedBy?: string;
    reviewedAt?: string;
    resolution?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReportData {
    type: ReportType;
    targetId: string;
    reason: ReportReason;
    description?: string;
}

export interface ReportResponse {
    success: boolean;
    message?: string;
    report?: Report;
    reports?: Report[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const reportService = {
    /**
     * Create a report
     */
    createReport: async (data: CreateReportData): Promise<Report> => {
        const response = await api.post<ReportResponse>('/reports', data, {
            withCredentials: true,
        });
        if (response.data.success && response.data.report) {
            return response.data.report;
        }
        throw new Error(response.data.message || 'Failed to create report');
    },

    /**
     * Get user's reports
     */
    getUserReports: async (params?: {
        page?: number;
        limit?: number;
    }): Promise<{ reports: Report[]; pagination: Record<string, unknown> }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `/reports?${queryString}` : '/reports';

        const response = await api.get<ReportResponse>(url, {
            withCredentials: true,
        });
        if (response.data.success && response.data.reports) {
            return {
                reports: response.data.reports,
                pagination: response.data.pagination || {},
            };
        }
        throw new Error('Failed to fetch reports');
    },

    /**
     * Get all reports (admin only)
     */
    getAllReports: async (params?: {
        status?: string;
        type?: string;
        page?: number;
        limit?: number;
    }): Promise<{ reports: Report[]; pagination: Record<string, unknown> }> => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.type) queryParams.append('type', params.type);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `/reports/admin?${queryString}` : '/reports/admin';

        const response = await api.get<ReportResponse>(url, {
            withCredentials: true,
        });
        if (response.data.success && response.data.reports) {
            return {
                reports: response.data.reports,
                pagination: response.data.pagination || {},
            };
        }
        throw new Error('Failed to fetch reports');
    },

    /**
     * Update report status (admin only)
     */
    updateReportStatus: async (
        reportId: string,
        status: 'pending' | 'reviewing' | 'resolved' | 'dismissed',
        resolution?: string
    ): Promise<Report> => {
        const response = await api.patch<ReportResponse>(
            `/reports/admin/${reportId}`,
            { status, resolution },
            { withCredentials: true }
        );
        if (response.data.success && response.data.report) {
            return response.data.report;
        }
        throw new Error(response.data.message || 'Failed to update report');
    },
};

