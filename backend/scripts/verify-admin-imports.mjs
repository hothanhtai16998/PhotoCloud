/**
 * Runtime check: every module the admin area imports must actually load and
 * expose the functions the admin controllers destructure from it.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE = fileURLToPath(new URL('../', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const toUrl = (rel) => pathToFileURL(BASE + '/' + rel).href;

const CHECKS = [
  ['src/libs/s3.js', ['deleteImageFromR2', 'r2Client']],
  ['src/utils/emailAlerts.js', ['sendImageApprovedEmail', 'sendImageRejectedEmail']],
  ['src/utils/auditLogger.js', ['logPermissionChange', 'getClientIp']],
  ['src/utils/permissionCache.js', ['invalidateUserCache', 'getCacheStats']],
  ['src/utils/permissionValidator.js', ['validatePermissionsForRole', 'applyRoleInheritance']],
  ['src/utils/sitePalette.js', ['validateSitePalette', 'publicSitePalette']],
  ['src/utils/alertMonitor.js', ['invalidateSettingsCache', 'startMonitoring', 'stopMonitoring']],
  ['src/utils/systemMetrics.js', ['getSystemStatus']],
  ['src/utils/socketMetrics.js', ['socketMetrics']],
  ['src/utils/checkAITaggingStatus.js', ['checkAITaggingStatus']],
  ['src/utils/testGoogleVisionAPI.js', ['testGoogleVisionAPI']],
  ['src/utils/tagTranslator.js', ['translateTags']],
  ['src/utils/adminUtils.js', ['computeAdminStatus', 'enrichUserWithAdminStatus', 'isAdminRoleValid']],
];

let failed = 0;
for (const [rel, names] of CHECKS) {
  const url = toUrl(rel);
  try {
    const mod = await import(url);
    const missing = names.filter((n) => mod[n] === undefined);
    if (missing.length) {
      console.log(`MISSING  ${rel}  ->  ${missing.join(', ')}`);
      failed++;
    } else {
      console.log(`OK       ${rel}  (${names.length} exports)`);
    }
  } catch (e) {
    console.log(`LOAD FAIL ${rel}  ->  ${e.message}`);
    failed++;
  }
}

// The whole admin barrel must load, since adminRoute.js imports it eagerly.
try {
  await import(toUrl('src/controllers/admin/index.js'));
  console.log('OK       src/controllers/admin/index.js');
} catch (e) {
  console.log(`LOAD FAIL src/controllers/admin/index.js  ->  ${e.message}`);
  failed++;
}

console.log(failed === 0 ? '\nOK: admin import chain intact' : `\n${failed} failure(s)`);
process.exit(failed === 0 ? 0 : 1);
