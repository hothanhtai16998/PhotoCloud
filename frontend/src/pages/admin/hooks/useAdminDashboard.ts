import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { adminService, type DashboardStats } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';

interface UseAdminDashboardReturn {
  stats: DashboardStats | null;
  loading: boolean;
  loadDashboardStats: () => Promise<void>;
}

/**
 * Custom hook for managing admin dashboard stats.
 * Encapsulates dashboard-related state and operations for the admin panel.
 */
export function useAdminDashboard(): UseAdminDashboardReturn {
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboardStats = useCallback(async () => {
    // Check permission before API call
    if (!isSuperAdmin() && !hasPermission('viewDashboard')) {
      toast.error('Bạn không có quyền xem bảng điều khiển');
      return;
    }

    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError.response?.data?.message || 'Failed to load dashboard stats'
      );
    } finally {
      setLoading(false);
    }
  }, [hasPermission, isSuperAdmin]);

  return {
    stats,
    loading,
    loadDashboardStats,
  };
}
