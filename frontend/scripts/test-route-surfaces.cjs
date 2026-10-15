const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
(async()=>{
  const root=path.resolve(__dirname,'../dist');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    let file=path.resolve(root,'.'+decodeURIComponent(pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()) file=path.join(root,'index.html');
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  const report=[];
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
      let newsletterFailure=false;let newsletterActions=0;
      let adminFixture=true;
      let loginIdentity='member';const delayedRefresh=[];
      await context.route('**/api/**',route=>{
        const url=route.request().url();
        if(process.argv.includes('--auth-switch')) {
          if(url.includes('/auth/refresh')) {
            if(loginIdentity==='member') {delayedRefresh.push(route);return;}
            return route.fulfill({json:{accessToken:'admin-token'}});
          }
          if(url.includes('/auth/signin')) {loginIdentity='admin';return route.fulfill({json:{accessToken:'admin-token'}});}
          if(url.includes('/users/me')) {
            const admin=route.request().headers().authorization==='Bearer admin-token';
            return route.fulfill({headers:{'Cache-Control':'no-store'},json:{user:{_id:admin?'admin':'member',username:admin?'admin123':'user111',displayName:admin?'Admin fixture':'Old member',email:'fixture@example.com',isAdmin:admin}}});
          }
        }
        if(url.includes('/newsletter/')) {
          newsletterActions++;
          return route.fulfill({status:newsletterFailure?503:200,json:{success:!newsletterFailure,message:newsletterFailure?'Chưa gửi được email xác nhận. Vui lòng thử lại sau.':url.includes('/subscribe')?'Vui lòng kiểm tra email xác nhận.':'Đã xử lý thành công.'}});
        }
        const user={_id:'0123456789abcdef01234567',username:'fixture',displayName:'Fixture',email:'fixture@example.com',role:adminFixture?'admin':'user',isAdmin:adminFixture,favorites:[],following:[],followers:[]};
        const body=url.includes('/users/me')?{success:true,user}:url.includes('/auth/refresh')?{accessToken:'fixture'}:{success:true,images:[],collections:[],packages:[],posts:[],notifications:[],bookings:[],downloads:[],users:[],sessions:[],favorites:{},unreadCount:0,settings:{},pagination:{page:1,limit:20,total:0,pages:0}};
        return route.fulfill({json:body});
      });
      for(const theme of ['light','dark']){
        for(const route of ['/','/explore','/packages','/about','/contact','/blog','/collections','/favorites','/favorites/collections','/downloads','/notifications','/profile/bookings','/booking','/upload','/settings/profile','/signin','/signup','/404','/photos/test-0123456789ab','/collections/0123456789abcdef01234567','/booking/0123456789abcdef01234567','/admin']){
          if(process.argv.includes('--gold') && !['/explore','/packages','/blog','/favorites','/settings/profile'].includes(route)) continue;
          if(process.argv.includes('--home') && route!=='/') continue;
          if(process.argv.includes('--newsletter') && route!=='/') continue;
          if(process.argv.includes('--admin-entry') && route!=='/') continue;
          if(process.argv.includes('--auth-switch') && route!=='/') continue;
          const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
          const watchdog=setTimeout(()=>void page.close().catch(()=>{}),8000);
          try {
          if(process.argv.includes('--auth-switch')) loginIdentity='member';
          await page.goto(`http://127.0.0.1:${server.address().port}${process.argv.includes('--auth-switch')?'/signin':route}`,{waitUntil:'domcontentloaded'});
          await page.waitForTimeout(350);
          await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
          await page.waitForTimeout(250);
          const sample=await page.evaluate(()=>{
            const header=document.querySelector('.PHOTOCLOUD-header');
            const whites=[...document.querySelectorAll('body *')].filter(element=>{
              const box=element.getBoundingClientRect();return box.width>80&&box.height>40&&box.top<innerHeight&&box.bottom>0&&getComputedStyle(element).backgroundColor==='rgb(255, 255, 255)';
            }).map(element=>element.className).slice(0,12);
            return {body:getComputedStyle(document.body).backgroundColor,header:header?getComputedStyle(header).backgroundColor:null,whiteSurfaces:whites};
          });
          report.push({width,theme,route,actual:new URL(page.url()).pathname,...sample,errors});
          if(process.argv.includes('--auth-switch')) {
            await page.locator('#username').fill('admin123');await page.locator('#password').fill('test-only-password');
            await page.locator('form button[type="submit"]').click();await page.waitForURL(`http://127.0.0.1:${server.address().port}/`);
            const avatar=page.locator('.user-menu-trigger:visible');await avatar.waitFor();
            for(const old of delayedRefresh.splice(0)) await old.fulfill({json:{accessToken:'old-member-token'}}).catch(()=>{});
            await page.waitForTimeout(200);
            if(width>768)await avatar.hover();else await avatar.click();
            await page.locator('.user-menu-content a[href="/admin"]').waitFor();
            assert.ok((await page.locator('.user-menu-content').textContent()).includes('admin123'));
            assert.ok(!(await page.locator('.user-menu-content').textContent()).includes('user111'));
            await page.reload({waitUntil:'domcontentloaded'});
            await page.locator('.user-menu-trigger:visible').waitFor();
            if(width>768)await page.locator('.user-menu-trigger:visible').hover();else await page.locator('.user-menu-trigger:visible').click();
            await page.locator('.user-menu-content a[href="/admin"]').waitFor();
            console.log(`PASS account isolation ${width} ${theme}: admin login, delayed old refresh, reload`);
          }
          if(process.argv.includes('--admin-entry')) {
            const trigger=page.locator('.user-menu-trigger:visible');await trigger.waitFor();
            console.log('Admin trigger',width,await trigger.boundingBox());
            if(width>768) await trigger.hover();else await trigger.click();
            const link=page.locator('.user-menu-content a[href="/admin"]');await link.waitFor();
            assert.ok((await link.textContent()).includes('Quản trị'));
            if(width>768) assert.equal(await page.locator('.header-library-action[href="/admin"]:visible').count(),1);
            await link.click();await page.waitForURL('**/admin');
            adminFixture=false;
            await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
            await page.locator('.user-menu-trigger:visible').waitFor();
            if(width>768) await page.locator('.user-menu-trigger:visible').hover();else await page.locator('.user-menu-trigger:visible').click();
            await page.locator('.user-menu-content').waitFor();
            assert.equal(await page.locator('.user-menu-content a[href="/admin"]').count(),0,'Member must not see admin entry');
            assert.equal(await page.locator('.header-library-action[href="/admin"]').count(),0);
            adminFixture=true;
          }
          if(process.argv.includes('--newsletter')) {
            const input=page.locator('.studio-footer-newsletter input');
            const submit=page.locator('.studio-footer-newsletter button[type="submit"]');
            await input.fill('test@example.com');await submit.click();
            await page.locator('.studio-footer-newsletter [role="status"]').waitFor();
            newsletterFailure=true;
            await input.fill('retry@example.com');await submit.click();
            await page.locator('.studio-footer-newsletter [role="alert"]').waitFor();newsletterFailure=false;
            for(const action of ['confirm','unsubscribe']) {
              const beforeActions=newsletterActions;
              await page.goto(`http://127.0.0.1:${server.address().port}/newsletter/${action}#token=${'a'.repeat(64)}`,{waitUntil:'domcontentloaded'});
              await page.locator('.newsletter-page').waitFor();
              await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
              assert.equal(newsletterActions,beforeActions,'Opening a link must not mutate subscriptions');
              await page.screenshot({timeout:3000,path:path.resolve(__dirname,`../newsletter-${action}-${theme}-${width}.png`)});
              await page.locator('.newsletter-page button').click();
              await page.waitForFunction(()=>document.querySelector('.newsletter-page h1')?.textContent.startsWith('Đã'));
              assert.equal(newsletterActions,beforeActions+1);
            }
          }
          if(process.argv.includes('--home')) {
            const positions=await page.locator('.homepage .hero-section').evaluate(element=>{
              const box=element.getBoundingClientRect();const top=box.top+scrollY;return {inside:top+box.height/2,after:top+box.height+40};
            });
            const color=()=>page.locator('.PHOTOCLOUD-header').evaluate(element=>getComputedStyle(element).backgroundColor);
            await page.evaluate(y=>window.scrollTo(0,y),positions.inside);await page.waitForTimeout(300);
            assert.equal(await color(),theme==='dark'?'rgb(48, 41, 30)':'rgb(240, 234, 224)','Keep gold inside HeroBooking');
            await page.evaluate(y=>window.scrollTo(0,y),positions.after);await page.waitForTimeout(300);
            assert.equal(await color(),sample.body,'Use canvas after HeroBooking');
            await page.evaluate(y=>window.scrollTo(0,y),positions.inside);await page.waitForTimeout(300);
            assert.equal(await color(),theme==='dark'?'rgb(48, 41, 30)':'rgb(240, 234, 224)','Return to gold inside HeroBooking');
          }
          if(process.argv.includes('--gold') && ['/packages','/favorites','/settings/profile'].includes(route)) {
            const band=await page.locator('.packages-page,.favorites-page,.profile-settings-page').first().evaluate(element=>getComputedStyle(element).backgroundImage);
            assert.ok(band.includes('linear-gradient')&&band.includes('radial-gradient'),'Gold heading wash must render on page');
          }
          if(['/explore','/packages','/signin','/admin'].includes(route)) await page.screenshot({timeout:3000,path:path.resolve(__dirname,`../surface-${route.slice(1)}-${theme}-${width}.png`)});
          if(process.argv.includes('--gold') && route==='/packages') {
            await page.evaluate(()=>window.scrollTo(0,650));await page.waitForTimeout(300);
            const scrolled=await page.locator('.PHOTOCLOUD-header').evaluate(element=>({canvas:element.dataset.surface==='canvas',color:getComputedStyle(element).backgroundColor}));
            assert.ok(scrolled.canvas,'Header switches after gold band');
            assert.equal(scrolled.color,sample.body);
            await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(300);
            assert.equal(await page.locator('.PHOTOCLOUD-header').evaluate(element=>getComputedStyle(element).backgroundColor),sample.header,'Header returns to gold at top');
          }
          } catch(error) {report.push({width,theme,route,errors:[error.message],unverified:true,whiteSurfaces:[]});}
          finally{clearTimeout(watchdog);await page.close().catch(()=>{});}
        }
      }
      await context.close();
      console.log(`Completed ${width}: ${report.length} samples`);
    }
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
  fs.writeFileSync(path.resolve(__dirname,process.argv.includes('--auth-switch')?'../auth-switch-report.json':process.argv.includes('--admin-entry')?'../admin-entry-report.json':process.argv.includes('--newsletter')?'../newsletter-ui-report.json':process.argv.includes('--home')?'../home-header-surfaces-report.json':process.argv.includes('--gold')?'../gold-surfaces-report.json':'../route-surfaces-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({samples:report.length,issues:report.filter(item=>item.whiteSurfaces.length||item.errors.length),redirected:report.filter(item=>item.route!==item.actual).map(item=>({route:item.route,actual:item.actual}))},null,2));
  assert.ok(report.filter(item=>!item.unverified).every(item=>item.body===(item.theme==='dark'?'rgb(36, 32, 23)':'rgb(250, 248, 244)')),'Body canvas follows theme');
  if(process.argv.includes('--gold')) assert.ok(report.filter(item=>!item.unverified).every(item=>item.header===(item.theme==='dark'?'rgb(48, 41, 30)':'rgb(240, 234, 224)')),'Header uses warm solid theme surface');
})().catch(error=>{console.error(error);process.exitCode=1;});
