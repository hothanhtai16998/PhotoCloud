import { useMemo } from 'react';
import { useUserStore } from '@/stores/useUserStore';
import type { AdminRolePermissions } from '@/services/adminService';

/**
 * Hook to check user permissions
 * Returns functions to check if user has specific permissions.
 *
 * IMPORTANT: All returned functions and the wrapper object are memoized
 * with useCallback / useMemo. Without this, every parent render would
 * create a new identity for hasPermission/isSuperAdmin/etc., which
 * triggers re-renders in every child that depends on them (and infinite
 * loops in any useEffect that lists them in its deps array). That was
 * the root cause of the admin page feeling "stuck" — the sidebar,
 * header, and tab buttons were all re-rendering on every keystroke.
 */
export function usePermissions(): {
  hasPermission: (permission: keyof AdminRolePermissions) => boolean;
  hasAnyPermission: (permissions: Array<keyof AdminRolePermissions>) => boolean;
  hasAllPermissions: (permissions: Array<keyof AdminRolePermissions>) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  permissions: AdminRolePermissions | null;
} {
  const user = useUserStore((state) => state.user);

  // Memoize all checkers off `user` so identities stay stable across renders.
  // The boolean primitives (isAdmin / isSuperAdmin) are computed up-front so
  // downstream useEffects can list them in deps arrays without re-firing.
  const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin, isSuperAdmin, permissions } = useMemo(() => {
    const isSuperAdmin = user?.isSuperAdmin === true;
    const isAdmin = user?.isAdmin === true || isSuperAdmin;
    const userPermissions = user?.permissions ?? null;

    const hasPermission = (permission: keyof AdminRolePermissions): boolean => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      if (!userPermissions) return false;
      return userPermissions[permission] === true;
    };

    const hasAnyPermission = (perms: Array<keyof AdminRolePermissions>): boolean => {
      return perms.some((p) => hasPermission(p));
    };

    const hasAllPermissions = (perms: Array<keyof AdminRolePermissions>): boolean => {
      return perms.every((p) => hasPermission(p));
    };

    const isAdminFn = () => isAdmin;
    const isSuperAdminFn = () => isSuperAdmin;

    return {
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAdmin: isAdminFn,
      isSuperAdmin: isSuperAdminFn,
      permissions: userPermissions,
    };
    // user is the only thing that should re-create these callbacks
  }, [user]);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isSuperAdmin,
    permissions,
  };
}
