import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotDir = 'qa-screenshots';
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

const baseUrl = 'http://localhost:5173';
const breakpoints = [
    { name: '360-mobile', width: 360, height: 640 },
    { name: '480-wide', width: 480, height: 800 },
    { name: '768-tablet', width: 768, height: 1024 }
];

const routes = [
    { name: 'Home', path: '/' },
    { name: 'Admin', path: '/admin' },
    { name: 'EditProfile', path: '/profile/edit' }
];

async function runTests() {
    const results = [];
    let browser;

    try {
        browser = await chromium.launch({
            headless: true,
            timeout: 30000
        });

        for (const route of routes) {
            console.log(`\n📄 Testing route: ${route.name} (${route.path})`);

            for (const bp of breakpoints) {
                const testName = `${bp.name}-${route.name}`;
                const screenshotPath = path.join(screenshotDir, `${testName}.png`);

                try {
                    console.log(`  • ${bp.name}...`);

                    const context = await browser.newContext({
                        viewport: { width: bp.width, height: bp.height }
                    });

                    const page = await context.newPage();

                    // Navigate with a reasonable timeout
                    await page.goto(`${baseUrl}${route.path}`, {
                        waitUntil: 'domcontentloaded',
                        timeout: 20000
                    });

                    // Wait a bit for render
                    await page.waitForTimeout(1000);

                    // Take screenshot
                    await page.screenshot({ path: screenshotPath, fullPage: true });

                    // Check for horizontal scroll
                    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
                    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
                    const hasScroll = scrollWidth > clientWidth;

                    const result = {
                        test: testName,
                        status: hasScroll ? '❌ FAIL' : '✅ PASS',
                        scrollWidth,
                        clientWidth,
                        screenshot: screenshotPath
                    };

                    results.push(result);
                    console.log(`    ${result.status} (scroll: ${scrollWidth}px vs viewport: ${clientWidth}px)`);

                    await context.close();
                } catch (err) {
                    const result = {
                        test: testName,
                        status: '⚠️ ERROR',
                        error: err.message,
                        screenshot: screenshotPath
                    };
                    results.push(result);
                    console.log(`    ⚠️ ERROR: ${err.message}`);
                }
            }
        }
    } finally {
        if (browser) await browser.close();
    }

    // Write report
    const reportPath = path.join(screenshotDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    // Print summary
    const passed = results.filter(r => r.status === '✅ PASS').length;
    const failed = results.filter(r => r.status === '❌ FAIL').length;
    const errors = results.filter(r => r.status === '⚠️ ERROR').length;
    const total = results.length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 QA REPORT`);
    console.log(`Total: ${total} | ✅ PASS: ${passed} | ❌ FAIL: ${failed} | ⚠️ ERROR: ${errors}`);
    console.log(`Report saved to: ${reportPath}`);
    console.log(`Screenshots saved to: ${screenshotDir}/`);
    console.log(`${'='.repeat(60)}\n`);

    process.exit(failed > 0 || errors > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
