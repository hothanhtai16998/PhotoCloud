// Compatibility re-export.
//
// The implementation moved to ../services/ai/tagTranslator.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/ai/tagTranslator.js directly.
export * from '../services/ai/tagTranslator.js';
