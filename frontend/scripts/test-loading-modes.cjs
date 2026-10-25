const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const user = { _id: 'viewer', username: 'viewer', displayName: 'Viewer', pinnedImages: [], followersCount: 0, followingCount: 0 };
  const photo = { _id: 'fixture-photo', imageTitle: 'Ảnh giữ khi cập nhật', imageUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#b6a180" width="600" height="400"/></svg>'), width: 600, height: 400, createdAt: '2026-10-23', uploadedBy: user };
  const collection = { _id: 'fixture-collection', name: 'Bộ sưu tập giữ khi cập nhật', createdBy: user, images: [], imageCount: 1, isPublic: true, createdAt: '2026-10-23', updatedAt: '2026-10-23' };
  try {
    for (const theme of ['light', 'dark']) for (const mode of ['explore', 'favorites', 'dashboard']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => { sessionStorage.setItem('hasAuth', 'true'); localStorage.setItem('theme', theme); }, theme);
      let release, fail = false;
      let gate = new Promise(r => release = r);
      const hold = () => { gate = new Promise(r => release = r); };
      const target = mode === 'explore' ? '/api/images' : mode === 'favorites' ? '/api/collection-favorites' : '/api/images/me';
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url()), path = url.pathname;
        if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (path === '/api/users/me' || path === '/api/users/viewer') return route.fulfill({ json: { user } });
        if (path === target) {
          await gate;
          if (fail) return route.fulfill({ status: 503, json: { message: 'Fixture unavailable' } });
          return route.fulfill({ json: { images: [photo], collections: [collection], pagination: { page: Number(url.searchParams.get('page') || 1), pages: 2, total: 2, limit: 1 } } });
        }
        if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: {} });
        const res = await fetch(origin + path + url.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + (mode === 'explore' ? '/explore' : mode === 'favorites' ? '/favorites/collections' : '/me'));
        if (mode !== 'dashboard') await page.locator('#root .user-data-loading--section').waitFor();
        else assert.equal(await page.locator('.user-dash-stat').count(), 0, 'do not flash zero cards before initial response');
        release();
        const selector = mode === 'explore' ? '[data-image-id="fixture-photo"]' : mode === 'favorites' ? '.favorite-collection-card' : '.user-dash-stat';
        // Favorite card naming belongs to the existing page, not the shared loader.
        const content = mode === 'favorites' ? page.getByText(collection.name, { exact: true }) : page.locator(selector).first();
        await content.waitFor({ state: 'visible' });
        await content.evaluate(el => el.dataset.loadingRetained = 'yes');
        hold();
        if (mode === 'explore') await page.getByLabel('Sắp xếp', { exact: true }).selectOption('views');
        else if (mode === 'favorites') await page.locator('.pagination-btn').last().click();
        else await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
        await page.locator('.user-data-loading--inline').waitFor({ state: 'visible' });
        assert.equal(await content.isVisible(), true, 'old data remains visible while API is pending');
        assert.equal(await content.getAttribute('data-loading-retained'), 'yes', 'content is not remounted');
        assert.equal(await page.locator('#root .user-data-loading--section').count(), 0);
        if (mode === 'explore') fail = true;
        release();
        await page.locator('.user-data-loading--inline').waitFor({ state: 'detached' });
        assert.equal(await content.isVisible(), true, 'retain data after success or failure');
        if (mode === 'explore') await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).waitFor();
        await page.screenshot({ path: `qa-policy-checkbox/loading-modes-${mode}-${theme}.png` });
        assert.deepEqual(errors, []);
        console.log('PASS', theme, mode, 'initial/update/retain DOM/complete' + (fail ? '/503 retains data' : ''));
      } finally { release(); await context.close(); }
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
