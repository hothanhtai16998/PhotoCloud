const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const reports=[];
try{browser=await chromium.launch({channel:'msedge',headless:true});
for(const theme of ['light','dark']){
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
const origin='http://127.0.0.1:'+server.address().port;
const photo={_id:'photo',imageTitle:'Ảnh thử',width:600,height:400,imageUrl:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="tan"/></svg>')};
let reads=0,fail=false,version=0;
await context.route('**/api/**',async route=>{const u=new URL(route.request().url());
if(u.pathname==='/api/collections'&&route.request().method()==='GET'){
reads++;await new Promise(r=>setTimeout(r,200));
if(fail)return route.fulfill({status:503,json:{message:'API chưa phục hồi'}});
return route.fulfill({json:{success:true,collections:[{_id:'kept',name:'Bộ có ảnh '+version,isPublic:true,imageCount:1,coverImage:null,sampleImages:[photo],createdBy:'fixture-admin',tags:['test'],createdAt:'2026-10-19'},{_id:'empty',name:'Không được xuất hiện',isPublic:true,imageCount:0,images:[],createdAt:'2026-10-19'}]}});}
if(route.request().method()!=='GET'){
if(u.pathname==='/api/auth/refresh')return route.fulfill({json:{accessToken:'fixture'}});
return route.fulfill({json:{success:true}});}
const response=await fetch(origin+u.pathname+u.search);return route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});});
const page=await context.newPage();page.setDefaultTimeout(12000);
await page.goto(origin+'/collections');await page.locator('.collection-card').waitFor();
assert.equal(await page.locator('.collection-card').count(),1,'empty collection is hidden');
assert.equal(await page.locator('.collection-card-placeholder').count(),0,'sample image replaces missing cover');
await page.locator('.collections-search-input').fill('Bộ có ảnh');
const offline=async()=>{await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.getByRole('alert').filter({hasText:'ngoại tuyến'}).waitFor();};
await offline();const before=reads;version=1;await context.setOffline(false);
await page.getByRole('heading',{name:'Bộ có ảnh 1',exact:true}).waitFor();assert.equal(reads,before+1,'one automatic recovery');
assert.equal(await page.locator('.collections-search-input').inputValue(),'Bộ có ảnh','keep filter');
await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForTimeout(300);assert.equal(reads,before+1,'no repeated online fetch');
await offline();fail=true;const failedBefore=reads;await context.setOffline(false);
await page.getByRole('alert').filter({hasText:'Không thể tải'}).waitFor();assert.equal(await page.locator('.collection-card').count(),1,'cache survives failed recovery');
await page.waitForTimeout(350);assert.equal(reads,failedBefore+1,'no retry loop');
fail=false;version=2;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:'Bộ có ảnh 2',exact:true}).waitFor();
// A reconnect must not dismiss or refresh an editor with unsaved input.
await page.locator('.collections-create-btn').click();await page.locator('#collection-name').fill('Bản nháp cần giữ');
await offline();const blockedBefore=reads;version=3;await context.setOffline(false);await page.waitForTimeout(300);
assert.equal(reads,blockedBefore);assert.equal(await page.locator('#collection-name').inputValue(),'Bản nháp cần giữ');
await page.locator('.collection-modal-close').click();
await page.getByRole('heading',{name:'Bộ có ảnh 3',exact:true}).waitFor();assert.equal(reads,blockedBefore+1,'deferred recovery runs after editor closes');
await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/collections-recovery-'+theme+'.png')});
reports.push({theme,reads,result:'PASS'});await context.close();}
fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/collections-recovery.json'),JSON.stringify(reports,null,2));console.log('PASS: hide empty, fallback cover, auto refresh once, cached list/filter, failed recovery/manual retry and editor draft guard, light/dark.');
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
