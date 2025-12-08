import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'qa-screenshots');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Breakpoints to test (width, label)
const BREAKPOINTS = [
  { width: 360, height: 800, label: '360-mobile' },
  { width: 375, height: 812, label: '375-iphone' },
  { width: 412, height: 915, label: '412-pixel' },
  { width: 480, height: 800, label: '480-mobile-wide' },
  { width: 768, height: 1024, label: '768-tablet' },
];

// Routes to test
const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/admin', name: 'Admin' },
  { path: '/profile/edit', name: 'EditProfile' },
  { path: '/collections', name: 'Collections' },
  { path: '/profile', name: 'Profile' },
];

async function captureScreenshots() {
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const route of ROUTES) {
      console.log(`\n📸 Testing route: ${route.name} (${route.path})`);

      for (const bp of BREAKPOINTS) {
        try {
          const page = await browser.newPage({
            viewport: { width: bp.width, height: bp.height },
          });

          const url = `${BASE_URL}${route.path}`;
          console.log(`  • ${bp.label}...`, { url });

          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

          // Wait for content to render
          await page.waitForTimeout(1500);

          // Check for horizontal scroll
          const hasHorizontalScroll = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });

          // Get document size
          const docSize = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
          }));

          // Capture screenshot
          const screenshotName = `${route.name}-${bp.label}.png`;
          const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          const result = {
            route: route.name,
            path: route.path,
            breakpoint: bp.label,
            width: bp.width,
            hasHorizontalScroll,
            docScrollWidth: docSize.scrollWidth,
            docClientWidth: docSize.clientWidth,
            screenshotFile: screenshotName,
            status: hasHorizontalScroll ? '❌ FAIL (H-scroll)' : '✅ PASS',
          };

          results.push(result);
          console.log(`    ${result.status} | scroll: ${docSize.scrollWidth}px (viewport: ${bp.width}px)`);

          await page.close();
        } catch (err) {
          console.error(`    ❌ ERROR at ${bp.label}: ${err.message}`);
          results.push({
            route: route.name,
            path: route.path,
            breakpoint: bp.label,
            width: bp.width,
            status: `❌ ERROR: ${err.message}`,
            screenshotFile: null,
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n\n📊 QA REPORT\n');
  console.log('='.repeat(120));

  const passCount = results.filter((r) => r.status?.includes('PASS')).length;
  const failCount = results.filter((r) => r.status?.includes('FAIL')).length;
  const errorCount = results.filter((r) => r.status?.includes('ERROR')).length;

  console.log(`Total: ${results.length} | ✅ PASS: ${passCount} | ❌ FAIL: ${failCount} | ⚠️ ERROR: ${errorCount}\n`);

  // Group by route
  const groupedByRoute = {};
  results.forEach((r) => {
    if (!groupedByRoute[r.route]) groupedByRoute[r.route] = [];
    groupedByRoute[r.route].push(r);
  });

  Object.entries(groupedByRoute).forEach(([route, items]) => {
    console.log(`\n📄 ${route}:`);
    items.forEach((item) => {
      const failIcon = item.status?.includes('PASS') ? '✅' : '❌';
      console.log(
        `  ${failIcon} ${item.breakpoint.padEnd(20)} | width: ${String(item.width).padEnd(3)}px | scroll: ${String(item.docScrollWidth || 'N/A').padEnd(4)}px | ${item.status}`
      );
    });
  });

  // List failures
  const failures = results.filter((r) => r.status?.includes('FAIL'));
  if (failures.length > 0) {
    console.log('\n\n🔴 FAILURES DETECTED:\n');
    failures.forEach((f) => {
      console.log(`  • ${f.route} @ ${f.breakpoint}: ${f.docScrollWidth}px > ${f.docClientWidth}px viewport`);
    });
  }

  // Save JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, 'qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📋 Report saved: ${reportPath}`);
  console.log(`📸 Screenshots saved: ${SCREENSHOTS_DIR}`);
}

captureScreenshots().catch(console.error);
