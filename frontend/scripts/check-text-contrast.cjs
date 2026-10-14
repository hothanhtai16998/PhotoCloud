const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{a=luminance(a);b=luminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
const rgb=value=>value.match(/\d+/g).slice(0,3).map(Number);
(async()=>{
  let tokens='';postcss.parse(fs.readFileSync(path.join(root,'src/index.css'),'utf8')).walkRules(rule=>{
    if(rule.selector===':root') rule.walkDecls(decl=>{if(decl.prop.startsWith('--studio-'))tokens+=`${decl.prop}:${decl.value};`});
  });
  const css=fs.readFileSync(path.join(root,'src/styles/theme.css'),'utf8')+`:root{${tokens}}`+fs.readFileSync(path.join(root,'src/components/booking/HeroBooking.css'),'utf8');
  const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
  try{
    for(const width of [320,390,768,1024,1440]){
      const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      await page.setContent('<div id="tokens"><span style="color:var(--text-muted)">Chữ phụ</span></div><section class="hero-section"><div class="hero-copy"><span class="hero-eyebrow">PhotoCloud Studio</span><h1 class="hero-title"><em>theo cách của bạn</em></h1><button class="hero-cta hero-cta--primary">Đặt lịch chụp ngay</button></div></section>');
      await page.addStyleTag({content:css});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.classList.toggle('dark-theme',theme==='dark'),theme);
        const colors=await page.locator('#tokens span').evaluate(el=>{const s=getComputedStyle(el);return{fg:s.color,bgs:['--bg-primary','--bg-secondary','--bg-card'].map(name=>s.getPropertyValue(name).trim())}});
        for(const bg of colors.bgs){const parsed=bg.slice(1).match(/../g).map(v=>parseInt(v,16));const contrast=ratio(rgb(colors.fg),parsed);assert.ok(contrast>=4.5);results.push({width,theme,role:'muted',bg,contrast:+contrast.toFixed(2)});}
      }
      await page.evaluate(()=>document.documentElement.classList.remove('dark-theme'));
      for(const selector of ['.hero-eyebrow','.hero-title em']){
        const s=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return{color:s.color,size:parseFloat(s.fontSize),fill:s.webkitTextFillColor,background:s.backgroundImage}});
        assert.equal(s.background,'none');
        // Conservative dark bound for the authored light gradient + both overlays.
        const contrast=ratio(rgb(s.color),[222,210,184]);const threshold=s.size>=24?3:4.5;
        assert.ok(contrast>=threshold,`${selector}: ${contrast}`);
        results.push({width,theme:'light',role:selector,contrast:+contrast.toFixed(2),threshold,fontSize:s.size});
      }
      await page.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(root,'text-contrast-checks.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
