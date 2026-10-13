const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const results = [];
const base = 'http://127.0.0.1:4174';
async function check(name, fn) { try { const evidence = await fn(); results.push({ name, evidence }); console.log(name, JSON.stringify(evidence)); } catch (error) { results.push({ name, error:error.message }); console.log(name, 'ERROR',error.message.slice(0,160)); } }
(async () => {
  const browser = await chromium.launch({ channel:'msedge', headless:true });
  try {
    for (const width of [320,390,768,1024,1440]) await check(`responsive-${width}`,async () => {
      const page=await browser.newPage({viewport:{width,height:900}});
      try {
        await page.goto(base); await page.locator('.hero-copy').waitFor();
        return await page.evaluate(() => ({ viewport:innerWidth, heroColumn:document.querySelector('.hero-copy').getBoundingClientRect().width, heroSection:document.querySelector('.hero-section').getBoundingClientRect().width, horizontalOverflow:document.documentElement.scrollWidth>innerWidth }));
      } finally { await page.close(); }
    });
    await check('booking-keyboard',async () => {
      const page=await browser.newPage();
      try {
        await page.goto(base); await page.getByRole('button',{name:'Đặt lịch chụp',exact:true}).click(); await page.getByRole('dialog').waitFor();
        const initial=await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'));
        await page.keyboard.press('Tab'); const afterTab=await page.evaluate(() => ({inside:!!document.activeElement.closest('[role="dialog"]'),label:document.activeElement.getAttribute('aria-label')}));
        await page.keyboard.press('Escape'); const closed=await page.getByRole('dialog').count()===0;
        return {initialFocusInside:initial,afterTab,escapeClosed:closed};
      } finally { await page.close(); }
    });
    await check('touch-emulation-and-rotation',async () => {
      const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      try {
        await page.goto(base); const button=page.locator('.bookmark'); await button.waitFor(); const b=await button.boundingBox();
        await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
        const pressed=await button.getAttribute('aria-pressed'); await page.setViewportSize({width:844,height:390});
        return {syntheticTapPressed:pressed,rotatedOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),physicalDevice:false};
      } finally { await page.close(); }
    });
    await check('reduced-motion-autoplay',async () => {
      const page=await browser.newPage({reducedMotion:'reduce'});
      try {
        await page.goto(base); await page.locator('.slide-number').waitFor(); const before=await page.locator('.slide-number').textContent();
        await page.waitForTimeout(6700); return {before,after:await page.locator('.slide-number').textContent()};
      } finally { await page.close(); }
    });
    for(const route of ['/explore','/collections','/packages','/blog','/about','/signin','/profile','/admin']) await check(`route-${route}`,async () => {
      const page=await browser.newPage();
      try {
        await page.goto(base+route); await page.waitForTimeout(1500);
        return {path:new URL(page.url()).pathname,heading:await page.locator('h1').allTextContents(),dialogs:await page.getByRole('dialog').count()};
      } finally { await page.close(); }
    });
    await check('refresh-scroll',async () => {
      const page=await browser.newPage();
      try {
        await page.goto(base); await page.locator('.travel-stage').waitFor(); await page.evaluate(()=>window.scrollTo(0,900));
        await page.reload(); await page.locator('.travel-stage').waitFor(); await page.waitForTimeout(200);
        return {afterReload:await page.evaluate(()=>window.scrollY)};
      } finally { await page.close(); }
    });
    await check('image-api-failure',async () => {
      const page=await browser.newPage();
      try {
        await page.route('**/api/images?*',route=>route.abort());
        await page.goto(base); await page.waitForTimeout(1500);
        return {message:await page.locator('.travel-empty').textContent().catch(()=>null),retryButtons:await page.getByRole('button',{name:/thử lại/i}).count()};
      } finally { await page.close(); }
    });
  } finally { await browser.close(); fs.writeFileSync('product-context-checks.json',JSON.stringify(results,null,2)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
