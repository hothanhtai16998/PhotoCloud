const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.route('**/api/**',async route=>{const url=new URL(route.request().url());if(route.request().method()!=='GET' && !url.pathname.includes('/auth/refresh'))return route.fulfill({status:403,json:{}});const response=await fetch(origin+url.pathname+url.search);let data=await response.json();if(Array.isArray(data.bookings))data.bookings=data.bookings.map(b=>({...b,requestedStartTime:'08:00'}));return route.fulfill({status:response.status,json:data});});
 const page=await context.newPage();await page.goto(origin+'/admin/bookings');const list=page.locator(width<801?'.booking-request-mobile-list':'.booking-request-table');
 await list.getByText('Minh An',{exact:true}).waitFor();const row=list.locator(width<801?'article':'tbody tr').filter({hasText:'Minh An'});await row.getByText('08:00',{exact:false}).first().waitFor();
 await row.getByRole('button',{name:/Chi tiết|Xem chi tiết/}).click();await page.getByRole('dialog').getByText('08:00',{exact:true}).waitFor();await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.getByRole('button',{name:'Lịch',exact:true}).click();await page.getByText('08:00',{exact:false}).first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));console.log('PASS admin exact requested time',width);await context.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
