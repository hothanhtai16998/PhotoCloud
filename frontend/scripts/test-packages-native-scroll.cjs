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

        const start = await page.locator('.packages-scroll-track').evaluate(el => scrollY + el.getBoundingClientRect().top - 80);
        const distance = await page.locator('.packages-scroll-track').evaluate(el => el.offsetHeight - el.firstElementChild.offsetHeight);
        const positions=[];
        for (const delta of [-81,-40,-5,0,5,40,81]) {
          await page.evaluate(y => scrollTo({top:y,behavior:'instant'}),start+delta);
          await page.waitForTimeout(40);
          positions.push((await geometry()).top);
          await selected(0);
        }
        assert.ok(Math.abs(positions[3]-100)<2,'soft pin peaks 20px below anchor');
        assert.ok(positions[2]>positions[3] && positions[3]>positions[4],'continuous entry movement');
        assert.ok(Math.abs((positions[2]-positions[3])-(positions[3]-positions[4]))<1,'velocity joins smoothly');
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),start);
        await page.waitForTimeout(40);
        assert.ok(Math.abs((await geometry()).top-80)<2,'reduced motion keeps native pin');
        await page.emulateMedia({reducedMotion:'no-preference'});
        for (const i of [0,1,2,3,2,1,0]) {
          await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), start + distance * ((i + .25) / 4));
          await selected(i);
          const box = await geometry();
          assert.ok(Math.abs(box.top - 80) < 3, JSON.stringify(box));
          assert.ok(box.cardBottom <= height + 1);
        }
        await page.getByRole('tab', {name:base[3].name,exact:true}).click();await selected(3);
        await page.waitForTimeout(450);
        await page.screenshot({path:'qa-policy-checkbox/packages-native-stage-'+width+'-'+height+'-'+theme+'.png'});
        await page.mouse.move(5, height/2);
        const before = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, -180);await page.waitForTimeout(200);
        assert.ok(await page.evaluate(() => scrollY) < before, 'wheel must move native document');
        await page.locator('.package-stage-scroll-hint a').click();
        await page.waitForFunction(() => document.querySelector('#packages-custom').getBoundingClientRect().top < innerHeight);
        assert.deepEqual(errors,[]);
        await page.screenshot({path:'qa-policy-checkbox/packages-native-'+width+'-'+height+'-'+theme+'.png'});
        console.log('PASS',width,height,theme,'native sticky progress both directions, direct tab, wheel moves, skip');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode=1; });
