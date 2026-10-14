const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const luminance = rgb => rgb.map(v => {v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
const ratio = (fg,bg) => {const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);};
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try {
    for (const width of [390,1440]) {
      const page=await browser.newPage({viewport:{width,height:900}});
      await page.setContent('<main class="travel-stage"><div class="destination-actions"><button class="bookmark" aria-label="Bookmark"><svg stroke="currentColor" width="18" height="18"></svg></button></div></main>');
      await page.addStyleTag({content:fs.readFileSync(path.join(root,'src/components/TimedCardSlider.css'),'utf8')});
      const button=page.locator('.bookmark');
      for(const state of ['normal','hover','focus','saved']) {
        if(state==='hover') await button.hover();
        if(state==='focus') await button.focus();
        if(state==='saved') await button.evaluate(el=>el.classList.add('saved'));
        const colors=await button.evaluate(el=>({fg:getComputedStyle(el.querySelector('svg')).stroke,bg:getComputedStyle(el).backgroundColor}));
        const contrast=ratio(colors.fg.match(/\d+/g).map(Number).slice(0,3),colors.bg.match(/\d+/g).map(Number).slice(0,3));
        assert.ok(contrast>=3,`Icon contrast ${state}: ${contrast}`);
        results.push({width,state,...colors,contrast:Number(contrast.toFixed(2))});
      }
      await page.close();
    }
  }finally{await browser.close();}
  console.log(JSON.stringify({oldRatio:ratio([255,255,255],[239,181,47]),results}));
  fs.writeFileSync(path.join(root,'bookmark-contrast-checks.json'),JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
