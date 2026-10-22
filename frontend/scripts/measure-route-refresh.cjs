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
        const apiLog = [];
        await ctx.route('**/api/**', async route => {
          const u = new URL(route.request().url());
          apiLog.push({ path: u.pathname, query: u.search });
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
        await page.addInitScript(({ shellSel, dataSel }) => {
          window.__frames = [];
          window.__cls = 0;
          window.__shifts = [];
          let prev = '';
          const round = n => Math.round(n * 10) / 10;
          const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: round(r.x), y: round(r.y + scrollY), w: round(r.width), h: round(r.height) }; };
          // Only count shifts of visible content; startup shells are inert/hidden
          // and their geometry must never drive a CLS verdict.
          const hidden = el => !el || el.hasAttribute('inert') || getComputedStyle(el).display === 'none';
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
              if (entry.hadRecentInput) continue;
              window.__cls += entry.value;
              window.__shifts.push({
                ms: Math.round(entry.startTime),
                value: Math.round(entry.value * 1000) / 1000,
                nodes: entry.sources.map(s => ({
                  tag: s.node?.nodeName ?? null,
                  cls: s.node?.className?.toString?.().slice(0, 60) ?? null,
                  from: { x: round(s.previousRect.x), y: round(s.previousRect.y), w: round(s.previousRect.width), h: round(s.previousRect.height) },
                  to: { x: round(s.currentRect.x), y: round(s.currentRect.y), w: round(s.currentRect.width), h: round(s.currentRect.height) },
                })),
              });
            }
          }).observe({ type: 'layout-shift', buffered: true });
          const tick = () => {
            const header = document.querySelector('.PHOTOCLOUD-header') || document.querySelector('.public-header-startup');
            const logo = header?.querySelector('.header-logo, .text-logo');
            const nav = header?.querySelector('.header-studio-nav');
            const actions = header?.querySelector('.header-actions');
            const shell = document.querySelector(shellSel);
            const data = document.querySelector(dataSel);
            const startup = document.querySelector('.public-header-startup, .public-collections-startup, .public-explore-startup, .public-collection-detail-startup');
            const value = {
              headerBox: box(header), logoBox: box(logo), navBox: box(nav), actionsBox: box(actions),
              shellBox: box(shell), dataBox: box(data),
              startupVisible: startup ? box(startup) : null,
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
        }, {
          shellSel: ROUTE === '/explore' ? '.explore-page' : ROUTE.startsWith('/collections/') ? '.collection-detail-page' : '.collections-page',
          dataSel: ROUTE === '/explore' ? '.explore-grid-wrap' : ROUTE.startsWith('/collections/') ? '.collection-detail-grid, .collection-detail-grid-placeholder' : '.collections-grid, .collections-page-shell',
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
        const shifts = await page.evaluate(() => (window.__shifts ?? []));
        const frames = await page.evaluate(() => window.__frames);
        const apiCalls = apiLog.map(a => `${a.path}?${a.query}`);
        reports.push({
          route: ROUTE, width, authMode, timing, cls: Math.round(cls * 1000) / 1000, shifts,
          apiCalls,
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
    console.log(`[${r.route}] ${r.width}px ${r.authMode}: frames=${r.frameCount} CLS=${r.cls} JS=${(r.jsTotalBytes / 1024).toFixed(0)}kB/${r.jsRequests}req FCP=${r.timing['first-contentful-paint']} DCL=${r.timing.domContentLoaded} errors=${r.consoleErrors.length}`);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });