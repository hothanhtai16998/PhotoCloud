const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');

(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
  try {
    for (const theme of ['light', 'dark']) {
      const user = { _id: '507f1f77bcf86cd799439011', username: 'uploadfixture', displayName: 'Upload fixture', isAdmin: false, isSuperAdmin: false };
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
      await context.addInitScript(theme => { sessionStorage.setItem('hasAuth', 'true');localStorage.setItem('theme', theme);localStorage.setItem('uploadPreserveQuality', 'true'); }, theme);
      let count = 0, ready = false, fail = false;
      const finalized = [], published = [];
      let profileRevision;
      await context.route('**/fixture-storage/**', route => route.fulfill({ status: 200, body: '' }));
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url()), path = url.pathname;
        if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
        if (path === '/api/users/me' || path === '/api/users/' + user._id || path === '/api/users/username/' + user.username) return route.fulfill({ json: { user } });
        if (path === '/api/images/user/' + user._id) {
          profileRevision = url.searchParams.get('_t');
          return route.fulfill({ json: { images: published.map(id => ({
          _id: id, imageTitle: 'Ảnh đã xử lý', imageUrl: 'data:image/png;base64,' + pixel.toString('base64'),
          uploadedBy: user, imageCategory: null, moderationStatus: 'pending', createdAt: new Date().toISOString(),
        })), pagination: { total: published.length, page: 1, pages: 1 } } });
        }
        if (path === '/api/images/me') return route.fulfill({ json: { images: [], pagination: { total: 0 } } });
        if (path === '/api/images/pre-upload' && route.request().method() === 'POST') {
          const id = 'image-123456-' + (++count).toString(16).padStart(8, '0');
          return route.fulfill({ json: { uploadId: id, uploadKey: 'photo-app-raw/' + id + '.png', uploadUrl: origin + '/fixture-storage/' + id, maxFileSize: 1000000, expiresIn: 300 } });
        }
        if (path === '/api/images/finalize') {
          const data = route.request().postDataJSON();finalized.push(data.uploadId);
          return route.fulfill({ status: 202, json: { success: true, status: 'queued', uploadId: data.uploadId } });
        }
        if (path.startsWith('/api/images/uploads/')) {
          const id = path.split('/').pop();
          if (!ready) return route.fulfill({ json: { success: true, status: 'processing', uploadId: id } });
          if (fail) return route.fulfill({ json: { success: true, status: 'failed', uploadId: id, message: 'Fixture: xử lý thất bại, hãy thử lại.' } });
          if (!published.includes(id)) published.push(id);
          return route.fulfill({ json: { success: true, status: 'completed', uploadId: id, image: {
            _id: id, imageTitle: 'Ảnh đã xử lý', imageUrl: 'data:image/png;base64,' + pixel.toString('base64'), uploadedBy: user,
            moderationStatus: 'pending', createdAt: new Date().toISOString(),
          } } });
        }
        if (route.request().method() !== 'GET') return route.fulfill({ status: 200, json: { success: true } });
        const response = await fetch(origin + path + url.search);
        return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/me');
        await page.getByRole('button', { name: 'Tải ảnh đầu tiên', exact: true }).click();
        const files = Array.from({ length: 7 }, (_, index) => ({ name: `photo-${index}.png`, mimeType: 'image/png', buffer: pixel }));
        await page.locator('.upload-file-input').setInputFiles(files);
        const submit = page.locator('.upload-submit-btn');
        await submit.waitFor();
        await page.waitForFunction(() => !document.querySelector('.upload-submit-btn').disabled);
        assert.equal(count, 7, 'each selected file receives exactly one pre-upload');
        await submit.click();
        await page.getByRole('status').filter({ hasText: 'Đang xử lý ảnh' }).waitFor();
        await page.waitForTimeout(600);
        assert.equal(await page.locator('.upload-success-screen').count(), 0, '202 never opens success');
        assert.equal(published.length, 0);
        if (!process.env.UPLOAD_CACHE_CHECK) await page.screenshot({ path: `qa-policy-checkbox/upload-processing-${theme}.png` });
        ready = true;
        if (theme === 'dark') {
          fail = true;
          await page.locator('.upload-submit-btn').waitFor();
          assert.equal(await page.locator('.upload-success-screen').count(), 0);
          assert.equal(count, 7, 'failure retains the staged files');
          fail = false;
          await page.locator('.upload-submit-btn').click();
        }
        await page.locator('.upload-success-screen').waitFor({ timeout: 30000 });
        assert.equal(published.length, 7, 'success waits for every image, including later waves');
        assert.equal(new Set(finalized).size, 7, 'retry reuses the accepted upload IDs');
        assert.match(await page.locator('.success-subtitle').textContent(), /chờ duyệt/);
        if (!process.env.UPLOAD_CACHE_CHECK) await page.screenshot({ path: `qa-policy-checkbox/upload-confirmed-${theme}.png` });
        await page.getByRole('button', { name: 'Xem trang cá nhân', exact: true }).click();
        await page.waitForURL('**/@uploadfixture');
        await page.waitForFunction(() => document.querySelectorAll('[data-image-id]').length >= 7);
        assert.ok(profileRevision, 'opening profile after upload bypasses an older cached list');
        const revision = profileRevision;
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll('[data-image-id]').length >= 7);
        assert.equal(profileRevision, revision, 'F5 keeps the post-upload profile revision');
        assert.deepEqual(errors, []);
        console.log('PASS', theme, '7 files / 202 waits / actual completion / pending moderation /', theme === 'dark' ? 'failure and same-ID retry' : 'later waves');
      } finally { await context.close(); }
    }
  } finally { await browser.close();await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error);process.exitCode = 1; });
