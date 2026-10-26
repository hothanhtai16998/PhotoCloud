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
      const populated = width===1440 && height===900 && theme==='dark';
      if(populated)Object.assign(packages[0], {detailDescription:'Chi tiết do admin nhập',includes:['Quyền lợi do admin nhập'],coverUrl:'https://example.com/cover.avif',gallery:['https://example.com/a.avif','https://example.com/b.avif']});
      await context.route('https://example.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#8b7359"/></svg>'}));
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

        await page.locator('.package-service').first().waitFor();
        assert.equal(await page.locator('.package-service').count(),4);
        assert.equal(await page.locator('.package-service-photo--main img').count(),populated?1:0);
        if(populated){assert.equal(await page.locator('#service-portrait .package-service-gallery a').count(),2);await page.getByText('Chi tiết do admin nhập',{exact:true}).waitFor();await page.getByText('Quyền lợi do admin nhập',{exact:true}).waitFor();}
        assert.equal(await page.locator('.package-service-gallery').count(),4);
        await page.locator('.package-service-jumps a').filter({hasText:'Couple'}).click();
        await page.waitForFunction(()=>document.querySelector('#service-couple').getBoundingClientRect().top<150);
        const section=page.locator('#service-couple');
        await section.getByRole('button',{name:'Đặt lịch gói Couple',exact:true}).click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({state:'hidden'});
        await page.evaluate(()=>{const el=document.querySelector('#service-portrait');scrollTo({top:scrollY+el.getBoundingClientRect().top-100,behavior:'instant'});});await page.waitForTimeout(100);
        await page.screenshot({path:'qa-policy-checkbox/services-'+width+'-'+height+'-'+theme+'.png'});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.goto(origin+'/packages/portrait');
        await page.getByRole('heading',{name:base[0].name,exact:true}).waitFor();
        assert.equal(await page.locator('.package-service-photo--main').count(),1);
        assert.deepEqual(errors,[]);
        console.log('PASS',width,height,theme,'service sections, empty media, anchors, booking modal, direct detail');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode=1; });
