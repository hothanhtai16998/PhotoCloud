const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const member=process.argv.includes('--member');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=','base64');
const image={_id:'000000000000000000000001',imageTitle:'Fixture',imageUrl:'/fixture.png',regularUrl:'/fixture.png',thumbnailUrl:'/fixture.png',width:1200,height:800,imageCategory:'Fixture',uploadedBy:{_id:'000000000000000000000099',username:'fixture'},createdAt:'2026-10-14T00:00:00Z',tags:[]};
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
  try{for(const width of [320,390,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.routeWebSocket('**/*',socket=>socket.close());
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());const p=u.pathname;const headers={'access-control-allow-origin':'http://photocloud.test','access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':route.request().headers()['access-control-request-headers']||'*'};
      const json=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data),headers});
      if(p.includes('/api/')){
        if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
        if(p.endsWith('/images'))return json({images:[image],pagination:{page:1,pages:1,total:1,limit:30}});
        if(p.includes('/images/by-id'))return json({image});
        if(p.endsWith('/categories'))return json({categories:[]});
        if(member&&p.endsWith('/auth/refresh'))return json({accessToken:'fixture-only-token'});
        if(member&&p.endsWith('/users/me'))return json({user:{_id:'000000000000000000000099',username:'fixture',displayName:'Fixture',roles:[],createdAt:'2026-10-14T00:00:00Z'}});
        if(p.includes('/auth/'))return route.fulfill({status:401,contentType:'application/json',body:'{}',headers});
        return json({settings:{maintenanceMode:false},collections:[],favorites:[],packages:[],views:1});
      }
      if(u.hostname!=='photocloud.test'||p==='/fixture.png')return route.fulfill({contentType:'image/png',body:pixel});
      const target=p.startsWith('/assets/')?path.join(root,'dist',p):path.join(root,'dist/index.html');
      if(!fs.existsSync(target))return route.abort();
      return route.fulfill({contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream',body:fs.readFileSync(target)});
    });
    await page.goto('http://photocloud.test/explore');
    if(member&&width>768)await page.locator('.header-library-actions').waitFor({timeout:5000}).catch(async e=>{console.log(JSON.stringify({width,header:await page.locator('.PHOTOCLOUD-header').innerText()}));throw e;});
    if(width<=768)await page.getByRole('button',{name:'Menu',exact:true}).click();
    await page.getByRole('button',{name:'Chuyển sang chế độ tối',exact:true}).click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),'dark');
    if(width<=768)await page.getByRole('button',{name:'Menu',exact:true}).click();
    await page.reload();await page.locator('.explore-page').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dark-theme')),true);
    const styles=async selector=>page.locator(selector).first().evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,filter:getComputedStyle(el).filter}));
    const explore=await styles('.explore-page');assert.equal(explore.background,'rgb(22, 20, 15)');
    await page.locator('.blur-up-image-container').first().click();
    await page.locator('.image-modal-surface').waitFor();const photo=await styles('.image-modal-surface');assert.equal(photo.background,'rgb(22, 20, 15)');
    assert.equal((await styles('.image-page-photo')).filter,'none');
    await page.waitForTimeout(300);
    await page.screenshot({path:path.join(root,`theme-photo-${width}.png`)});
    await page.goto('http://photocloud.test/explore');
    await page.locator('.header-logo').waitFor();
    assert.deepEqual(await page.locator('.header-studio-nav a').allTextContents(),['Khám phá','Gói chụp','Bộ sưu tập','Câu chuyện','Về studio']);
    if(member&&width>768)assert.equal(await page.locator('.header-actions .header-library-action').count(),2);
    if(width>768) {
      const bounds=await page.locator('.PHOTOCLOUD-header').evaluate(el=>{
        const logo=el.querySelector('.header-logo').getBoundingClientRect(),nav=el.querySelector('.header-studio-nav').getBoundingClientRect(),actions=el.querySelector('.header-actions').getBoundingClientRect();
        return {logoLeft:logo.left,logoRight:logo.right,navLeft:nav.left,navRight:nav.right,actionsLeft:actions.left};
      });
      assert.ok(bounds.logoLeft>=0 && bounds.logoRight<=bounds.navLeft+1 && bounds.navRight<=bounds.actionsLeft+1,'Header navigation must not overlap logo/actions or clip logo');
    }
    await page.evaluate(()=>window.scrollTo(0,400));
    await page.locator('.header-logo').click();
    await page.waitForURL('http://photocloud.test/');await page.locator('.hero-section').waitFor();
    await page.waitForFunction(()=>scrollY===0);
    assert.deepEqual(await page.locator('.header-studio-nav a').allTextContents(),['Khám phá','Gói chụp','Bộ sưu tập','Câu chuyện','Về studio']);
    await page.locator('.hero-section').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollTo(0,Math.max(80,scrollY)));
    await page.waitForTimeout(300);
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.PHOTOCLOUD-header')).backgroundColor==='rgb(22, 20, 15)');
    assert.equal((await styles('.PHOTOCLOUD-header')).background,'rgb(22, 20, 15)');
    const hero=await styles('.hero-section');assert.equal(hero.background,'rgb(31, 28, 22)');
    const packages=await styles('.home-package-section');assert.equal(packages.background,'rgb(22, 20, 15)');
    const geometry=await page.locator('.home-package-section').evaluate(el=>{
      const r=el.getBoundingClientRect(),s=getComputedStyle(el),grid=el.querySelector('.home-package-grid').getBoundingClientRect();
      return {width:r.width,parentWidth:el.parentElement.clientWidth,innerWidth:grid.width,expectedInner:Math.min(1296,r.width-32),scrollWidth:el.scrollWidth};
    });
    assert.ok(Math.abs(geometry.innerWidth-geometry.expectedInner)<2);
    assert.ok(geometry.scrollWidth<=geometry.width+1);
    const buttons=await page.locator('.home-package-body button').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().bottom));
    if(width>768)assert.ok(Math.max(...buttons)-Math.min(...buttons)<2,'Package actions must share bottom baseline');
    await page.locator('.home-package-section').screenshot({path:path.join(root,`theme-packages-${width}.png`)});
    await page.waitForTimeout(300);
    await page.locator('.hero-section').screenshot({path:path.join(root,`theme-hero-${width}.png`)});
    await page.locator('.hero-cta--primary').click();await page.locator('.booking-modal').waitFor();
    const booking=await styles('.booking-modal');assert.equal(booking.background,'rgb(37, 34, 28)');
    await page.waitForTimeout(300);
    await page.screenshot({path:path.join(root,`theme-booking-${width}.png`)});
    await page.keyboard.press('Escape');
    await page.goto('http://photocloud.test/explore');
    if(width<=768)await page.getByRole('button',{name:'Menu',exact:true}).click();
    await page.getByRole('button',{name:'Chuyển sang chế độ sáng',exact:true}).click();
    await page.reload();await page.locator('.explore-page').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dark-theme')),false);
    const canvases=[];
    if(member)for(const theme of ['light','dark']) {
      await page.evaluate(theme=>{localStorage.setItem('theme',theme);},theme);
      for(const [route,selector] of [['/collections','.collections-page'],['/favorites','.favorites-page'],['/packages','.packages-page'],['/explore','.explore-page']]) {
        await page.goto(`http://photocloud.test${route}`);await page.locator(selector).waitFor();
        const canvas=await styles(selector);
        assert.equal(canvas.background,theme==='dark'?'rgb(22, 20, 15)':'rgb(250, 248, 244)');
        assert.equal(await page.locator('.image-page-sidebar').count(),0);
        const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,left:document.querySelector('.PHOTOCLOUD-header').getBoundingClientRect().left}));
        assert.equal(layout.overflow,false);assert.equal(layout.left,0);
        canvases.push({route,theme,background:canvas.background});
        if(width===1440&&route==='/favorites')await page.screenshot({path:path.join(root,`theme-favorites-${theme}.png`)});
      }
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({width,canvases}));
    results.push({width,canvases,explore,hero,packages,geometry,photo,booking,persistDark:true,persistLight:true,photoFilterUnchanged:true,logoToTop:true,consistentNav:true,solidScrolledHeader:true,packageButtons:buttons,errors});await page.close();
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(root,member?'site-theme-member-checks.json':'site-theme-checks.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
