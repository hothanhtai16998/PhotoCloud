import AdminRole from '../models/AdminRole.js';
import { getCachedPermissions, setCachedPermissions } from './permissionCache.js';

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
    const userIdStr = typeof userId === 'object' ? userId._id?.toString() || userId.toString() : userId.toString();
    
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
 * Check if IP address matches allowed IPs (supports CIDR notation)
 * @param {string} ip - IP address to check
 * @param {string[]} allowedIPs - Array of allowed IP addresses or CIDR ranges
 * @returns {boolean} True if IP is allowed
 */
const isIPAllowed = (ip, allowedIPs) => {
    if (!allowedIPs || allowedIPs.length === 0) {
        return true; // No restrictions means all IPs allowed
    }
    
    // Normalize IP (remove port if present)
    const normalizedIP = ip.split(':')[0].split(']')[0]; // Handle IPv6 with port
    
    for (const allowedIP of allowedIPs) {
        if (!allowedIP) continue;
        
        // Exact match
        if (allowedIP === normalizedIP) {
            return true;
        }
        
        // CIDR notation check
        if (allowedIP.includes('/')) {
            if (isIPInCIDR(normalizedIP, allowedIP)) {
                return true;
            }
        }
    }
    
    return false;
};

/**
 * Check if IP is within CIDR range (basic implementation)
 * @param {string} ip - IP address
 * @param {string} cidr - CIDR notation (e.g., "192.168.1.0/24")
 * @returns {boolean} True if IP is in CIDR range
 */
const isIPInCIDR = (ip, cidr) => {
    try {
        const [network, prefixLength] = cidr.split('/');
        const prefix = parseInt(prefixLength, 10);
        
        // IPv4 CIDR
        if (ip.includes('.') && network.includes('.')) {
            const ipParts = ip.split('.').map(Number);
            const networkParts = network.split('.').map(Number);
            
            if (ipParts.length !== 4 || networkParts.length !== 4) {
                return false;
            }
            
            // Convert to 32-bit integer
            const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
            const networkNum = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
            const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
            
            return (ipNum & mask) === (networkNum & mask);
        }
        
        // For IPv6, use simpler prefix matching (full implementation would be more complex)
        if (ip.includes(':') && network.includes(':')) {
            const ipParts = ip.split(':').filter(p => p);
            const networkParts = network.split(':').filter(p => p);
            const prefixBytes = Math.floor(prefix / 8);
            
            if (prefixBytes > ipParts.length || prefixBytes > networkParts.length) {
                return false;
            }
            
            for (let i = 0; i < prefixBytes; i++) {
                if (ipParts[i] !== networkParts[i]) {
                    return false;
                }
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        // If CIDR parsing fails, fall back to exact match
        return ip === network;
    }
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
    
    const { isAdmin, isSuperAdmin, adminRole, validation } = await computeAdminStatus(user._id, clientIP);
    
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

