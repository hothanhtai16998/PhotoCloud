const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const server=require('./admin-preview.cjs'); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  let fail=false,empty=false,limited=false,calls=0;
  await context.route('**/api/**',async route=>{
   const url=new URL(route.request().url());
   if(limited && url.pathname.includes('/users/me')) return route.fulfill({json:{user:{_id:'limited',username:'reviewer',isAdmin:true,isSuperAdmin:false,permissions:{viewDashboard:true}}}});
   if(url.pathname.endsWith('/dashboard/stats')) {
    calls++; if(fail) return route.fulfill({status:503,json:{message:'Không tải được tổng quan thử nghiệm'}});
    return route.fulfill({json:{stats:{totalImages:empty?0:12345,totalUsers:3,totalCategories:8},recentUsers:[],recentImages:empty?[]:[{_id:'one',imageTitle:'Tên ảnh tiếng Việt rất dài '.repeat(8),imageUrl:origin+'/missing-photo.png',createdAt:'2026-10-16T12:00:00Z',uploadedBy:{displayName:'Người tải thử'}},{_id:'two',imageTitle:null,imageUrl:null,createdAt:'invalid',uploadedBy:null}]}});
   }
   const response=await route.fetch({url:origin+url.pathname+url.search});return route.fulfill({response});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/admin');await page.getByText('12.345',{exact:true}).waitFor();
  await page.getByText('Ảnh chưa có tiêu đề',{exact:true}).waitFor();await page.getByText('Chưa rõ ngày',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.admin-recent-photo img').length===0);
  for(const theme of ['light','dark']) {await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);await page.screenshot({path:`qa-policy-checkbox/dashboard-${theme}.png`,fullPage:true,animations:'disabled'});}
  fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await page.getByText('Không tải được tổng quan thử nghiệm',{exact:true}).waitFor();assert.ok(await page.getByText('12.345',{exact:true}).count());await page.getByText('Chưa thể cập nhật.',{exact:false}).waitFor();
  fail=false;empty=true;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByText('Chưa có ảnh mới',{exact:true}).waitFor();assert.equal(await page.locator('.admin-recent-row').count(),0);
  fail=true;await page.reload();await page.getByText('Không tải được tổng quan thử nghiệm',{exact:true}).waitFor();assert.equal(await page.getByText('Chưa có ảnh mới',{exact:true}).count(),0);
  fail=false;limited=true;await page.reload();await page.getByText('Tài khoản hiện chỉ có quyền xem tổng quan.',{exact:false}).waitFor();assert.equal(await page.locator('nav[aria-label="Công việc nhanh"] a').count(),0);
  assert.deepEqual(errors,[]);fs.writeFileSync('qa-policy-checkbox/dashboard-results.json',JSON.stringify({passed:true,calls,environment:'Edge headless 1440x1000; isolated API fixture; light/dark; responsive not tested'},null,2));console.log('PASS dashboard success, large/missing data, broken image, refresh retention, retry, empty, initial failure, limited permissions, light/dark');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
