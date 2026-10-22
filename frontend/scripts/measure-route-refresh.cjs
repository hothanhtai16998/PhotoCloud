// Measures first-paint geometry on a public route: header, fixed page frame,
// data regions. Records every distinct frame so shifts are attributable.
// Usage: node scripts/measure-route-refresh.cjs <route> <label>
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');

const ROUTE = process.argv[2] || '/explore';
const LABEL = process.argv[3] || 'before';

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const reports = [];
  try {
    for (const width of [1440, 390]) {
      for (const authMode of ['guest', 'member']) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
        if (authMode === 'member') {
          await ctx.addInitScript(() => sessionStorage.setItem('publicChromeHint', 'member'));
        }
        // Measure real navigation timing: first paint is a reload-time property.
        await ctx.route('**/api/**', async route => {
          const u = new URL(route.request().url());
          if (u.pathname === '/api/auth/refresh') {
            await new Promise(r => setTimeout(r, 700));
            return route.fulfill({ status: 401, json: { message: 'Guest' } });
          }
          if (u.pathname === '/api/images') {
            await new Promise(r => setTimeout(r, 500));
            const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#b6a180" width="600" height="400"/></svg>');
            return route.fulfill({
              json: {
                images: Array.from({ length: 30 }, (_, i) => ({
                  _id: `image-${i}`, imageTitle: `Khung hình ${i}`, imageUrl: photo,
                  width: 600, height: 400, createdAt: '2026-10-15', views: 10,
                  uploadedBy: { _id: 'u1', username: 'studio', displayName: 'Studio' },
                })),
                pagination: { page: 1, pages: 1, total: 30, limit: 30 },
              },
            });
          }
          const res = await fetch(origin + u.pathname + u.search);
          return route.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() });
        });

        const page = await ctx.newPage();
        const jsBytes = [];
        const consoleErrors = [];
        page.on('pageerror', e => consoleErrors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
        page.on('response', async res => {
          const url = res.url();
          if (!/\.(?:js|mjs)(\?|$)/.test(new URL(url).pathname)) return;
          try { const len = (await res.body()).length; jsBytes.push({ url: url.split('/').pop(), bytes: len }); } catch {}
        });

        // Frame sampler: geometry of header + page frame + data region only.
        await page.addInitScript(() => {
          window.__frames = [];
          let prev = '';
          const round = n => Math.round(n * 10) / 10;
          const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: round(r.x), y: round(r.y + scrollY), w: round(r.width), h: round(r.height) }; };
          const tick = () => {
            const header = document.querySelector('.PHOTOCLOUD-header') || document.querySelector('.public-header-startup');
            const logo = header?.querySelector('.header-logo, .text-logo');
            const nav = header?.querySelector('.header-studio-nav');
            const actions = header?.querySelector('.header-actions');
            const shell = document.querySelector('.app-body [class$="-page"],.app-body [class*="-page "]');
            const data = document.querySelector('.explore-grid-wrap, .collections-grid, .collection-detail-grid-placeholder');
            const value = {
              headerBox: box(header), logoBox: box(logo), navBox: box(nav), actionsBox: box(actions),
              shellBox: box(shell), dataBox: box(data),
              headerSurface: header?.dataset?.surface ?? null,
              rootEmpty: !document.querySelector('#root')?.childElementCount,
              fonts: document.fonts.status,
              bodyLoading: document.body.classList.contains('global-loading-active'),
            };
            const key = JSON.stringify(value);
            if (key !== prev) {
              window.__frames.push({ ms: Math.round(performance.now()), ...value });
              prev = key;
            }
            if (performance.now() < 5000) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        await page.goto(origin + ROUTE, { waitUntil: 'load' });
        await page.waitForTimeout(4000);

        const timing = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const paints = {};
          for (const p of performance.getEntriesByType('paint')) paints[p.name] = Math.round(p.startTime);
          return {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
            loadEvent: Math.round(nav.loadEventEnd),
            ...paints,
            transferBytes: nav.transferSize,
            htmlBytes: Math.round(performance.getEntriesByType('navigation')[0].encodedBodySize || 0),
          };
        });

        // Layout shift, ignoring shifts inside startup shells that are already hidden.
        const cls = await page.evaluate(() => (window.__cls ?? 0));
        const frames = await page.evaluate(() => window.__frames);
        reports.push({
          route: ROUTE, width, authMode, timing, cls,
          jsTotalBytes: jsBytes.reduce((a, b) => a + b.bytes, 0),
          jsRequests: jsBytes.length,
          jsFiles: jsBytes.sort((a, b) => b.bytes - a.bytes).slice(0, 8),
          frameCount: frames.length,
          frames,
          consoleErrors,
        });
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.mkdirSync('qa-policy-checkbox', { recursive: true });
  fs.writeFileSync(`qa-policy-checkbox/route-refresh-${LABEL}.json`, JSON.stringify(reports, null, 2));
  for (const r of reports) {
    console.log(`[${r.route}] ${r.width}px ${r.authMode}: frames=${r.frameCount} JS=${(r.jsTotalBytes / 1024).toFixed(0)}kB/${r.jsRequests}req FCP=${r.timing['first-contentful-paint']} LCPish=${r.timing.loadEvent} errors=${r.consoleErrors.length}`);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });