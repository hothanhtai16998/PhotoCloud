import AdminRole from '../models/AdminRole.js';
import User from '../models/User.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * Permission definitions - Granular permissions for fine-grained access control
 */
export const PERMISSIONS = {
    // User Management
    VIEW_USERS: 'viewUsers',
    EDIT_USERS: 'editUsers',
    DELETE_USERS: 'deleteUsers',
    BAN_USERS: 'banUsers',
    UNBAN_USERS: 'unbanUsers',
    
    // Image Management
    VIEW_IMAGES: 'viewImages',
    EDIT_IMAGES: 'editImages',
    DELETE_IMAGES: 'deleteImages',
    MODERATE_IMAGES: 'moderateImages',
    
    // Category Management
    VIEW_CATEGORIES: 'viewCategories',
    CREATE_CATEGORIES: 'createCategories',
    EDIT_CATEGORIES: 'editCategories',
    DELETE_CATEGORIES: 'deleteCategories',
    
    // Admin Management
    VIEW_ADMINS: 'viewAdmins',
    CREATE_ADMINS: 'createAdmins',
    EDIT_ADMINS: 'editAdmins',
    DELETE_ADMINS: 'deleteAdmins',
    
    // Dashboard & Analytics
    VIEW_DASHBOARD: 'viewDashboard',
    VIEW_ANALYTICS: 'viewAnalytics',
    
    // Collections (if applicable)
    VIEW_COLLECTIONS: 'viewCollections',
    MANAGE_COLLECTIONS: 'manageCollections',
    
    // Favorites Management
    MANAGE_FAVORITES: 'manageFavorites',
    
    // Content Moderation (general)
    MODERATE_CONTENT: 'moderateContent',
    
    // System & Logs
    VIEW_LOGS: 'viewLogs',
    EXPORT_DATA: 'exportData',
    MANAGE_SETTINGS: 'manageSettings',
};

/**
 * Check if user has a specific permission
 * Uses AdminRole as single source of truth
 */
export const hasPermission = async (userId, permission, clientIP = null) => {
    // Compute admin status from AdminRole (uses cache internally)
    const { computeAdminStatus } = await import('../utils/adminUtils.js');
    const { isSuperAdmin, adminRole, validation } = await computeAdminStatus(userId, clientIP);
    
    // If role is invalid (expired, inactive, or IP restricted), no permissions
    if (!validation || !validation.valid || !adminRole) {
        return false;
    }
    
    // Super admin has all permissions
    if (isSuperAdmin) {
        return true;
    }

    // No admin role means no permissions
    if (!adminRole) {
        return false;
    }

    // Super admin role has all permissions
    if (adminRole.role === 'super_admin') {
        return true;
    }

    // Check specific permission
    return adminRole.permissions[permission] === true;
};

/**
 * Middleware to check if user has a specific permission
 * Must be used after protectedRoute middleware
 * Uses AdminRole as single source of truth
 */
export const requirePermission = (permission) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required',
            });
        }

        // Use computed admin status from authMiddleware (based on AdminRole)
        // If not computed yet, compute it now
        if (req.user.isSuperAdmin === undefined || req.user.isAdmin === undefined) {
            const { computeAdminStatus } = await import('../utils/adminUtils.js');
            const clientIP = req.clientIP || null;
            const { isAdmin, isSuperAdmin, adminRole } = await computeAdminStatus(req.user._id, clientIP);
            req.user.isAdmin = isAdmin;
            req.user.isSuperAdmin = isSuperAdmin;
            if (adminRole) {
                req.adminRole = adminRole;
                req.user._adminRole = adminRole;
            }
        }

        // Super admin has all permissions
        if (req.user.isSuperAdmin) {
            return next();
        }

        // Check admin role
        const adminRole = req.adminRole || req.user._adminRole;
        
        if (!adminRole) {
            return res.status(403).json({
                message: 'Admin access required',
            });
        }

        // Check if role is valid (for time-based permissions)
        const { isAdminRoleValid } = await import('../utils/adminUtils.js');
        const clientIP = req.clientIP || null;
        const validation = isAdminRoleValid(adminRole, clientIP);
        
        if (!validation.valid) {
            return res.status(403).json({
                message: `Permission denied: ${validation.reason || 'Admin role is invalid'}`,
            });
        }

        // Super admin role has all permissions
        if (adminRole.role === 'super_admin') {
            return next();
        }

        // Check specific permission
        const hasPerm = adminRole.permissions[permission] === true;
        
        if (!hasPerm) {
            return res.status(403).json({
                message: `Permission denied: ${permission} required`,
            });
        }

        // Attach admin role to request for use in controllers
        req.adminRole = adminRole;
        next();
    });
};

/**
 * Middleware to check if user is super admin
 * Uses AdminRole as single source of truth
 */
export const requireSuperAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required',
        });
    }

    // Use computed admin status from authMiddleware (based on AdminRole)
    // If not computed yet, compute it now
    if (req.user.isSuperAdmin === undefined) {
        const { computeAdminStatus } = await import('../utils/adminUtils.js');
        const clientIP = req.clientIP || null;
        const { isSuperAdmin, adminRole } = await computeAdminStatus(req.user._id, clientIP);
        req.user.isSuperAdmin = isSuperAdmin;
        if (adminRole) {
            req.adminRole = adminRole;
            req.user._adminRole = adminRole;
        }
    }

    if (!req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Super admin access required',
        });
    }

    // Ensure adminRole is attached
    if (!req.adminRole && req.user._adminRole) {
        req.adminRole = req.user._adminRole;
    }

    next();
});

