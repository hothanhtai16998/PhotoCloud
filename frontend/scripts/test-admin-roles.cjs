const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const server = require('./admin-preview.cjs'); await new Promise(r => server.listen(0, '127.0.0.1', r));
 const origin = 'http://127.0.0.1:' + server.address().port; let browser;
 try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const owner = { _id: 'fixture-admin', username: 'root', displayName: 'Quản trị hệ thống', email: 'root@example.test' };
  const member = { _id: 'member', username: 'member', displayName: 'Tài khoản thử', email: 'member@example.test' };
  let roles = [
   { _id: 'system', userId: owner, role: 'super_admin', active: true, permissions: Object.fromEntries(['viewDashboard', 'viewUsers', 'editUsers', 'deleteUsers', 'viewImages', 'editImages', 'viewCategories', 'createCategories', 'viewAdmins', 'createAdmins', 'viewAnalytics', 'viewCollections', 'manageCollections', 'manageFavorites', 'moderateContent', 'viewLogs', 'manageSettings'].map(key => [key, true])) },
   { _id: 'custom', userId: member, role: 'admin', grantedBy: owner, permissions: { viewDashboard: true, viewUsers: true }, active: false, allowedIPs: ['127.0.0.1'] },
   { _id: 'missing', userId: null, role: 'moderator', grantedBy: owner, permissions: {}, active: true },
  ];
  let failList = false, failSave = true, failDelete = true, userFail = false;
  const writes = [];
  await context.route('**/api/**', async route => {
   const req = route.request(), url = new URL(req.url());
   if (url.pathname.endsWith('/admin/roles') && req.method() === 'GET') {
    if (failList) return route.fulfill({ status: 503, json: { message: 'Không tải được quyền thử' } });
    return route.fulfill({ json: { adminRoles: roles } });
   }
   if (url.pathname.endsWith('/admin/users')) {
    if (userFail) return route.fulfill({ status: 503, json: { message: 'Không tải được tài khoản thử' } });
    const page = Number(url.searchParams.get('page') || 1), search = url.searchParams.get('search');
    return route.fulfill({ json: { users: [{ _id: page === 2 || search ? 'new-user' : 'first', username: page === 2 || search ? 'target' : 'first', email: 'target@example.test' }], pagination: { page, pages: search ? 1 : 2, total: search ? 1 : 21 } } });
   }
   if (url.pathname.includes('/admin/roles') && req.method() !== 'GET') {
    writes.push({ method: req.method(), payload: req.postDataJSON() });
    if (req.method() === 'DELETE') {
     if (failDelete) return route.fulfill({ status: 503, json: { message: 'Chưa thu hồi được thử' } });
     roles = roles.filter(r => r._id !== 'custom');
     return route.fulfill({ json: { message: 'ok' } });
    }
    if (failSave) return route.fulfill({ status: 503, json: { message: 'Chưa lưu được thử' } });
    const value = req.postDataJSON();
    if (req.method() === 'POST') roles.push({ _id: 'created', userId: { _id: value.userId, username: 'target' }, grantedBy: owner, ...value, userId: { _id: value.userId, username: 'target' } });
    else roles = roles.map(r => r._id === 'custom' ? { ...r, ...value } : r);
    return route.fulfill({ json: { adminRole: {} } });
   }
   const response = await route.fetch({ url: origin + url.pathname + url.search }); return route.fulfill({ response });
  });
  const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + '/admin/roles');
  await page.getByText('Được hệ thống bảo vệ', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Sửa quyền Quản trị hệ thống' }).count(), 0);
  await page.getByText('Chưa có thông tin tài khoản', { exact: true }).waitFor();
  await page.getByText('Xem quyền chi tiết', { exact: true }).first().click();
  const permissionBox = page.getByRole('region', { name: 'Quyền của Quản trị hệ thống', exact: true });
  assert.ok((await permissionBox.boundingBox()).height <= 290);
  assert.ok(await permissionBox.evaluate(el => el.scrollHeight > el.clientHeight));
  await permissionBox.focus(); await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('.pc-role-permission-summary').scrollTop > 0);
  for (const theme of ['light', 'dark']) {
   await page.evaluate(t => document.documentElement.classList.toggle('dark-theme', t === 'dark'), theme);
   await page.screenshot({ path: `qa-policy-checkbox/roles-${theme}.png`, fullPage: true, animations: 'disabled' });
  }
  await page.getByRole('button', { name: 'Thêm quyền quản trị', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Sau', exact: true }).click();
  await dialog.getByLabel('Chọn tài khoản', { exact: true }).selectOption('new-user');
  await dialog.getByLabel('Vai trò', { exact: true }).selectOption('moderator');
  const invalid = dialog.getByRole('checkbox', { name: 'Chỉnh sửa người dùng Không thuộc vai trò này', exact: true }); assert.equal(await invalid.isDisabled(), true);
  await dialog.getByLabel('Vai trò', { exact: true }).selectOption('admin');
  assert.equal(await dialog.getByRole('checkbox', { name: 'Xem người dùng Kế thừa', exact: true }).isChecked(), true);
  assert.equal(await dialog.getByRole('checkbox', { name: 'Xem người dùng Kế thừa', exact: true }).isDisabled(), true);
  await dialog.getByRole('checkbox', { name: 'Chỉnh sửa người dùng', exact: true }).check();
  await dialog.getByLabel('Ngày hết hạn (giờ trên thiết bị)', { exact: true }).fill('2020-01-01T10:00');
  await dialog.getByRole('button', { name: 'Thêm quyền', exact: true }).click();
  await dialog.getByText('Ngày hết hạn phải ở tương lai.', { exact: true }).waitFor(); assert.equal(writes.length, 0);
  await dialog.getByLabel('Ngày hết hạn (giờ trên thiết bị)', { exact: true }).fill('2035-01-01T10:00');
  await dialog.getByLabel('IP / dải IP được phép', { exact: true }).fill('127.0.0.1, 127.0.0.1');
  await dialog.getByRole('button', { name: 'Thêm quyền', exact: true }).click();
  await dialog.getByText(/Chưa lưu được quyền/).waitFor();
  assert.equal(await dialog.getByLabel('Chọn tài khoản', { exact: true }).inputValue(), 'new-user');
  for (const theme of ['light', 'dark']) {
   await page.evaluate(t => document.documentElement.classList.toggle('dark-theme', t === 'dark'), theme);
   await page.screenshot({ path: `qa-policy-checkbox/roles-editor-${theme}.png`, fullPage: true, animations: 'disabled' });
  }
  failSave = false; await dialog.getByRole('button', { name: 'Thêm quyền', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(writes.length, 2); assert.equal(writes[1].payload.permissions.editUsers, true); assert.deepEqual(writes[1].payload.allowedIPs, ['127.0.0.1']); assert.ok(writes[1].payload.expiresAt.endsWith('Z'));
  await page.getByRole('button', { name: 'Sửa quyền Tài khoản thử', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Kích hoạt quyền', exact: false }).check();
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
  assert.equal(writes.at(-1).payload.active, true);
  const trigger = page.getByRole('button', { name: 'Thu hồi quyền Tài khoản thử', exact: true });
  await trigger.click(); await dialog.getByRole('button', { name: 'Hủy', exact: true }).click(); assert.equal(writes.filter(w => w.method === 'DELETE').length, 0);
  await trigger.click(); await dialog.getByRole('button', { name: 'Thu hồi quyền', exact: true }).click(); await dialog.getByText(/Chưa thu hồi được quyền/).waitFor(); assert.equal(await dialog.count(), 1);
  failDelete = false; await dialog.getByRole('button', { name: 'Thu hồi quyền', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
  failList = true; await page.getByRole('button', { name: 'Làm mới', exact: true }).click(); await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor(); assert.equal(await page.getByText('Chưa có quyền quản trị', { exact: true }).count(), 0);
  failList = false; await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await page.getByText('Được hệ thống bảo vệ', { exact: true }).waitFor();
  roles = []; await page.getByRole('button', { name: 'Làm mới', exact: true }).click(); await page.getByText('Chưa có quyền quản trị', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS roles protected/missing accounts, themes, account pagination, inheritance/role constraints, expiry validation, draft retention/retry, create/edit payload, revoke cancel/error/retry, list error/empty');
 } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

