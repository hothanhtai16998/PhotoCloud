/**
 * Role-based permission constraints
 * Defines what permissions each role can have
 */

// Permissions allowed for moderator role
const MODERATOR_ALLOWED_PERMISSIONS = [
    // Dashboard & Analytics
    'viewDashboard',
    'viewAnalytics',
    
    // View-only permissions
    'viewUsers',
    'viewImages',
    'viewCategories',
    'viewCollections',
    
    // Moderation permissions
    'moderateImages',
    'moderateContent',
    
    // Favorites (for moderation purposes)
    'manageFavorites',
    
    // View logs (to see moderation history)
    'viewLogs',
];

// Permissions allowed for admin role (includes all moderator permissions)
const ADMIN_ALLOWED_PERMISSIONS = [
    ...MODERATOR_ALLOWED_PERMISSIONS,
    
    // User Management
    'editUsers',
    'deleteUsers',
    'banUsers',
    'unbanUsers',
    
    // Image Management
    'editImages',
    'deleteImages',
    
    // Category Management
    'createCategories',
    'editCategories',
    'deleteCategories',
    
    // Collection Management
    'manageCollections',
    
    // System permissions
    'exportData',
    'manageSettings',
    
    // View admin roles (but not create/edit/delete)
    'viewAdmins',
];

// Super admin has all permissions (no restrictions)
// This is handled in the middleware, so we don't need to list them here

/**
 * Get allowed permissions for a role
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @returns {string[]} Array of allowed permission keys
 */
export const getAllowedPermissions = (role) => {
    switch (role) {
        case 'moderator':
            return [...MODERATOR_ALLOWED_PERMISSIONS];
        case 'admin':
            return [...ADMIN_ALLOWED_PERMISSIONS];
        case 'super_admin':
            // Super admin has all permissions - return all possible permissions
            return [
                // User Management
                'viewUsers',
                'editUsers',
                'deleteUsers',
                'banUsers',
                'unbanUsers',
                
                // Image Management
                'viewImages',
                'editImages',
                'deleteImages',
                'moderateImages',
                
                // Category Management
                'viewCategories',
                'createCategories',
                'editCategories',
                'deleteCategories',
                
                // Admin Management
                'viewAdmins',
                'createAdmins',
                'editAdmins',
                'deleteAdmins',
                
                // Dashboard & Analytics
                'viewDashboard',
                'viewAnalytics',
                
                // Collections
                'viewCollections',
                'manageCollections',
                
                // Favorites Management
                'manageFavorites',
                
                // Content Moderation
                'moderateContent',
                
                // System & Logs
                'viewLogs',
                'exportData',
                'manageSettings',
            ];
        default:
            return [];
    }
};

/**
 * Check if a permission is allowed for a role
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @param {string} permission - Permission key to check
 * @returns {boolean} True if permission is allowed for the role
 */
export const isPermissionAllowedForRole = (role, permission) => {
    if (role === 'super_admin') {
        return true; // Super admin has all permissions
    }
    
    const allowedPermissions = getAllowedPermissions(role);
    return allowedPermissions.includes(permission);
};

/**
 * Validate permissions against role constraints
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @param {Object} permissions - Permissions object (e.g., { viewUsers: true, deleteUsers: false })
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export const validatePermissionsForRole = (role, permissions) => {
    const errors = [];
    
    // Super admin has no restrictions
    if (role === 'super_admin') {
        return { valid: true, errors: [] };
    }
    
    // Get allowed permissions for the role
    const allowedPermissions = getAllowedPermissions(role);
    
    // Check each permission that is set to true
    for (const [permission, value] of Object.entries(permissions)) {
        // Only check permissions that are explicitly set to true
        if (value === true) {
            if (!isPermissionAllowedForRole(role, permission)) {
                errors.push(
                    `Permission '${permission}' is not allowed for role '${role}'. ` +
                    `Allowed permissions for ${role}: ${allowedPermissions.join(', ')}`
                );
            }
        }
    }
    
    // Special validation: Admin management permissions
    if (role !== 'super_admin') {
        const adminManagementPerms = ['createAdmins', 'editAdmins', 'deleteAdmins'];
        for (const perm of adminManagementPerms) {
            if (permissions[perm] === true) {
                errors.push(
                    `Permission '${perm}' is only allowed for super_admin role. ` +
                    `Regular admins and moderators cannot manage admin roles.`
                );
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Get inherited permissions for a role (permissions inherited from lower roles)
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @returns {string[]} Array of inherited permission keys
 */
export const getInheritedPermissions = (role) => {
    switch (role) {
        case 'moderator':
            // Moderator has no inheritance (base role)
            return [];
        case 'admin':
            // Admin inherits all moderator permissions
            return [...MODERATOR_ALLOWED_PERMISSIONS];
        case 'super_admin':
            // Super admin inherits all admin permissions (which includes moderator)
            return [...ADMIN_ALLOWED_PERMISSIONS];
        default:
            return [];
    }
};

/**
 * Apply role inheritance to permissions object
 * Automatically sets inherited permissions to true
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @param {Object} permissions - Permissions object (may be partial)
 * @returns {Object} Permissions object with inherited permissions applied
 */
export const applyRoleInheritance = (role, permissions = {}) => {
    const inheritedPerms = getInheritedPermissions(role);
    const result = { ...permissions };
    
    // Set all inherited permissions to true
    inheritedPerms.forEach(perm => {
        result[perm] = true;
    });
    
    return result;
};

/**
 * Get a human-readable description of role permissions
 * @param {string} role - 'moderator', 'admin', or 'super_admin'
 * @returns {string} Description of what the role can do
 */
export const getRoleDescription = (role) => {
    switch (role) {
        case 'moderator':
            return 'Moderators can view content, moderate images and content, and view logs. They cannot modify users, delete content, or manage system settings.';
        case 'admin':
            return 'Admins have full content management permissions including user management, content deletion, and system settings. They cannot create, edit, or delete admin roles.';
        case 'super_admin':
            return 'Super admins have all permissions including full admin role management.';
        default:
            return 'Unknown role';
    }
};

