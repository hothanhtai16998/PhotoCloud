// Compatibility re-export.
//
// The implementation moved to ../services/palette/sitePalette.js. This path stays because
// backend/src/controllers/admin/** imports it, and the admin area is out of
// scope for this refactor. Prefer importing ../services/palette/sitePalette.js directly.
export * from '../services/palette/sitePalette.js';
