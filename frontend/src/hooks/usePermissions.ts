import { useUserStore } from '@/stores/useUserStore';
import type { AdminRolePermissions } from '@/services/adminService';

/**
 * Hook to check user permissions
 * Returns functions to check if user has specific permissions
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

    /**
     * Check if user has a specific permission
     * Super admins have all permissions
     */
    const hasPermission = (permission: keyof AdminRolePermissions): boolean => {
        if (!user) return false;
        
        // Super admin has all permissions
        if (user.isSuperAdmin) return true;
        
        // If no permissions object, user has no permissions
        if (!user.permissions) return false;
        
        // Check specific permission
        return user.permissions[permission] === true;
    };

    /**
     * Check if user has any of the specified permissions
     */
    const hasAnyPermission = (permissions: Array<keyof AdminRolePermissions>): boolean => {
        return permissions.some(perm => hasPermission(perm));
    };

    /**
     * Check if user has all of the specified permissions
     */
    const hasAllPermissions = (permissions: Array<keyof AdminRolePermissions>): boolean => {
        return permissions.every(perm => hasPermission(perm));
    };

    /**
     * Check if user is admin (has any admin role)
     */
    const isAdmin = (): boolean => {
        return user?.isAdmin === true || user?.isSuperAdmin === true;
    };

    /**
     * Check if user is super admin
     */
    const isSuperAdmin = (): boolean => {
        return user?.isSuperAdmin === true;
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        isSuperAdmin,
        permissions: user?.permissions ?? null,
    };
}

