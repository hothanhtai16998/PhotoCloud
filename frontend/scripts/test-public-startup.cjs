const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const defaults = require('../../shared/sitePalette.json');
const rgb = hex => 'rgb(' + [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(', ') + ')';
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({channel:'msedge', headless:true});
  const reports = [];
  try {
    const custom = structuredClone(defaults);
    custom.dark['--bg-primary'] = '#18212B'; custom.dark['--bg-header'] = '#233448';
    const cases = [
      {name:'light', theme:'light'}, {name:'dark', theme:'dark'},
      {name:'cached-dark', theme:'dark', palette:custom},
      {name:'invalid-cache', theme:'dark', raw:'{broken'},
      {name:'unsafe-color', theme:'dark', palette:{dark:{'--bg-primary':'red;display:none'}}},
      {name:'invalid-color-type', theme:'dark', palette:{dark:{'--bg-primary':{match:'invalid'}}}},
      {name:'storage-unavailable', theme:'light', blocked:true},
      {name:'admin-unmodified', theme:'dark', admin:true}
    ];
    for (const scenario of cases) {
      const context = await browser.newContext({viewport:{width:1440,height:900}, serviceWorkers:'block'});
      await context.addInitScript(s => {
        localStorage.setItem('theme',s.theme);
        if (s.raw || s.palette) localStorage.setItem('photocloud.sitePalette.v1', s.raw || JSON.stringify(s.palette));
        if (s.blocked) Storage.prototype.getItem = () => {throw new Error('storage blocked')};
      }, scenario);
      let release;
      const gate = new Promise(resolve => release = resolve);
      await context.route(/\/assets\/index-[^/]+\.js|\.css(?:\?|$)/, async route => {await gate; await route.continue()});
      const palette = scenario.name === 'cached-dark' ? custom : defaults;
      await context.route('**/api/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === '/api/auth/refresh') return route.fulfill({status:401,json:{message:'Guest'}});
        if (pathname === '/api/settings') return route.fulfill({json:{settings:{sitePalette:palette}}});
        return route.fulfill({json:{collections:[],images:[],settings:{},pagination:{total:0}}});
      });
      const page = await context.newPage();
      await page.goto(origin + (scenario.admin ? '/admin/settings' : '/collections'), {waitUntil:'commit'});
      await page.waitForFunction(() => !!document.getElementById('root'));
      const initial = await page.evaluate(() => ({
        body:getComputedStyle(document.body).backgroundColor,
        root:getComputedStyle(document.getElementById('root')).backgroundColor,
        band:getComputedStyle(document.getElementById('public-header-startup')).backgroundColor,
        animated:getComputedStyle(document.getElementById('public-header-startup')).animationName,
        meta:document.querySelector('meta[name="theme-color"]').content,
        sitePalette:document.documentElement.dataset.sitePalette,
        links:[...document.querySelectorAll('#public-header-startup .header-studio-nav a')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width}})
      }));
      if (scenario.admin) assert.equal(initial.sitePalette, undefined, 'admin bootstrap untouched');
      else {
        const colors = palette[scenario.theme];
        assert.equal(initial.body,rgb(colors['--bg-primary']),scenario.name+' body before JS/CSS');
        assert.equal(initial.root,initial.body);
        assert.equal(initial.band,rgb(colors['--bg-header']));
        assert.equal(initial.animated,'none');
        assert.equal(initial.meta.toUpperCase(),colors['--bg-primary'].toUpperCase());

      }
      release();
      if (!scenario.admin && !scenario.blocked) {
        await page.locator('.PHOTOCLOUD-header').waitFor();
        const finalLinks=await page.locator('.PHOTOCLOUD-header .header-studio-nav a').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}}));
        assert.ok(finalLinks.every((r,i)=>Math.max(Math.abs(r.x-initial.links[i].x),Math.abs(r.y-initial.links[i].y),Math.abs(r.w-initial.links[i].w))<0.6),'labels remain stable before and after application CSS');
        if (['light','dark'].includes(scenario.name)) await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/public-startup-'+scenario.name+'.png')});
        assert.equal(await page.locator('.PHOTOCLOUD-header').evaluate(el=>getComputedStyle(el).backgroundColor),rgb(palette[scenario.theme]['--bg-header']));
        assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),initial.body,'startup-to-app color remains stable');
        const toggle = page.getByRole('button',{name:scenario.theme==='dark'?'Chuyển sang chế độ sáng':'Chuyển sang chế độ tối',exact:true});
        await toggle.click();
        const nextTheme = scenario.theme==='dark'?'light':'dark';
        await page.waitForFunction(expected=>getComputedStyle(document.body).backgroundColor===expected,rgb(palette[nextTheme]['--bg-primary']));
      }
      reports.push({name:scenario.name,initial,result:'PASS'});
      await context.close();
    }
    fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/public-startup.json'),JSON.stringify(reports,null,2));
    console.log('PASS: pre-JS/CSS light/dark/custom palette, invalid cache/color, blocked storage, admin bootstrap unchanged; stable app colors and theme toggle.');
  } finally {await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
