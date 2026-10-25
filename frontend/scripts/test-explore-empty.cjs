const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => localStorage.setItem('theme', theme), theme);
      const calls = [];
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/refresh') return route.fulfill({ status: 401, json: {} });
        if (url.pathname === '/api/categories') return route.fulfill({ json: { categories: [{ _id: 'travel', name: 'Du lịch' }] } });
        if (url.pathname === '/api/images') {
          calls.push(Object.fromEntries(url.searchParams));
          return route.fulfill({ json: { images: [], pagination: { page: 1, total: 0, pages: 0, limit: 30 } } });
        }
        return route.fulfill({ json: { settings: {} } });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + server.address().port + '/explore');
      await page.getByRole('heading', { name: 'Chưa có ảnh', exact: true }).waitFor();
      const hero = await page.locator('#root .explore-hero p').evaluate(el => ({ h: el.getBoundingClientRect().height, line: parseFloat(getComputedStyle(el).lineHeight) }));
      assert.ok(hero.h <= hero.line + 1, 'desktop introduction fits one line');
      await page.getByRole('button', { name: 'Du lịch', exact: true }).click();
      await page.getByRole('heading', { name: 'Danh mục này chưa có ảnh', exact: true }).waitFor();
      assert.match(await page.locator('.explore-empty p').textContent(), /Du lịch/);
      assert.equal(await page.locator('.explore-empty').getByRole('button', { name: 'Bỏ bộ lọc' }).count(), 0);
      const centerDelta = await page.locator('.explore-empty').evaluate(el => {
        const box = el.getBoundingClientRect(), icon = el.querySelector('svg').getBoundingClientRect();
        return Math.abs(box.x + box.width / 2 - icon.x - icon.width / 2);
      });
      assert.ok(centerDelta < 1, 'empty icon centered with the text');
      await page.screenshot({ path: `qa-policy-checkbox/explore-empty-category-${theme}.png` });
      await page.getByLabel('Sắp xếp', { exact: true }).selectOption('views');
      await page.getByRole('heading', { name: 'Danh mục này chưa có ảnh', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Dọc', exact: true }).click();
      await page.getByRole('heading', { name: 'Chưa có ảnh phù hợp', exact: true }).waitFor();
      await page.locator('.explore-empty').getByRole('button', { name: 'Bỏ bộ lọc', exact: true }).click();
      await page.getByRole('heading', { name: 'Danh mục này chưa có ảnh', exact: true }).waitFor();
      assert.equal((await page.locator('.explore-chip.is-active').textContent()).trim(), 'Du lịch', 'removing filters keeps selected category');
      assert.equal((await page.locator('.explore-segmented-btn.is-active').textContent()).trim(), 'Tất cả');
      await page.getByRole('button', { name: 'Xem tất cả ảnh', exact: true }).click();
      await page.getByRole('heading', { name: 'Chưa có ảnh', exact: true }).waitFor();
      assert.equal((await page.locator('.explore-chip.is-active').textContent()).trim(), 'Tất cả');
      assert.deepEqual(errors, []);
      console.log('PASS', theme, 'intro/empty all/category/filter/sort/reset/category kept/icon center');
      await context.close();
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
