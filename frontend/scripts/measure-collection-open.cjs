const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true});const samples=[];
for(let run=0;run<3;run++){
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
const id='000000000000000000000101',user={_id:'viewer',username:'viewer',isAdmin:false};
const image={_id:'000000000000000000000001',imageTitle:'Ảnh fixture',width:600,height:400,imageUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="tan"/></svg>'),uploadedBy:user};
const collection={_id:id,name:'Bộ kiểm tốc độ',createdBy:user,isPublic:true,images:[image],imageCount:1,coverImage:image,sampleImages:[],createdAt:'2026-10-19'};
let detailRequests=0;
await context.route('**/api/**',async route=>{const p=new URL(route.request().url()).pathname;
if(p==='/api/auth/refresh')return route.fulfill({json:{accessToken:'fixture'}});
if(p==='/api/users/me')return route.fulfill({json:{user}});
if(p==='/api/collections')return route.fulfill({json:{success:true,collections:[collection]}});
if(p==='/api/collections/'+id){detailRequests++;await pause(700);return route.fulfill({json:{success:true,collection}});}
if(p==='/api/collection-favorites/check'){await pause(900);return route.fulfill({json:{success:true,favorites:{[id]:false}}});}
if(route.request().method()!=='GET')return route.fulfill({json:{success:true}});
const response=await fetch('http://127.0.0.1:'+server.address().port+p);return route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});});
const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port+'/collections');await page.locator('.collection-card-link').waitFor();
await page.evaluate(()=>{window.openMetrics={start:0,shell:null,header:null,image:null};document.addEventListener('click',()=>window.openMetrics.start=performance.now(),{capture:true,once:true});});
const tracking=page.evaluate(async()=>new Promise(resolve=>{const poll=()=>{const m=window.openMetrics;if(m.start){const visible=el=>el&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).opacity!=='0'&&el.getBoundingClientRect().height>0;
if(m.shell===null&&visible(document.querySelector('.collection-detail-header')))m.shell=performance.now()-m.start;
if(m.header===null&&visible(document.querySelector('.collection-detail-actions')))m.header=performance.now()-m.start;
const photo=document.querySelector('.collection-detail-images img.full.loaded');if(photo&&visible(photo)){m.image=performance.now()-m.start;return resolve(m);}
if(performance.now()-m.start>10000)return resolve(m);}requestAnimationFrame(poll);};poll();}));
await page.locator('.collection-card-link').click();const metrics=await tracking;samples.push({run,detailRequests,...metrics});await context.close();}
const result={environment:'Edge headless 1440x900, local Vite build fixture; detail API 700ms, favorite API 900ms; no CPU throttle',samples};fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/collection-open-'+(process.argv[2]||'measurement')+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

