const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const pagination = { page: 1, pages: 0, total: 0, limit: 20, totalPages: 0, hasMore: false };
  const cases = [
    ['/packages', '/api/bookings/packages', { packages: [] }],
    ['/profile/bookings', '/api/bookings/mine', { bookings: [], pagination }],
    ['/notifications', '/api/notifications', { notifications: [] }],
    ['/favorites/photos', '/api/favorites', { images: [], pagination }],
    ['/favorites/collections', '/api/collection-favorites', { collections: [], pagination }],
    ['/downloads', '/api/users/me/download-history', { downloads: [], pagination }],
    ['/s/photos/loading-fixture', '/api/images', { images: [], pagination }],
    ['/settings/notifications', '/api/users/me/notification-preferences', { preferences: {} }],
  ];
  try {
    for (const theme of ['light', 'dark']) for (const [url, endpoint, payload] of cases) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(theme => {
        sessionStorage.setItem('hasAuth', 'true');
        localStorage.setItem('theme', theme);
      }, theme);
      let release;
      const gate = new Promise(r => release = r);
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (path === '/api/users/me') return route.fulfill({ json: { user: { _id: 'loading-viewer', username: 'viewer', displayName: 'Viewer', isAdmin: false } } });
        if (path === '/api/auth/sessions') return route.fulfill({ json: { sessions: [] } });
        if (path === endpoint) { await gate; return route.fulfill({ json: { success: true, ...payload } }); }
        if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: {} });
        const res = await fetch(origin + path + new URL(route.request().url()).search);
        return route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + url);
        if (url === '/settings/notifications') await page.getByRole('tab', { name: 'Thông báo', exact: true }).click();
        const loader = page.locator('#root .user-data-loading');
        await loader.waitFor({ state: 'visible' });
        await loader.scrollIntoViewIfNeeded();
        const style = await loader.evaluate(el => {
          const p = getComputedStyle(el.querySelector('p'));
          const bar = getComputedStyle(el.querySelector('.user-data-loading-track span'));
          return { font: p.fontFamily, size: p.fontSize, animation: bar.animationName, visibility: getComputedStyle(el).visibility, opacity: getComputedStyle(el).opacity };
        });
        assert.match(style.font, /Explore Fraunces/);
        assert.equal(style.size, url === '/settings/notifications' ? '18px' : '22px');
        assert.equal(style.animation, 'none', 'respect reduced motion');
        assert.equal(style.visibility, 'visible');
        assert.equal(style.opacity, '1');
        assert.equal(await loader.getAttribute('role'), 'status');
        if (url === '/packages' || url === '/settings/notifications') await page.screenshot({ path: `qa-policy-checkbox/user-loading-${url === '/packages' ? 'packages' : 'settings'}-${theme}.png` });
        release();
        await loader.waitFor({ state: 'detached' });
        assert.deepEqual(errors, []);
        console.log('PASS', theme, url, 'pending visible/font/reduced-motion/API completion');
      } finally { release(); await context.close(); }
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
