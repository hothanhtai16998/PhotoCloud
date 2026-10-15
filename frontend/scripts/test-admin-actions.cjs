const {
  chromium,
} = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: 'block',
    });
    let restricted = false,
      fail = false;
    let failCategory = false;
    const calls = [];
    await context.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      calls.push({
        path: url.pathname,
        method: req.method(),
        data: req.postData(),
      });
      if (failCategory && req.method() === 'PUT' && url.pathname.includes('/categories/admin/')) return route.fulfill({ status: 503, json: { message: 'Không thể lưu danh mục thử nghiệm' } });
      if (restricted && url.pathname.includes('/users/me'))
        return route.fulfill({
          json: {
            user: {
              _id: 'limited',
              username: 'reviewer',
              isAdmin: true,
              isSuperAdmin: false,
              permissions: { viewImages: true },
            },
          },
        });
      if (fail && url.pathname.endsWith('/admin/images'))
        return route.fulfill({
          status: 503,
          json: { message: 'Không tải được thư viện thử nghiệm' },
        });
      const response = await fetch(origin + url.pathname + url.search, {
        method: req.method(),
        headers: { 'Content-Type': 'application/json' },
        body: ['GET', 'HEAD'].includes(req.method())
          ? undefined
          : req.postData(),
      });
      await route.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: await response.text(),
      });
    });
    const page = await context.newPage();
    await page.goto(origin + '/admin/images');
    const uploadButton = page.getByRole('button', { name: 'Tải ảnh lên', exact: true });
    assert.ok(['flex', 'inline-flex'].includes(await uploadButton.evaluate(el => getComputedStyle(el).display)));
    assert.notEqual(await uploadButton.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 0, 0)');
    assert.equal(await uploadButton.locator(':scope > svg').count(), 1, 'Icon stays in the button flex row');
    await page
      .getByRole('button', { name: 'Tải ảnh lên', exact: true })
      .click();
    await page.locator('.upload-modal-overlay').waitFor();
    assert.equal(new URL(page.url()).pathname, '/admin/images');
    await page.locator('.upload-modal-close').click();
    await page.locator('.upload-modal-overlay').waitFor({ state: 'detached' });
    await page
      .getByRole('button', { name: 'Sửa Buổi sáng ở Đà Lạt' })
      .first()
      .click();
    await page.getByLabel('Tiêu đề ảnh').fill('Ảnh đã chỉnh sửa');
    const update = page.waitForRequest(
      (r) => r.method() === 'PUT' && r.url().includes('/admin/images/')
    );
    await page
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    assert.equal((await update).postDataJSON().imageTitle, 'Ảnh đã chỉnh sửa');
    await page.goto(origin + '/admin/moderation');
    const approve = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/approve')
    );
    await page
      .getByRole('button', { name: 'Duyệt ảnh', exact: true })
      .first()
      .click();
    await approve;
    await page
      .getByRole('button', { name: 'Từ chối', exact: true })
      .first()
      .click();
    await page.getByLabel('Lý do từ chối').fill('Ảnh cần điều chỉnh');
    const reject = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/reject')
    );
    await page.getByRole('button', { name: 'Xác nhận từ chối' }).click();
    assert.equal((await reject).postDataJSON().reason, 'Ảnh cần điều chỉnh');
    await page.goto(origin + '/admin/categories');
    const countBefore = calls.filter((c) => c.method === 'DELETE').length;
    await page
      .getByRole('button', { name: 'Xóa Phong cảnh', exact: true })
      .click();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(
      calls.filter((c) => c.method === 'DELETE').length,
      countBefore
    );
    await page.getByRole('button', { name: 'Sửa Phong cảnh', exact: true }).click();
    assert.equal(await page.locator('#cat-slug').count(), 0);
    await page.locator('#cat-desc').fill('');
    await page.getByLabel('Hiển thị trong thư viện').uncheck();
    failCategory = true;
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.getByRole('alert').getByText('Không thể lưu danh mục thử nghiệm').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 1, 'Keep draft open after save failure');
    failCategory = false;
    const categoryUpdate = page.waitForRequest(r => r.method() === 'PUT' && r.url().includes('/categories/admin/'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const categoryBody = (await categoryUpdate).postDataJSON();
    assert.equal(categoryBody.description, '');
    assert.equal(categoryBody.isActive, false);
    assert.ok(!('slug' in categoryBody));
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    fail = true;
    await page.goto(origin + '/admin/images');
    await page
      .getByRole('alert')
      .getByText('Không tải được thư viện thử nghiệm')
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: 'Chưa có dữ liệu', exact: true })
        .count(),
      0
    );
    fail = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page
      .getByRole('button', { name: 'Sửa Buổi sáng ở Đà Lạt' })
      .first()
      .waitFor();
    restricted = true;
    const before = calls.length;
    await page.goto(origin + '/admin/settings');
    await page
      .getByRole('heading', { name: 'Bạn chưa có quyền xem mục này' })
      .waitFor();
    assert.equal(
      calls.slice(before).filter((c) => c.path.endsWith('/admin/settings'))
        .length,
      0
    );
    assert.equal(
      await page
        .getByRole('link', { name: 'Cài đặt website', exact: true })
        .count(),
      0
    );
    assert.equal(
      await page.getByRole('link', { name: 'Phân quyền', exact: true }).count(),
      0
    );
    await context.close();
    console.log(
      'PASS mutation payloads, moderation endpoints, delete cancel, error/retry, restricted routes'
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
