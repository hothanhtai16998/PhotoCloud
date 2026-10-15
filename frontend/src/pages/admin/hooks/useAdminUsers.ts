import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { adminService, type User } from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';

interface Pagination {
  page: number;
  pages: number;
  total: number;
  totalPages?: number;
}

interface UseAdminUsersReturn {
  users: User[];
  pagination: Pagination;
  search: string;
  loading: boolean;
  editingUser: User | null;
  setSearch: (search: string) => void;
  setEditingUser: (user: User | null) => void;
  loadUsers: (page?: number) => Promise<void>;
  deleteUser: (userId: string, username: string) => Promise<boolean>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

/**
 * Custom hook for managing admin users functionality.
 * Encapsulates all user-related state and operations for the admin panel.
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const { hasPermission, isSuperAdmin } = usePermissions();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Track mounted state so async loaders don't call setState after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadUsers = useCallback(
    async (page = 1) => {
      // Check permission before API call
      if (!isSuperAdmin() && !hasPermission('viewUsers')) {
        toast.error('Bạn không có quyền xem người dùng');
        return;
      }

      try {
        setLoading(true);
        const response = await adminService.getAllUsers({
          page,
          limit: 20,
          search: search || undefined,
        });
        if (!mountedRef.current) return;
        // Defensive: response shape may vary (raw body or wrapped). Accept both.
        const data = (response as any)?.data ?? response;
        const userList = data?.users ?? data?.data?.users ?? [];
        const pag = data?.pagination ?? data?.data?.pagination ?? { page: 1, pages: 1, total: 0 };
        setUsers(Array.isArray(userList) ? userList : []);
        setPagination(pag);
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        const msg = axiosError.response?.data?.message || 'Failed to load users';
        // Suppress noisy toast for auth errors — user is being signed out anyway.
        if (axiosError.response?.status !== 401 && axiosError.response?.status !== 403) {
          toast.error(msg);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [search, hasPermission, isSuperAdmin]
  );

  const deleteUser = useCallback(
    async (userId: string, _username: string): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('deleteUsers')) {
        toast.error('Bạn không có quyền xóa người dùng');
        return false;
      }

      // Note: Confirmation is now handled by the modal in AdminUsers component
      // This function is called after confirmation
      try {
        await adminService.deleteUser(userId);
        toast.success('Xoá người dùng thành công');
        await loadUsers(pagination.page);
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi xoá người dùng'
        );
        return false;
      }
    },
    [hasPermission, isSuperAdmin, loadUsers, pagination.page]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>): Promise<boolean> => {
      // Check permission before action
      if (!isSuperAdmin() && !hasPermission('editUsers')) {
        toast.error('Bạn không có quyền chỉnh sửa người dùng');
        return false;
      }

      try {
        await adminService.updateUser(userId, updates);
        toast.success('Cập nhật thông tin người dùng thành công');
        setEditingUser(null);
        await loadUsers(pagination.page);
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Failed to update user'
        );
        return false;
      }
    },
    [hasPermission, isSuperAdmin, loadUsers, pagination.page]
  );

  return {
    users,
    pagination,
    search,
    loading,
    editingUser,
    setSearch,
    setEditingUser,
    loadUsers,
    deleteUser,
    updateUser,
  };
}
