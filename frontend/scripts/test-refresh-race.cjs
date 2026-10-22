const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const fixture = require('./admin-preview.cjs');
  await new Promise(r => fixture.listen(0, '127.0.0.1', r));
  const fixtureOrigin = 'http://127.0.0.1:' + fixture.address().port;
  const source = process.env.PUBLIC_FRAME_URL || fixtureOrigin;
  let streaming = false;
  const proxy = http.createServer(async (req, res) => {
    try {
      const upstream = await fetch(source + req.url);
      let body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'text/plain' });
      if (streaming && req.url === '/collections') {
        // Pause HTML parsing after the initial header/toolbar, before activation.
        const html = body.toString();
        const marker = html.indexOf('<script>(()=>{');
        assert.ok(marker > 0);
        res.write(html.slice(0, marker));
        setTimeout(() => res.end(html.slice(marker)), 160);
      } else res.end(body);
    } catch (error) { res.destroy(error); }
  });
  await new Promise(r => proxy.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1705, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/socket.io/**', route => route.abort());
    await context.routeWebSocket('**/socket.io/**', socket => socket.close());
    await context.addInitScript(() => {
      sessionStorage.setItem('hasAuth', 'true');
      sessionStorage.setItem('publicChromeHint', 'admin');
      window.refreshFrames = [];
      function visible(el) {
        if (!el || !el.getBoundingClientRect().width) return false;
        for (let n = el; n instanceof Element; n = n.parentElement) {
          const s = getComputedStyle(n);
          if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < .95) return false;
        }
        return true;
      }
      const tick = () => {
        const header = document.querySelector('.PHOTOCLOUD-header') || document.querySelector('#public-header-startup');
        const toolbar = document.querySelector('#root [data-collections-frame]') || document.querySelector('#public-collections-startup [data-collections-frame]');
        if (visible(header)) {
          const any = selector => [...header.querySelectorAll(selector)].some(visible);
          window.refreshFrames.push({ t: performance.now(), booking: any('.public-booking-button'), account: any('.account-header-frame'), guest: any('.public-guest-actions'), create: visible(toolbar?.querySelector('.collections-create-btn')), toolbar: visible(toolbar) });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    let iteration = 0, refreshAttempt = 0;
    await context.route('**/api/**', async route => {
      const u = new URL(route.request().url());
      if (u.pathname === '/api/auth/refresh') {
        await new Promise(r => setTimeout(r, [0, 15, 70, 180][iteration % 4]));
        refreshAttempt++;
        if (process.env.REFRESH_FAULTS === '1') {
          if (iteration % 4 === 1 && refreshAttempt <= 2) return route.fulfill({ status: 429, headers: { 'retry-after': '0' }, json: {} });
          if (iteration % 4 === 2 && refreshAttempt === 1) return route.abort('connectionfailed');
          if (iteration % 4 === 3 && refreshAttempt === 1) return route.fulfill({ status: 503, json: {} });
        }
        return route.fulfill({ json: { accessToken: 'fixture' } });
      }
      if (u.pathname === '/api/users/me') {
        await new Promise(r => setTimeout(r, [150, 0, 40][iteration % 3]));
        return route.fulfill({ json: { user: { _id: 'fixture', username: 'Viewer', isAdmin: true, isSuperAdmin: true } } });
      }
      const response = await fetch(fixtureOrigin + u.pathname + u.search);
      return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
    });
    const page = await context.newPage();
    for (iteration = 0; iteration < Number(process.env.REFRESH_RUNS || 40); iteration++) {
      refreshAttempt = 0;
      streaming = iteration % 5 === 0;
      if (!iteration) await page.goto('http://127.0.0.1:' + proxy.address().port + '/collections');
      else await page.reload();
      await page.locator('#root .collections-create-btn:not(:disabled)').waitFor();
      await page.waitForTimeout(200);
      const frames = await page.evaluate(() => window.refreshFrames);
      const bad = frames.filter(f => !f.booking || !f.account || f.guest || (f.toolbar && !f.create));
      report.push({ iteration, streaming, frames: frames.length, bad });
      if (bad.length) console.log('FAIL refresh frames:', JSON.stringify(report.at(-1)));
    }
    fs.writeFileSync(path.resolve(__dirname, '../qa-policy-checkbox/' + (process.env.REFRESH_FAULTS === '1' ? 'auth-refresh-race.json' : 'refresh-race.json')), JSON.stringify(report, null, 2));
    assert.equal(report.filter(r => r.bad.length).length, 0, 'every visible frame keeps account controls and create');
    console.log('PASS repeated refresh frame trace:', report.length, 'runs;', report.reduce((n, r) => n + r.frames, 0), 'frames');
    await context.close();
  } finally { await browser.close(); proxy.close(); fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
