import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  adminService,
  type AdminRole,
  type AdminRolePermissions,
} from '@/services/adminService';
import { usePermissions } from '@/hooks/usePermissions';

interface UseAdminRolesReturn {
  adminRoles: AdminRole[];
  loading: boolean;
  editingRole: AdminRole | null;
  creatingRole: boolean;
  setEditingRole: (role: AdminRole | null) => void;
  setCreatingRole: (creating: boolean) => void;
  loadAdminRoles: (
    loadUsersCallback?: (page: number) => Promise<void>,
    usersLength?: number
  ) => Promise<void>;
  createRole: (
    data: CreateRoleData,
    loadUsersCallback?: (page: number) => Promise<void>,
    usersPage?: number
  ) => Promise<boolean>;
  updateRole: (userId: string, updates: UpdateRoleData) => Promise<boolean>;
  deleteRole: (
    userId: string,
    username: string,
    loadUsersCallback?: (page: number) => Promise<void>,
    usersPage?: number
  ) => Promise<boolean>;
}

interface CreateRoleData {
  userId: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: AdminRolePermissions;
  expiresAt?: string | null;
  active?: boolean;
  allowedIPs?: string[];
}

interface UpdateRoleData {
  role?: 'super_admin' | 'admin' | 'moderator';
  permissions?: AdminRolePermissions;
  expiresAt?: string | null;
  active?: boolean;
  allowedIPs?: string[];
}

/**
 * Custom hook for managing admin roles functionality.
 * Encapsulates all role-related state and operations for the admin panel.
 */
export function useAdminRoles(): UseAdminRolesReturn {
  const { isSuperAdmin } = usePermissions();

  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);

  // Mounted ref so async loaders don't call setState after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadAdminRoles = useCallback(
    async (
      loadUsersCallback?: (page: number) => Promise<void>,
      usersLength?: number
    ) => {
      if (!isSuperAdmin()) return;

      try {
        setLoading(true);
        const response = await adminService.getAllAdminRoles();
        if (!mountedRef.current) return;
        // Defensive: accept both raw body and wrapped shapes
        const data = (response as any)?.data ?? response;
        const list = data?.adminRoles ?? data?.data?.adminRoles ?? [];
        setAdminRoles(Array.isArray(list) ? list : []);

        // Also load users if not already loaded (for create role modal)
        if (usersLength === 0 && loadUsersCallback) {
          await loadUsersCallback(1);
        }
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        const msg = axiosError.response?.data?.message || 'Lỗi khi lấy danh sách quyền admin';
        if (axiosError.response?.status !== 401 && axiosError.response?.status !== 403) {
          toast.error(msg);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [isSuperAdmin]
  );

  const createRole = useCallback(
    async (
      data: CreateRoleData,
      loadUsersCallback?: (page: number) => Promise<void>,
      usersPage?: number
    ): Promise<boolean> => {
      try {
        await adminService.createAdminRole(data);
        toast.success('Quyền admin đã được tạo thành công');
        setCreatingRole(false);
        await loadAdminRoles();
        if (loadUsersCallback && usersPage) {
          await loadUsersCallback(usersPage);
        }
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi tạo quyền admin'
        );
        return false;
      }
    },
    [loadAdminRoles]
  );

  const updateRole = useCallback(
    async (userId: string, updates: UpdateRoleData): Promise<boolean> => {
      try {
        await adminService.updateAdminRole(userId, updates);
        toast.success('Quyền admin đã được cập nhật thành công');
        setEditingRole(null);
        await loadAdminRoles();
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi cập nhật quyền admin'
        );
        return false;
      }
    },
    [loadAdminRoles]
  );

  const deleteRole = useCallback(
    async (
      userId: string,
      _username: string,
      loadUsersCallback?: (page: number) => Promise<void>,
      usersPage?: number
    ): Promise<boolean> => {
      // Note: Confirmation is now handled by the modal in AdminRoles component
      // This function is called after confirmation
      try {
        await adminService.deleteAdminRole(userId);
        toast.success('Quyền admin đã được xoá thành công');
        await loadAdminRoles();
        if (loadUsersCallback && usersPage) {
          await loadUsersCallback(usersPage);
        }
        return true;
      } catch (error: unknown) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
        };
        toast.error(
          axiosError.response?.data?.message || 'Lỗi khi xoá quyền admin'
        );
        return false;
      }
    },
    [loadAdminRoles]
  );

  return {
    adminRoles,
    loading,
    editingRole,
    creatingRole,
    setEditingRole,
    setCreatingRole,
    loadAdminRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}
