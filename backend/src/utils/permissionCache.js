// Compatibility re-export.
//
// The implementation moved to ../services/cache/permissionCache.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/cache/permissionCache.js directly.
export * from '../services/cache/permissionCache.js';
