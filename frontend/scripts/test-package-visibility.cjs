const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try {
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
 let active=true, failRestore=true;const calls=[];
 const item={_id:'p1',name:'Gói thử',slug:'test',description:'Mô tả thử',category:'portrait',durationMinutes:60,basePrice:1000000,includedPhotos:20,includedPeople:1,deliveryDays:7,sortOrder:4};
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());
 if(u.pathname.endsWith('/bookings/admin/packages')&&req.method()==='GET') return route.fulfill({json:{packages:[{...item,active}]}});
 if(u.pathname.endsWith('/bookings/admin/packages/p1')) {calls.push(req.method());
 if(req.method()==='DELETE')active=false;
 if(req.method()==='PATCH'){assert.equal(req.postDataJSON().active,true);assert.equal(req.postDataJSON().sortOrder,4);if(failRestore)return route.fulfill({status:503,json:{message:'Lỗi hiện lại thử nghiệm'}});active=true;}
 return route.fulfill({json:{success:true,package:{...item,active}}});}
 const response=await route.fetch({url:origin+u.pathname+u.search});return route.fulfill({response});});
 const page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto(origin+'/admin/bookings');await page.getByRole('button',{name:'Gói chụp',exact:true}).click();
 await page.getByRole('button',{name:'Ẩn gói Gói thử',exact:true}).click();await page.getByRole('button',{name:'Hiện lại gói Gói thử',exact:true}).waitFor();assert.equal(active,false);
 await page.reload();await page.getByRole('button',{name:'Gói chụp',exact:true}).click();await page.getByRole('button',{name:'Hiện lại gói Gói thử',exact:true}).click();await page.getByText('Lỗi hiện lại thử nghiệm',{exact:true}).waitFor();assert.equal(active,false);
 failRestore=false;await page.getByRole('button',{name:'Hiện lại gói Gói thử',exact:true}).click();await page.getByRole('button',{name:'Ẩn gói Gói thử',exact:true}).waitFor();assert.equal(active,true);assert.deepEqual(calls,['DELETE','PATCH','PATCH']);
 await page.getByRole('button',{name:'Ẩn gói Gói thử',exact:true}).click();await page.getByRole('button',{name:'Hiện lại gói Gói thử',exact:true}).waitFor();
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);await page.screenshot({path:`qa-policy-checkbox/package-visibility-${theme}.png`,fullPage:true,animations:'disabled'});}
 console.log('PASS hide retains admin row, reload retains restore action, restore failure/retry, active payload and sortOrder preserved');
 } finally {await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
