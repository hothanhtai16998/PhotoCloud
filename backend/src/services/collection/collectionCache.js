import { deleteCache, generateCacheKey } from '../cache/queryCache.js';
import { logger } from '../../utils/logger.js';

/** Invalidate query and response caches after collection mutations. */
export async function invalidateUserCollections(userId) {
    deleteCache(generateCacheKey('userCollections', { userId: userId.toString() }));

    // Also clear cacheMiddleware cache
    try {
        const { clearCollectionsCache } = await import('../../middlewares/cacheMiddleware.js');
        const cleared = clearCollectionsCache(userId);
        if (cleared > 0) {
            logger.info('Cleared collections cache', {
                userId: userId.toString(),
                entriesCleared: cleared
            });
        }
    } catch (cacheError) {
        logger.error('Failed to clear collections cache:', cacheError);
        // Don't fail the request if cache clear fails
    }
}

/** Invalidate lists of everyone affected by collection membership, including removed users. */
export async function invalidateCollectionLists(collection, extraUsers = []) {
    const users = [collection.createdBy, ...(collection.collaborators || []).map(item => item.user), ...extraUsers];
    const ids = new Set(users.filter(Boolean).map(user => String(user._id || user)));
    await Promise.all([...ids].map(invalidateUserCollections));
}
