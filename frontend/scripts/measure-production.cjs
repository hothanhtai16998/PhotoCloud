const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__metrics = { lcp: [], longTasks: [], cls: 0, firstImageDecoded: null, stageMounted: null };
      new PerformanceObserver(list => list.getEntries().forEach(e => window.__metrics.lcp.push({ time: e.startTime, size: e.size, url: e.url }))).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => window.__metrics.longTasks.push({ time: e.startTime, duration: e.duration }))).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.__metrics.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
      const observer = new MutationObserver(() => {
        const image = document.querySelector('.travel-stage .landscape');
        if (!image || window.__metrics.stageMounted !== null) return;
        window.__metrics.stageMounted = performance.now();
        const source = getComputedStyle(image).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if (source) { const preload = new Image(); preload.src = source; preload.decode().then(() => { window.__metrics.firstImageDecoded = performance.now(); }).catch(() => {}); }
        observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
    });
    for (const mode of ['cold', 'warm']) {
      const requests = [];
      const handler = async response => {
        try {
          const request = response.request();
          const parsed = new URL(response.url());
          requests.push({ url: parsed.origin + parsed.pathname, type: request.resourceType(), status: response.status(), fromSW: response.fromServiceWorker(), timing: request.timing(), size: (await response.body()).length });
        } catch {}
      };
      page.on('response', handler);
      if (mode === 'cold') await page.goto('http://127.0.0.1:4174/', { waitUntil: 'load' });
      else await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.__metrics.firstImageDecoded !== null, null, { timeout: 15000 }).catch(async () => console.log('IMAGE_TIMEOUT', await page.locator('.travel-empty').textContent().catch(() => ''), JSON.stringify(requests.filter(r => r.status >= 400))));
      await page.waitForTimeout(1000);
      const metrics = await page.evaluate(() => ({ ...window.__metrics, nav: performance.getEntriesByType('navigation')[0].toJSON(), paints: performance.getEntriesByType('paint').map(p => p.toJSON()), sw: !!navigator.serviceWorker.controller, resources: performance.getEntriesByType('resource').map(r => ({ url: new URL(r.name).origin + new URL(r.name).pathname, start: r.startTime, duration: r.duration, transfer: r.transferSize, encoded: r.encodedBodySize })) }));
      page.off('response', handler);
      results.push({ run, mode, metrics, requests });
      console.log(JSON.stringify({ run, mode, html:metrics.nav.responseEnd, fcp:metrics.paints.find(p=>p.name==='first-contentful-paint')?.startTime, stage:metrics.stageMounted, image:metrics.firstImageDecoded, lcp:metrics.lcp.at(-1)?.time, cls:metrics.cls, sw:metrics.sw, requests:requests.length }));
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(process.argv[2] || 'performance-baseline.json', JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
