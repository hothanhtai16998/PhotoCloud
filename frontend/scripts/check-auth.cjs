const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
 const page = await browser.newPage();
 for (const route of ['signin','signup']) {
  for (const width of [1440,390,320]) {
   await page.setViewportSize({width,height:width===1440?900:844});
   await page.goto(`http://127.0.0.1:5173/${route}`);
   await page.locator('.auth-lamp-switch').waitFor();
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   await page.screenshot({path:`auth-${route}-${width}.png`,fullPage:true});
   const button = page.locator('.auth-lamp-switch');
   await button.click();
   assert.equal(await button.getAttribute('aria-pressed'),'false');
   await page.screenshot({path:`auth-${route}-${width}-off.png`,fullPage:true});
   await page.locator('#username').fill('sample');
   await button.focus(); await page.keyboard.press('Space');
   assert.equal(await button.getAttribute('aria-pressed'),'true');
   for (const distance of [10,35,90]) {
    const before=await button.getAttribute('aria-pressed');
    const box=await button.boundingBox(); const x=box.x+22,y=box.y+22;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+distance,{steps:5});await page.mouse.up();
    assert.equal(await button.getAttribute('aria-pressed'),distance>=24?(before==='true'?'false':'true'):before);
    await page.waitForTimeout(400);
   }
   await page.locator('button[type=submit]').click();
   assert(await page.locator('.error-message').count()>0);
   console.log(`${route} ${width}: layout, click, keyboard, drag and validation OK`);
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.auth-lamp-cord').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 const button=page.locator('.auth-lamp-switch');
 const state=await button.getAttribute('aria-pressed');
 await button.dispatchEvent('pointerdown',{pointerId:20,isPrimary:true,button:0,clientY:100});
 await button.dispatchEvent('pointermove',{pointerId:20,isPrimary:true,clientY:150});
 await button.dispatchEvent('pointercancel',{pointerId:20,isPrimary:true});
 assert.equal(await button.getAttribute('aria-pressed'),state);
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const mobile=await context.newPage();await mobile.goto('http://127.0.0.1:5173/signin');
 const cord=mobile.locator('.auth-lamp-switch');await cord.waitFor();
 await mobile.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const box=await cord.boundingBox();
 const cdp=await context.newCDPSession(mobile);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+22,y:box.y+22}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+22,y:box.y+62}]});
 await mobile.waitForTimeout(100);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await cord.getAttribute('aria-pressed'),'false');
 await context.close();
 console.log('Touch drag, cancellation and reduced motion OK');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
