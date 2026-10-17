const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('app_locale','vi');});
 const calls=[],errors=[];let raw='System settings updated';
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());calls.push({path:u.pathname,method:req.method()});
 if(u.pathname.endsWith('/admin/logs'))return route.fulfill({json:{logs:[{_id:'log',timestamp:'2026-10-16T00:00:00Z',level:'info',message:raw,action:'updateSettings',userId:{displayName:'Tên người dùng giữ nguyên'}}],pagination:{page:1,pages:1,total:1}}});
 if(u.pathname.endsWith('/admin/roles'))return route.fulfill({json:{adminRoles:[]}});
 if(u.pathname.endsWith('/bookings/admin/packages'))return route.fulfill({json:{packages:[{_id:'p',slug:'portrait',name:'Gói chụp không dịch',description:'Mô tả khách nhập giữ nguyên',durationMinutes:60,basePrice:1500000,includedPhotos:20,includedPeople:1,deliveryDays:7,category:'portrait',active:true}]}});
 const response=await route.fetch({url:origin+u.pathname+u.search});return route.fulfill({response});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/admin/logs');await page.getByRole('heading',{name:'Nhật ký hệ thống',exact:true}).waitFor();await page.getByText('Cài đặt hệ thống đã được cập nhật',{exact:true}).waitFor();
 const requestsBefore=calls.length;await page.getByRole('combobox',{name:'Ngôn ngữ quản trị',exact:true}).selectOption('en');
 await page.getByRole('heading',{name:'System Logs',exact:true}).waitFor();await page.getByText('System settings updated',{exact:true}).first().waitFor();await page.getByRole('link',{name:'Activity log',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('app_locale')),'vi');assert.equal(await page.evaluate(()=>localStorage.getItem('photocloud_admin_locale')),'en');assert.equal(calls.length,requestsBefore);
 await page.reload();await page.getByRole('heading',{name:'System Logs',exact:true}).waitFor();
 await page.screenshot({path:'qa-policy-checkbox/admin-language-logs-en.png',fullPage:true,animations:'disabled'});
 const routes=['/admin','/admin/images','/admin/categories','/admin/collections','/admin/moderation','/admin/bookings','/admin/users','/admin/roles','/admin/settings'];const headings=[];
 for(const route of routes){await page.goto(origin+route);await page.locator('main h1').waitFor();const h=await page.locator('main h1').innerText();headings.push({route,heading:h});assert.ok(!/[À-ỹĐđ]/.test(h),`${route}: ${h}`);}
 // A setting draft must survive switching languages; no reload or mutation.
 await page.getByRole('textbox').first().fill('Draft giữ nguyên');
 const field=await page.getByRole('textbox').first().inputValue();
 await page.getByRole('combobox',{name:'Admin language',exact:true}).selectOption('vi');
 assert.equal(await page.getByRole('textbox').first().inputValue(),field);
 await page.getByRole('combobox',{name:'Ngôn ngữ quản trị',exact:true}).selectOption('en');
 assert.equal(await page.getByRole('textbox').first().inputValue(),field);
 // Leave the draft with explicit discard confirmation, then test a package dialog.
 page.on('dialog',dialog=>dialog.accept());await page.goto(origin+'/admin/bookings');await page.getByRole('button',{name:'Packages',exact:true}).click();await page.getByText('Gói chụp không dịch',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Edit package Gói chụp không dịch',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Package name',{exact:true}).fill('Bản nháp nguyên vẹn');
 await dialog.getByRole('combobox',{name:'Admin language',exact:true}).selectOption('vi');await dialog.getByRole('heading',{name:'Chỉnh sửa gói chụp',exact:true}).waitFor();assert.equal(await dialog.getByLabel('Tên gói',{exact:true}).inputValue(),'Bản nháp nguyên vẹn');
 await dialog.getByRole('combobox',{name:'Ngôn ngữ quản trị',exact:true}).selectOption('en');assert.equal(await dialog.getByLabel('Package name',{exact:true}).inputValue(),'Bản nháp nguyên vẹn');
 await page.screenshot({path:'qa-policy-checkbox/admin-language-package-en.png',fullPage:true,animations:'disabled'});
 await dialog.getByRole('button',{name:'Close package form',exact:true}).click();
 await page.goto(origin+'/admin/roles');await page.getByRole('button',{name:'Add Admin Role',exact:true}).click();const roleDialog=page.getByRole('dialog');await roleDialog.getByLabel('Role',{exact:true}).selectOption('moderator');await roleDialog.getByRole('combobox',{name:'Admin language',exact:true}).selectOption('vi');assert.equal(await roleDialog.getByLabel('Vai trò',{exact:true}).inputValue(),'moderator');await roleDialog.getByRole('button',{name:'Hủy',exact:true}).click();
 const writes=calls.filter(c=>!['GET','OPTIONS'].includes(c.method)&&!c.path.includes('/auth/refresh')&&!c.path.endsWith('/admin/analytics/track'));assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 fs.writeFileSync('qa-policy-checkbox/admin-language-results.json',JSON.stringify({passed:true,headings,publicLocale:'vi',adminLocale:'separate; persisted',mutations:writes},null,2));console.log('PASS admin-only vi/en, instant switching, all 10 route headings, persistence, public locale isolation, settings/package/role draft retention, raw user content, localized event label, no language-change requests or writes');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

