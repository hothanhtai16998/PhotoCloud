// Compatibility re-export.
//
// The implementation moved to ../services/monitoring/alertMonitor.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/monitoring/alertMonitor.js directly.
export * from '../services/monitoring/alertMonitor.js';
