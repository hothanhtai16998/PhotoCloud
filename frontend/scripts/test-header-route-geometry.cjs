const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixture = require('./admin-preview.cjs');

(async () => {
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) for (const guest of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      if (!guest) await context.addInitScript(() => { sessionStorage.setItem('hasAuth', 'true'); sessionStorage.setItem('publicChromeHint', 'admin'); });
      await context.route('**/socket.io/**', route => route.abort());
      await context.routeWebSocket('**/socket.io/**', socket => socket.close());
      await context.route('**/api/auth/refresh', route => route.fulfill(guest ? { status: 401, json: { message: 'Guest' } } : { json: { accessToken: 'fixture' } }));
      if (!guest) await context.route('**/api/users/me?*', route => route.fulfill({ json: { user: { _id: 'fixture', username: 'Viewer', isAdmin: true, isSuperAdmin: true } } }));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const snapshot = () => page.evaluate(() => {
        const header = document.querySelector('#root .PHOTOCLOUD-header');
        const selectors = ['.text-logo', '.header-studio-nav', '.header-actions', ...Array.from({ length: 5 }, (_, i) => `.header-studio-nav a:nth-child(${i + 1})`)];
        return Object.fromEntries(selectors.map(selector => {
          const r = header.querySelector(selector).getBoundingClientRect();
          return [selector, { x: r.x, y: r.y, w: r.width, h: r.height }];
        }));
      });
      await page.goto(origin + '/');
      await page.locator('.homepage .hero-section').waitFor();
      await page.locator(guest ? '.public-sign-in' : '.header-library-action[aria-label="Quản trị"]').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const home = await snapshot();
      for (const route of ['/collections', '/about', '/']) {
        await page.locator(`.header-studio-nav a[href="${route === '/' ? '/collections' : route}"]`).click();
        if (route === '/') await page.locator('.PHOTOCLOUD-header .text-logo').click();
        await page.waitForURL(origin + route);
        await page.waitForTimeout(500);
        const current = await snapshot();
        for (const selector of Object.keys(home)) for (const axis of ['x', 'y', 'w', 'h']) {
          assert.ok(Math.abs(home[selector][axis] - current[selector][axis]) < 1, `${theme} guest=${guest} ${route} ${selector}.${axis}: home=${home[selector][axis]}, route=${current[selector][axis]}`);
        }
      }
      assert.deepEqual(errors, []);
      console.log('PASS header geometry home/collections/about/home:', theme, guest ? 'guest' : 'account');
      await context.close();
    }
  } finally { await browser.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; fixture.close(); });
