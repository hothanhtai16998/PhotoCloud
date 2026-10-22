const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const fixture = require('./admin-preview.cjs');
  await new Promise(r => fixture.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => { localStorage.setItem('theme', theme); sessionStorage.setItem('publicChromeHint', 'admin'); sessionStorage.setItem('hasAuth', 'true'); }, theme);
      await context.route('**/socket.io/**', route => route.abort());
      await context.routeWebSocket('**/socket.io/**', socket => socket.close());
      let releaseMain, releaseChunk, releaseAuth, releaseData, reads = 0;
      const main = new Promise(r => releaseMain = r), chunk = new Promise(r => releaseChunk = r), auth = new Promise(r => releaseAuth = r), data = new Promise(r => releaseData = r);
      await context.route(/\/assets\/index-[^/]+\.js|\/src\/main\.tsx/, async route => { await main; await route.continue(); });
      await context.route(/\/assets\/CollectionDetailPage-[^/]+\.js|\/src\/pages\/collection\/CollectionDetailPage\.tsx/, async route => { await chunk; await route.continue(); });
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') { await auth; return route.fulfill({ json: { accessToken: 'fixture' } }); }
        if (url.pathname === '/api/users/me') return route.fulfill({ json: { user: { _id: 'owner', username: 'Viewer', isAdmin: true } } });
        if (url.pathname === '/api/collections/demo') {
          reads++; await data;
          return route.fulfill({ json: { success: true, collection: { _id: 'demo', name: 'Bộ kiểm thử', description: 'Mô tả từ API', createdBy: { _id: 'owner', username: 'Viewer' }, isPublic: true, images: [] } } });
        }
        const res = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage();
      await page.goto((process.env.PUBLIC_FRAME_URL || origin) + '/collections/demo', { waitUntil: 'commit' });
      const snapshot = () => page.evaluate(() => {
        const frame = document.querySelector('#root [data-collection-detail-frame]') || document.querySelector('#public-collection-detail-startup [data-collection-detail-frame]');
        return ['.collection-detail-back', '.collection-detail-title-row h1', '.collection-detail-actions','&'].map(selector => {
          const el = selector === '&' ? frame : frame.querySelector(selector), r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, h:r.height, visibility: getComputedStyle(el).visibility, color: getComputedStyle(el).color };
        });
      });
      await page.locator('#public-collection-detail-startup [data-collection-detail-frame]').waitFor();
      const before = await snapshot();
      await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/detail-startup-' + theme + '.png') });
      releaseMain(); releaseAuth();
      await page.locator('.PHOTOCLOUD-header').waitFor();
      assert.equal(await page.locator('#public-collection-detail-startup [data-collection-detail-frame]').isVisible(), true, 'frame survives lazy route chunk');
      releaseChunk();
      await page.locator('#root [data-collection-detail-frame]').waitFor();
      const mounted = await snapshot();
      assert.ok(Math.abs(before[3].h-mounted[3].h)<.6,'frame height before/after app CSS');
      assert.equal(await page.locator('#public-collection-detail-startup').count(), 0);
      for (let i = 0; i < 2; i++) { assert.ok(Math.abs(before[i].x - mounted[i].x) < .6); assert.ok(Math.abs(before[i].y - mounted[i].y) < .6); assert.equal(before[i].color, mounted[i].color); }
      await page.evaluate(() => document.body.classList.add('global-loading-active'));
      assert.equal(await page.locator('#root .collection-detail-page').evaluate(el => getComputedStyle(el).opacity), '1');
      releaseData();
      await page.getByRole('heading', { name: 'Bộ kiểm thử', exact: true }).waitFor();
      const ready = await snapshot();
      assert.ok(Math.abs(before[3].h-ready[3].h)<.6,'frame reserves normal metadata height');
      assert.equal(reads, 1, 'auth/profile restoration must not fetch detail as guest and then clear/reload');
      assert.ok(Math.abs(before[0].x - ready[0].x) < .6 && Math.abs(before[0].y - ready[0].y) < .6);
      await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/detail-ready-' + theme + '.png') });
      console.log('PASS detail frame before JS/chunk/auth/API, local loader and single initial read:', theme);
      await context.close();
    }
  } finally { await browser.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
