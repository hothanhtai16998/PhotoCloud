import { adminText } from '@/pages/admin/adminLocale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { adminService, type AdminRole } from '@/services/adminService';
import { useUserStore } from '@/stores/useUserStore';
import { useAdminResource, adminError } from './useAdminResource';

export type RoleCreateData = Parameters<typeof adminService.createAdminRole>[0];
export type RoleUpdateData = Parameters<typeof adminService.updateAdminRole>[1];
export function useAdminRoles() {
  const account = useUserStore(s => s.user?._id);
  const loader = useCallback(async () => {
    const result = await adminService.getAllAdminRoles();
    if (!Array.isArray(result.adminRoles)) throw new Error('Invalid roles response');
    return { roles: result.adminRoles, account };
  }, [account]);
  const { data, loading, error, reload } = useAdminResource(loader);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (operation: () => Promise<unknown>, message: string) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true);
    const stillCurrent = () => mounted.current && useUserStore.getState().user?._id === account;
    try {
      await operation();
      if (!stillCurrent()) return false;
      toast.success(message);
      await reload();
      return stillCurrent();
    } catch (cause) {
      if (stillCurrent()) toast.error(adminError(cause));
      return false;
    } finally {
      lock.current = false;
      if (stillCurrent()) setBusy(false);
    }
  };
  return {
    adminRoles: data && data.account === account ? data.roles : [], loading, error, busy,
    editingRole, creatingRole, setEditingRole, setCreatingRole, loadAdminRoles: reload,
    createRole: async (value: RoleCreateData) => {
      const ok = await run(() => adminService.createAdminRole(value), adminText("Đã thêm quyền quản trị."));
      if (ok) setCreatingRole(false);
      return ok;
    },
    updateRole: async (id: string, value: RoleUpdateData) => {
      const ok = await run(() => adminService.updateAdminRole(id, value), adminText("Đã cập nhật quyền quản trị."));
      if (ok) setEditingRole(null);
      return ok;
    },
    deleteRole: (id: string, _name: string) => run(() => adminService.deleteAdminRole(id), adminText("Đã thu hồi quyền quản trị.")),
  };
}
