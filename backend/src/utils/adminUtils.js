// Compatibility re-export.
//
// The implementation moved to ../services/permissions/adminUtils.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/permissions/adminUtils.js directly.
export * from '../services/permissions/adminUtils.js';
