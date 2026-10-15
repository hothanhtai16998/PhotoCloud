const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const preview = require('./admin-preview.cjs');
  let holdMore = false;
  const calls = [];
  const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#b6a180" width="600" height="400"/></svg>');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/images') return preview.emit('request', req, res);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/json');
    const page = Number(url.searchParams.get('page') || 1);
    calls.push(Object.fromEntries(url.searchParams));
    if (holdMore && page === 2) return; // Remains pending until the browser disconnects.
    const empty = url.searchParams.get('search') === 'empty';
    res.end(JSON.stringify({ images: empty ? [] : Array.from({ length: page === 1 ? 20 : 1 }, (_, i) => ({
      _id: `offline-image-${page}-${i}`, imageTitle: `Ảnh ${page}-${i}`, imageUrl: photo,
      width: 600, height: 400, uploadedBy: { _id: 'u1', username: 'studio' }, createdAt: '2026-10-15',
    })), pagination: { page, pages: empty ? 0 : 2, total: empty ? 0 : 21, limit: 20 } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        // Real HTTP request: no fulfill() for images, so browser offline emulation applies.
        if (url.pathname === '/api/images') return route.continue({ url: origin + url.pathname + url.search });
        const response = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      });
      const page = await context.newPage();
      await page.goto(origin + '/s/photos/empty');
      await page.getByRole('heading', { name: 'Chưa tìm thấy ảnh phù hợp', exact: true }).waitFor();
      await context.setOffline(true);
      assert.equal(await page.evaluate(() => navigator.onLine), false);
      const retry = page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true });
      await retry.waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Chưa tìm thấy ảnh phù hợp', exact: true }).count(), 0);
      assert.ok(!(await page.locator('.search-results-summary').textContent()).includes('0 ảnh'));
      const input = page.locator('.search-results-page .header-search input');
      await input.fill('chân dung');
      await input.press('Enter');
      await page.getByRole('heading', { name: 'Kết quả cho “chân dung”', exact: true }).waitFor();
      await retry.waitFor();
      await page.waitForFunction(() => !navigator.onLine &&
        document.querySelector('.search-results-summary')?.textContent === 'Chưa tải được kết quả mới.' &&
        !document.querySelector('.search-results-error button').disabled);
      await context.setOffline(false);
      await retry.click();
      await page.waitForFunction(() => document.querySelectorAll('.grid-item-wrapper').length === 20);
      assert.equal(calls.at(-1).search, 'chân dung');

      holdMore = true;
      const moreRequest = page.waitForRequest(req => {
        const url = new URL(req.url());
        return url.pathname === '/api/images' && url.searchParams.get('page') === '2';
      });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await moreRequest;
      await context.setOffline(true);
      await retry.waitFor();
      assert.equal(await page.locator('.grid-item-wrapper').count(), 20);
      await page.waitForFunction(() => !document.querySelector('.search-results-error button').disabled);
      fs.mkdirSync(path.resolve(__dirname, '../qa-policy-checkbox'), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../qa-policy-checkbox/search-offline-${theme}.png`) });
      holdMore = false;
      await context.setOffline(false);
      await retry.click();
      await page.waitForFunction(() => document.querySelectorAll('.grid-item-wrapper').length === 21);
      assert.equal(calls.at(-1).page, '2');
      assert.equal(calls.at(-1).search, 'chân dung');
      assert.equal(await page.locator('.search-results-error').count(), 0);
      console.log('PASS offline search', theme, 'offline-empty/new-query/page2-abort-retain/reconnect-retry-page2');
      await context.close();
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
