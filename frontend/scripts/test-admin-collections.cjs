const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const server = require('./admin-preview.cjs');
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const origin = 'http://127.0.0.1:' + server.address().port;
 let browser;
 try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  let failList = false, failDelete = true, publicState = true;
  const mutations = [];
  await context.route('**/api/**', async route => {
   const request = route.request(), url = new URL(request.url());
   if (url.pathname.endsWith('/admin/collections')) {
    if (failList) return route.fulfill({ status: 503, json: { message: 'Lỗi tải thử nghiệm' } });
    const q = url.searchParams.get('search');
    if (q === 'slow') await new Promise(r => setTimeout(r, 350));
    const rows = q === 'none' ? [] : [{ _id: 'one', name: q === 'slow' ? 'Kết quả cũ' : 'Bộ sưu tập tiếng Việt', description: 'Mô tả '.repeat(30), createdBy: null, imageCount: 3, views: null, isPublic: publicState, createdAt: 'invalid' }];
    return route.fulfill({ json: { collections: rows, pagination: { page: 1, pages: 1, total: rows.length } } });
   }
   if (url.pathname.endsWith('/admin/collections/one')) {
    mutations.push(request.method());
    if (request.method() === 'DELETE' && failDelete) return route.fulfill({ status: 503, json: { message: 'Chưa xóa được' } });
    if (request.method() === 'PUT') { assert.deepEqual(request.postDataJSON(), { isPublic: false }); publicState = false; }
    return route.fulfill({ json: { collection: {} } });
   }
   const response = await route.fetch({ url: origin + url.pathname + url.search });
   return route.fulfill({ response });
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/admin/collections');
  await page.getByText('Chưa rõ người tạo', { exact: true }).waitFor();
  await page.getByText('Chưa rõ ngày', { exact: true }).waitFor();
  for (const theme of ['light', 'dark']) {
   await page.evaluate(t => document.documentElement.classList.toggle('dark-theme', t === 'dark'), theme);
   await page.screenshot({ path: `qa-policy-checkbox/admin-collections-${theme}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Ẩn Bộ sưu tập tiếng Việt', exact: true }).click();
  await page.getByText('Riêng tư', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Xóa Bộ sưu tập tiếng Việt', exact: true }).click();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.deepEqual(mutations, ['PUT']);
  const trigger = page.getByRole('button', { name: 'Xóa Bộ sưu tập tiếng Việt', exact: true });
  await trigger.click();
  await page.getByRole('button', { name: 'Xóa bộ sưu tập', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Chưa xóa được' }).waitFor(); assert.equal(await page.getByRole('dialog').count(), 1);
  failDelete = false; await page.getByRole('button', { name: 'Xóa bộ sưu tập', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' }); assert.deepEqual(mutations, ['PUT', 'DELETE', 'DELETE']);
  failList = true; await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); assert.equal(await page.getByText('Chưa có bộ sưu tập', { exact: true }).count(), 0);
  failList = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await page.getByText('Bộ sưu tập tiếng Việt', { exact: true }).waitFor();
  const box = page.getByRole('searchbox', { name: 'Tìm bộ sưu tập' });
  await box.fill('slow'); const request = page.waitForRequest(r => r.url().includes('search=slow'));
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click(); await request;
  await box.fill('none'); await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByText('Không tìm thấy bộ sưu tập', { exact: true }).waitFor();
  await page.reload(); await page.getByText('Không tìm thấy bộ sưu tập', { exact: true }).waitFor(); assert.ok(page.url().includes('q=none'));
  await page.goBack(); await page.getByText('Kết quả cũ', { exact: true }).waitFor();
  await page.goForward(); await page.getByText('Không tìm thấy bộ sưu tập', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync('qa-policy-checkbox/admin-collections-results.json', JSON.stringify({ passed: true, mutations, environment: 'Edge headless 1440x1000, API fixtures; no DB; responsive untested' }, null, 2));
  console.log('PASS collections missing data, themes, toggle payload, cancel, delete error/retry, list error/retry, URL search/reload/Back/Forward');
 } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
