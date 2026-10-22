const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const fixture = require('./admin-preview.cjs');
  await new Promise(r => fixture.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const phase of ['refresh', 'profile']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      await context.addInitScript(() => { sessionStorage.setItem('hasAuth', 'true'); sessionStorage.setItem('publicChromeHint', 'admin'); });
      await context.route('**/socket.io/**', route => route.abort());
      await context.routeWebSocket('**/socket.io/**', socket => socket.close());
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') {
          if (phase === 'refresh') await new Promise(r => setTimeout(r, 1000));
          return route.fulfill({ json: { accessToken: 'fixture' } }).catch(() => {});
        }
        if (url.pathname === '/api/users/me') {
          if (phase === 'profile') await new Promise(r => setTimeout(r, 1000));
          return route.fulfill({ json: { user: { _id: 'fixture', username: 'Viewer', isAdmin: true } } }).catch(() => {});
        }
        const res = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage();
      const pending = page.waitForRequest(request => new URL(request.url()).pathname === (phase === 'refresh' ? '/api/auth/refresh' : '/api/users/me'));
      await page.goto((process.env.PUBLIC_FRAME_URL || origin) + '/collections', { waitUntil: 'domcontentloaded' });
      await pending;
      await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
      // Keep the old document alive to expose notifications normally hidden by fast navigation.
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.session-recovery-notice:visible').count(), 0, phase + ' cancellation is silent');
      assert.equal(await page.locator('.PHOTOCLOUD-header .public-sign-in').count(), 0, 'cancellation never becomes guest');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('publicChromeHint')), 'admin');
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      await page.locator('#root .collections-create-btn:not(:disabled)').waitFor();
      assert.equal(await page.locator('.session-recovery-notice:visible').count(), 0);
      console.log('PASS silent departure and resumed document:', phase);
      await context.close();
    }
  } finally { await browser.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
