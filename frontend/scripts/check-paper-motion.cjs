const assert=require('node:assert/strict');const {createHash}=require('node:crypto');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({channel:'msedge',headless:true});try{const ctx=await browser.newContext({viewport:{width:1705,height:980},reducedMotion:'no-preference',serviceWorkers:'block'});await ctx.route('https://example.test/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#52756b"/></svg>'}));await ctx.route('**/api/**',async r=>{const u=new URL(r.request().url());if(u.pathname==='/api/images')return r.fulfill({json:{images:Array.from({length:6},(_,i)=>({_id:'s'+i,imageTitle:'Ảnh tham khảo '+i,imageUrl:'https://example.test/'+i+'.svg',width:1200,height:800})),pagination:{page:1,pages:1,total:6}}});if(u.pathname==='/api/bookings/packages')return r.fulfill({json:{success:true,packages:[{slug:'portrait',name:'Gói API fixture',description:'Nội dung từ API fixture',basePrice:1900000,durationMinutes:75,includedPhotos:25,includedPeople:1,deliveryDays:10,category:'portrait'}]}});if(r.request().method()!=='GET')return r.fulfill({json:{success:true}});const res=await fetch(origin+u.pathname+u.search);await r.fulfill({status:res.status,body:await res.text(),contentType:'application/json'});});const page=await ctx.newPage();await page.goto(origin+'/');await page.locator('.home-tour canvas.is-ready').waitFor();await page.locator('.travel-stage .destination').waitFor();await page.waitForTimeout(400);
const motion=await page.evaluate(async()=>{
 const guide=document.querySelector('.home-tour'),canvas=guide.querySelector('canvas');
 const anchors=['.home-wayfinding','.home-journey','.home-journey-gallery','#home-packages'].map(s=>Math.max(0,document.querySelector(s).getBoundingClientRect().top+scrollY-innerHeight*.5));
 const source=new Image();source.src='/images/home-guide/paper-guide-poses.png';await source.decode();const expected=document.createElement('canvas');expected.width=canvas.width;expected.height=canvas.height;const expectedContext=expected.getContext('2d');const cells={wave:0,point:1,photo:2,album:3,listen:4,calendar:5};const points=[];
 for(const center of anchors){
  for(const direction of [1,-1]){
   scrollTo(0,center+(direction===1?-160:160));
   for(let settle=0;settle<32;settle++)await new Promise(r=>requestAnimationFrame(r));
   for(let step=0;step<=16;step++){
    scrollTo(0,center-160+(direction===1?step:16-step)*20);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=guide.getBoundingClientRect();
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    expected.width=canvas.width;expected.height=canvas.height;const cell=cells[canvas.dataset.pose],size=Math.min(canvas.width,canvas.height);expectedContext.clearRect(0,0,expected.width,expected.height);expectedContext.drawImage(source,cell%3*512,Math.floor(cell/3)*512,512,512,(canvas.width-size)/2,(canvas.height-size)/2,size,size);const reference=expectedContext.getImageData(0,0,expected.width,expected.height).data;let mismatch=0;for(let i=3;i<pixels.length;i+=4)if(Math.abs(pixels[i]-reference[i])>16)mismatch++;let solid=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>180)solid++;
    points.push({center,direction,step,x:rect.x,y:rect.y,visible:getComputedStyle(guide).visibility,solid,mismatch});
   }
  }
 }
 return points;
});
require('node:fs').writeFileSync('qa-policy-checkbox/paper-motion-samples.json',JSON.stringify(motion,null,2));
for(const sample of motion){assert.equal(sample.visible,'visible');assert.equal(sample.mismatch,0,'frame alpha silhouette matches one pose, no ghost limbs');assert.ok(sample.solid>150,'no blank/translucent actor frame');}
for(let i=1;i<motion.length;i++){const a=motion[i-1],b=motion[i];if(a.center===b.center&&a.direction===b.direction)assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<100,'no section-boundary teleport');}
require('node:fs').writeFileSync('qa-policy-checkbox/paper-motion-samples.json',JSON.stringify(motion,null,2));
console.log('PASS',motion.length,'scroll frames across four boundaries forward/backward: no disappearance or teleport');const hashes=[],positions=[];for(const [name,selector,index] of [['welcome',null,0],['idea','.home-journey',3],['photo','.home-journey-gallery',4],['packages','#home-packages',7],['faq','.home-booking-faq',10],['final','.home-bottom-cta',11]]){await page.evaluate(selector=>{const e=selector&&document.querySelector(selector);window.scrollTo(0,e?e.getBoundingClientRect().top+scrollY-130:0);},selector);await page.waitForTimeout(500);const metrics=await page.locator('.home-tour').evaluate(el=>({top:el.getBoundingClientRect().top,left:el.getBoundingClientRect().left,bottom:el.getBoundingClientRect().bottom,scene:Number(el.dataset.scene)}));const contentRight=await page.locator('#home-packages').evaluate(el=>el.getBoundingClientRect().right);if(index>0)assert.ok(metrics.left>=contentRight+8,'guide stays outside content');console.log(name,metrics);assert.equal(metrics.scene,index);assert.ok(metrics.top>=0&&metrics.bottom<=980);if(index>0)positions.push(metrics.left);if(name==='packages'){await page.locator('.home-package-card button').hover();await page.waitForTimeout(50);assert.ok((await page.locator('.home-tour-speech').innerText()).includes('Gói API fixture'));}if(name==='faq'){await page.locator('.home-faq-item button').first().click();assert.equal(await page.locator('.home-faq-item button').first().getAttribute('aria-expanded'),'true');assert.ok((await page.locator('.home-tour-speech').innerText()).includes('câu trả lời'));}await page.screenshot({path:'qa-policy-checkbox/paper-tour-'+name+'.png'});const capture=await page.locator('.home-tour canvas').screenshot();hashes.push(createHash('sha256').update(capture).digest('hex'));}
assert.ok(new Set(hashes).size>=4,'distinct articulated poses');assert.ok(Math.max(...positions)-Math.min(...positions)<25,'stays in the outer rail instead of crossing content');await page.locator('.home-tour-speech button').click();await page.locator('.booking-modal-backdrop').waitFor();await page.waitForTimeout(100);assert.equal(await page.locator('.home-tour').evaluate(el=>getComputedStyle(el).visibility),'hidden');await page.locator('.booking-modal-close').click();await page.locator('.home-tour').waitFor({state:'visible'});await page.locator('.home-tour-close').click();await page.locator('.home-tour-reopen').click();await page.locator('.home-tour canvas.is-ready').waitFor({state:'visible'});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);assert.equal(await page.locator('.home-tour').getAttribute('data-scene'),'0');await page.setViewportSize({width:1024,height:900});await page.locator('#home-packages').scrollIntoViewIfNeeded();await page.waitForTimeout(150);assert.equal(await page.locator('.home-tour').getAttribute('data-compact'),'true');const narrow=await page.locator('.home-tour').boundingBox();const edge=await page.locator('#home-packages').evaluate(el=>el.getBoundingClientRect().right);assert.ok(narrow.x>=edge&&narrow.x+narrow.width<=1024,'compact guide fits the narrow gutter');await page.getByRole('link',{name:'Tìm thêm cảm hứng',exact:true}).click();await page.waitForURL('**/explore');await page.locator('.home-tour').waitFor({state:'detached'});assert.equal(await page.locator('.home-tour').count(),0);console.log('PASS full-page itinerary, poses, docking, modal suppression, hide/reopen, reverse scroll and route cleanup');}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});











