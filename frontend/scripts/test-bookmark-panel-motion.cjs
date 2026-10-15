const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const build = await esbuild.build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {MemoryRouter} from 'react-router-dom';
      import Sidebar from './src/components/ImagePageSidebar';
      import {TimedCardSlider} from './src/components/TimedCardSlider';
      import {useAuthStore} from './src/stores/useAuthStore';
      import {useUserStore} from './src/stores/useUserStore';
      import {useFavoriteStore} from './src/stores/useFavoriteStore';
      import './src/components/Header.css';
      const photos=Array.from({length:20},(_,i)=>({_id:i.toString(16).padStart(24,'0'),imageTitle:'Photo '+i,imageUrl:'/photo.jpg?full='+i,thumbnailUrl:'/photo.jpg?thumb='+i,width:800,height:600}));
      useAuthStore.setState({accessToken:'fixture',isInitializing:false});
      useUserStore.setState({user:{_id:'fixture-user'}});
      useFavoriteStore.setState({images:photos,hasLoaded:true,lastFetchedAt:Date.now(),pagination:{page:1,limit:20,total:20,pages:1}});
      createRoot(document.getElementById('root')).render(<MemoryRouter><header style={{position:'fixed',zIndex:1000,right:0}}><Sidebar variant="header"/></header><TimedCardSlider slides={photos.slice(0,6).map(p=>({id:p._id,image:p.imageUrl,title:p.imageTitle,place:'PhotoCloud',region:'Photo',description:''}))}/></MemoryRouter>);
    `, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, outdir: 'fixture', format: 'iife', jsx: 'automatic',
    alias: { '@': path.join(root, 'src') }, loader: { '.svg': 'dataurl' },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'production' }), 'process.env.NODE_ENV': '"production"' },
  });
  const js = build.outputFiles.find(file => file.path.endsWith('.js')).text;
  const css = build.outputFiles.find(file => file.path.endsWith('.css')).text;
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/photo.jpg')) { res.setHeader('Content-Type','image/jpeg'); res.end(fs.readFileSync(path.join(root,'public/preview-assets/editorial.jpg'))); }
    else if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(js); }
    else if (req.url === '/fixture.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else if (req.url.startsWith('/api/')) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({success:true,favorites:{}})); }
    else res.end('<!doctype html><html><head><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0"><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => console.error(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.locator('.travel-stage').waitFor();
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        window.frameGaps = [];
        let previous;
        const tick = now => { if (previous) window.frameGaps.push(now-previous); previous=now; window.frameClock=requestAnimationFrame(tick); };
        window.frameClock=requestAnimationFrame(tick);
      });
      const before = await page.locator('.travel-stage').boundingBox();
      await page.locator('button.header-library-action').first().click();
      await page.locator('.header-library-panel').waitFor();
      await page.waitForTimeout(700);
      const after = await page.locator('.travel-stage').boundingBox();
      assert.deepEqual(after, before, 'Opening bookmark must not resize slideshow');
      const gaps = await page.evaluate(() => { cancelAnimationFrame(window.frameClock); return window.frameGaps; });
      console.log(JSON.stringify({width,frames:gaps.length,maxGap:Math.max(...gaps),over50ms:gaps.filter(gap=>gap>50).length}));
      await page.screenshot({path:path.join(root,`bookmark-panel-${width}.png`)});
      await page.locator('.header-library-panel button').click();
      const checkCards = async () => {
        const cards = await page.locator('.destination-card').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          const stage = element.closest('.travel-stage').getBoundingClientRect();
          return { visible: box.right > stage.left && box.left < stage.right, inert: element.inert, tabIndex: element.tabIndex, hidden: element.getAttribute('aria-hidden') };
        }));
        assert.ok(cards.some(card => !card.visible), 'Fixture includes offscreen cards');
        for (const card of cards) {
          assert.equal(card.inert, !card.visible);
          assert.equal(card.tabIndex, card.visible ? 0 : -1);
          assert.equal(card.hidden, card.visible ? null : 'true');
        }
      };
      await checkCards();
      await page.locator('.discover').focus();
      for (let step = 0; step < 8; step++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.matches('.destination-card[inert]')), false);
        assert.equal(await page.locator('.travel-stage').evaluate(element => element.scrollLeft), 0);
      }
      await page.locator('button[title="Next destination"]').click();
      await page.waitForTimeout(700);
      await checkCards();
      await page.setViewportSize({width:320,height:900});
      await page.waitForTimeout(150);
      await checkCards();
      console.log(`PASS A07: visible/offscreen cards, Tab, slide change, resize from ${width}`);
      await page.close();
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error);process.exitCode=1;});
