const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try { for(const theme of ['light','dark']) {
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(theme=>{localStorage.setItem('theme',theme);sessionStorage.setItem('hasAuth','true');},theme);
 let fail=false,empty=false;const requests=[];
 await context.route('**/api/**',async route=>{
 const u=new URL(route.request().url());
 if(u.pathname==='/api/auth/refresh')return route.fulfill({json:{accessToken:'fixture'}});
 if(u.pathname==='/api/users/me')return route.fulfill({json:{user:{_id:'viewer',username:'viewer',displayName:'Khách thử nghiệm'}}});
 if(u.pathname==='/api/bookings/mine'){
 requests.push(u.searchParams.get('page'));if(fail)return route.fulfill({status:503,json:{message:'Fixture tạm gián đoạn'}});
 const page=Number(u.searchParams.get('page')||1);
 return route.fulfill({json:{success:true,bookings:empty?[]:[{_id:'booking-'+page,bookingCode:'PC-00'+page,status:page===1?'confirmed':'pending',requestedDate:'2030-10-20',confirmedDate:page===1?'2030-10-22':undefined,confirmedStartTime:page===1?'09:30':undefined,requestedTimeSlot:'morning',location:{type:'outdoor',address:'Địa điểm thử nghiệm'},packageSnapshot:{name:'Gói thử nghiệm '+page,basePrice:1500000,durationMinutes:60,includedPhotos:20}}],pagination:{page,limit:20,total:empty?0:21,pages:empty?0:2}}});
 }
 if(route.request().method()!=='GET')return route.fulfill({status:403,json:{}});
 const r=await fetch(origin+u.pathname+u.search);return route.fulfill({status:r.status,body:await r.text(),contentType:'application/json'});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/my-bookings');await page.getByRole('heading',{name:'Lịch chụp của tôi',exact:true}).waitFor();
 await page.getByText('PC-001',{exact:true}).waitFor();await page.getByText('22/10/2030',{exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Xem chi tiết',exact:true}).getAttribute('href'),'/booking/booking-1');
 await page.screenshot({path:'qa-policy-checkbox/my-bookings-'+theme+'.png'});
 await page.getByRole('button',{name:'Trang sau',exact:true}).click();await page.getByText('PC-002',{exact:true}).waitFor();assert.ok(requests.includes('2'));
 fail=true;await page.reload();await page.getByRole('heading',{name:'Chưa tải được lịch chụp',exact:true}).waitFor();
 fail=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByText('PC-001',{exact:true}).waitFor();
 empty=true;await page.reload();await page.getByRole('heading',{name:'Chưa có lịch đặt nào',exact:true}).waitFor();empty=false;
 for(const alias of ['/profile','/profile/bookings','/me','/@viewer','/profile/user/viewer']){await page.goto(origin+alias);await page.waitForURL('**/my-bookings');await page.getByText('PC-001',{exact:true}).waitFor();}
 await page.locator('.user-menu-trigger').click();assert.ok(await page.locator('.user-menu-content a[href="/my-bookings"]').count());assert.equal(await page.locator('.user-menu-content a[href="/@viewer"]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS',theme,'list,confirmed date,pagination,error/retry,empty,profile aliases,menu');await context.close();
 }
 const guest=await browser.newContext();await guest.route('**/api/**',route=>route.fulfill({status:401,json:{message:'Unauthenticated'}}));const page=await guest.newPage();await page.goto(origin+'/my-bookings');await page.waitForURL('**/signin**');console.log('PASS guest protected route');await guest.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
