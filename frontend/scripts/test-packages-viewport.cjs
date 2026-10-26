const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const base = [
    { slug: 'portrait', name: 'Chân dung cá nhân', category: 'portrait' },
    { slug: 'family', name: 'Gia đình', category: 'family' },
    { slug: 'mini-session', name: 'Mini session', category: 'mini' },
    { slug: 'couple', name: 'Couple', category: 'couple' },
  ].map((p, i) => ({ ...p, _id: 'p' + i, description: 'Buổi chụp lưu giữ những khoảnh khắc của bạn.', basePrice: 1500000 + i * 100000, durationMinutes: 60, includedPhotos: 20, includedPeople: 2, deliveryDays: 7 }));
  try {
    const environments = process.env.PACKAGES_CAPTURE_ONLY ? [[1440, 900, 'light'], [1440, 700, 'dark'], [1100, 620, 'light']]
      : [[1440, 900, 'light'], [1440, 900, 'dark'], [1440, 700, 'light'], [1440, 700, 'dark'], [1100, 620, 'light'], [390, 844, 'dark']];
    for (const [width, height, theme] of environments) {
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
      const packages = structuredClone(base);
      if (height === 620) packages[1].description = 'Nội dung dài cần đọc đầy đủ, không bị mất khi giữ khung gói. '.repeat(100);
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
      const realPhotos = process.env.PACKAGES_REAL_IMAGES === '1' && width === 1440 && height === 900 && theme === 'light';
      if (!realPhotos) await context.route('https://images.unsplash.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#9c8069"/></svg>' }));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/packages');
        await page.getByRole('tab', { name: base[0].name, exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        const selected = index => page.waitForFunction(index => document.querySelectorAll('[role="tab"]')[index]?.getAttribute('aria-selected') === 'true', index);
        const geometry = () => page.evaluate(() => {
          const catalog = document.querySelector('.packages-catalog'), card = document.querySelector('.package-card');
          const rect = catalog.getBoundingClientRect(), box = card.getBoundingClientRect();
          return { top: rect.top, height: rect.height, cardBottom: box.bottom, anchor: parseFloat(getComputedStyle(catalog).scrollMarginTop), y: scrollY,
            mode: getComputedStyle(catalog).getPropertyValue('--package-wheel-mode').trim() };
        });
        if (width < 900) {
          await page.mouse.wheel(0, 1000);
          await page.waitForFunction(() => scrollY > 100);
          assert.notEqual((await geometry()).mode, '1');
          await selected(0);
          await page.getByRole('tab', { name: base[1].name, exact: true }).click();await selected(1);
          console.log('PASS', width, height, theme, 'native narrow-screen scroll and tabs');
          continue;
        }
        const assertPinned = async y => {
          await page.waitForFunction(() => {
            const el = document.querySelector('.packages-catalog');
            return Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)) <= 2;
          });
          const box = await geometry();
          assert.ok(Math.abs(box.top - box.anchor) <= 2, JSON.stringify(box));
          assert.ok(Math.abs(box.height + box.anchor - height) <= 2, 'catalog fills available viewport');
          assert.ok(box.cardBottom <= height + 1, 'whole card stays in the viewport');
          if (y !== undefined) assert.ok(Math.abs(box.y - y) <= 2, 'wheel must not move the page between packages');
        };
        if (process.env.PACKAGES_CAPTURE_ONLY) {
          const targetY = await page.locator('.packages-catalog').evaluate(el => scrollY + el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop));
          await page.mouse.move(4, height / 2);
          await page.mouse.wheel(0, 1);
          // Model actual compositor/accelerated displacement that exceeds the raw wheel delta.
          await page.evaluate(y => scrollTo({ top: y + 240, behavior: 'instant' }), targetY);
          await page.waitForFunction(() => {
            const el = document.querySelector('.packages-catalog');
            return Math.abs(el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop)) <= 2;
          }, undefined, { timeout: 2500 });
          await selected(0);await assertPinned(targetY);
          await page.waitForTimeout(460);await page.mouse.wheel(0, 120);await selected(1);
          await page.evaluate(() => scrollBy({ top: 100, behavior: 'instant' }));
          await assertPinned(targetY);await selected(1);
          // A late layout change must move the pin, not unlock or skip a package.
          await page.locator('.packages-hero').evaluate(el => { el.style.marginBottom = '40px'; });
          await assertPinned(targetY + 40);await selected(1);
          await page.locator('.packages-hero').evaluate(el => { el.style.marginBottom = ''; });
          await assertPinned(targetY);
          await page.evaluate(() => document.activeElement?.blur());
          await page.keyboard.press('End');
          await page.waitForFunction(y => scrollY > y + 50, targetY);
          await page.waitForTimeout(650);
          await page.mouse.wheel(0, -1);
          await page.evaluate(y => scrollTo({ top: y - 180, behavior: 'instant' }), targetY);
          await assertPinned(targetY);await selected(3);
          await page.waitForTimeout(460);await page.mouse.wheel(0, -120);await selected(2);await assertPinned(targetY);
          assert.deepEqual(errors, []);
          console.log('PASS capture actual scroll in both directions / compositor drift / layout shift / keyboard escape', width, height, theme);
          continue;
        }
        await page.mouse.move(4, height / 2);
        await page.mouse.wheel(0, 2400);
        await selected(0);await assertPinned();
        const pinnedY = (await geometry()).y;
        for (let index = 1; index < base.length; index++) {
          await page.waitForTimeout(460);
          await page.mouse.wheel(0, 120);
          await selected(index);
          await page.mouse.wheel(0, 2400);
          await selected(index);await assertPinned(pinnedY);
        }
        await page.waitForFunction(() => {
          const prints = document.querySelectorAll('.package-stage-print');
          return prints.length === 1 && Number(getComputedStyle(prints[0]).opacity) === 1;
        });
        if (realPhotos) await page.waitForFunction(() => document.querySelector('.package-card img')?.naturalWidth > 0);
        await page.screenshot({ path: `qa-policy-checkbox/packages-viewport-${width}-${height}-${theme}.png` });
        await page.waitForTimeout(460);
        await page.mouse.wheel(0, 120);
        await page.waitForFunction(y => scrollY > y + 10, pinnedY);
        await page.mouse.wheel(0, -2400);
        await selected(3);await assertPinned();
        for (let index = 2; index >= 0; index--) {
          await page.waitForTimeout(460);
          await page.mouse.wheel(0, -120);
          await selected(index);
          await page.mouse.wheel(0, -2400);
          await selected(index);await assertPinned(pinnedY);
        }
        await page.waitForTimeout(460);await page.mouse.wheel(0, -120);
        await page.waitForFunction(y => scrollY < y - 10, pinnedY);
        // Re-enter after releasing, including the same direction after a scrollbar jump.
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.mouse.wheel(0, 2400);await selected(0);await assertPinned();
        await page.getByRole('tab', { name: base[1].name, exact: true }).click();await selected(1);
        if (height === 620) {
          const body = page.locator('.package-card-body');
          assert.ok(await body.evaluate(el => el.scrollHeight > el.clientHeight), 'long content has its own scroll area');
          await body.hover();await page.mouse.wheel(0, 100);
          await page.waitForFunction(() => document.querySelector('.package-card-body').scrollTop > 0);
          await selected(1);await assertPinned(pinnedY);
          await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
        }
        await page.getByRole('button', { name: 'Đặt lịch gói Gia đình', exact: true }).click();
        await page.locator('.booking-modal').waitFor();
        await page.waitForFunction(() => document.querySelector('.booking-modal .selected')?.textContent.includes('Gia đình'));
        await page.locator('.booking-modal').hover();await page.mouse.wheel(0, 500);
        await selected(1);
        await page.locator('.booking-modal-close').click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(460);await page.mouse.move(4, height / 2);await page.mouse.wheel(0, 120);
        await selected(2);await assertPinned(pinnedY);
        assert.deepEqual(errors, []);
        console.log('PASS', width, height, theme, 'viewport/4 steps/bursts/both end exits/re-entry/modal/reduced motion', height === 620 ? '/long copy scroll' : '');
      } finally { await context.close(); }
    }
  } finally { await browser.close();await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode = 1; });
