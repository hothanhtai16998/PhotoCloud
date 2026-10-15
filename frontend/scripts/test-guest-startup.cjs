const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const settingsFail of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      let refreshes = 0; let adminSettings = 0;
      await context.route('**/api/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === '/api/auth/refresh') {
          refreshes++;
          await new Promise(resolve => setTimeout(resolve, 150));
          return route.fulfill({ status: 401, json: { message: 'No refresh cookie' } });
        }
        if (pathname === '/api/admin/settings') adminSettings++;
        if (pathname === '/api/settings') {
          await new Promise(resolve => setTimeout(resolve, 400));
          return route.fulfill({ status: settingsFail ? 503 : 200, json: { settings: { siteName: 'PhotoCloud Guest QA' } } });
        }
        return route.fulfill({ json: { images: [], collections: [], packages: [], posts: [], settings: {}, pagination: { total: 0 } } });
      });
      const page = await context.newPage();
      await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
      if (!settingsFail) await page.waitForFunction(() => document.title === 'PhotoCloud Guest QA');
      await page.waitForTimeout(900);
      assert.equal(refreshes, 1, 'Only one guest startup refresh under dev StrictMode');
      assert.equal(adminSettings, 0, 'Public settings must not call admin endpoint');
      await page.locator('.header-logo').click();
      console.log(`PASS guest dev startup: settings ${settingsFail ? 'failure' : 'success'}, one refresh, no admin fallback`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
