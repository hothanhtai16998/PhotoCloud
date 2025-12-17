/**
 * Permission caching utility
 * Caches user permissions in memory to avoid database queries on every permission check
 * 
 * Features:
 * - In-memory cache with TTL (Time To Live)
 * - Automatic cache invalidation
 * - Per-user caching
 * - Cache statistics
 */

import { logger } from './logger.js';

const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

/**
 * Cache entry structure:
 * {
 *   data: { isAdmin, isSuperAdmin, adminRole, validation },
 *   timestamp: Date,
 *   expiresAt: Date
 * }
 */

/**
 * Get cache key for a user
 * @param {string} userId - User ID
 * @param {string} clientIP - Optional client IP (for IP-restricted roles)
 * @returns {string} Cache key
 */
const getCacheKey = (userId, clientIP = null) => {
    if (clientIP) {
        return `permissions:${userId}:${clientIP}`;
    }
    return `permissions:${userId}`;
};

/**
 * Check if cache entry is expired
 * @param {Object} entry - Cache entry
 * @returns {boolean} True if expired
 */
const isExpired = (entry) => {
    if (!entry || !entry.expiresAt) {
        return true;
    }
    return new Date() > entry.expiresAt;
};

/**
 * Clean expired entries from cache
 * Runs periodically to prevent memory leaks
 */
const cleanExpiredEntries = () => {
    const now = new Date();
    let cleaned = 0;
    
    for (const [key, entry] of permissionCache.entries()) {
        if (isExpired(entry)) {
            permissionCache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        logger.debug(`[PermissionCache] Cleaned ${cleaned} expired entries`);
    }
    
    return cleaned;
};

/**
 * Enforce cache size limit by removing oldest entries
 */
const enforceCacheSize = () => {
    if (permissionCache.size <= MAX_CACHE_SIZE) {
        return;
    }
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(permissionCache.entries())
        .map(([key, entry]) => ({ key, timestamp: entry.timestamp }))
        .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until under limit
    const toRemove = permissionCache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
        permissionCache.delete(entries[i].key);
    }
    
    logger.debug(`[PermissionCache] Removed ${toRemove} oldest entries to enforce size limit`);
};

/**
 * Get cached permissions for a user
 * @param {string} userId - User ID
 * @param {string} clientIP - Optional client IP
 * @returns {Object|null} Cached data or null if not found/expired
 */
export const getCachedPermissions = (userId, clientIP = null) => {
    const key = getCacheKey(userId, clientIP);
    const entry = permissionCache.get(key);
    
    if (!entry) {
        return null;
    }
    
    if (isExpired(entry)) {
        permissionCache.delete(key);
        return null;
    }
    
    return entry.data;
};

/**
 * Set cached permissions for a user
 * @param {string} userId - User ID
 * @param {Object} data - Permission data to cache
 * @param {string} clientIP - Optional client IP
 * @param {number} ttl - Time to live in milliseconds (optional, defaults to CACHE_TTL)
 */
export const setCachedPermissions = (userId, data, clientIP = null, ttl = CACHE_TTL) => {
    const key = getCacheKey(userId, clientIP);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);
    
    permissionCache.set(key, {
        data,
        timestamp: now,
        expiresAt,
    });
    
    // Enforce cache size limit
    enforceCacheSize();
};

/**
 * Invalidate cache for a specific user
 * @param {string} userId - User ID
 * @param {string} clientIP - Optional client IP (if null, invalidates all IPs for this user)
 */
export const invalidateUserCache = (userId, clientIP = null) => {
    if (clientIP) {
        // Invalidate specific IP
        const key = getCacheKey(userId, clientIP);
        permissionCache.delete(key);
    } else {
        // Invalidate all entries for this user (all IPs)
        const prefix = `permissions:${userId}`;
        for (const key of permissionCache.keys()) {
            if (key.startsWith(prefix)) {
                permissionCache.delete(key);
            }
        }
    }
};

/**
 * Clear all permission cache
 * Useful for testing or when permissions structure changes
 */
export const clearAllCache = () => {
    const size = permissionCache.size;
    permissionCache.clear();
    logger.info(`[PermissionCache] Cleared all ${size} cache entries`);
};

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => {
    const now = new Date();
    let valid = 0;
    let expired = 0;
    
    for (const entry of permissionCache.values()) {
        if (isExpired(entry)) {
            expired++;
        } else {
            valid++;
        }
    }
    
    return {
        total: permissionCache.size,
        valid,
        expired,
        maxSize: MAX_CACHE_SIZE,
        ttl: CACHE_TTL,
    };
};

/**
 * Initialize cache cleanup interval
 * Runs every 5 minutes to clean expired entries
 */
let cleanupInterval = null;

export const startCacheCleanup = () => {
    if (cleanupInterval) {
        return; // Already started
    }
    
    // Clean expired entries every 5 minutes
    cleanupInterval = setInterval(() => {
        cleanExpiredEntries();
    }, 5 * 60 * 1000);
    
    logger.info('[PermissionCache] Cache cleanup started');
};

export const stopCacheCleanup = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('[PermissionCache] Cache cleanup stopped');
    }
};

// Auto-start cleanup on module load
startCacheCleanup();

