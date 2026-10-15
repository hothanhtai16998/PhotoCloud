const {
  chromium,
} = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const origin = 'http://127.0.0.1:4188';
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise((resolve) => server.listen(4188, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440])
      for (const theme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width, height: 960 },
          serviceWorkers: 'block',
        });
        await context.route('**/api/**', async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          const response = await fetch(origin + url.pathname + url.search, {
            method: request.method(),
            headers: { 'Content-Type': 'application/json' },
            body: ['GET', 'HEAD'].includes(request.method())
              ? undefined
              : request.postData(),
          });
          await route.fulfill({
            status: response.status,
            contentType: 'application/json',
            body: await response.text(),
          });
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(origin + '/admin');
        await page
          .getByRole('heading', { name: 'Tổng quan', exact: true })
          .waitFor();
        if (theme === 'dark')
          await page
            .getByRole('button', {
              name: 'Chuyển sang giao diện tối',
              exact: true,
            })
            .click();
        if (
          theme === 'light' &&
          (await page
            .getByRole('button', {
              name: 'Chuyển sang giao diện sáng',
              exact: true,
            })
            .count())
        )
          await page
            .getByRole('button', {
              name: 'Chuyển sang giao diện sáng',
              exact: true,
            })
            .click();
        await page.getByText('864', { exact: true }).waitFor();
        await page.screenshot({
          path: path.resolve(
            __dirname,
            '../admin-overview-' + width + '-' + theme + '.png'
          ),
          fullPage: true,
        });
        const go = async (label, heading) => {
          if (width < 801)
            await page
              .getByRole('button', { name: 'Mở menu quản trị', exact: true })
              .click();
          await page
            .locator('.admin-layout-sidebar:visible nav, dialog[open] nav')
            .getByRole('link', { name: label, exact: true })
            .click();
          await page
            .getByRole('heading', { name: heading || label, exact: true })
            .waitFor();
        };
        await go('Thư viện ảnh');
        await page
          .locator('.admin-table tbody tr')
          .first()
          .getByText('Buổi sáng ở Đà Lạt')
          .waitFor();
        await page
          .getByRole('searchbox', { name: 'Tìm kiếm', exact: true })
          .fill('không có kết quả');
        await page
          .getByRole('button', { name: 'Tìm kiếm', exact: true })
          .click();
        await page
          .getByRole('heading', { name: 'Không tìm thấy kết quả', exact: true })
          .waitFor();
        await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
        await page
          .getByRole('checkbox', { name: 'Chọn tất cả ảnh trên trang' })
          .check();
        await page
          .getByRole('button', { name: 'Đổi danh mục', exact: true })
          .click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.screenshot({
          path: path.resolve(
            __dirname,
            '../admin-images-' + width + '-' + theme + '.png'
          ),
          fullPage: true,
        });
        await go('Danh mục');
        await page
          .getByRole('button', { name: 'Xóa Phong cảnh', exact: true })
          .click();
        await page.getByRole('dialog', { name: 'Xác nhận xóa' }).waitFor();
        await page.getByRole('button', { name: 'Hủy', exact: true }).click();
        await page
          .getByRole('button', { name: 'Tạo danh mục', exact: true })
          .click();
        await page.getByRole('dialog').waitFor();
        await page
          .getByLabel('Tên danh mục', { exact: false })
          .fill('Đời thường');
        assert.equal(await page.locator('#cat-slug').count(), 0);
        await page.keyboard.press('Escape');
        await go('Người dùng');
        await page
          .getByRole('button', { name: 'Sửa Hoàng Linh', exact: true })
          .click();
        await page.getByRole('dialog').waitFor();
        assert.equal(
          await page.getByRole('combobox').count(),
          0,
          'User form must not pretend to update roles'
        );
        await page.keyboard.press('Escape');
        await go('Cài đặt website');
        await page
          .getByLabel('Tên website', { exact: true })
          .fill('PhotoCloud ' + width + ' ' + theme);
        const saved = page.waitForRequest(
          (r) => r.method() === 'PUT' && r.url().endsWith('/admin/settings')
        );
        await page
          .getByRole('button', { name: 'Lưu thay đổi', exact: true })
          .click();
        assert.equal(
          (await saved).postDataJSON().settings.siteName,
          'PhotoCloud ' + width + ' ' + theme
        );
        await page
          .getByText('Các thay đổi đã được lưu', { exact: true })
          .waitFor();
        await page.screenshot({
          path: path.resolve(
            __dirname,
            '../admin-settings-' + width + '-' + theme + '.png'
          ),
          fullPage: true,
        });
        await go('Duyệt nội dung');
        await page.locator('.admin-review-item').first().waitFor();
        await page
          .locator('.admin-review-item')
          .first()
          .getByRole('button', { name: 'Từ chối', exact: true })
          .click();
        await page.getByLabel('Lý do từ chối').fill('Ảnh chưa đạt chất lượng');
        await page.getByRole('button', { name: 'Hủy', exact: true }).click();
        await page.screenshot({
          path: path.resolve(
            __dirname,
            '../admin-moderation-' + width + '-' + theme + '.png'
          ),
          fullPage: true,
        });
        await go('Lịch chụp & dịch vụ', 'Đặt lịch chụp');
        await page.getByRole('button', { name: 'Lịch', exact: true }).click();
        await page.locator('.admin-calendar-grid').waitFor();
        await go('Bộ sưu tập', 'Bộ sưu tập');
        // Check document overflow, not intentionally scrollable data tables.
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          'No document overflow'
        );
        assert.deepEqual(errors, []);
        await context.close();
        console.log('PASS', width, theme);
      }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
