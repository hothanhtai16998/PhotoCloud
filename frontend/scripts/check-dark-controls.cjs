const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const rgb=s=>s.match(/\d+/g).slice(0,3).map(Number);
const lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{a=lum(rgb(a));b=lum(rgb(b));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
(async()=>{
  const cssFile=fs.readdirSync(path.join(root,'dist/assets')).find(n=>/^index-.*\.css$/.test(n));
  const css=fs.readFileSync(path.join(root,'dist/assets',cssFile),'utf8');
  const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
  try{for(const width of [320,390,768,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.route('**/*',r=>r.abort());
    await page.setContent('<div class="fixture-surface"><button class="studio-cta-secondary">Nhận báo giá <svg width="16" height="16" stroke="currentColor"></svg></button><button class="hero-cta hero-cta--secondary">Xem gói chụp <svg width="16" height="16" stroke="currentColor"></svg></button><span class="hero-highlight-icon"><svg width="13" height="13" stroke="currentColor"></svg></span><button class="user-menu-trigger"><div class="avatar-placeholder header-user-avatar-placeholder">U</div></button><div class="home-package-body"><button>Chọn gói <svg width="16" height="16" stroke="currentColor"></svg></button></div><button class="studio-cta-ghost">Về PhotoCloud</button></div>');
    await page.addStyleTag({content:css+' .fixture-surface{background:var(--bg-card);padding:16px} *,*::before,*::after{animation:none!important;transition:none!important}'});
    for(const theme of ['light','dark']){
      await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);
      for(const selector of ['.studio-cta-secondary','.hero-cta--secondary','.hero-highlight-icon','.avatar-placeholder','.studio-cta-ghost']){
        const el=page.locator(selector);
        for(const state of ['normal','hover','focus']){
          await page.mouse.move(width-1,899);
          await page.evaluate(()=>document.activeElement instanceof HTMLElement&&document.activeElement.blur());
          if(state==='hover')await el.hover();
          if(state==='focus')await el.focus();
          const colors=await el.evaluate(el=>{const s=getComputedStyle(el);return{fg:s.color,bg:s.backgroundColor==='rgba(0, 0, 0, 0)'?getComputedStyle(document.querySelector('.fixture-surface')).backgroundColor:s.backgroundColor}});
          if(theme==='dark')assert.ok(ratio(colors.fg,colors.bg)>= (selector==='.hero-highlight-icon'?3:4.5),`${selector} ${state}: ${ratio(colors.fg,colors.bg)}`);
          results.push({width,theme,selector,state,contrast:+ratio(colors.fg,colors.bg).toFixed(2)});
        }
      }
      const geometry=await page.locator('.home-package-body button').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.firstChild);const text=r.getBoundingClientRect(),icon=el.querySelector('svg').getBoundingClientRect();return{delta:Math.abs((text.top+text.bottom-icon.top-icon.bottom)/2),scroll:el.scrollWidth,width:el.clientWidth}});
      assert.ok(geometry.delta<2);assert.ok(geometry.scroll<=geometry.width+1);
    }
    await page.close();
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(root,'dark-controls-checks.json'),JSON.stringify(results,null,2));console.log('PASS: five widths, both themes, dark contrast, hover/focus and inline package arrow.');
})().catch(e=>{console.error(e);process.exitCode=1;});
