const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(value => localStorage.setItem('theme', value), theme);
      let releaseAuth, releaseData, releaseImage, releaseResults;
      let resultsRequested = false;
      const results = new Promise(resolve => releaseResults = resolve);
      await context.route("**/assets/CollectionsResults-*.js", async route => { resultsRequested = true; await results; await route.continue(); });
      const auth = new Promise(resolve => releaseAuth = resolve);
      const data = new Promise(resolve => releaseData = resolve);
      const image = new Promise(resolve => releaseImage = resolve);
      const origin = 'http://127.0.0.1:' + server.address().port;
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') {
          await auth;
          return route.fulfill({ status: 401, json: { message: 'Guest' } });
        }
        if (url.pathname === '/api/collections') {
          await data;
          return route.fulfill({ json: { success: true, collections: [{ _id: 'fixture', name: 'Test collection', imageCount: 1, isPublic: true, tags: ['test'], createdAt: '2026-10-20', coverImage: { _id: 'photo', width: 600, height: 400, imageUrl: origin + '/slow-photo.svg' } }] } });
        }
        const response = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
      await context.route('**/slow-photo.svg', async route => {
        await image;
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="tan"/></svg>' });
      });
      const page = await context.newPage();
      await page.goto(origin + '/collections');
      await page.locator('.collections-search-input').waitFor();
      await page.evaluate(() => document.body.classList.add('global-loading-active'));
      assert.equal(await page.locator('.collections-page').evaluate(el => getComputedStyle(el).visibility), 'visible', 'global loader must not hide the local page shell');
      assert.equal(await page.locator('.collections-page').evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('.collections-skeleton-grid').count(), 1);
      assert.equal(await page.locator('.collections-empty').count(), 0);
      assert.equal(await page.locator('.collections-search-input').isDisabled(), true);
      await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/collection-shell-' + theme + '.png') });
      assert.equal(resultsRequested, true, 'results chunk is independently pending');
      await page.locator('.collections-header').evaluate(el => { window.originalCollectionsHeader = el; });
      releaseResults();
      releaseAuth();
      await page.waitForFunction(() => !document.querySelector('.collections-search-input').disabled);
      await page.locator('.collections-search-input').fill('Test');
      assert.equal(await page.locator('.collections-skeleton-grid').count(), 1);
      releaseData();
      await page.locator('.collection-card').waitFor();
      assert.equal(await page.locator('.collections-header').evaluate(el => el === window.originalCollectionsHeader), true, 'shell survives results loading without remount');
      assert.equal(await page.locator('.collections-search-input').inputValue(), 'Test');
      assert.equal(await page.locator('.collections-skeleton-grid').count(), 0);
      assert.equal(await page.locator('img.full.loaded').count(), 0, 'metadata precedes slow image');
      releaseImage();
      await page.locator('img.full.loaded').waitFor();
      await context.route('**/assets/CollectionsResults-*.js', route => route.abort());
      const failedPage = await context.newPage();
      await failedPage.goto(origin + '/collections');
      await failedPage.getByRole('alert').filter({hasText:'Không thể mở danh sách'}).waitFor();
      assert.equal(await failedPage.locator('.collections-header').isVisible(), true, 'chunk failure stays inside results');
      assert.equal(await failedPage.locator('.collections-search-input').isVisible(), true);
      await context.close();
    }
    console.log('PASS light/dark: shell before results chunk/auth/API; stable header node; filters retained; metadata before image; chunk error stays local.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
