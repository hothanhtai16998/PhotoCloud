const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fixture = require('./admin-preview.cjs');

(async () => {
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      await context.route('**/api/collections?*', route => route.fulfill({ json: { success: true, collections: [{ _id: 'sample', name: 'Fixture', imageCount: 1, isPublic: true, createdBy: 'fixture', images: [] }] } }));
      const page = await context.newPage();
      const scripts = [], errors = [];
      page.on('request', request => { if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/collections');
      await page.locator('.collection-card').first().waitFor();
      assert.ok(!scripts.some(path => /\/(HomePage|ImagePage)-/.test(path)), 'Collection must not download unrelated route scripts');
      await page.locator('.PHOTOCLOUD-header .text-logo').click();
      await page.waitForURL(origin + '/');
      await page.locator('.homepage .hero-section').waitFor();
      assert.ok(scripts.some(path => /\/HomePage-/.test(path)), 'Home loads its own route on demand');
      await page.goBack();
      await page.locator('.collection-card').first().waitFor();
      await page.reload();
      await page.locator('.collection-card').first().waitFor();
      assert.deepEqual(errors, []);
      console.log('PASS collection split, home navigation, Back and F5:', theme);
      await context.close();
    }
  } finally { await browser.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; fixture.close(); });
