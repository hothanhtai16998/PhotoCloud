// Compatibility re-export.
//
// The implementation moved to ../config/storage.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../config/storage.js directly.
export * from '../config/storage.js';
export { default } from '../config/storage.js';
