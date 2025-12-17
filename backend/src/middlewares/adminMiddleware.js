import { asyncHandler } from './asyncHandler.js';

/**
 * Middleware to protect admin routes
 * Must be used after protectedRoute middleware
 * Checks if user is super admin or has an admin role
 * Uses AdminRole as single source of truth (computed in authMiddleware)
 */
export const adminRoute = asyncHandler(async (req, res, next) => {
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
        }
    }

    // Check if user is admin (computed from AdminRole)
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Admin access required',
        });
    }

    // Attach admin role to request if not already attached
    if (!req.adminRole && req.user._adminRole) {
        req.adminRole = req.user._adminRole;
    }

    next();
});

