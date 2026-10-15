const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => { const server = require('./admin-preview.cjs'); await new Promise(r => server.listen(0, '127.0.0.1', r)); const browser = await chromium.launch({ channel: 'msedge', headless: true }); try {
    for (const theme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
        await ctx.addInitScript(t => { localStorage.setItem('theme', t); localStorage.setItem('photoApp_searchFilters', JSON.stringify({ orientation: 'all', color: 'all', dateFrom: '', dateTo: '', sortBy: 'date', order: 'asc', minWidth: 100 })); }, theme);
        const calls = [];
        let fail = false, empty = false, failMore = true, failCategories = true;
        const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#b6a180" width="600" height="400"/></svg>');
        await ctx.route('**/api/**', async (route) => { const u = new URL(route.request().url()); if (u.pathname === '/api/categories' && failCategories)
            return route.fulfill({ status: 503, json: { message: 'Category fixture failed' } }); if (u.pathname === '/api/categories')
            return route.fulfill({ json: { categories: [{ _id: 'cat-1', name: 'Chân dung', imageCount: 31 }, { _id: 'cat-2', name: 'Phong cảnh', imageCount: 31 }] } }); if (u.pathname === '/api/images') {
            calls.push(Object.fromEntries(u.searchParams));
            if (fail || (failMore && u.searchParams.get('page') === '2'))
                return route.fulfill({ status: 503, json: { message: 'Fixture images unavailable' } });
            const page = Number(u.searchParams.get('page') || 1);
            return route.fulfill({ json: { images: empty ? [] : Array.from({ length: page === 1 ? 30 : 1 }, (_, i) => ({ _id: `image-${page}-${i}`, imageTitle: `Khung hình ${page}-${i}`, imageUrl: photo, width: 600, height: 400, uploadedBy: { _id: 'u1', username: 'studio', displayName: 'Studio' }, createdAt: '2026-10-15', imageCategory: { _id: 'cat-1', name: 'Chân dung' }, views: 10 })), pagination: { page, pages: empty ? 0 : 2, total: empty ? 0 : 31, limit: 30 } } });
        } const r = await fetch('http://127.0.0.1:' + server.address().port + u.pathname + u.search); return route.fulfill({ status: r.status, contentType: 'application/json', body: await r.text() }); });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto('http://127.0.0.1:' + server.address().port + '/explore');
        await page.locator('.explore-category-error').waitFor();
        failCategories = false;
        await page.locator('.explore-category-error').getByRole('button', { name: 'Thử lại', exact: true }).click();
        await page.getByRole('button', { name: /Chân dung/, exact: false }).last().click();
        await page.getByRole('button', { name: 'Dọc', exact: true }).click();
        await page.getByLabel('Sắp xếp', { exact: true }).selectOption('views');
        await page.waitForFunction(() => document.querySelector('.explore-results')?.textContent.includes('31 ảnh'));
        await page.screenshot({ path: `qa-policy-checkbox/explore-${theme}.png`, fullPage: false });
        const moreResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/images' && new URL(r.url()).searchParams.get('page') === '2');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await moreResponse;
        await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).waitFor();
        assert.ok(await page.locator('.no-flash-grid-container').count());
        failMore = false;
        const retryMore = page.waitForResponse(r => new URL(r.url()).pathname === '/api/images' && new URL(r.url()).searchParams.get('page') === '2' && r.status() === 200);
        await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).click();
        await retryMore;
        await page.waitForFunction(() => document.querySelector('.explore-results')?.textContent.includes('31 ảnh'));
        const next = calls.findLast(c => c.page === '2');
        assert.equal(next.order, 'asc');
        assert.equal(next.minWidth, '100');
        assert.equal(next.category, 'Chân dung');
        assert.equal(next.orientation, 'portrait');
        assert.equal(next.sortBy, 'views');
        fail = true;
        await page.getByRole('button', { name: 'Ngang', exact: true }).click();
        await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).waitFor();
        fail = false;
        await page.getByRole('button', { name: 'Thử lại tải ảnh', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.explore-results')?.textContent.includes('31 ảnh'));
        empty = true;
        await page.getByRole('button', { name: 'Vuông', exact: true }).click();
        await page.getByRole('heading', { name: 'Chưa có ảnh phù hợp' }).waitFor();
        empty = false;
        const resetResponse = page.waitForResponse(r => { const u = new URL(r.url()); return u.pathname === '/api/images' && !u.searchParams.has('category') && !u.searchParams.has('orientation'); });
        await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).first().click();
        await resetResponse;
        await page.waitForFunction(() => document.querySelector('.explore-results')?.textContent === '31 ảnh');
        const reset = calls.at(-1);
        assert.ok(!reset.category && !reset.orientation);
        assert.equal(reset.sortBy, 'date');
        assert.deepEqual(errors, []);
        console.log('PASS explore', theme, 'pagination/page2-retry/category-retry/advanced-filters/asc-order/empty/reset');
        await ctx.close();
    }
}
finally {
    await browser.close();
    await new Promise(r => server.close(r));
} })().catch(e => { console.error(e); process.exitCode = 1; });
