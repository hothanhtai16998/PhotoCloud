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
      let submitted=null;
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (url.pathname === '/api/users/me') return route.fulfill({ json: { user: { _id: 'viewer', username: 'viewer', displayName: 'Viewer' } } });
        if (url.pathname === '/api/bookings/packages') return route.fulfill({ json: { success: true, packages } });
        if(url.pathname==='/api/bookings' && route.request().method()==='POST'){submitted=route.request().postDataJSON();return route.fulfill({json:{success:true,booking:{bookingCode:'TEST-0800'}}});}
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

        const dialog=page.getByRole('dialog');await dialog.waitFor();
        await dialog.getByRole('heading',{name:'Thời gian và địa điểm',exact:true}).waitFor();
        assert.equal(await dialog.getByRole('heading',{name:'Chọn gói phù hợp'}).count(),0);
        assert.equal(await dialog.getByText('Gói đã chọn:',{exact:false}).count(),0);
        assert.equal(await dialog.getByRole('button',{name:'Đổi gói',exact:true}).count(),0);
        const today=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
        assert.equal(await dialog.locator(`[data-date="${today}"]`).getAttribute('aria-pressed'),'true');
        await dialog.getByRole('button',{name:'Tháng sau',exact:true}).click();
        await dialog.getByRole('button',{name:'Loại địa điểm:',exact:false}).click();
        await page.getByRole('menuitemradio',{name:'Studio',exact:true}).click();
        await dialog.getByRole('button',{name:'Loại địa điểm: Studio',exact:true}).click();
        await page.screenshot({path:'qa-policy-checkbox/booking-location-menu-'+width+'-'+height+'-'+theme+'.png'});
        await page.keyboard.press('Escape');
        await dialog.waitFor();
        await dialog.getByRole('button',{name:'Loại địa điểm: Studio',exact:true}).focus();
        await page.keyboard.press('ArrowDown');
        await page.getByRole('menuitemradio',{name:'Ngoại cảnh',exact:true}).click();
        const dateButton=dialog.locator('[data-date]:not([disabled])').first();
        const selectedDate=await dateButton.getAttribute('data-date');
        await dateButton.click();
        assert.equal(await dateButton.getAttribute('aria-pressed'),'true');
        await dialog.getByRole('radio',{name:'08:15',exact:true}).check();
        await dialog.getByRole('radio',{name:'Linh hoạt — trao đổi với studio',exact:true}).check();
        await dialog.getByRole('radio',{name:'08:00',exact:true}).check();
        assert.equal(await dialog.getByLabel('Địa chỉ / khu vực',{exact:false}).count(),0);
        await page.waitForTimeout(350);
        await page.screenshot({path:'qa-policy-checkbox/booking-time-'+width+'-'+height+'-'+theme+'.png'});
        await dialog.getByRole('button',{name:'Tiếp tục',exact:false}).click();
        await dialog.getByRole('button',{name:'Tiếp tục',exact:false}).click();
        await dialog.locator('[aria-invalid=true]').first().waitFor();
        assert.ok(await dialog.locator('[aria-invalid=true]').count() >= 3);
        await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-invalid')==='true');
        await dialog.getByLabel('Địa chỉ / khu vực',{exact:true}).fill('Địa điểm thử nghiệm');
        await dialog.getByLabel('Họ và tên',{exact:true}).fill('Khách thử nghiệm');
        await dialog.getByLabel('Email',{exact:true}).fill('test@example.com');
        await dialog.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');
        await dialog.getByRole('button',{name:'Tiếp tục',exact:false}).click();
        await dialog.getByText(selectedDate+' · 08:00',{exact:true}).waitFor();
        await dialog.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();
        await dialog.getByRole('heading',{name:'Đã gửi yêu cầu',exact:true}).waitFor();
        assert.equal(submitted.requestedDate,selectedDate);assert.equal(submitted.requestedStartTime,'08:00');assert.equal(submitted.requestedTimeSlot,'morning');assert.equal(submitted.packageSlug,'couple');
        await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('photocloud:open-booking-modal',{detail:{}})));
        await dialog.getByRole('heading',{name:'Chọn gói phù hợp',exact:true}).waitFor();
        await page.keyboard.press('Escape');
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('photocloud:open-booking-modal',{detail:{selectedPackageId:'missing-package'}})));
        await dialog.getByRole('heading',{name:'Chọn gói phù hợp',exact:true}).waitFor();
        await page.keyboard.press('Escape');
        await page.evaluate(()=>window.dispatchEvent(new CustomEvent('photocloud:open-booking-modal',{detail:{selectedPackageId:'family'}})));
        await dialog.getByRole('heading',{name:'Thời gian và địa điểm',exact:true}).waitFor();
        assert.equal(await dialog.getByRole('button',{name:'Đổi gói',exact:true}).count(),0);
        assert.equal(await dialog.locator(`[data-date="${selectedDate}"]`).getAttribute('aria-pressed'),'true');
        await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});

        assert.deepEqual(errors,[]);
        console.log('PASS',width,height,theme,'skip package,08:00 payload,generic/invalid fallback,no change-package button');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode=1; });
