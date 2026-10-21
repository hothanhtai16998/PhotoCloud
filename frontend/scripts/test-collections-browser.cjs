const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
(async () => {
 const server = require('./admin-preview.cjs'); await new Promise(r => server.listen(0, '127.0.0.1', r));
 const origin = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch({ channel: 'msedge', headless: true }), reports = [];
 const seed = () => [{ _id: 'a', name: 'Ánh sáng %', createdBy: 'fixture-admin', images: [], isPublic: false, tags: ['studio'], imageCount: 2, createdAt: '2026-10-01' }, { _id: 'b', name: 'Bình minh', createdBy: 'fixture-admin', images: [], isPublic: true, tags: ['trời'], imageCount: 5, createdAt: '2026-10-02' }, { _id: 'c', name: 'Tên dài '.repeat(30), createdBy: 'fixture-admin', images: [], isPublic: true, imageCount: 3, createdAt: '2026-10-03' }];
 try { for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.addInitScript(theme => { try { localStorage.setItem('theme', theme); } catch { /* Browser error documents have no storage. */ } }, theme);
  let hangList = false;
  let rows = seed(), failList = false, failDelete = true, failEdit = true, failCreate = true, failImage = true, reads = 0, deletes = 0, creates = 0, additions = 0;
  await context.route('**/api/**', async route => {
   const u = new URL(route.request().url()), method = route.request().method(), id = u.pathname.split('/').at(-1);
   if (u.pathname === '/api/collections') {
    if (method === 'GET') { if (hangList) return; reads++; await new Promise(r => setTimeout(r, 250)); return route.fulfill({ status: failList ? 503 : 200, json: { success: !failList, collections: rows } }); }
    if (method === 'POST') { creates++; if (failCreate) return route.fulfill({ status: 503, json: { message: 'Thử lại' } }); const item = { ...seed()[0], ...route.request().postDataJSON(), _id: 'new', imageCount: 0 }; rows.unshift(item); return route.fulfill({ json: { success: true, collection: item } }); }
   }
   if (/\/collections\/[^/]+\/images$/.test(u.pathname)) { additions++; if (failImage) return route.fulfill({ status: 503, json: { message: 'Ảnh chưa thêm được' } }); rows[0].imageCount = 1; return route.fulfill({ json: { success: true, collection: rows[0] } }); }
   if (/\/collections\/[^/]+$/.test(u.pathname)) {
    if (method === 'DELETE') { deletes++; await new Promise(r => setTimeout(r, 300)); if (failDelete) return route.fulfill({ status: 503, json: { message: 'Thử lại' } }); rows = rows.filter(r => r._id !== id); return route.fulfill({ json: { success: true } }); }
    if (method === 'PATCH') { if (failEdit) return route.fulfill({ status: 503, json: { message: 'Không thể lưu' } }); rows = rows.map(r => r._id === id ? { ...r, ...route.request().postDataJSON() } : r); return route.fulfill({ json: { success: true, collection: rows.find(r => r._id === id) } }); }
    return route.fulfill({ json: { success: true, collection: rows.find(r => r._id === id) } });
   }
   if (u.pathname.includes('/images/user/')) return route.fulfill({ json: { images: [{ _id: 'photo-1', imageTitle: 'Ánh sáng', imageUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', width: 600, height: 400 }], pagination: { pages: 1 } } });
   const response = await fetch(origin + u.pathname + u.search); return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
  });
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  const started = Date.now(); await page.goto(origin + '/collections'); await page.locator('.collection-card').first().waitFor(); const readyMs = Date.now() - started;
  assert.equal(await page.locator('.collection-card').count(), 3); assert.equal(reads, 1);
  await page.locator('.collections-search-input').fill('%'); await page.waitForFunction(() => document.querySelectorAll('.collection-card').length === 1);
  await page.locator('.collections-search-clear').click(); assert.equal(await page.locator('.collection-card').count(), 3);
  await page.locator('.collections-tag-filter-btn').filter({ hasText: /^studio$/ }).click(); assert.equal(await page.locator('.collection-card').count(), 1);
  await page.locator('.collections-filter-btn').click(); await page.locator('.collections-empty').waitFor(); await page.locator('.collections-empty-btn').click(); assert.equal(await page.locator('.collection-card').count(), 3);
  await page.locator('.collections-sort-select').selectOption('oldest'); assert.match(await page.locator('.collection-card-title').first().innerText(), /Ánh sáng/);
  await page.locator('.collections-sort-select').selectOption('images'); assert.match(await page.locator('.collection-card-title').first().innerText(), /Bình minh/);
  await page.locator('.collection-card-link').first().focus(); await page.keyboard.press('Enter'); await page.waitForURL(/\/collections\/b$/); await page.getByRole('link', { name: 'Quay lại bộ sưu tập' }).waitFor();
  const backBox = await page.locator('.collection-detail-back').boundingBox(), titleBox = await page.locator('.collection-detail-title-row h1').boundingBox(); assert.ok(Math.abs(backBox.x - titleBox.x) < 2); assert.ok(backBox.height < 40);
  assert.equal(await page.locator('.collection-detail-header').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: path.resolve(__dirname, '../qa-policy-checkbox/collection-detail-refined-' + theme + '.png') }); await context.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline'))); await page.locator('.collection-load-error-actions').waitFor();
  const actions = page.locator('.collection-load-error-actions'); assert.equal(await actions.getByRole('link', { name: 'Quay lại danh sách' }).count(), 1);
  const retryBox = await actions.getByRole('button').boundingBox(), returnBox = await actions.getByRole('link').boundingBox(); assert.ok(Math.abs(retryBox.y - returnBox.y) < 4);
  await page.screenshot({path:path.resolve(__dirname, '../qa-policy-checkbox/collection-error-refined-' + theme + '.png')});
  await context.setOffline(false); await actions.waitFor({ state: 'hidden' }); await page.locator('.collection-detail-title-row').waitFor();
  await page.getByRole('link', { name: 'Quay lại bộ sưu tập' }).click(); await page.locator('.collections-search-input').waitFor(); assert.equal(reads, 1);
  await page.screenshot({ path: path.resolve(__dirname, `../qa-policy-checkbox/collections-${theme}.png`) });
  await page.locator('.action-danger').first().click(); const dialog = page.getByRole('dialog'); await dialog.waitFor(); await dialog.getByRole('button', { name: 'Xóa', exact: true }).click(); await dialog.getByRole('alert').waitFor(); assert.equal(deletes, 1);
  failDelete = false; await dialog.getByRole('button', { name: 'Xóa', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }); assert.equal(await page.locator('.collection-card').count(), 2);
  await page.locator('.collection-card-action-btn:not(.action-danger)').first().click(); await page.locator('#edit-collection-name').fill('Đã sửa %'); await page.locator('.collection-modal-submit-btn').click(); await page.waitForTimeout(300); assert.equal(await page.locator('#edit-collection-name').inputValue(), 'Đã sửa %');
  failEdit = false; await page.locator('.collection-modal-submit-btn').click(); await page.locator('.collection-modal').waitFor({ state: 'hidden' }); await page.getByRole('heading', { name: /Đã sửa/ }).waitFor();
  await page.locator('.collections-create-btn').click(); await page.locator('#collection-name').fill('Bộ mới %'); await page.locator('.collection-modal-submit-btn').click(); await page.waitForTimeout(300); assert.equal(await page.locator('#collection-name').inputValue(), 'Bộ mới %'); failCreate = false;
  await page.locator('.collection-modal-image-picker-item').first().click(); await page.locator('.collection-modal-submit-btn').click(); await page.waitForTimeout(300); const createCount = creates; assert.equal(additions, 1);
  failImage = false; await page.locator('.collection-modal-submit-btn').click(); await page.locator('.collection-modal').waitFor({ state: 'hidden' }); assert.equal(creates, createCount); assert.equal(additions, 2);
  failList = true; await page.reload(); await page.getByRole('alert').filter({ hasText: 'Không thể tải danh sách' }).waitFor(); assert.equal(await page.locator('.collections-empty').count(), 0);
  failList = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.locator('.collection-card').first().waitFor();
  // Real browser offline plus HTTP timeout, keeping failure distinct from empty.
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await context.setOffline(false);
  await page.goto(origin + '/collections'); await page.locator('.collection-card').first().waitFor();
  hangList = true; await page.reload(); await page.getByRole('alert').filter({ hasText: 'Không thể tải danh sách' }).waitFor({ timeout: 20000 }); hangList = false;
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.locator('.collection-card').first().waitFor();
  // Both dialogs trap Tab, close on Escape and restore focus.
  await page.locator('.collections-create-btn').click(); await page.getByRole('dialog').waitFor();
  await page.locator('.collection-modal-close').focus(); await page.keyboard.press('Shift+Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]')));
  await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(await page.locator('.collections-create-btn').evaluate(el => el === document.activeElement), true);
  await context.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline'))); await page.getByRole('alert').filter({ hasText: 'ngoại tuyến' }).waitFor(); assert.equal(await page.locator('[data-sonner-toast]').count(), 0);
  const cachedCards = await page.locator('.collection-card').count();
  await context.setOffline(false);
  // Online refreshes once while keeping cached rows and current filters.
  await page.getByRole('alert').filter({ hasText: 'ngoại tuyến' }).waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.collection-card').count(), cachedCards);
  rows = []; await page.reload(); await page.locator('.collections-empty').waitFor(); assert.deepEqual(errors, []);
  reports.push({ theme, readyMs, reads, creates, additions, deletes }); await context.close();
 }} finally { await browser.close(); server.close(); }
 fs.writeFileSync(path.resolve(__dirname, '../qa-policy-checkbox/collections-browser.json'), JSON.stringify(reports, null, 2)); console.log('PASS desktop light/dark:', reports);
})().catch(e => { console.error(e); process.exitCode = 1; });
