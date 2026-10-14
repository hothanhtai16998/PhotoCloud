const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=', 'base64');
const images = Array.from({ length: 12 }, (_, i) => ({
  _id: (i + 1).toString(16).padStart(24, '0'), imageTitle: `Fixture ${i}`,
  imageUrl: `/photo-large-${i}.png`, regularUrl: `/photo-large-${i}.png`,
  smallUrl: `/photo-small-${i}.png`, thumbnailUrl: `/photo-small-${i}.png`,
  width: 1200, height: 800, imageCategory: 'Fixture',
  uploadedBy: { _id: '000000000000000000000099', username: 'fixture' },
  createdAt: '2026-10-13T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z', tags: [],
}));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const width of [1440, 390]) for (const moduleDelay of [0, 2000]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        const pathname = url.pathname;
        const headers = {'access-control-allow-origin': 'http://photocloud.test', 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || '*'};
        const json = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers });
        if (pathname.includes('/api/')) {
          if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers});
          if (pathname.endsWith('/images')) return json({ images, pagination: { page: 1, pages: 1, total: 12, limit: 30 } });
          if (pathname.includes('/images/by-id/')) return json({image: images[0]});
          if (pathname.endsWith('/categories')) return json({categories: []});
          if (pathname.includes('/auth/')) return route.fulfill({status:401,contentType:'application/json',body:'{}',headers});
          return json({settings: {maintenanceMode:false}, favorites: [], collections: [], packages: [], views:1});
        }
        if (pathname.startsWith('/photo-')) {
          if (pathname.startsWith('/photo-large')) await new Promise(done => setTimeout(done, 3000));
          return route.fulfill({ contentType: 'image/png', body: pixel });
        }
        if (url.hostname !== 'photocloud.test') return route.abort();
        if (/\/ImagePage-.*\.js$/.test(pathname)) await new Promise(done => setTimeout(done, moduleDelay));
        const target = pathname.startsWith('/assets/') ? path.join(root, 'dist', pathname) : path.join(root, 'dist/index.html');
        const ext = path.extname(target);
        const type = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.svg':'image/svg+xml'}[ext] || 'application/octet-stream';
        if (!fs.existsSync(target)) return route.abort();
        return route.fulfill({contentType: type, body: fs.readFileSync(target)});
      });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://photocloud.test/explore');
      const card = page.locator('.blur-up-image-container').first();
      await card.waitFor({timeout:10000}).catch(async error => {
        console.log(JSON.stringify({errors,body:await page.locator('body').innerText()}));
        throw error;
      });
      await card.scrollIntoViewIfNeeded();
      const previousScroll = await page.evaluate(() => scrollY);
      const started = Date.now();
      await card.click();
      await page.locator(width > 768 ? '.image-page-modal' : '.image-page .image-modal-surface').waitFor({timeout:15000});
      const clickToSurfaceMs = Date.now()-started;
      assert.equal(await page.locator('.image-page-photo').evaluate(img => img.complete), false, 'Surface must open before large image finishes');
      await page.locator('.image-modal-scroll-area').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.locator('.image-modal-related-section .blur-up-image-container').first().waitFor();
      if (width > 768) await page.keyboard.press('Escape');
      else await page.goBack();
      await page.waitForURL('**/explore');
      await page.waitForFunction(y => Math.abs(scrollY-y)<2, previousScroll);
      results.push({width,moduleDelayMs:moduleDelay,largeImageDelayMs:3000,clickToSurfaceMs,largeImageStillLoading:true,relatedGridReachable:true,closeRestoresScroll:true,errors});
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(root, `photo-open-${process.argv[2] || 'measurement'}.json`), JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
})().catch(error => {console.error(error);process.exitCode=1;});
