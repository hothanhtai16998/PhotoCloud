/**
 * Simple In-Memory Query Cache
 * Caches frequently accessed database queries to reduce CPU and database load
 */

import { logger } from '../../utils/logger.js';

// Cache storage
const cache = new Map();
// Ownership tokens prevent invalidated in-flight reads from repopulating stale data.
const pendingReads = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found/expired
 */
export function getCache(key) {
    const item = cache.get(key);
    
    if (!item) {
        return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }
    
    return item.value;
}

/**
 * Set cache value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
 */
export function setCache(key, value, ttlMs = DEFAULT_TTL) {
    pendingReads.delete(key);
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

/**
 * Delete cache entry
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
    pendingReads.delete(key);
    cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearCache() {
    pendingReads.clear();
    cache.clear();
}

/**
 * Generate cache key from query parameters
 * @param {string} prefix - Cache prefix (e.g., 'collections')
 * @param {object} params - Query parameters
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}:${JSON.stringify(params[key])}`)
        .join('|');
    return `${prefix}:${sortedParams}`;
}

/**
 * Cache wrapper for async functions
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {Promise<any>} Cached or fresh result
 */
export async function cached(key, fn, ttlMs = DEFAULT_TTL) {
    const value = getCache(key);
    if (value !== null) return value;
    const existing = pendingReads.get(key);
    if (existing) return existing.promise;

    const owner = {};
    // Defer execution so even synchronous failures run after ownership is registered.
    owner.promise = Promise.resolve().then(fn).then(result => {
        if (pendingReads.get(key) === owner) setCache(key, result, ttlMs);
        return result;
    }).finally(() => {
        if (pendingReads.get(key) === owner) pendingReads.delete(key);
    });
    pendingReads.set(key, owner);
    return owner.promise;
}

/**
 * Cleanup expired cache entries (should be called periodically)
 */
export function cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of cache.entries()) {
        if (now > item.expiresAt) {
            cache.delete(key);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        logger.debug(`[Query Cache] Cleaned ${cleaned} expired entries`);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    for (const item of cache.values()) {
        if (now > item.expiresAt) {
            expired++;
        } else {
            active++;
        }
    }
    
    return {
        total: cache.size,
        active,
        expired,
    };
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

