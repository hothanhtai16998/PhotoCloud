const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const outputDir = process.env.BOOKING_QA_OUTPUT_DIR || path.resolve(__dirname, '..');
fs.mkdirSync(outputDir, { recursive: true });
(async () => {
 const server = require('./admin-preview.cjs'); await new Promise(r => server.listen(0, '127.0.0.1', r));
 const origin = 'http://127.0.0.1:' + server.address().port;
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
   const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 720 : width === 320 ? 568 : 844 }, serviceWorkers: 'block' });
   await context.addInitScript(value => localStorage.setItem('theme', value), theme);
   const calls = []; let failUpdate = false;
   await context.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); calls.push({ path: url.pathname, method: req.method(), body: req.postData() });
    if (failUpdate && req.method() === 'PATCH') return route.fulfill({ status: 503, json: { message: 'Chưa thể cập nhật lịch thử nghiệm' } });
    const response = await fetch(origin + url.pathname + url.search, { method: req.method(), headers: { 'Content-Type': 'application/json' }, body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData() });
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
   });
   const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
   await page.goto(origin + '/admin/bookings');
   const list = page.locator(width < 801 ? '.booking-request-mobile-list' : '.booking-request-table');
   await list.getByText('Minh An', { exact: true }).waitFor();
   const confirmedRow = list.locator(width < 801 ? 'article' : 'tbody tr').filter({ hasText: 'Hoàng Linh' });
   await confirmedRow.getByRole('button', { name: /Chi tiết|Xem chi tiết/ }).click();
   await page.locator('.booking-action-choice').filter({ hasText: 'Hoàn thành buổi chụp' }).click();
   const completeButton = page.getByRole('button', { name: 'Xác nhận hoàn thành', exact: true });
   assert.ok(await completeButton.isEnabled());
   await page.screenshot({ path: path.resolve(outputDir, 'booking-process-confirmed-' + width + '-' + theme + '.png') });
   await page.getByRole('button', { name: 'Đóng', exact: true }).click();
   assert.equal(calls.filter(c => /bookings\/admin\/(packages|availability|reviews|policy)/.test(c.path)).length, 0, 'Do not load inactive tabs');
   await page.screenshot({ path: path.resolve(outputDir, 'booking-workspace-' + width + '-' + theme + '.png'), fullPage: true });
   await page.getByRole('group', { name: 'Lọc nhanh trạng thái' }).getByRole('button', { name: 'Chờ xử lý', exact: true }).click();
   await page.waitForURL('**status=pending');
   await list.getByText('Hoàng Linh', { exact: true }).waitFor({ state: 'hidden' });
   await page.getByRole('group', { name: 'Lọc nhanh trạng thái' }).getByRole('button', { name: 'Tất cả', exact: true }).click();
   await list.getByText('Thu Hà', { exact: true }).waitFor();
   await page.getByRole('searchbox', { name: 'Tìm yêu cầu đặt lịch' }).fill('PC-003');
   await page.getByRole('button', { name: 'Tìm', exact: true }).click();
   await list.getByText('Minh An', { exact: true }).waitFor({ state: 'hidden' });
   await list.getByRole('button', { name: /Chi tiết|Xem chi tiết/ }).click();
   await page.getByRole('dialog').waitFor();
   assert.equal(await page.getByLabel('Trạng thái mới', { exact: true }).count(), 0, 'Closed booking is read only');
   await page.getByRole('button', { name: 'Đóng', exact: true }).click();
   await page.getByRole('button', { name: 'Xóa tìm kiếm', exact: true }).click();
   await list.getByText('Minh An', { exact: true }).waitFor();
   await list.getByRole('button', { name: /Chi tiết|Xem chi tiết/ }).first().click();
   const dialog = page.getByRole('dialog'); await dialog.waitFor();
   const assertFooter = async () => {
    const footer = await page.locator('.booking-detail-modal > .admin-modal-footer').boundingBox();
    const bounds = await dialog.boundingBox();
    assert.ok(footer && bounds && footer.y + footer.height <= bounds.y + bounds.height + 1 && footer.y + footer.height <= page.viewportSize().height, 'Footer stays within dialog and viewport');
    for (const button of await page.locator('.booking-footer-buttons button').all()) { const b = await button.boundingBox(); assert.ok(b.y >= footer.y && b.y + b.height <= footer.y + footer.height + 1); }
   };
   await assertFooter();
   const updatesBefore = calls.filter(c => c.method === 'PATCH').length;
   await page.locator('.booking-action-choice').filter({ hasText: 'Xác nhận lịch chụp' }).click();
   assert.equal(calls.filter(c => c.method === 'PATCH').length, updatesBefore, 'Choosing a status must not save');
   await page.getByLabel('Ngày chụp', { exact: true }).fill('2026-10-21');
   await page.getByLabel('Bắt đầu', { exact: true }).fill('09:00');
   await page.getByLabel('Kết thúc', { exact: true }).fill('10:00');
   const beforeTabs = await dialog.boundingBox();
   await page.getByRole('tab', { name: /Lịch sử trạng thái/ }).click();
   const afterTabs = await dialog.boundingBox();
   const matchingColors = await page.locator('.booking-history-timeline li').evaluateAll(items => items.every(item => {
    const tone = item.dataset.tone;
    const sample = document.createElement('span');
    sample.className = 'booking-state ' + tone;
    item.append(sample);
    const expected = getComputedStyle(sample).color;
    const actual = getComputedStyle(item.querySelector('strong')).color;
    const iconColor = getComputedStyle(item.querySelector('.booking-history-icon')).color;
    sample.remove();
    return expected === actual && actual === iconColor;
   }));
   assert.ok(matchingColors, 'History and badge share status colors');
   assert.ok(Math.abs(beforeTabs.height - afterTabs.height) < 1 && Math.abs(beforeTabs.y - afterTabs.y) < 1, 'Tab switch preserves modal frame');
   assert.equal(await page.getByRole('button', { name: 'Xác nhận lịch chụp', exact: true }).count(), 0);
   await page.screenshot({ path: path.resolve(outputDir, 'booking-history-' + width + '-' + theme + '.png') });
   await page.getByRole('tab', { name: 'Thông tin yêu cầu', exact: true }).click();
   assert.equal(await page.getByLabel('Ngày chụp', { exact: true }).inputValue(), '2026-10-21', 'Draft preserved across tabs');
   await assertFooter();
   await page.screenshot({ path: path.resolve(outputDir, 'booking-detail-' + width + '-' + theme + '.png') });
   if (width === 1440 && theme === 'dark') {
    failUpdate = true; await page.getByRole('button', { name: 'Xác nhận lịch chụp', exact: true }).click();
    await page.getByRole('alert').getByText('Chưa thể cập nhật lịch thử nghiệm').waitFor();
    assert.equal(await page.getByLabel('Ngày chụp', { exact: true }).inputValue(), '2026-10-21');
    failUpdate = false;
    const updated = page.waitForRequest(r => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'Xác nhận lịch chụp', exact: true }).click();
    const body = (await updated).postDataJSON(); assert.equal(body.status, 'confirmed'); assert.equal(body.confirmedStartTime, '09:00');
    await dialog.waitFor({ state: 'detached' });
   } else await page.getByRole('button', { name: 'Đóng', exact: true }).click();
   assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
   assert.deepEqual(errors, []);
   await context.close(); console.log('PASS booking workspace', width, theme);
  }
 } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });


