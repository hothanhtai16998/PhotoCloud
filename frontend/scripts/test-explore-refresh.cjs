const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const reports = [];
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(t => localStorage.setItem('theme', t), theme);
      let release, releaseApi;
      const gate = new Promise(r => release = r);
      const api = new Promise(r => releaseApi = r);
      let imageRequests = 0;
      let reloadRelease, reloading = false;
      const reloadGate = new Promise(r => reloadRelease = r);
      await context.route(/\/assets\/.*\.(js|css)(?:\?|$)/, async route => { await (reloading ? reloadGate : gate); await route.continue(); });
      await context.route('**/api/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/api/auth/refresh') return route.fulfill({ status: 401, json: { message: 'Guest' } });
        if (u.pathname === '/api/images' || u.pathname === '/api/categories') {
          if (u.pathname === '/api/images') imageRequests++;
          await api;
          return route.fulfill({ json: { images: [], categories: ['Chân dung', 'Du lịch', 'Gia đình', 'Kiến trúc', 'Ngoài trời', 'Phong cảnh', 'Thú cưng', 'Thời trang', 'Ẩm thực'].map((name, i) => ({ _id: 'cat-' + i, name })), pagination: { page: 1, pages: 0, total: 0 } } });
        }
        return route.fulfill({ json: { settings: {} } });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '/explore', { waitUntil: 'commit' });
      await page.locator('#public-explore-startup').waitFor({ state: 'visible' });
      const measure = selector => page.evaluate(selector => {
        const el = document.querySelector(selector);
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        return { x: r.x, y: r.y, w: r.width, h: r.height, color: s.color, background: s.backgroundColor, font: s.fontFamily };
      }, selector);
      const before = await measure('#public-explore-startup h1');
      const filtersBefore = await measure('#public-explore-startup .explore-filters');
      const searchBefore = await measure('#public-explore-startup .header-search');
      const inputBefore = await measure('#public-explore-startup .search-input');
      const headerBefore = await measure('#public-header-startup .header-studio-nav');
      release();
      await page.locator('#root .explore-page').waitFor();
      await page.waitForFunction(() => !document.getElementById('public-explore-startup'));
      const after = await measure('#root .explore-page h1');
      const filtersAfter = await measure('#root .explore-filters');
      assert.deepEqual(await measure('#root .header-search'), searchBefore, 'search frame');
      assert.deepEqual(await measure('#root .explore-page .search-input'), inputBefore, 'search input');
      const headerAfter = await measure('.PHOTOCLOUD-header .header-studio-nav');
      reports.push({ theme, before, after, headerBefore, headerAfter, filtersBefore, filtersAfter });
      assert.deepEqual(after, before, theme + ' heading stable across HTML/React');
      assert.deepEqual(filtersAfter, filtersBefore, theme + ' filters stable across HTML/React');
      for (const key of ['x', 'y', 'w', 'h']) assert.equal(headerAfter[key], headerBefore[key], theme + ' header ' + key);
      assert.equal(await page.getByRole('heading', { name: 'Chưa có ảnh phù hợp' }).count(), 0);
      await page.screenshot({ path: `qa-policy-checkbox/explore-runtime-${theme}.png` });
      releaseApi();
      await page.getByRole('heading', { name: 'Chưa có ảnh phù hợp' }).waitFor();
      await page.waitForFunction(() => document.querySelectorAll('#root .explore-categories button').length === 10);
      assert.equal(imageRequests, 1, 'category response must not repeat the initial image request');
      const ready = await measure('#root .explore-filters');
      reloading = true;
      await page.reload({ waitUntil: 'commit' });
      await page.waitForFunction(() => document.querySelectorAll('#public-explore-startup .explore-categories button').length === 10);
      assert.deepEqual(await measure('#public-explore-startup .explore-filters'), ready, 'cached categories before JS');
      reloadRelease();
      await page.getByRole('heading', { name: 'Chưa có ảnh phù hợp' }).waitFor();
      assert.deepEqual(await measure('#root .explore-filters'), ready, 'cached categories after React/API');
      assert.equal(imageRequests, 2, 'one image request per reload');
      await page.screenshot({ path: `qa-policy-checkbox/explore-categories-${theme}.png` });
      assert.deepEqual(errors, []);
      console.log('PASS explore refresh', theme, 'pre-JS/chunk/API/empty/reload/header/heading/search/9-real-category-labels');
      await context.close();
    }
  } finally {
    fs.writeFileSync('qa-policy-checkbox/explore-refresh.json', JSON.stringify(reports, null, 2));
    await browser.close();
    await new Promise(r => server.close(r));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
