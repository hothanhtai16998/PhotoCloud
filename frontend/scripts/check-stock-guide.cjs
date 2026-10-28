const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5185', '--strictPort'], { windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server timeout')), 20000);
      server.stdout.on('data', data => { if (String(data).includes('5185')) { clearTimeout(timer); resolve(); } });
      server.on('error', reject);
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5185/model-preview.html');
    await page.getByText('Đang chạy: Đứng nghỉ', { exact: true }).waitFor();
    for (const name of ['Chào', 'Đi bộ', 'Đồng ý', 'Ngồi', 'Đứng nghỉ']) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.getByText('Đang chạy: ' + name, { exact: true }).waitFor();
    }
    await page.screenshot({ path: 'qa-policy-checkbox/stock-guide-review.png', fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByText('Tư thế tĩnh — đang giảm chuyển động.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS local GLB load, five animation controls, reduced motion, no page errors.');
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
