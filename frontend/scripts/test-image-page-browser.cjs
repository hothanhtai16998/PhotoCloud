const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect fill="#b6a180" width="900" height="600"/></svg>');
  const images = Array.from({ length: 3 }, (_, i) => ({
    _id: (i + 1).toString(16).padStart(24, '0'), imageTitle: `Khung hình ${i + 1}`, imageUrl: photo,
    thumbnailUrl: photo, width: 900, height: 600, views: 10, downloads: 2, favoriteCount: 0,
    createdAt: '2026-10-15T08:00:00Z', tags: ['studio'], uploadedBy: { _id: 'author-fixture', username: 'studio', displayName: 'Studio' },
  }));
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => {
        localStorage.setItem('theme', theme);
        window.__modalSeen = false;
        window.__openDuration = null;
        document.addEventListener('click', event => {
          if (event.target.closest('.blur-up-image-container')) window.__openStarted = performance.now();
        }, true);
        new MutationObserver(() => {
          if (document.querySelector('.image-page-modal')) {
            window.__modalSeen = true;
            if (window.__openStarted && window.__openDuration === null) window.__openDuration = performance.now() - window.__openStarted;
          }
        }).observe(document, { subtree: true, childList: true });
      }, theme);
      let byIdCalls = 0, failDetail = false, brokenPhoto = false, saved = false;
      await context.route("**/photo-fixture.svg*", route => brokenPhoto
        ? route.abort()
        : route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="tan"/></svg>' }));
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/images/by-id/')) {
          byIdCalls++;
          if (failDetail) return route.fulfill({ status: 503, json: { message: 'Không thể tải thông tin ảnh thử nghiệm' } });
          const id = url.pathname.split('/').at(-1);
          const image = images.find(image => image._id === id || image._id.endsWith(id));
          if (!image) return route.fulfill({ status: 404, json: { message: 'Không tìm thấy ảnh' } });
          await new Promise(resolve => setTimeout(resolve, 1200));
          return route.fulfill({ json: { image: brokenPhoto ? { ...image, imageUrl: origin + "/photo-fixture.svg", regularUrl: origin + "/photo-fixture.svg", smallUrl: origin + "/photo-fixture.svg" } : image } });
        }
        if (url.pathname === '/api/images') return route.fulfill({ json: { images, pagination: { page: 1, pages: 1, total: 3, limit: 20 } } });
        if (/\/images\/[^/]+\/(view|download)$/.test(url.pathname)) return route.fulfill({ json: { views: 11, downloads: 2, dailyViews: [], dailyDownloads: [] } });
        if (url.pathname.startsWith('/api/search/')) return route.fulfill({ json: { suggestions: [], popular: [] } });
        if (/\/favorites\/[a-f0-9]{24}$/.test(url.pathname) && route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 1200));
          saved = !saved;
          return route.fulfill({ json: { isFavorited: saved, favoriteCount: saved ? 1 : 0 } });
        }
        if (url.pathname.includes('/favorites')) return route.fulfill({ json: { favorites: [], favoriteIds: [], isFavorited: false } });
        const response = await fetch(origin + url.pathname + url.search);
        return route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/s/photos/studio');
      await page.locator('.grid-item-wrapper').first().waitFor();
      await page.locator('.grid-item-wrapper .blur-up-image-container').first().click();
      await page.locator('.image-page-modal').waitFor();
      const duration = await page.evaluate(() => window.__openDuration);
      await page.locator('.image-page-photo.is-ready').waitFor();
      await page.screenshot({ path: path.resolve(__dirname, `../qa-policy-checkbox/image-modal-${theme}.png`) });
      assert.equal(byIdCalls, 0, 'Grid image opens without waiting for detail API');
      assert.ok(duration !== null);
      await page.keyboard.press('ArrowRight');
      await page.waitForURL(/000000000002$/);
      assert.equal(await page.locator('.image-page-modal').count(), 1);
      await page.keyboard.press('Escape');
      await page.waitForURL(/\/s\/photos\/studio$/);
      await page.locator('.image-page-modal').waitFor({ state: 'detached' });
      assert.equal(await page.locator('.image-page-modal').count(), 0);
      await page.locator('.grid-item-wrapper .blur-up-image-container').first().click();
      await page.locator('.image-page-modal').waitFor();
      await page.reload();
      await page.locator('.image-page .image-modal-surface').waitFor();
      assert.equal(await page.evaluate(() => window.__modalSeen), false, 'Reload never inserts a modal even for the first frame');
      assert.equal(await page.locator('.image-page-modal').count(), 0);
      await page.locator('.image-page-photo.is-ready').waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.PHOTOCLOUD-header').dataset.surface !== 'canvas');
      const initialHeaderColor = await page.locator('.PHOTOCLOUD-header').evaluate(el => getComputedStyle(el).backgroundColor);
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.evaluate(() => window.scrollTo(0, 120));
        await page.waitForFunction(() => document.querySelector('.PHOTOCLOUD-header').dataset.surface === 'canvas');
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForFunction(() => document.querySelector('.PHOTOCLOUD-header').dataset.surface === 'heading');
        await page.waitForFunction(color => getComputedStyle(document.querySelector('.PHOTOCLOUD-header')).backgroundColor === color, initialHeaderColor);
      }
      await page.screenshot({ path: path.resolve(__dirname, `../qa-policy-checkbox/image-page-${theme}.png`) });
      const palette = await page.evaluate(() => {
        const scope = document.querySelector('.image-page');
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const rgb = color => {
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const value = name => getComputedStyle(scope).getPropertyValue(name).trim();
        const color = (selector, property) => rgb(getComputedStyle(document.querySelector(selector))[property]);
        const luminance = rgb => rgb.map(n => { n /= 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        const fg = luminance(color('.image-modal-download-button', 'color'));
        const bg = luminance(color('.image-modal-download-button', 'backgroundColor'));
        return {
          photo: color('.image-modal-image-container', 'backgroundColor'), expectedPhoto: rgb(value('--bg-card')),
          related: color('.image-modal-related-section', 'backgroundColor'), expectedRelated: rgb(value('--bg-card')),
          heading: color('.image-modal-related-title', 'color'), expectedHeading: rgb(value('--text-primary')),
          downloadContrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
        };
      });
      assert.deepEqual(palette.photo, palette.expectedPhoto);
      assert.deepEqual(palette.related, palette.expectedRelated);
      assert.deepEqual(palette.heading, palette.expectedHeading);
      assert.ok(palette.downloadContrast >= 4.5, 'Download label contrast');
      fs.writeFileSync(path.resolve(__dirname, `../qa-policy-checkbox/image-palette-${theme}.json`), JSON.stringify(palette, null, 2));
      await page.locator('.image-modal-related-section').scrollIntoViewIfNeeded();
      await page.locator('.image-modal-related-section .grid-item-wrapper').first().waitFor();
      await page.locator('.image-modal-related-section').screenshot({ path: path.resolve(__dirname, `../qa-policy-checkbox/image-related-${theme}.png`) });

      const saveButton = page.locator('.image-modal-favorite-button[aria-pressed]');
      await saveButton.click();
      await page.waitForFunction(() => {
        const button = document.querySelector('.image-modal-favorite-button');
        return button.getAttribute('aria-pressed') === 'true' && button.getAttribute('aria-busy') === 'true';
      }, null, { timeout: 800 });
      await page.waitForFunction(() => document.querySelector('.image-modal-favorite-button').getAttribute('aria-busy') === 'false');
      assert.equal(await saveButton.getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
      await page.locator('.edit-modal-tab').first().waitFor();
      assert.deepEqual((await page.locator('.edit-modal-tab').allTextContents()).map(t => t.trim()), ['Chi tiết', 'Tags', 'Exif']);
      assert.equal(await page.getByRole('button', { name: 'Chỉnh ảnh', exact: true }).count(), 0);
      for (const tab of ['Tags', 'Exif', 'Chi tiết']) {
        await page.getByRole('button', { name: tab, exact: true }).click();
        assert.equal(await page.locator('.edit-modal-tab-panel').count(), 1);
      }
      await page.locator('.edit-modal-close').click();
      assert.equal(await page.locator('.edit-image-modal').count(), 0);
      // A new modal still works after the initial reload was normalized.
      await page.goto(origin + '/s/photos/studio');
      await page.locator('.grid-item-wrapper .blur-up-image-container').first().click();
      await page.locator('.image-page-modal').waitFor();
      await page.locator('.image-modal-author-area').click();
      await page.waitForURL(/\/@studio$/);
      await page.locator('.image-page-modal').waitFor({ state: 'detached' });
      assert.equal(await page.locator('.image-page-modal').count(), 0, 'Author navigation must not be overwritten by closing the modal');
      failDetail = true;
      await page.goto(origin + '/photos/khung-hinh-1-000000000001');
      await page.getByRole('alert').filter({ hasText: 'Không thể tải thông tin ảnh thử nghiệm' }).waitFor();
      failDetail = false;
      await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await page.locator('.image-page .image-modal-surface').waitFor();
      await page.goto(origin + '/photos/missing-ffffffffffff');
      await page.getByRole('alert').filter({ hasText: 'Không tìm thấy ảnh' }).waitFor();
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'ngoại tuyến' }).waitFor();
      await context.setOffline(false);
      brokenPhoto = true;
      await page.goto(origin + '/photos/khung-hinh-1-000000000001');
      await page.locator('.image-page-photo-error').waitFor();
      const failedUrl = page.url();
      brokenPhoto = false;
      await page.locator('.image-page-photo-error button').click();
      await page.locator('.image-page-photo.is-ready').waitFor();
      assert.equal(page.url(), failedUrl, 'Retry keeps the selected photo URL');
      assert.equal(await page.locator('.image-page-photo-error').count(), 0);
      assert.deepEqual(errors, []);
      fs.writeFileSync(path.resolve(__dirname, `../qa-policy-checkbox/image-latency-${theme}.json`), JSON.stringify({ theme, clickToModalDOMMs: duration, reloadModalInserted: false, note: 'Local fixture; detail API delayed 1200ms. Does not measure production latency.' }, null, 2));
      console.log('PASS image page', theme, `click-to-modal DOM ${Math.round(duration)}ms`, 'reload-no-modal-frame/arrows-close/author/error-retry');
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
