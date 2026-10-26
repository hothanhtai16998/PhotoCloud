const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const packages = [
    { _id: 'p1', slug: 'portrait', name: 'Chân dung cá nhân', category: 'portrait', description: 'Buổi chụp dành riêng cho bạn.', basePrice: 1500000, durationMinutes: 60, includedPhotos: 20, includedPeople: 1, deliveryDays: 7 },
    { _id: 'p2', slug: 'family', name: 'Gia đình', category: 'family', description: 'Lưu giữ khoảnh khắc bên người thân.', basePrice: 3200000, durationMinutes: 120, includedPhotos: 50, includedPeople: 6, deliveryDays: 7 },
  ];
  try {
    for (const width of (process.env.HERO_BOUNDS_ONLY ? [390] : [1440, 390])) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      let releaseImages;
      const imageGate = new Promise(resolve => { releaseImages = resolve; });
      await context.route('https://images.unsplash.com/**', async route => { await imageGate;await route.continue(); });
      await context.addInitScript(theme => { localStorage.setItem('theme', theme);sessionStorage.setItem('hasAuth', 'true'); }, theme);
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (url.pathname === '/api/users/me') return route.fulfill({ json: { user: { _id: 'viewer', username: 'viewer', displayName: 'Viewer' } } });
        if (url.pathname === '/api/bookings/packages') return route.fulfill({ json: { success: true, packages } });
        if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: {} });
        const response = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/packages', { waitUntil: 'domcontentloaded' });
        await page.getByRole('tab', { name: 'Chân dung cá nhân', exact: true }).waitFor();
        assert.equal(await page.locator('.packages-hero-moment-anchor').evaluate(el => getComputedStyle(el).animationName), 'none', 'photo entrance waits for the photograph');
        releaseImages();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => [...document.querySelectorAll('.packages-hero img')].every(img => img.complete && img.naturalWidth > 0), undefined, { timeout: 15000 });
        await page.waitForTimeout(1100);
        const sample = async y => {
          await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
          await page.waitForTimeout(550);
          return page.evaluate(() => {
            const read = selector => {
              const el = document.querySelector(selector), style = getComputedStyle(el), matrix = new DOMMatrix(style.transform);
              const box = el.getBoundingClientRect();
              return { x: matrix.m41, y: matrix.m42, transform: style.transform, width: style.width, height: style.height,
                left: box.left, right: box.right, top: box.top, bottom: box.bottom };
            };
            return { front: read('.packages-hero-moment'), back: read('.packages-hero-portrait'),
              copy: document.querySelector('.packages-hero-copy').getBoundingClientRect().right,
              heroBottom: document.querySelector('.packages-hero').getBoundingClientRect().bottom,
              overflow: document.documentElement.scrollWidth > innerWidth + 1 };
          });
        };
        const start = await sample(0);
        if (!process.env.HERO_BOUNDS_ONLY) await page.screenshot({ path: `qa-policy-checkbox/packages-hero-fan-${width}-${theme}-top.png` });
        const mid = await sample(width === 1440 ? 260 : 480);
        assert.equal(mid.overflow, false);
        assert.equal(mid.front.width, start.front.width);assert.equal(mid.front.height, start.front.height);
        assert.ok(mid.front.bottom < mid.heroBottom, 'front print stays above the catalog');
        if (width === 390) assert.ok(mid.front.left >= 0 && mid.front.right <= width, 'moving print stays inside the narrow viewport');
        if (width === 1440) {
          assert.ok(mid.front.y - start.front.y < -70, `front scroll movement is visible: ${mid.front.y - start.front.y}`);
          assert.ok(mid.front.x - start.front.x < -20);
          assert.ok(mid.back.y > mid.front.y, 'rear print travels more slowly');
          assert.ok(mid.front.left > mid.copy + 8, 'print stays clear of hero copy');
        }
        if (!process.env.HERO_BOUNDS_ONLY) await page.screenshot({ path: `qa-policy-checkbox/packages-hero-fan-${width}-${theme}-scroll.png` });
        const returned = await sample(0);
        assert.ok(Math.abs(returned.front.y - start.front.y) < 1, 'reverse scroll restores the same composition');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const reducedTop = await sample(0), reducedScroll = await sample(260);
        assert.equal(reducedTop.front.transform, reducedScroll.front.transform);
        assert.equal(reducedTop.back.transform, reducedScroll.back.transform);
        assert.equal(await page.locator('.packages-hero-moment-anchor').evaluate(el => getComputedStyle(el).animationName), 'none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.getByRole('link', { name: 'Tìm gói chụp của bạn', exact: false }).click();
        await page.getByRole('tab', { name: 'Gia đình', exact: true }).click();
        await page.getByRole('button', { name: 'Đặt lịch gói Gia đình', exact: true }).click();
        await page.locator('.booking-modal').waitFor();
        await page.waitForFunction(() => document.querySelector('.booking-modal .selected')?.textContent.includes('Gia đình'));
        await page.locator('.booking-modal-close').click();
        assert.deepEqual(errors, []);
        console.log('PASS', width, theme, 'image-ready entrance/hero separation/reverse/fixed geometry/no overflow/reduced motion/booking selected family');
      } finally { await context.close(); }
    }
  } finally { await browser.close();await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode = 1; });
