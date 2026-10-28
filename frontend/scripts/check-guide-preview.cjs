// Local visual review only: no API calls or customer data.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5183', '--strictPort'], { cwd: process.cwd(), windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview server startup timed out')), 20000);
      server.stdout.on('data', data => { if (String(data).includes('5183')) { clearTimeout(timer); resolve(); } });
      server.on('error', error => { clearTimeout(timer); reject(error); });
      server.on('exit', code => { clearTimeout(timer); reject(new Error('Preview server exited: ' + code)); });
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5183/guide-preview.html');
    await page.getByText('Ba tư thế tĩnh để kiểm tra tạo hình.', { exact: true }).waitFor();
    await page.screenshot({ path: 'qa-policy-checkbox/guide-phase1-review.png', fullPage: true });
    for (const pose of ['wave', 'photo', 'album']) {
      await page.locator('#' + pose).screenshot({ path: 'qa-policy-checkbox/guide-phase1-' + pose + '.png' });
    }
    await page.getByRole('button', { name: 'Bật chuyển động thử', exact: true }).click();
    await page.getByText('Đang xem chuyển động thử.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Dừng chuyển động thử', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText('Đang tôn trọng tùy chọn giảm chuyển động của thiết bị.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS three poses, animation toggle, reduced motion, renderer recreation without page errors. Screenshots saved.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
