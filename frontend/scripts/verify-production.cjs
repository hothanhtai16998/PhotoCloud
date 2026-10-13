const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4174/');
      await page.locator('.travel-stage').waitFor();
      await page.evaluate(async () => {
        const sources = Array.from(document.querySelectorAll('.travel-stage .landscape,.travel-stage .destination-card')).map(element => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean);
        await Promise.all(sources.map(source => { const image = new Image(); image.src=source; return image.decode(); }));
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await page.screenshot({ path:`performance-${name}.png` });
      console.log(name, await page.evaluate(() => ({ header:getComputedStyle(document.querySelector('.PHOTOCLOUD-header')).backgroundColor, nav:document.querySelector('.header-studio-nav a')&&getComputedStyle(document.querySelector('.header-studio-nav a')).color, font:getComputedStyle(document.querySelector('.travel-stage')).fontFamily, titleFont:getComputedStyle(document.querySelector('.travel-stage h1')).fontFamily })), errors);
      await page.getByRole('button',{name:'Đặt lịch chụp',exact:true}).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button',{name:'Đóng',exact:true}).click();
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
