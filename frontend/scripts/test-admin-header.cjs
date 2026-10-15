const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = path.resolve(__dirname, '../dist');
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      let heldChunk;
      await context.route(/\/assets\/AdminPage-[^/]+\.js$/, route => { heldChunk = route; });
      await context.route('**/api/**', route => {
        const url = route.request().url();
        if (process.argv.includes('--metrics-ok') && url.includes('/admin/dashboard/websocket-metrics')) return route.fulfill({ json: { success: true, metrics: {
          uptime: { ms: 1000, formatted: '1s' }, connections: { total: 2, active: 1, failed: 0, reconnected: 0, successRate: '100%' },
          events: { total: 5, eventsPerSecond: 1, topEventTypes: [], latency: { average: '1', min: '1', max: '1' } },
          rooms: { total: 1, totalUsers: 1, topRooms: [] }, errors: { auth: 0, join: 0, emit: 0, other: 0, total: 0 }, timestamp: new Date().toISOString(),
        } } });
        if (process.argv.includes('--loaded') && url.includes('/admin/analytics?')) return route.fulfill({ json: {
          users: { total: 12, new: 2 }, images: { total: 20, new: 3, pendingModeration: 1, approved: 19 },
          dailyUsers: [], dailyUploads: [], dailyPending: [], dailyApproved: [], categories: [], topUploaders: [],
        } });
        // Admin data failures deliberately exercise navigation without live data.
        return route.fulfill({ status: url.includes('/admin/') ? 503 : 200, json:
          url.includes('/auth/refresh') ? { accessToken: 'fixture' } :
          url.includes('/users/me') ? { user: { _id: 'fixture', username: 'admin', isAdmin: true, isSuperAdmin: true } } :
          { images: [], notifications: [], unreadCount: 0, settings: {}, pagination: { total: 0 } } });
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__adminMeasures = 0;
        const original = window.getComputedStyle;
        window.getComputedStyle = function (element, pseudo) {
          if (element.classList.contains('admin-page')) window.__adminMeasures++;
          return original.call(this, element, pseudo);
        };
      });
      const errors = [];
      page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR', error.message); });
      const origin = `http://127.0.0.1:${server.address().port}`;
      try {
        await page.goto(origin + '/admin', { waitUntil: 'domcontentloaded' });
        await page.locator('.global-loading-overlay.visible').waitFor();
        assert.ok(heldChunk, 'Admin route chunk must still be pending');
        if (width > 768) {
          await page.locator('.site-theme-toggle:visible').click({ timeout: 2000 });
          assert.ok((await page.locator('html').getAttribute('class')).includes('dark-theme'));
        }
        await page.locator('.user-menu-trigger:visible').click({ timeout: 2000 });
        await page.locator('.user-menu-content').waitFor();
        await heldChunk.continue();
        await page.locator('.admin-page').waitFor();
        await page.locator('.global-loading-overlay').waitFor({ state: 'detached' });
        if (process.argv.includes('--loaded')) {
          await page.waitForTimeout(2500);
          assert.deepEqual(errors, [], 'Loaded dashboard must not crash');
          await page.locator('.admin-analytics-falcon').waitFor({ timeout: 3000 });
          assert.equal(await page.evaluate(() => window.__adminMeasures), 0, 'No header surface measurement of admin chart mutations');
          const frames = await page.evaluate(() => new Promise(resolve => {
            const start = performance.now(); let last = start; const gaps = [];
            const tick = now => {
              gaps.push(now - last); last = now;
              if (now - start < 1000) requestAnimationFrame(tick);
              else resolve({ count: gaps.length, maxGap: Math.round(Math.max(...gaps)) });
            };
            requestAnimationFrame(tick);
          }));
          console.log('Loaded dashboard frames', width, frames);
          assert.ok(frames.count >= 10, 'Dashboard should remain responsive');
          if (process.argv.includes('--metrics-ok')) {
            assert.ok(!(await page.locator('body').innerText()).includes('Failed to load WebSocket metrics'));
            await page.screenshot({ path: path.resolve(__dirname, `../admin-loaded-${width}.png`) });
          }
        }
        await page.locator('.user-menu-trigger:visible').click();
        await page.locator('.user-menu-content').waitFor({ state: 'detached' });
        for (const index of [1, 2]) {
          if (width <= 768) await page.locator('.admin-mobile-menu-btn').click();
          const tab = page.locator('.admin-nav-item').nth(index);
          await tab.click({ timeout: 2000 });
          await page.waitForFunction(index => document.querySelectorAll('.admin-nav-item')[index]?.classList.contains('active'), index);
          if (width <= 768) await page.locator('.admin-sidebar').evaluate(element => {
            if (!element.classList.contains('mobile-closed')) throw new Error('Mobile sidebar must close after selecting a tab');
          });
        }
        await page.locator('.header-logo').click();
        await page.waitForURL(origin + '/');
        console.log(`PASS admin ${width}: pending route, avatar, desktop theme, users/images tabs, logo navigation`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
