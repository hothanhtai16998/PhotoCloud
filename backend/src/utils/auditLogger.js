// Compatibility re-export.
//
// The implementation moved to ../services/audit/auditLogger.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/audit/auditLogger.js directly.
export * from '../services/audit/auditLogger.js';
