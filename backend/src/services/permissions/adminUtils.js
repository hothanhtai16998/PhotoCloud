import { isIPAllowed } from '../../utils/ipAccessRules.js';
import AdminRole from '../../models/AdminRole.js';
import {
  getCachedPermissions,
  setCachedPermissions,
} from '../cache/permissionCache.js';

/**
 * Compute admin status from AdminRole
 * This unifies the permission system - AdminRole is the single source of truth
 * Now includes caching for performance
 *
 * @param {string|Object} userId - User ID or User object
 * @param {string} clientIP - Optional client IP address for IP restriction checks
 * @returns {Promise<{isAdmin: boolean, isSuperAdmin: boolean, adminRole: Object|null, validation?: Object}>}
 */
export const computeAdminStatus = async (userId, clientIP = null) => {
  const userIdStr =
    typeof userId === 'object'
      ? userId._id?.toString() || userId.toString()
      : userId.toString();

  // Try to get from cache first
  const cached = getCachedPermissions(userIdStr, clientIP);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const adminRole = await AdminRole.findOne({ userId: userIdStr }).lean();

  let result;

  if (!adminRole) {
    result = {
      isAdmin: false,
      isSuperAdmin: false,
      adminRole: null,
      validation: { valid: false, reason: 'No admin role found' },
    };
  } else {
    // Check if role is valid (for time-based permissions)
    const validation = isAdminRoleValid(adminRole, clientIP);

    if (!validation.valid) {
      result = {
        isAdmin: false,
        isSuperAdmin: false,
        adminRole: null,
        validation,
      };
    } else {
      // Super admin role has all permissions
      const isSuperAdmin = adminRole.role === 'super_admin';

      // User is admin if they have any valid admin role
      const isAdmin = true;

      result = {
        isAdmin,
        isSuperAdmin,
        adminRole,
        validation,
      };
    }
  }

  // Cache the result (cache for 5 minutes)
  setCachedPermissions(userIdStr, result, clientIP);

  return result;
};

/**
 * Check if admin role is currently valid (not expired, active, IP allowed)
 * @param {Object} adminRole - AdminRole document
 * @param {string} clientIP - Client IP address (optional, for IP restriction check)
 * @returns {{valid: boolean, reason: string|null}} Validation result
 */
export const isAdminRoleValid = (adminRole, clientIP = null) => {
  if (!adminRole) {
    return { valid: false, reason: 'No admin role found' };
  }

  // Check if role is active
  if (adminRole.active === false) {
    return { valid: false, reason: 'Admin role is inactive' };
  }

  // Check if role has expired
  if (adminRole.expiresAt && new Date(adminRole.expiresAt) < new Date()) {
    return { valid: false, reason: 'Admin role has expired' };
  }

  // Check IP restrictions if client IP is provided
  if (clientIP && adminRole.allowedIPs && adminRole.allowedIPs.length > 0) {
    if (!isIPAllowed(clientIP, adminRole.allowedIPs)) {
      return { valid: false, reason: 'Access denied from this IP address' };
    }
  }

  return { valid: true, reason: null };
};

/**
 * Enrich user object with computed admin status from AdminRole
 * Now includes caching for performance
 *
 * @param {Object} user - User object
 * @param {string} clientIP - Optional client IP address for IP restriction checks
 * @returns {Promise<Object>} User object with computed isAdmin and isSuperAdmin
 */
export const enrichUserWithAdminStatus = async (user, clientIP = null) => {
  if (!user || !user._id) {
    return user;
  }

  const { isAdmin, isSuperAdmin, adminRole, validation } =
    await computeAdminStatus(user._id, clientIP);

  // Extract permissions from adminRole for frontend use
  const permissions = adminRole?.permissions || null;

  return {
    ...user,
    isAdmin,
    isSuperAdmin,
    // Attach permissions for frontend permission checks
    permissions: permissions,
    // Attach adminRole for use in controllers/middleware
    _adminRole: adminRole,
    // Attach validation info
    _adminRoleValidation: validation,
  };
};
