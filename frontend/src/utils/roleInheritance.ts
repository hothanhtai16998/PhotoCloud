/**
 * Role inheritance utilities for frontend
 * Matches backend permissionValidator.js logic
 */

// Permissions for moderator role (base role)
const MODERATOR_PERMISSIONS = [
    'viewDashboard',
    'viewAnalytics',
    'viewUsers',
    'viewImages',
    'viewCategories',
    'viewCollections',
    'moderateImages',
    'moderateContent',
    'manageFavorites',
    'viewLogs',
] as const;

// Permissions for admin role (includes all moderator permissions)
const ADMIN_PERMISSIONS = [
    ...MODERATOR_PERMISSIONS,
    'editUsers',
    'deleteUsers',
    'banUsers',
    'unbanUsers',
    'editImages',
    'deleteImages',
    'createCategories',
    'editCategories',
    'deleteCategories',
    'manageCollections',
    'exportData',
    'manageSettings',
    'viewAdmins',
] as const;

/**
 * Get inherited permissions for a role
 * @param role - 'moderator', 'admin', or 'super_admin'
 * @returns Array of inherited permission keys
 */
export const getInheritedPermissions = (role: 'super_admin' | 'admin' | 'moderator'): string[] => {
    switch (role) {
        case 'moderator':
            // Moderator has no inheritance (base role)
            return [];
        case 'admin':
            // Admin inherits all moderator permissions
            return [...MODERATOR_PERMISSIONS];
        case 'super_admin':
            // Super admin inherits all admin permissions (which includes moderator)
            return [...ADMIN_PERMISSIONS];
        default:
            return [];
    }
};

/**
 * Check if a permission is inherited for a role
 * @param role - 'moderator', 'admin', or 'super_admin'
 * @param permission - Permission key to check
 * @returns True if permission is inherited
 */
export const isPermissionInherited = (
    role: 'super_admin' | 'admin' | 'moderator',
    permission: string
): boolean => {
    const inheritedPerms = getInheritedPermissions(role);
    return inheritedPerms.includes(permission);
};

/**
 * Get the role that this permission is inherited from
 * @param role - Current role
 * @param permission - Permission key
 * @returns Role name that provides this permission, or null if not inherited
 */
export const getInheritedFromRole = (
    role: 'super_admin' | 'admin' | 'moderator',
    permission: string
): 'moderator' | 'admin' | null => {
    if (role === 'admin' && MODERATOR_PERMISSIONS.includes(permission as typeof MODERATOR_PERMISSIONS[number])) {
        return 'moderator';
    }
    if (role === 'super_admin') {
        if (MODERATOR_PERMISSIONS.includes(permission as typeof MODERATOR_PERMISSIONS[number])) {
            return 'moderator';
        }
        if (ADMIN_PERMISSIONS.includes(permission as typeof ADMIN_PERMISSIONS[number])) {
            return 'admin';
        }
    }
    return null;
};

