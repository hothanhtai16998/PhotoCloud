import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '../dist');

// Parse HTML to find all initial resources
const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

// Extract script and link tags
const scriptMatches = indexHtml.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
const linkMatches = indexHtml.match(/<link[^>]*href="([^"]+)"[^>]*>/g) || [];

const initialResources = [];

// Extract script sources
scriptMatches.forEach(match => {
  const srcMatch = match.match(/src="([^"]+)"/);
  if (srcMatch) {
    const src = srcMatch[1].replace(/^\//, '');
    initialResources.push({ type: 'script', path: src });
  }
});

// Extract CSS links
linkMatches.forEach(match => {
  const hrefMatch = match.match(/href="([^"]+)"/);
  if (hrefMatch && !hrefMatch[1].startsWith('http')) {
    const href = hrefMatch[1].replace(/^\//, '');
    initialResources.push({ type: 'stylesheet', path: href });
  }
});

// External resources (only actual downloads, not preconnect)
// Google Fonts CSS files are loaded but deferred
const fontLinks = indexHtml.match(/href="(https:\/\/fonts\.googleapis\.com[^"]+)"/g) || [];
fontLinks.forEach(match => {
  const urlMatch = match.match(/href="(https:\/\/fonts\.googleapis\.com[^"]+)"/);
  if (urlMatch && !urlMatch[1].includes('preconnect')) {
    initialResources.push({ type: 'external', path: urlMatch[1], note: 'Google Fonts CSS (deferred)' });
  }
});

// Calculate sizes
let totalSize = 0;
let totalGzipSize = 0;
const resources = [];

initialResources.forEach(resource => {
  if (resource.type === 'external') {
    // Google Fonts CSS is small (~2-5 KB), actual font files load later
    const size = resource.path.includes('fonts.googleapis.com/css') ? 3 : 0;
    resources.push({
      type: resource.type,
      path: resource.path.substring(0, 60) + (resource.path.length > 60 ? '...' : ''),
      size: size > 0 ? `~${size} KB (estimated)` : 'DNS only (no download)',
      gzip: size > 0 ? `~${(size * 0.5).toFixed(1)} KB (estimated)` : 'N/A',
      note: resource.note || 'External resource'
    });
    totalSize += size;
    totalGzipSize += size * 0.5;
    return;
  }

  const fullPath = join(distDir, resource.path);
  try {
    const stats = statSync(fullPath);
    const sizeKB = stats.size / 1024;
    
    // Estimate gzip size (typically 30-40% of original for JS/CSS)
    const gzipKB = sizeKB * 0.35;
    
    resources.push({
      type: resource.type,
      path: resource.path,
      size: `${sizeKB.toFixed(2)} KB`,
      gzip: `${gzipKB.toFixed(2)} KB (estimated)`
    });
    
    totalSize += sizeKB;
    totalGzipSize += gzipKB;
  } catch (e) {
    // File not found, might be external or dynamic
    resources.push({
      type: resource.type,
      path: resource.path,
      size: 'N/A',
      gzip: 'N/A',
      note: 'Not found in dist'
    });
  }
});

// Also check what loads when HomePage is accessed
// Based on code analysis, these load when HomePage loads:
// Note: vendor chunks are already loaded initially, so we don't count them again
const homePageResources = [
  { path: 'assets/HomePage-BPy5cBbO.js', type: 'script', note: 'Lazy loaded with HomePage' },
  { path: 'assets/HomePage-CyOHSc4D.css', type: 'stylesheet', note: 'Lazy loaded with HomePage' },
  { path: 'assets/Header-B0oV3aad.js', type: 'script', note: 'Imported by HomePage' },
  { path: 'assets/Header-OW1qCRYq.css', type: 'stylesheet', note: 'Imported by HomePage' },
  { path: 'assets/NoFlashGrid-BwUb2YaP.js', type: 'script', note: 'Imported by HomePage' },
  { path: 'assets/NoFlashGrid-CK0ZEMEm.js', type: 'script', note: 'Imported by HomePage' },
  { path: 'assets/NoFlashGrid-dd1ARPjg.css', type: 'stylesheet', note: 'Imported by HomePage' },
  { path: 'assets/NoFlashGrid-yj1fk8Po.css', type: 'stylesheet', note: 'Imported by HomePage' },
  { path: 'assets/logo-CD6Ledml.png', type: 'image', note: 'Logo asset' },
];

// Get HTML file size
const htmlPath = join(distDir, 'index.html');
const htmlStats = statSync(htmlPath);
const htmlSizeKB = htmlStats.size / 1024;
const htmlGzipKB = htmlSizeKB * 0.3; // HTML compresses well

console.log('='.repeat(80));
console.log('INITIAL PAGE LOAD RESOURCE ANALYSIS');
console.log('='.repeat(80));
console.log('\n📄 INITIAL HTML LOAD');
console.log('-'.repeat(80));
console.log(`HTML          index.html                                    ${htmlSizeKB.toFixed(2).padStart(8)} KB (gzip: ${htmlGzipKB.toFixed(2)} KB)`);
console.log('\n📦 INITIAL JAVASCRIPT & CSS (from index.html)');
console.log('-'.repeat(80));

resources.forEach(r => {
  console.log(`${r.type.padEnd(12)} ${r.path.padEnd(50)} ${r.size.padEnd(10)} (gzip: ${r.gzip})${r.note ? ' - ' + r.note : ''}`);
});

console.log('\n📦 ADDITIONAL RESOURCES WHEN HOMEPAGE LOADS');
console.log('-'.repeat(80));

let homePageTotal = 0;
let homePageGzip = 0;

homePageResources.forEach(resource => {
  const fullPath = join(distDir, resource.path);
  try {
    const stats = statSync(fullPath);
    const sizeKB = stats.size / 1024;
    const gzipKB = sizeKB * 0.35;
    
    console.log(`${resource.type.padEnd(12)} ${resource.path.padEnd(50)} ${sizeKB.toFixed(2).padStart(8)} KB (gzip: ${gzipKB.toFixed(2)} KB) - ${resource.note}`);
    
    homePageTotal += sizeKB;
    homePageGzip += gzipKB;
  } catch (e) {
    console.log(`${resource.type.padEnd(12)} ${resource.path.padEnd(50)} ${'N/A'.padStart(8)} - ${resource.note} (not found)`);
  }
});

// Calculate vendor chunks that are always needed
const alwaysLoadedVendors = [
  { path: 'assets/vendor-BND51eEt.js', type: 'script', note: 'Common vendor chunk' },
];

console.log('\n📚 ALWAYS LOADED VENDOR CHUNKS');
console.log('-'.repeat(80));

let vendorTotal = 0;
let vendorGzip = 0;

alwaysLoadedVendors.forEach(resource => {
  const fullPath = join(distDir, resource.path);
  try {
    const stats = statSync(fullPath);
    const sizeKB = stats.size / 1024;
    const gzipKB = sizeKB * 0.35;
    
    console.log(`${resource.type.padEnd(12)} ${resource.path.padEnd(50)} ${sizeKB.toFixed(2).padStart(8)} KB (gzip: ${gzipKB.toFixed(2)} KB) - ${resource.note}`);
    
    vendorTotal += sizeKB;
    vendorGzip += gzipKB;
  } catch (e) {
    console.log(`${resource.type.padEnd(12)} ${resource.path.padEnd(50)} ${'N/A'.padStart(8)} - ${resource.note} (not found)`);
  }
});

// External resources (Google Fonts)
// CSS files are small, font files load asynchronously
console.log('\n🌐 EXTERNAL RESOURCES (Google Fonts - Deferred)');
console.log('-'.repeat(80));
console.log('stylesheet Google Fonts CSS (Urbanist + Proxima Nova) - ~3 KB (deferred, non-blocking)');
console.log('stylesheet Google Fonts CSS (Roboto) - ~3 KB (deferred, non-blocking)');
console.log('font files (woff2) - ~150-200 KB total (loaded asynchronously after page render)');
console.log('Note: Fonts are deferred and don\'t block initial page render');

const externalTotal = 6; // Only CSS files count for initial load
const externalGzip = 3; // Estimated

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY - TOTAL RESOURCES DOWNLOADED ON FIRST VISIT');
console.log('='.repeat(80));
console.log(`\nInitial HTML:`);
console.log(`  Uncompressed: ${htmlSizeKB.toFixed(2)} KB`);
console.log(`  Gzipped:      ${htmlGzipKB.toFixed(2)} KB`);

console.log(`\nInitial Core JS/CSS (from HTML):`);
console.log(`  Uncompressed: ${totalSize.toFixed(2)} KB`);
console.log(`  Gzipped:      ${totalGzipSize.toFixed(2)} KB`);

console.log(`\nHomePage-specific resources (lazy loaded):`);
console.log(`  Uncompressed: ${homePageTotal.toFixed(2)} KB`);
console.log(`  Gzipped:      ${homePageGzip.toFixed(2)} KB`);

console.log(`\nExternal resources (Google Fonts - deferred):`);
console.log(`  Estimated:    ${externalTotal} KB`);
console.log(`  Gzipped:      ${externalGzip} KB (estimated)`);

const grandTotal = htmlSizeKB + totalSize + homePageTotal + externalTotal;
const grandTotalGzip = htmlGzipKB + totalGzipSize + homePageGzip + externalGzip;

console.log('\n' + '='.repeat(80));
console.log(`🎯 TOTAL FIRST VISIT DOWNLOAD:`);
console.log(`  Uncompressed: ${grandTotal.toFixed(2)} KB (${(grandTotal / 1024).toFixed(2)} MB)`);
console.log(`  Gzipped:      ${grandTotalGzip.toFixed(2)} KB (${(grandTotalGzip / 1024).toFixed(2)} MB)`);
console.log('='.repeat(80));

console.log('\n📝 NOTES:');
console.log('- Google Fonts are loaded asynchronously (deferred) and don\'t block initial render');
console.log('- Service Worker (sw.js) is registered but doesn\'t count toward initial page load');
console.log('- Images from API are loaded separately and not included in this calculation');
console.log('- Slider component is lazy loaded and only loads when not searching');
console.log('- Other pages (Profile, Admin, etc.) are lazy loaded and not included');

