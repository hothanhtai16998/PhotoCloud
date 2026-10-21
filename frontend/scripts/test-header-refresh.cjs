const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const reports = [];
  try {
    for (const scenario of [
      {width:1705,theme:'light',role:'guest'}, {width:1200,theme:'dark',role:'guest'},
      {width:1200,theme:'light',role:'admin'}, {width:1705,theme:'dark',role:'member'},
      {width:1200,theme:'dark',role:'expired'}, {width:1000,theme:'light',role:'admin'}
    ]) {
      const context = await browser.newContext({viewport:{width:scenario.width,height:900},serviceWorkers:'block'});
      await context.addInitScript(s => {
        localStorage.setItem('theme',s.theme);
        if (s.role==='expired') sessionStorage.setItem('hasAuth','true');
        window.headerTrace=[];
        let seen=false;
        const tick=()=>{
          const el=document.querySelector('.PHOTOCLOUD-header') || document.querySelector('.public-header-startup');
          if(el&&getComputedStyle(el).display!=='none') {
            seen=true;
            const nav=el.querySelector('.header-studio-nav');
            const brand=el.querySelector('.text-logo').getBoundingClientRect();
            window.headerTrace.push({logo:{x:brand.x,y:brand.y,w:brand.width},bg:getComputedStyle(el).backgroundColor,links:[...nav.querySelectorAll('a')].map(link=>{const r=link.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width}})});
          } else if(seen) window.headerTrace.push({missing:true});
          if(performance.now()<7000)requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },scenario);
      let releaseMain, releaseAuth;
      const main=new Promise(resolve=>releaseMain=resolve),auth=new Promise(resolve=>releaseAuth=resolve);
      await context.route(/\/assets\/index-[^/]+\.js/,async route=>{await main;await route.continue()});
      await context.route('**/*.woff2',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue()});
      await context.route('**/api/**',async route=>{
        const u=new URL(route.request().url());
        if(u.pathname==='/api/auth/refresh') {
          await auth;
          return route.fulfill(scenario.role==='guest'||scenario.role==='expired'?{status:401,json:{message:'Guest'}}:{json:{accessToken:'fixture'}});
        }
        if(u.pathname==='/api/users/me') return route.fulfill({json:{user:{_id:'fixture',username:'viewer',displayName:'Test user',isAdmin:scenario.role==='admin',isSuperAdmin:scenario.role==='admin'}}});
        if(u.pathname==='/api/collections') return route.fulfill({json:{success:true,collections:[]}});
        const response=await fetch(origin+u.pathname+u.search);
        return route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});
      });
      const page=await context.newPage();
      await page.goto(origin+'/collections',{waitUntil:'commit'});
      await page.locator('#public-header-startup').waitFor();
      const initial=await page.locator('#public-header-startup .header-studio-nav a').evaluateAll(links=>links.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,text:el.textContent}}));
      assert.equal(initial.length,5);
      const initialLogo=await page.locator('#public-header-startup .text-logo').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}});
      assert.equal(await page.locator('#public-header-startup').getAttribute('aria-hidden'),'true');
      if(scenario.role==='guest')await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/header-static-'+scenario.theme+'.png')});
      releaseMain();
      await page.locator('.PHOTOCLOUD-header').waitFor();
      assert.equal(await page.locator('#public-header-startup').count(),0,'remove startup chrome before paint');
      releaseAuth();
      await page.locator('.header-actions .header-booking-button').waitFor();
      await page.waitForTimeout(1100);
      const trace=await page.evaluate(()=>window.headerTrace);
      const maxShift=Math.max(0,...trace.flatMap(frame=>{
        assert.equal(frame.missing,undefined,'no blank frame between HTML and React');
        assert.ok(Math.max(Math.abs(frame.logo.x-initialLogo.x),Math.abs(frame.logo.y-initialLogo.y),Math.abs(frame.logo.w-initialLogo.w))<0.6,'logo remains stable');
        return frame.links.map((link,i)=>Math.max(Math.abs(link.x-initial[i].x),Math.abs(link.y-initial[i].y),Math.abs(link.w-initial[i].w)));
      }));
      assert.ok(maxShift<0.6,JSON.stringify({scenario,maxShift,initial,trace:trace.filter((_,i)=>i%10===0)}));
      assert.equal(new Set(trace.map(frame=>frame.bg)).size,1,'header surface remains the same color');
      const nav=await page.locator('.PHOTOCLOUD-header .header-studio-nav').boundingBox();
      const actions=await page.locator('.PHOTOCLOUD-header .header-actions').boundingBox();
      assert.ok(nav.x+nav.width<=actions.x+0.5,'account controls do not overlap navigation: '+JSON.stringify({scenario,nav,actions}));
      assert.equal(await page.getByRole('button',{name:'Đặt lịch chụp',exact:true}).count(),1);
      assert.equal(await page.locator('.header-booking-button svg').isVisible(),true,'compact booking icon remains visible');
      if(scenario.role==='guest')await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/header-ready-'+scenario.theme+'.png')});
      if(scenario.role==='guest'){
        await page.getByRole('button',{name:'Đặt lịch chụp',exact:true}).click();
        await page.locator('.booking-modal').waitFor();
        await page.getByRole('button',{name:'Đóng đặt lịch',exact:true}).click();
        await page.locator('.booking-modal').waitFor({state:'hidden'});
      }
      reports.push({...scenario,maxShift,frames:trace.length,result:'PASS'});
      await context.close();
    }
    fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/header-refresh-regression.json'),JSON.stringify(reports,null,2));
    console.log('PASS: static-to-React header, auth/expiry, delayed fonts, labels stable and no overlap:',JSON.stringify(reports));
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
