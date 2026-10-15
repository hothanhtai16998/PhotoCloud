const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const server = require('./admin-preview.cjs');
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const origin = 'http://127.0.0.1:' + server.address().port;
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
   const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block' });
   await context.addInitScript(value => localStorage.setItem('theme', value), theme);
   await context.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url());
    const response = await fetch(origin + url.pathname + url.search, { method: request.method(), headers: { 'Content-Type': 'application/json' }, body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postData() });
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
   });
   const page = await context.newPage(); const errors = [];
   page.on('pageerror', e => errors.push(e.message));
   for (const [route, heading, content] of [['collections', 'Bộ sưu tập', 'Những chuyến đi'], ['bookings', 'Đặt lịch chụp', 'Buổi sáng'], ['roles', 'Phân quyền quản trị', 'Xem người dùng'], ['logs', 'Nhật ký hệ thống', 'Đã cập nhật cài đặt']]) {
    await page.goto(origin + '/admin/' + route);
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
    await page.getByText(content, { exact: true }).first().waitFor();
    assert.equal(await page.locator(route === 'bookings' ? '.admin-tools .admin-page-header' : '.admin-tools .admin-header').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    const colors = await page.locator('.admin-tools th').first().evaluate(el => ({ actual: getComputedStyle(el).backgroundColor, desired: getComputedStyle(document.querySelector('.admin-layout')).backgroundColor }));
    assert.equal(colors.actual, colors.desired, 'Table header follows workspace surface');
    const text = await page.locator('.admin-tools').innerText();
    assert.ok(!/\b(Actions|System|SUPER ADMIN|viewUsers|morning|flexible)\b/.test(text), 'Interface uses Vietnamese labels');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Only table scrolls, not document');
    if (route === 'bookings') {
     const inactive = await page.getByRole('button', { name: 'Gói chụp', exact: true }).evaluate(el => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
     assert.notEqual(inactive.color, inactive.bg);
    }
    if (route === 'roles') assert.notEqual(await page.getByRole('button', { name: '+ Thêm quyền quản trị', exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
    await page.screenshot({ path: path.resolve(__dirname, '../admin-tab-' + route + '-' + width + '-' + theme + '.png'), fullPage: true });
   }
   assert.deepEqual(errors, []);
   await context.close(); console.log('PASS admin tools', width, theme);
  }
 } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
