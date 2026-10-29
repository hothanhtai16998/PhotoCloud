// Compatibility re-export.
//
// The implementation moved to ../services/email/emailAlerts.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/email/emailAlerts.js directly.
export * from '../services/email/emailAlerts.js';
