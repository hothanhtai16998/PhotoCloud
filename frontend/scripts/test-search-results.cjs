const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const out = path.resolve(__dirname, '../qa-policy-checkbox');
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('photoApp_searchFilters', JSON.stringify({ orientation: 'all', color: 'all', sortBy: 'date', order: 'asc', minWidth: 100 }));
      }, theme);
      const calls = [];
      let failMore = true;
      const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#b6a180" width="600" height="400"/></svg>');
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/images') {
          const params = Object.fromEntries(url.searchParams);
          calls.push(params);
          const page = Number(params.page || 1);
          if (params.search === 'lỗi mạng' || (page === 2 && failMore)) {
            return route.fulfill({ status: 503, json: { message: 'Fixture search unavailable' } });
          }
          const empty = params.search === 'không có ảnh';
          return route.fulfill({ json: {
            images: empty ? [] : Array.from({ length: page === 1 ? 20 : 1 }, (_, i) => ({
              _id: `search-image-${page}-${i}`, imageTitle: `Ảnh ${page}-${i}`, imageUrl: photo,
              width: 600, height: 400, uploadedBy: { _id: 'u1', username: 'studio', displayName: 'Studio' },
              createdAt: '2026-10-15', views: 10,
            })), pagination: { page, pages: empty ? 0 : 2, total: empty ? 0 : 21, limit: 20 },
          } });
        }
        if (url.pathname.startsWith('/api/search/')) return route.fulfill({ json: { suggestions: [], popular: [] } });
        const response = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const query = '100% Việt %20';
      await page.goto(`${origin}/s/photos/${encodeURIComponent(query)}`);
      await page.waitForFunction(() => document.querySelector('.search-results-summary')?.textContent === '21 ảnh phù hợp');
      assert.ok((await page.getByRole('heading', { level: 1 }).textContent()).includes(query));
      assert.equal(calls.at(-1).search, query);
      assert.equal(await page.locator('.grid-item-wrapper').count(), 20);
      const clearInput = page.locator('.search-results-page .header-search input');
      const beforeClearUrl = page.url();
      const beforeClearCalls = calls.length;
      await page.locator('.search-results-page .search-clear').click();
      assert.equal(await clearInput.inputValue(), '');
      assert.ok(await clearInput.evaluate(input => document.activeElement === input));
      assert.equal(page.url(), beforeClearUrl);
      await page.getByRole('heading', { level: 1 }).click();
      assert.equal(await clearInput.inputValue(), '', 'Blur must not restore the cleared query');
      await clearInput.press('Enter');
      assert.equal(page.url(), beforeClearUrl, 'Empty submit stays on the current page');
      assert.equal(calls.length, beforeClearCalls);
      await clearInput.fill(query);
      await page.screenshot({ path: path.join(out, `search-${theme}.png`) });

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).waitFor();
      assert.equal(await page.locator('.grid-item-wrapper').count(), 20);
      failMore = false;
      await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.grid-item-wrapper').length === 21);
      assert.equal(calls.at(-1).page, '2');
      assert.equal(calls.at(-1).search, query);
      assert.equal(calls.at(-1).order, 'asc');
      assert.equal(calls.at(-1).minWidth, '100');

      await page.locator('.search-results-page .search-filters-toggle').click();
      await page.getByRole('button', { name: 'Dọc', exact: true }).click();
      const countBeforeApply = calls.length;
      const appliedResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/images' && url.searchParams.get('orientation') === 'portrait';
      });
      await page.getByRole('button', { name: 'Áp dụng', exact: true }).click();
      await appliedResponse;
      await page.waitForFunction(() => document.querySelector('.search-results-summary')?.textContent === '21 ảnh phù hợp');
      assert.equal(calls.length, countBeforeApply + 1, 'One request owner when applying filters');
      assert.equal(calls.at(-1).page, '1');
      assert.ok(!calls.at(-1).category);

      const input = page.locator('.search-results-page .header-search input');
      await input.fill('không có ảnh');
      await input.press('Enter');
      await page.getByRole('heading', { name: 'Chưa tìm thấy ảnh phù hợp', exact: true }).waitFor();
      assert.equal(await page.locator('.grid-item-wrapper').count(), 0);
      await input.fill('lỗi mạng');
      await input.press('Enter');
      await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'Chưa tìm thấy ảnh phù hợp', exact: true }).count(), 0);
      await input.fill('chân dung');
      await input.press('Enter');
      await page.waitForFunction(() => document.querySelector('.search-results-summary')?.textContent === '21 ảnh phù hợp');
      assert.equal(calls.at(-1).search, 'chân dung');
      assert.equal(calls.at(-1).orientation, 'portrait');
      await page.reload();
      await page.waitForFunction(() => document.querySelector('.search-results-summary')?.textContent === '21 ảnh phù hợp');
      assert.equal(calls.at(-1).search, 'chân dung');
      assert.deepEqual(errors, []);
      console.log('PASS search', theme, 'special-query/filter-single-request/page2-retry/empty/error/query-change/reload');
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

