const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
  const fixture = require('./admin-preview.cjs');
  await new Promise(r => fixture.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + fixture.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const scenario of ['429-auto', '503-manual', 'network-online', 'profile-retry', 'profile-429', 'profile-malformed', 'admin-503', 'member-admin', '401', '403']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(scenario => { localStorage.setItem('theme', scenario === 'network-online' || scenario === 'profile-429' ? 'dark' : 'light'); sessionStorage.setItem('hasAuth', 'true'); sessionStorage.setItem('publicChromeHint', 'admin'); }, scenario);
      await context.route('**/socket.io/**', route => route.abort());
      await context.routeWebSocket('**/socket.io/**', socket => socket.close());
      let calls = 0, recover = false;
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') {
          calls++;
          if (scenario === '401' || scenario === '403') return route.fulfill({ status: Number(scenario), json: {} });
          if (!recover && scenario === 'network-online') return route.abort('connectionfailed');
          if (!recover && (scenario === '503-manual' || scenario === 'admin-503' || (scenario === '429-auto' && calls <= 2))) return route.fulfill({ status: scenario === '429-auto' ? 429 : 503, headers: { 'retry-after': '0' }, json: {} });
          return route.fulfill({ json: { accessToken: 'fixture' } });
        }
        if (url.pathname === '/api/users/me' && scenario === 'profile-malformed' && !recover) return route.fulfill({json:{}});
        if (url.pathname === '/api/users/me') return route.fulfill(scenario.startsWith('profile-') && !recover ? { status: scenario === 'profile-429' ? 429 : 503, headers: { 'retry-after': '120' }, json: {} } : { json: { user: { _id: 'fixture', username: 'Viewer', isAdmin: scenario !== 'member-admin', isSuperAdmin: scenario !== 'member-admin' } } });
        const res = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage();
      await page.goto((process.env.PUBLIC_FRAME_URL || origin) + (scenario.startsWith('profile-') ? '/settings/profile' : scenario === 'admin-503' || scenario === 'member-admin' ? '/admin' : '/collections'));
      if (scenario === '401' || scenario === '403') {
        await page.locator('.PHOTOCLOUD-header .public-sign-in').waitFor();
        assert.equal(calls, 1);
        assert.equal(await page.locator('#root .collections-create-btn').count(), 0);
      } else if (scenario === 'member-admin') {
        await page.waitForURL(url => url.pathname === '/');
        assert.equal(await page.locator('.PHOTOCLOUD-header .public-sign-in').count(),0, 'member keeps login while denied admin area');
      } else if (scenario === '429-auto') {
        await page.locator('#root .collections-create-btn:not(:disabled)').waitFor();
        assert.equal(calls, 3);
      } else {
        await page.locator('.session-recovery-notice').waitFor();
        assert.equal(await page.locator('.session-recovery-notice').count(), 1, 'one recovery notice owns both failure paths');
        assert.equal(await page.locator('.session-recovery-notice p').innerText(), 'Chưa thể hoàn tất kiểm tra tài khoản. Vui lòng thử lại.');
        assert.equal(await page.locator('.PHOTOCLOUD-header .public-sign-in').count(), 0);
        assert.equal(await page.evaluate(() => sessionStorage.getItem('publicChromeHint')), 'admin');
        if (!scenario.startsWith('profile-')) {
          assert.equal(calls, 3, 'automatic recovery is bounded');
          if (scenario !== 'admin-503') assert.equal(await page.locator('#root .collections-create-btn').isDisabled(), true);
          else assert.match(page.url(), /\/admin$/, 'temporary auth failure preserves admin URL');
        } else assert.match(page.url(), /settings\/profile$/, 'profile failure never redirects to sign in');
        await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/auth-recovery-' + scenario + '.png') });
        const recoveredProfile = page.waitForResponse(response => new URL(response.url()).pathname === '/api/users/me' && response.status() === 200);
        recover = true;
        if (scenario === 'network-online') await page.evaluate(() => window.dispatchEvent(new Event('online')));
        else await page.locator('.session-recovery-notice button').click();
        await page.locator('.session-recovery-notice').waitFor({ state: 'hidden' });
        await recoveredProfile;
        if (scenario !== 'admin-503') await page.locator('.account-avatar-slot .user-menu-trigger').waitFor();
        else assert.match(page.url(), /\/admin$/);
        if (!scenario.startsWith('profile-') && scenario !== 'admin-503') await page.locator('#root .collections-create-btn:not(:disabled)').waitFor();
      }
      console.log('PASS session recovery:', scenario, 'refresh calls:', calls);
      await context.close();
    }
    // A Socket.IO auth error followed by a temporary refresh failure cannot log out HTTP auth.
    const socketContext = await browser.newContext();
    await socketContext.addInitScript(() => { sessionStorage.setItem('hasAuth', 'true'); sessionStorage.setItem('publicChromeHint', 'admin'); });
    let socketRefreshes = 0;
    await socketContext.route('**/socket.io/**', route => route.abort());
    await socketContext.routeWebSocket('**/socket.io/**', socket => {
      socket.send('0' + JSON.stringify({ sid: 'fixture', upgrades: [], pingInterval: 25000, pingTimeout: 20000 }));
      socket.onMessage(message => { if (String(message).startsWith('40')) socket.send('44' + JSON.stringify({ message: 'Authentication error' })); });
    });
    await socketContext.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/refresh') return route.fulfill(++socketRefreshes === 1 ? { json: { accessToken: 'fixture' } } : { status: 503, json: {} });
      const res = await fetch(origin + url.pathname + url.search);
      return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
    });
    const socketPage = await socketContext.newPage();
    const socketFailure = socketPage.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/refresh' && response.status() === 503);
    await socketPage.goto((process.env.PUBLIC_FRAME_URL || origin) + '/collections');
    await socketFailure;
    await socketPage.locator('#root .collections-create-btn:not(:disabled)').waitFor();
    assert.equal(await socketPage.locator('.PHOTOCLOUD-header .public-sign-in').count(), 0);
    assert.equal(await socketPage.evaluate(() => sessionStorage.getItem('publicChromeHint')), 'admin');
    console.log('PASS Socket.IO auth error + refresh 503 preserves session');
    await socketContext.close();

    // Reload before refresh finishes: old-page cancellation cannot poison the next page's hint.
    const context = await browser.newContext();
    await context.addInitScript(() => { sessionStorage.setItem('hasAuth', 'true'); sessionStorage.setItem('publicChromeHint', 'admin'); });
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/refresh') {
        await new Promise(r => setTimeout(r, 400));
        return route.fulfill({ json: { accessToken: 'fixture' } }).catch(() => {});
      }
      const res = await fetch(origin + url.pathname + url.search);
      return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
    });
    await context.route('**/socket.io/**', route => route.abort());
    await context.routeWebSocket('**/socket.io/**', socket => socket.close());
    const page = await context.newPage();
    await page.goto((process.env.PUBLIC_FRAME_URL || origin) + '/collections', { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 10; i++) {
      await page.locator('.PHOTOCLOUD-header .account-header-frame').waitFor();
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.evaluate(() => sessionStorage.getItem('publicChromeHint')), 'admin');
    }
    await page.locator('#root .collections-create-btn:not(:disabled)').waitFor();
    console.log('PASS 10 rapid reloads during pending refresh');
    await context.close();
  } finally { await browser.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
