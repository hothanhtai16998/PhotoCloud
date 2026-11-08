import { computeAdminStatus } from './adminUtils.js';

/** Resolve missing computed flags once; leave existing role/flag decisions intact. */
export async function ensureRequestAdminStatus(req) {
    if (req.user.isSuperAdmin !== undefined && req.user.isAdmin !== undefined) return;
    const { isAdmin, isSuperAdmin, adminRole } = await computeAdminStatus(req.user._id, req.clientIP || null);
    req.user.isAdmin = isAdmin;
    req.user.isSuperAdmin = isSuperAdmin;
    if (adminRole) req.adminRole = adminRole;
    return adminRole;
}
