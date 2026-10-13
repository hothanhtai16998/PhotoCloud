const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const records=[];
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   try{
    await page.goto('http://127.0.0.1:4174/');await page.locator('.travel-stage').waitFor();await page.evaluate(()=>document.fonts.ready);
    async function sample(selectors){return page.evaluate(selectors=>selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return {selector,missing:true};const s=getComputedStyle(e);const r=e.getBoundingClientRect();return{selector,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,color:s.color,background:s.backgroundColor,border:s.border,radius:s.borderRadius,padding:s.padding,gap:s.gap,shadow:s.boxShadow,width:r.width,height:r.height,position:s.position,display:s.display};}),selectors);}
    const home=await sample(['body','.PHOTOCLOUD-header','.header-logo','.header-studio-nav a','.header-booking-button','.travel-stage h1','.travel-stage .slider-controls button','.hero-title','.home-section-heading h2','.home-package-card','.home-package-body','.home-package-body p','.home-booking-flow']);
    await page.getByRole('button',{name:'Đặt lịch chụp',exact:true}).click();await page.getByRole('dialog').waitFor();const booking=await sample(['.booking-modal','.booking-modal-header h2','.booking-modal-close','.booking-modal-packages button']);await page.getByRole('button',{name:'Đóng',exact:true}).click();
    await page.goto('http://127.0.0.1:4174/explore');await page.locator('.explore-filters').waitFor();const library=await sample(['.image-page-sidebar','.sidebar-nav-item','.sidebar-icon','.no-flash-grid','.explore-chip','.explore-select']);
    records.push({width,home,booking,library});
   }finally{await page.close();}
  }
 }finally{await browser.close();fs.writeFileSync('design-observations.json',JSON.stringify(records,null,2));}
 console.log(JSON.stringify(records.map(r=>({width:r.width,body:r.home[0],header:r.home[1],title:r.home[6],heading:r.home[9],modal:r.booking[0]}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
