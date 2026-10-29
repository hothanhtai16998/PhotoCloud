// Compatibility re-export.
//
// The implementation moved to ../services/realtime/socketMetrics.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/realtime/socketMetrics.js directly.
export * from '../services/realtime/socketMetrics.js';
