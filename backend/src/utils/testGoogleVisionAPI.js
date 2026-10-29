// Compatibility re-export.
//
// The implementation moved to ../../scripts/testGoogleVisionAPI.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../../scripts/testGoogleVisionAPI.js directly.
export * from '../../scripts/testGoogleVisionAPI.js';
