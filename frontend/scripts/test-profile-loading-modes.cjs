const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => { sessionStorage.setItem('hasAuth', 'true'); localStorage.setItem('theme', theme); }, theme);
      const user = { _id: 'viewer', username: 'viewer', displayName: 'Viewer', pinnedImages: [], followersCount: 0, followingCount: 0, createdAt: '2026-01-01' };
      let releasePhotos, releaseAnalytics, updating = false, collectionRequests = 0;
      const emptyCollections = process.argv.includes('--empty');
      const photos = new Promise(r => releasePhotos = r), analytics = new Promise(r => releaseAnalytics = r);
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url()), p = url.pathname;
        if (p === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (['/api/users/me', '/api/users/viewer', '/api/users/username/viewer'].includes(p)) return route.fulfill({ json: { user } });
        if (p === '/api/images/user/viewer') { await photos; return route.fulfill({ json: { images: [], pagination: { page: 1, total: 0, pages: 0, limit: 20 } } }); }
        if (p.startsWith('/api/follows/')) return route.fulfill({ json: { stats: { followers: 0, following: 0, isFollowing: false }, followers: [], following: [] } });
        if (p === '/api/bookings/mine') return route.fulfill({ json: { bookings: [] } });
        if (p === '/api/collections') {
          collectionRequests++;
          return route.fulfill({ json: { success: true, collections: emptyCollections ? [] : [{ _id: 'profile-collection', name: 'Bộ sưu tập hồ sơ fixture', createdBy: user, images: [], sampleImages: [], isPublic: true, imageCount: 0 }] } });
        }
        if (p === '/api/users/analytics') {
          if (updating) await analytics;
          return route.fulfill({ json: { summary: { totalImages: 0, totalViews: updating ? 22 : 11, totalDownloads: 0, avgViewsPerImage: 0, avgDownloadsPerImage: 0, period: 'fixture' }, viewsOverTime: [], downloadsOverTime: [], mostPopularImages: [], geographicDistribution: [], bestPerformingCategories: [] } });
        }
        if (route.request().method() !== 'GET') return route.fulfill({ status: 403, json: {} });
        const res = await fetch(origin + p + url.search);
        return route.fulfill({ status: res.status, body: await res.text(), contentType: 'application/json' });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(origin + '/@viewer');
        await page.getByText('Đang tải ảnh hồ sơ', { exact: true }).waitFor({ state: 'visible' });
        releasePhotos();
        await page.locator('.profile-content .empty-state:visible').first().waitFor();
        await page.locator('.profile-tab').filter({ hasText: 'Bộ sưu tập' }).click();
        if (emptyCollections) {
          await page.locator('.profile-content .empty-state:visible').waitFor();
          // Observe the settled empty response: it must not start a fetch loop.
          await page.waitForTimeout(300);
          assert.equal(collectionRequests, 1, 'an empty collection response is final, not a new loading trigger');
        } else await page.getByText('Bộ sưu tập hồ sơ fixture', { exact: true }).waitFor({ state: 'visible' });
        await page.locator('.profile-tab').last().click();
        await page.locator('.insights-period-button').waitFor({ state: 'visible' });
        const metric = page.locator('.insights-metric-value').first();
        await metric.waitFor({ state: 'visible' });
        await metric.evaluate(el => el.dataset.retained = 'yes');
        updating = true;
        await page.locator('.insights-period-button').click();
        await page.locator('.insights-period-option').first().click();
        await page.getByText('Đang cập nhật thống kê', { exact: true }).waitFor();
        assert.equal(await metric.isVisible(), true);
        assert.equal(await metric.getAttribute('data-retained'), 'yes');
        await page.screenshot({ path: `qa-policy-checkbox/loading-modes-profile-${theme}.png` });
        releaseAnalytics();
        await page.getByText('Đang cập nhật thống kê', { exact: true }).waitFor({ state: 'detached' });
        assert.equal((await metric.textContent()).trim(), '22');
        assert.deepEqual(errors, []);
        console.log('PASS profile', theme, emptyCollections ? 'empty collections do not refetch' : 'collection panel', 'photos initial/empty, stats pending keeps DOM/new data');
      } catch (error) {
        console.error('Profile fixture page errors:', errors);
        await page.screenshot({ path: `qa-policy-checkbox/loading-modes-profile-failure-${theme}.png` });
        console.error((await page.locator('body').innerText()).slice(0, 800));
        throw error;
      } finally { releasePhotos(); releaseAnalytics(); await context.close(); }
    }
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
