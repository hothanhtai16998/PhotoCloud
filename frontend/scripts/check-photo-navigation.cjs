const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}); const results=[];
 try {
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   try {
    await page.goto('http://127.0.0.1:4174/explore');
    const card=page.locator('.grid-item-wrapper').nth(8); await card.waitFor(); await card.scrollIntoViewIfNeeded();
    const before=await page.evaluate(()=>scrollY); await card.locator('.blur-up-image-image-wrapper').click(); await page.waitForURL('**/photos/**'); await page.waitForTimeout(300);
    const opened={path:new URL(page.url()).pathname,dialog:await page.locator('.image-page-modal').count()};
    if(width>768){await page.locator('.image-page-close').click();await page.waitForURL('**/explore');await page.waitForTimeout(200);}
    else {await page.goBack();await page.waitForURL('**/explore');await card.waitFor();}
    await page.waitForTimeout(1000);
    const returned=await page.evaluate(()=>scrollY);
    await card.locator('.blur-up-image-image-wrapper').click();await page.waitForURL('**/photos/**');await page.reload();await page.waitForTimeout(500);
    const reloaded={path:new URL(page.url()).pathname,dialog:await page.locator('.image-page-modal').count(),scroll:await page.evaluate(()=>scrollY)};
    await page.goto('http://127.0.0.1:4174/explore');await card.waitFor();await card.locator('.blur-up-image-image-wrapper').click();await page.waitForURL('**/photos/**');await page.waitForTimeout(300);
    results.push({width,before,opened,returned,reloaded,newDialogAfterReload:await page.locator('.image-page-modal').count()});
   }catch(e){results.push({width,error:e.message});}finally{await page.close();}
  }
 }finally{await browser.close();fs.writeFileSync('photo-navigation-checks.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}
})().catch(e=>{console.error(e);process.exitCode=1;});
