const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const packages = [
    { _id: 'p1', slug: 'portrait', name: 'Chân dung cá nhân', description: 'Một buổi chụp tập trung vào cá tính và phong cách riêng của bạn.', category: 'portrait', basePrice: 1500000, durationMinutes: 60, includedPhotos: 20, includedPeople: 1, deliveryDays: 8 },
    { _id: 'p2', slug: 'family', name: 'Gia đình', description: 'Buổi chụp ấm áp cho gia đình, tối đa sáu người.', category: 'family', basePrice: 3200000, durationMinutes: 120, includedPhotos: 50, includedPeople: 6, deliveryDays: 9 },
    { _id: 'p3', slug: 'mini-session', name: 'Mini session', description: 'Một buổi chụp ngắn gọn và linh hoạt cho những dịp đặc biệt.', category: 'mini', basePrice: 900000, durationMinutes: 30, includedPhotos: 10, includedPeople: 1, deliveryDays: 4 },
    { _id: 'p4', slug: 'couple', name: 'Couple', description: 'Ghi lại những khoảnh khắc tự nhiên của hai người.', category: 'couple', basePrice: 2200000, durationMinutes: 90, includedPhotos: 35, includedPeople: 2, deliveryDays: 7 },
  ];
  try {
    for (const width of (process.env.PACKAGES_MOTION_MEASURE ? [1440] : [1440, 390])) for (const theme of (process.env.PACKAGES_MOTION_MEASURE ? ['light'] : ['light', 'dark'])) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => { localStorage.setItem('theme', theme); sessionStorage.setItem('hasAuth', 'true'); }, theme);
      let fail = false, empty = false, brokenImage = false;
      await context.route('**/api/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (u.pathname === '/api/users/me') return route.fulfill({ json: { user: { _id: 'viewer', username: 'viewer', displayName: 'Viewer' } } });
        if (u.pathname === '/api/bookings/packages') return route.fulfill(fail ? { status: 503, json: { message: 'Fixture unavailable' } } : { json: { success: true, packages: empty ? [] : packages } });
        if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: {} });
        const res = await fetch(origin + u.pathname + u.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      await context.route('https://images.unsplash.com/**', route => {
        if (brokenImage) return route.fulfill({ status: 404, body: '' });
        if (process.env.PACKAGES_REAL_IMAGES === '1') return route.continue();
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#9c8069"/></svg>' });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/packages');
        await page.locator('.package-card').last().waitFor();
        if (process.env.PACKAGES_MOTION_MEASURE) {
          await page.evaluate(() => document.fonts.ready);
          const session = await context.newCDPSession(page);
          await session.send('Performance.enable');
          const metrics = async () => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
          const before = await metrics();
          const gaps = await page.evaluate(async () => {
            document.documentElement.style.scrollBehavior = 'auto';
            const target = document.querySelector('.package-stage').getBoundingClientRect().top + scrollY - 112;
            const gaps = []; let previous = performance.now();
            for (let frame = 0; frame <= 90; frame++) {
              scrollTo({ top: target * frame / 90, behavior: 'instant' });
              await new Promise(resolve => requestAnimationFrame(resolve));
              const now = performance.now(); gaps.push(now - previous); previous = now;
            }
            return gaps.slice(1).sort((a, b) => a - b);
          });
          const after = await metrics();
          console.log(JSON.stringify({ browser: await browser.version(), viewport: '1440x1000', fixture: '4 packages / SVG images / fonts ready / 90 scripted scroll frames', LayoutCount: after.LayoutCount - before.LayoutCount, RecalcStyleCount: after.RecalcStyleCount - before.RecalcStyleCount, LayoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, rafP95Ms: gaps[Math.floor(gaps.length * .95)], rafOver32ms: gaps.filter(g => g > 32).length }));
          continue;
        }
        assert.equal(await page.locator('.package-card').count(), 1);
        assert.equal(await page.getByRole('tab').count(), packages.length);
        assert.deepEqual(await page.getByRole('tab').allTextContents(), packages.map(pkg => pkg.name));
        assert.equal(await page.locator('.packages-comparison').count(), 0, 'duplicate comparison removed');
        const waitPrint = () => page.waitForFunction(() => {
          const prints = document.querySelectorAll('.package-stage-print');
          if (prints.length !== 1) return false;
          const style = getComputedStyle(prints[0]);
          return Number(style.opacity) === 1 && (style.transform === 'none' || new DOMMatrix(style.transform).m42 === 0);
        });
        const assertSelected = async name => {
          await page.getByRole('tabpanel', { name, exact: true }).waitFor();
          assert.equal(await page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true');
          await waitPrint();
        };
        await page.getByRole('tab', { name: 'Gia đình', exact: true }).click();
        await assertSelected('Gia đình');
        assert.equal(await page.getByRole('tab', { name: 'Gia đình', exact: true }).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('End');
        await assertSelected('Couple');
        assert.equal(await page.getByRole('button', { name: 'Gói tiếp theo', exact: true }).isDisabled(), true);
        await page.keyboard.press('Home');
        await assertSelected('Chân dung cá nhân');
        assert.equal(await page.getByRole('button', { name: 'Gói trước', exact: true }).isDisabled(), true);
        await page.keyboard.press('ArrowRight');
        await assertSelected('Gia đình');
        await page.getByRole('button', { name: 'Gói trước', exact: true }).click();
        await assertSelected('Chân dung cá nhân');
        const art = page.locator('.package-stage-art');
        await art.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 300, clientY: 200 });
        await art.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 150, clientY: 205 });
        await assertSelected('Gia đình');
        await art.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 300, clientY: 200 });
        await art.dispatchEvent('pointercancel', { pointerType: 'touch' });
        await art.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 150, clientY: 205 });
        await assertSelected('Gia đình');
        await page.getByRole('tab', { name: 'Mini session', exact: true }).click();
        await page.getByRole('tab', { name: 'Chân dung cá nhân', exact: true }).click();
        await assertSelected('Chân dung cá nhân');
        if (width === 1440) {
          const stage = page.locator('.package-stage');
          await stage.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 112, behavior: 'instant' }));
          const hoverStage = async () => {
            const bounds = await stage.boundingBox();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          };
          await hoverStage();
          await page.mouse.wheel(0, 100);
          await page.mouse.wheel(0, 100);
          await page.mouse.wheel(0, 100);
          await assertSelected('Gia đình');
          const heldY = await page.evaluate(() => scrollY);
          const stageY = (await stage.boundingBox()).y;
          assert.ok(Math.abs(stageY - 112) < 3, `stage stays aligned below header: y=${stageY}, scroll=${heldY}`);
          for (const pkg of packages.slice(2)) {
            await page.mouse.wheel(0, 100);
            await assertSelected(pkg.name);
          }
          assert.equal(await page.evaluate(() => scrollY), heldY, 'wheel changes packages without scrolling to footer');
          await page.mouse.wheel(0, 150);
          await page.waitForFunction(y => scrollY > y, heldY);
          await hoverStage();
          // Entering from below first presents the last package again.
          await page.mouse.wheel(0, -100);
          await assertSelected('Couple');
          await page.waitForTimeout(570);
          for (const pkg of packages.slice(0, -1).reverse()) {
            await page.mouse.wheel(0, -100);
            await assertSelected(pkg.name);
          }
          const firstY = await page.evaluate(() => scrollY);
          await page.mouse.wheel(0, -150);
          await page.waitForFunction(y => scrollY < y, firstY);
          // Large wheel deltas with the pointer in the page margin cannot skip the stage.
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await page.mouse.move(4, 400);
          await page.mouse.wheel(0, 1800);
          await page.waitForFunction(() => Math.abs(document.querySelector('.package-stage').getBoundingClientRect().top - 112) < 3);
          await assertSelected('Chân dung cá nhân');
          await page.waitForTimeout(570);
          await page.mouse.wheel(0, 100);
          await assertSelected('Gia đình');
          await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await page.mouse.move(4, 400);
          await page.mouse.wheel(0, -1800);
          await page.waitForFunction(() => Math.abs(document.querySelector('.package-stage').getBoundingClientRect().top - 112) < 3);
          await assertSelected('Couple');
          await page.waitForTimeout(570);
          await page.mouse.wheel(0, -100);
          await assertSelected('Mini session');
          await page.getByRole('tab', { name: 'Chân dung cá nhân', exact: true }).click();
          await assertSelected('Chân dung cá nhân');
          await page.setViewportSize({ width: 1440, height: 760 });
          await stage.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 112, behavior: 'instant' }));
          await page.mouse.move(4, 400);
          await page.mouse.wheel(0, 100);
          await assertSelected('Gia đình');
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.getByRole('tab', { name: 'Chân dung cá nhân', exact: true }).click();
          await assertSelected('Chân dung cá nhân');
          console.log('PASS wheel next/back/hold stage/momentum/end release', theme);
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.getByRole('button', { name: 'Gói tiếp theo', exact: true }).click();
        await assertSelected('Gia đình');
        assert.equal(await page.locator('.package-stage-print').evaluate(el => getComputedStyle(el).transform), 'none');
        await page.getByRole('button', { name: 'Gói trước', exact: true }).click();
        await assertSelected('Chân dung cá nhân');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.getByRole('button', { name: 'Gói tiếp theo', exact: true }).click();
        await page.waitForFunction(() => [...document.querySelectorAll('.package-stage-print')].some(el => {
          const style = getComputedStyle(el);
          return Number(style.opacity) > 0 && Number(style.opacity) < 1 && style.transform !== 'none';
        }));
        await assertSelected('Gia đình');
        await page.getByRole('button', { name: 'Gói trước', exact: true }).click();
        await assertSelected('Chân dung cá nhân');
        assert.match(await page.locator('.package-card-price').first().textContent(), /1\.500\.000đ/);
        await page.evaluate(() => {
          document.documentElement.style.scrollBehavior = 'auto';
          scrollTo({ top: 0, left: 0, behavior: 'instant' });
        });
        if (process.env.PACKAGES_REAL_IMAGES === '1') {
          await page.locator('.packages-page img').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
          await page.waitForFunction(() => [...document.querySelectorAll('.packages-page img')].every(img => img.complete && img.naturalWidth > 0));
          await page.evaluate(() => document.fonts.ready);
          await page.locator('.packages-page img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (width === 1440) {
          const sample = async y => {
            await page.evaluate(async y => {
              scrollTo({ top: y, behavior: 'instant' });
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }, y);
            return page.evaluate(() => {
              const source = document.querySelector('.packages-hero-portrait');
              const style = getComputedStyle(source);
              return { width: style.width, height: style.height, padding: style.padding, stageOpacity: getComputedStyle(document.querySelector('.package-stage-art')).opacity };
            });
          };
          const start = await sample(0), mid = await sample(180), end = await sample(600);
          for (const current of [mid, end]) {
            assert.equal(current.width, start.width, 'scroll never resizes hero print');
            assert.equal(current.height, start.height);
            assert.equal(current.padding, start.padding);
            assert.equal(current.stageOpacity, '1', 'package photo never waits for a flying hero');
          }
          await page.screenshot({ path: `qa-policy-checkbox/packages-calm-reading-${theme}.png` });
          await sample(0);
          console.log('PASS bounded hero/stable geometry/always-visible package', theme);
        }
        if (width === 1440) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight < 3000), 'stage replaces repeated long sections');
        await page.screenshot({ path: `qa-policy-checkbox/packages-stage-${width}-${theme}.png`, fullPage: true });
        await page.locator('.package-stage').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 112, behavior: 'instant' }));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.screenshot({ path: `qa-policy-checkbox/packages-stage-focus-${width}-${theme}.png` });
        const choose = page.getByRole('button', { name: 'Đặt lịch gói Chân dung cá nhân', exact: true });
        await choose.focus();
        await page.keyboard.press('Enter');
        await page.locator('.booking-modal').waitFor();
        await page.waitForFunction(() => document.querySelector('.booking-modal .selected')?.textContent.includes('Chân dung cá nhân'));
        await page.locator('.booking-modal-close').click();
        assert.equal(await choose.evaluate(el => document.activeElement === el), true, 'booking dialog restores focus');
        await page.getByRole('link', { name: 'Xem chi tiết gói Chân dung cá nhân', exact: true }).click();
        await page.getByRole('heading', { name: 'Chân dung cá nhân', exact: true }).waitFor();
        await page.getByText('Giao ảnh trong 8 ngày', { exact: true }).waitFor();
        await page.screenshot({ path: `qa-policy-checkbox/package-detail-${width}-${theme}.png`, fullPage: true });
        await page.goBack();
        await page.locator('.package-card').last().waitFor();
        assert.equal(await page.getByRole('tab').count(), packages.length);
        await page.getByRole('link', { name: 'Xem chi tiết gói Chân dung cá nhân', exact: true }).click();
        await page.getByRole('button', { name: 'Đặt lịch gói này', exact: true }).click();
        await page.locator('.booking-modal').waitFor();
        await page.waitForFunction(() => document.querySelector('.booking-modal .selected')?.textContent.includes('Chân dung cá nhân'));
        await page.locator('.booking-modal-close').click();
        await page.getByRole('link', { name: 'Tất cả gói chụp', exact: true }).click();
        await page.getByRole('button', { name: 'Trao đổi về buổi chụp', exact: true }).click();
        await page.locator('.booking-modal').waitFor();
        await page.locator('.booking-modal-close').click();
        await page.goto(origin + '/packages/mini-session');
        await page.getByText('Giao ảnh trong 4 ngày', { exact: true }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: 'Mini session', exact: true }).waitFor();
        brokenImage = true;
        await page.reload();
        await page.getByRole('heading', { name: 'Mini session', exact: true }).waitFor();
        await page.waitForFunction(() => !document.querySelector('.package-detail .package-photo'));
        brokenImage = false;
        await page.goto(origin + '/packages/not-a-package');
        await page.getByRole('heading', { name: 'Không tìm thấy gói chụp này', exact: true }).waitFor();
        fail = true;
        await page.goto(origin + '/packages');
        await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
        assert.match(await page.locator('.packages-source-note').textContent(), /thông tin tham khảo/);
        fail = false;
        await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
        await page.locator('.packages-source-note').waitFor({ state: 'detached' });
        assert.equal(await page.locator('.package-card').count(), 1);
        packages.push({ ...packages[0], _id: 'p4', slug: 'unknown-category', category: 'unknown', name: 'Gói chưa có ảnh' });
        await page.reload();
        await page.getByRole('tab', { name: 'Gói chưa có ảnh', exact: true }).click(); await waitPrint();
        assert.equal(await page.locator('.package-card .package-photo').count(), 0, 'unknown category does not borrow a portrait');
        packages.pop();
        empty = true;
        await page.reload();
        await page.getByRole('heading', { name: 'Hiện chưa có gói chụp', exact: true }).waitFor();
        assert.equal(await page.locator('.package-card').count(), 0);
        assert.equal(await page.locator('.packages-comparison').count(), 0);
        empty = false;
        brokenImage = true;
        await page.reload();
        await page.locator('.package-card').last().waitFor();
        await page.waitForFunction(() => !document.querySelector('.packages-page .package-photo'));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('.packages-hero-photos').evaluate(el => getComputedStyle(el).animationName), 'none');
        assert.deepEqual(errors, []);
        console.log('PASS packages', width, theme, 'API/detail/live includes/modal preselection/custom/refresh/not found/fallback retry/empty');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
