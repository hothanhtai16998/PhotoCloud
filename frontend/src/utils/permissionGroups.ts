import type { AdminRolePermissions } from '@/services/adminService';

/**
 * Permission groups for better organization in UI
 * Note: Labels are translated in components using t() function
 */
export const PERMISSION_GROUPS = [
    {
        labelKey: 'manageUsers',
        permissions: [
            { key: 'viewUsers' },
            { key: 'editUsers' },
            { key: 'deleteUsers' },
            { key: 'banUsers' },
            { key: 'unbanUsers' },
        ],
    },
    {
        labelKey: 'manageImages',
        permissions: [
            { key: 'viewImages' },
            { key: 'editImages' },
            { key: 'deleteImages' },
            { key: 'moderateImages' },
        ],
    },
    {
        labelKey: 'manageCategories',
        permissions: [
            { key: 'viewCategories' },
            { key: 'createCategories' },
            { key: 'editCategories' },
            { key: 'deleteCategories' },
        ],
    },
    {
        labelKey: 'manageAdmins',
        permissions: [
            { key: 'viewAdmins' },
            { key: 'createAdmins' },
            { key: 'editAdmins' },
            { key: 'deleteAdmins' },
        ],
    },
    {
        labelKey: 'dashboardAnalytics',
        permissions: [
            { key: 'viewDashboard' },
            { key: 'viewAnalytics' },
        ],
    },
    {
        labelKey: 'collections',
        permissions: [
            { key: 'viewCollections' },
            { key: 'manageCollections' },
        ],
    },
    {
        labelKey: 'favorites',
        permissions: [
            { key: 'manageFavorites' },
        ],
    },
    {
        labelKey: 'moderation',
        permissions: [
            { key: 'moderateContent' },
        ],
    },
    {
        labelKey: 'systemLogs',
        permissions: [
            { key: 'viewLogs' },
            { key: 'exportData' },
            { key: 'manageSettings' },
        ],
    },
] as const;

/**
 * Get all permission keys as a flat object for default state
 */
export const getAllPermissionKeys = (): AdminRolePermissions => {
    const allPermissions: AdminRolePermissions = {};
    
    PERMISSION_GROUPS.forEach(group => {
        group.permissions.forEach(perm => {
            allPermissions[perm.key as keyof AdminRolePermissions] = perm.key === 'viewDashboard' ? true : false;
        });
    });
    
    return allPermissions;
};

