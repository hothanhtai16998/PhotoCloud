// Compatibility re-export.
//
// The implementation moved to ../services/monitoring/systemMetrics.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/monitoring/systemMetrics.js directly.
export * from '../services/monitoring/systemMetrics.js';
