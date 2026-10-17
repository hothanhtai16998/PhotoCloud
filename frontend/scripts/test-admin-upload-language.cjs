const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('app_locale','vi');localStorage.setItem('photocloud_admin_locale','en');localStorage.setItem('uploadPreserveQuality','true');});
 let preuploads=0,finalizes=0;
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());
 if(u.pathname.endsWith('/images/pre-upload')&&req.method()==='POST'){preuploads++;return route.fulfill({json:{message:'ok',uploadId:'fixture-upload',uploadKey:'fixture-key',uploadUrl:origin+'/api/fixture-storage',expiresIn:900,maxFileSize:10000000}});}
 if(u.pathname.endsWith('/fixture-storage')||u.pathname.endsWith('/images/pre-upload')&&req.method()==='DELETE')return route.fulfill({json:{success:true}});
 if(u.pathname.includes('/finalize')){finalizes++;return route.fulfill({status:503,json:{message:'Do not finalize in language test'}});}
 const response=await route.fetch({url:origin+u.pathname+u.search});return route.fulfill({response});});
 const page=await context.newPage();page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/admin/images');await page.getByRole('button',{name:/Upload/}).click();const modal=page.locator('.upload-modal-overlay');await modal.getByRole('heading',{name:'Add photos to PhotoCloud',exact:true}).waitFor();
 await modal.locator('input[type=file]').first().setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwZkAAAAASUVORK5CYII=','base64')});
 await modal.getByPlaceholder('Image title',{exact:true}).fill('Bản nháp không đổi');await page.waitForFunction(()=>document.querySelector('.upload-success-overlay')||document.querySelector('.upload-status-success')||[...document.querySelectorAll('.upload-modal-overlay *')].some(e=>e.textContent.trim()==='✓ Uploaded'));
 await modal.getByRole('combobox',{name:'Admin language',exact:true}).selectOption('vi');await modal.getByRole('heading',{name:'Thêm ảnh vào PhotoCloud',exact:true}).waitFor();assert.equal(await modal.getByPlaceholder('Tiêu đề ảnh',{exact:true}).inputValue(),'Bản nháp không đổi');assert.equal(await modal.locator('.upload-image-container-wrapper').count(),1);
 await modal.getByRole('combobox',{name:'Ngôn ngữ quản trị',exact:true}).selectOption('en');assert.equal(await modal.getByPlaceholder('Image title',{exact:true}).inputValue(),'Bản nháp không đổi');assert.equal(preuploads,1);assert.equal(finalizes,0);
 await page.evaluate(()=>document.documentElement.classList.add('dark-theme'));await page.screenshot({path:'qa-policy-checkbox/admin-language-upload-en-dark.png',fullPage:true,animations:'disabled'});
 await modal.getByRole('button',{name:'Close upload modal',exact:true}).click();await modal.waitFor({state:'detached'});assert.deepEqual(errors,[]);
 // The public upload entry point keeps its own locale even while admin is English.
 await page.goto(origin+'/explore');await page.locator('.header-upload-button').click();await page.locator('.upload-modal-overlay').getByRole('heading',{name:'Thêm ảnh vào PhotoApp',exact:true}).waitFor();assert.equal(await page.locator('.upload-modal-overlay .admin-language-picker').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('app_locale')),'vi');
 console.log('PASS admin upload English/Vietnamese, selected file/title retained, exactly one fixture pre-upload, no finalize, public upload stays Vietnamese');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

