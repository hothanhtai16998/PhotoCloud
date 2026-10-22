const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const role of ['member', 'admin', 'expired']) {
      const context = await browser.newContext({ viewport: { width: 1705, height: 900 } });
      await context.addInitScript(role => {
        sessionStorage.setItem('hasAuth', 'true');
        sessionStorage.setItem('publicChromeHint', role === 'member' ? 'member' : 'admin');
      }, role);
      let releaseMain, releaseAuth, releaseProfile;
      const main = new Promise(r => releaseMain = r), auth = new Promise(r => releaseAuth = r), profile = new Promise(r => releaseProfile = r);
      await context.route(/\/assets\/index-[^/]+\.js|\/src\/main\.tsx/, async route => { await main; await route.continue(); });
      await context.route('**/api/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/api/auth/refresh') { await auth; return route.fulfill(role === 'expired' ? { status: 401, json: {} } : { json: { accessToken: 'fixture' } }); }
        if (u.pathname === '/api/users/me') { await profile; return route.fulfill({ json: { user: { _id: 'fixture', username: 'Viewer', isAdmin: role === 'admin', isSuperAdmin: role === 'admin' } } }); }
        const res = await fetch(origin + u.pathname + u.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage();
      await page.goto((process.env.PUBLIC_FRAME_URL || origin) + '/collections', { waitUntil: 'commit' });
      await page.locator('#public-header-startup .account-header-frame:visible').waitFor();
      const snapshot = () => page.evaluate(() => {
        const h = document.querySelector('.PHOTOCLOUD-header') || document.querySelector('#public-header-startup');
        const f = document.querySelector('#root [data-collections-frame]') || document.querySelector('#public-collections-startup [data-collections-frame]');
        return [...h.querySelectorAll('.public-booking-button,.header-admin-group,.account-notifications-slot,.account-avatar-slot'), ...f.querySelectorAll('h1,.collections-create-btn,.collections-tag-filter-btn')].filter(el => el.getBoundingClientRect().width > 0).map(el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return { x: r.x, y: r.y, w: r.width, h: r.height, radius: s.borderRadius, color: s.color, bg: s.backgroundColor };
        });
      });
      const before = await snapshot();
      if (role !== 'member') assert.equal(await page.locator('#public-collections-startup .collections-create-btn').isDisabled(), true);
      await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/account-startup-' + role + '.png') });
      releaseMain(); await page.locator('#root [data-collections-frame]').waitFor();
      assert.deepEqual(await snapshot(), before, role + ': startup to React paint/geometry');
      releaseAuth(); releaseProfile();
      if (role === 'expired') {
        await page.locator('.PHOTOCLOUD-header .public-sign-in').waitFor();
        assert.equal(await page.locator('#root .collections-create-btn').count(), 0);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('publicChromeHint')), 'guest');
      } else {
        await page.locator('.account-avatar-slot .user-menu-trigger').waitFor();
        assert.deepEqual(await snapshot(), before, role + ': resolved account paint/geometry');
        if (role === 'admin') {
          const create = page.locator('#root .collections-create-btn');
          assert.equal(await create.isEnabled(), true);
          await create.click(); await page.locator('.collection-modal').waitFor();
        }
      }
      await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/account-ready-' + role + '.png') });
      console.log('PASS account startup, auth, role and create:', role);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
