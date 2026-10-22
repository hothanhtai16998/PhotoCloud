const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];try{
for(const scenario of [{theme:'light',width:1705,locale:'vi',knownGuest:true},{theme:'dark',width:1200,locale:'vi',knownGuest:true},{theme:'light',width:1705,locale:'en',knownGuest:true},{theme:'light',width:1705,locale:'vi',knownGuest:false}]){
 const c=await browser.newContext({viewport:{width:scenario.width,height:900},serviceWorkers:'block'});
 await c.addInitScript(s=>{localStorage.setItem('theme',s.theme);localStorage.setItem('app_locale',s.locale);if(s.knownGuest)sessionStorage.setItem('publicChromeHint','guest')},scenario);
 let releaseMain,releaseAuth,releaseData;const main=new Promise(r=>releaseMain=r),auth=new Promise(r=>releaseAuth=r),data=new Promise(r=>releaseData=r);
 await c.route(/\/assets\/index-[^/]+\.js|\/src\/main\.tsx/,async route=>{await main;await route.continue()});
 await c.route('**/api/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api/auth/refresh'){await auth;return route.fulfill({status:401,json:{message:'Guest'}})}if(u.pathname==='/api/collections'){await data;return route.fulfill({json:{success:true,collections:[{_id:'one',name:'Bộ mẫu',isPublic:true,imageCount:3,tags:['nhà','dài '.repeat(20)],createdBy:'fixture',createdAt:'2026-10-20'}]}})}const res=await fetch(origin+u.pathname+u.search);return route.fulfill({status:res.status,body:await res.text(),contentType:'application/json'})});
 const p=await c.newPage();await p.goto((process.env.PUBLIC_FRAME_URL||origin)+'/collections',{waitUntil:'commit'});
 const snapshot=()=>p.evaluate(()=>{const h=document.querySelector('.PHOTOCLOUD-header')||document.getElementById('public-header-startup');const f=document.querySelector('#root [data-collections-frame]')||document.querySelector('#public-collections-startup [data-collections-frame]');const get=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,w:r.width,h:r.height,font:s.font,text:s.textRendering,smoothing:s.webkitFontSmoothing,color:s.color,radius:s.borderRadius,background:s.backgroundColor}};return {logo:get(h.querySelector('.text-logo')),theme:get(h.querySelector('.public-theme-toggle')),login:get(h.querySelector('.public-sign-in-slot')),booking:get(h.querySelector('.public-booking-button')),title:get(f.querySelector('h1')),subtitle:get(f.querySelector('.collections-header-subtitle')),search:get(f.querySelector('input')),sort:get(f.querySelector('select')),tag:get(f.querySelector('.collections-tag-filter-btn')),filter:get(f.querySelector('.collections-filter-btn')),nav:[...h.querySelectorAll('.header-studio-nav a')].map(get)}});
 await p.locator('#public-collections-startup [data-collections-frame]').waitFor();
 if(scenario.locale==='en')await p.waitForFunction(()=>document.querySelector('#public-collections-startup h1')?.textContent==='Collections');
 const initial=await snapshot();const logoClip={x:initial.logo.x-2,y:initial.logo.y-2,width:initial.logo.w+4,height:initial.logo.h+4};
 const firstLogo=await p.screenshot({clip:logoClip});
 await p.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/toolbar-before-'+scenario.theme+'-'+scenario.locale+'.png')});
 assert.equal(await p.locator('#public-header-startup .public-sign-in').isVisible(),true);
 releaseMain();await p.locator('#root [data-collections-frame]').waitFor();const mounted=await snapshot();
 assert.equal(await p.locator('#public-collections-startup').count(),0);
 assert.equal(await p.locator('.PHOTOCLOUD-header .public-sign-in').isVisible(),true);
 const secondLogo=await p.screenshot({clip:logoClip});
 assert.equal(crypto.createHash('sha256').update(firstLogo).digest('hex'),crypto.createHash('sha256').update(secondLogo).digest('hex'),'logo pixels match across startup and React');
 releaseAuth();await p.waitForFunction(()=>!document.querySelector('#root .collections-search-input').disabled);
 const afterAuth=await snapshot();releaseData();await p.locator('.collection-card').waitFor();const afterData=await snapshot();
 assert.match(await p.locator('.collections-result-summary').innerText(), /1/);
 assert.equal(await p.locator('.collections-header .collections-eyebrow').count(),0,'count belongs with results');
 const deltas=[];for(const phase of [mounted,afterAuth,afterData])for(const key of Object.keys(initial)){if(key==='nav')continue;const before=initial[key],after=phase[key];assert.equal(before.radius,after.radius,key+' border radius');assert.equal(before.background,after.background,key+' background');const delta=Math.max(...['x','y','w','h'].map(k=>Math.abs(before[k]-after[k])));deltas.push(delta);assert.ok(delta<0.6,JSON.stringify({scenario,key,before,after,delta}));}
 assert.ok(initial.nav.every((rect,i)=>Math.abs(rect.x-afterData.nav[i].x)<0.6),'accepted navigation remains stable');
 await p.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/toolbar-after-'+scenario.theme+'-'+scenario.locale+'.png')});
 await p.getByRole('button',{name:scenario.theme==='light'?'Chuyển sang chế độ tối':'Chuyển sang chế độ sáng',exact:true}).click();
 const booking=p.getByRole('button',{name:'Đặt lịch chụp',exact:true});await booking.click();await p.locator('.booking-modal').waitFor();await p.getByRole('button',{name:'Đóng đặt lịch',exact:true}).click();
 const previous=await p.locator('.collections-search-input').inputValue();assert.equal(previous,'');await p.locator('.collections-search-input').fill('Bộ');assert.equal(await p.locator('.collection-card').count(),1);
 await p.reload();await p.locator('#root [data-collections-frame]').waitFor();assert.equal(await p.locator('.PHOTOCLOUD-header .public-sign-in').isVisible(),true,'confirmed guest remains visible on next reload');
 reports.push({...scenario,maxShift:Math.max(...deltas),logoPixelsEqual:true,result:'PASS'});await c.close();
}
fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/toolbar-regression.json'),JSON.stringify(reports,null,2));console.log('PASS shared startup/runtime toolbar, exact logo pixels, guest hints, theme/booking and filters:',JSON.stringify(reports));
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
