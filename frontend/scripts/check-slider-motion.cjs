const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const bundle = await esbuild.build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {TimedCardSlider} from './src/components/TimedCardSlider';
    const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="green"/></svg>');
    const slides=[1,2,3].map(i=>({image:image+'#'+i,title:'Photo '+i,region:'Region '+i,place:'Place '+i,description:'Fixture'}));
    createRoot(document.getElementById('root')).render(<><TimedCardSlider slides={slides}/><button id="outside">Outside</button></>);
  `},bundle:true,write:false,format:'iife',jsx:'automatic',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
  const css=fs.readFileSync(path.join(root,'src/components/TimedCardSlider.css'),'utf8');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try {
    for (const width of [390,1440]) {
      const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      await page.setContent('<div id="root"></div>');
      await page.addStyleTag({content:css});
      await page.addScriptTag({content:bundle.outputFiles[0].text});
      const number=page.locator('.slide-number');
      await number.waitFor();
      await page.waitForTimeout(6100);
      assert.equal(await number.innerText(),'01','Reduce motion must not autoplay by default');
      await page.getByTitle('Next destination').click();
      await page.waitForFunction(()=>document.querySelector('.slide-number').textContent==='02');
      assert.equal(await page.locator('.opening-layer').count(),0);
      assert.equal(await page.locator('.travel-stage').evaluate(el=>el.getAnimations({subtree:true}).length),0);
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.getByTitle('Play',{exact:true}).click();
      await page.waitForTimeout(6100);
      assert.equal(await number.innerText(),'02','Autoplay must pause while focus stays in slider');
      await page.locator('#outside').focus();
      await page.waitForFunction(()=>document.querySelector('.slide-number').textContent==='03',{},{timeout:7000});
      await page.waitForTimeout(600);
      await page.getByTitle('Next destination').click();
      await page.locator('.opening-layer').waitFor();
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>!document.querySelector('.opening-layer'));
      assert.equal(await page.locator('.travel-stage').evaluate(el=>el.classList.contains('is-moving')),false);
      await page.getByTitle('Play',{exact:true}).waitFor();
      results.push({width,reducedDefaultPaused:true,manualSnap:true,focusPauses:true,normalAutoplayResumes:true,preferenceChangeCancels:true});
      await page.close();
    }
    const delayed=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
    await delayed.setContent('<div id="root"></div>');
    await delayed.addStyleTag({content:css});
    await delayed.evaluate(()=>{
      const decode=HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode=function(){
        const ready=decode.call(this);
        return this.src.endsWith('#2') ? ready.then(()=>new Promise(resolve=>{window.releasePhotoDecode=resolve;})) : ready;
      };
    });
    await delayed.addScriptTag({content:bundle.outputFiles[0].text});
    await delayed.locator('.bookmark').waitFor();
    await delayed.waitForTimeout(6100);
    await delayed.locator('.bookmark').focus();
    await delayed.evaluate(()=>window.releasePhotoDecode());
    await delayed.waitForTimeout(6100);
    assert.equal(await delayed.locator('.slide-number').innerText(),'01','Pending automatic decode must not advance after bookmark receives focus');
    assert.equal(await delayed.locator('.bookmark').evaluate(el=>document.activeElement===el),true);
    await delayed.locator('#outside').focus();
    await delayed.waitForFunction(()=>document.querySelector('.slide-number').textContent==='02',{},{timeout:7000});
    results.push({width:1440,pendingAutomaticDecodeFocusBlocked:true,bookmarkFocusPreserved:true,resumeAfterLeaving:true});
    await delayed.close();
  } finally {await browser.close();}
  fs.writeFileSync(path.join(root,'slider-motion-checks.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
