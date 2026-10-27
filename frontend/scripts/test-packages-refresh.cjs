const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];
try{for(const width of [1440,1705,390])for(const theme of ['light','dark'])for(const motion of ['no-preference','reduce']){
const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:motion});await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
let releaseAssets,releaseApi;const assets=new Promise(r=>releaseAssets=r),api=new Promise(r=>releaseApi=r);
await context.route(/\/assets\/.*\.(js|css)(?:\?|$)/,async route=>{await assets;await route.continue();});
await context.route('https://images.unsplash.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#8d755d"/></svg>'}));
await context.route('**/api/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api/auth/refresh')return route.fulfill({status:401,json:{message:'Guest'}});if(u.pathname==='/api/bookings/packages'){await api;return route.fulfill({json:{success:true,packages:[{_id:'p1',slug:'portrait',name:'Gói thử nghiệm',description:'Dữ liệu fixture',category:'portrait',basePrice:1500000,durationMinutes:60,includedPhotos:20,includedPeople:2,deliveryDays:7}]}});}return route.fulfill({json:{settings:{},collections:[],images:[],categories:[],pagination:{page:1,pages:0,total:0}}});});
const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const measure=scope=>page.locator(scope+' .packages-hero').evaluate(el=>{const rect=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,color:s.color}};return{hero:rect(el),heading:rect(el.querySelector('h1')),copy:rect(el.querySelector('.packages-intro p')),cta:rect(el.querySelector('.package-card-cta')),container:((r)=>({x:r.x,y:r.y,w:r.w}))(rect(el.parentElement)),body:document.body.getBoundingClientRect().width};});
await page.goto(origin+'/packages',{waitUntil:'commit'});await page.locator('#public-packages-startup').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);const before=await measure('#public-packages-startup');
releaseAssets();await page.locator('#root .packages-page').waitFor();await page.waitForFunction(()=>!document.getElementById('public-packages-startup'));await page.locator('#root .packages-catalog .user-data-loading').waitFor();const pending=await measure('#root');
assert.deepEqual(pending,before,theme+' '+width+' static/pending frame');
assert.equal(await page.locator('#root #packages-custom').count(),1,'fixed custom section present while fetching');
releaseApi();await page.locator('.package-service').waitFor();const ready=await measure('#root');assert.deepEqual(ready,pending,'API does not move fixed hero');
await page.screenshot({path:'qa-policy-checkbox/packages-refresh-'+width+'-'+theme+'.png'});
await page.reload();await page.locator('#root .package-service').waitFor();await page.evaluate(()=>document.fonts.ready);assert.deepEqual(await measure('#root'),ready,'F5 steady frame');
await page.goto(origin+'/collections');await page.locator('#root .collections-header h1').waitFor();const collections=await page.locator('#root .collections-header h1').boundingBox();assert.ok(Math.abs(collections.x-ready.heading.x)<1,'same left edge as collections');
reports.push({width,theme,before,pending,ready,collections});assert.deepEqual(errors,[]);console.log('PASS',width,theme,motion,'preJS/pending/ready/F5 identical;collections alignment');
await context.close();}}
finally{fs.writeFileSync('qa-policy-checkbox/packages-refresh-layout.json',JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
