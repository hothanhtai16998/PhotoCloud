// Compatibility re-export.
//
// The implementation moved to ../../scripts/checkAITaggingStatus.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../../scripts/checkAITaggingStatus.js directly.
export * from '../../scripts/checkAITaggingStatus.js';
