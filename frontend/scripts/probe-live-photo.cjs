const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const cpuRate = Number(process.argv[2] || 1);
  const profiler = await page.context().newCDPSession(page);
  await profiler.send('Profiler.enable');
  if (cpuRate > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', {rate:cpuRate});
  }
  const requests = [], errors = [];
  let clickedAt = 0;
  try {
    await page.route('**/*', route => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) || route.request().url().includes('/socket.io/')) return route.abort();
      return route.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (clickedAt) requests.push({event:'start',url:request.url(),method:request.method(),at:Date.now()-clickedAt}); });
    page.on('requestfinished', request => { if (clickedAt) requests.push({event:'finished',url: request.url(), method: request.method(), timing: request.timing()}); });
    await page.goto('http://localhost:5173/explore');
    const card = page.locator('.blur-up-image-container').first();
    await card.waitFor({timeout:20000});
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.photoProbe = {click:0,route:0,dialog:0,longTasks:[]};
      document.addEventListener('click', () => {window.photoProbe.click=performance.now()}, {capture:true,once:true});
      const push = history.pushState.bind(history);
      history.pushState = (...args) => { window.photoProbe.route=performance.now();return push(...args); };
      new MutationObserver(() => {
        if (!window.photoProbe.dialog && document.querySelector('.image-page-modal')) window.photoProbe.dialog=performance.now();
      }).observe(document.body,{childList:true,subtree:true});
      new PerformanceObserver(list => window.photoProbe.longTasks.push(...list.getEntries().map(e => ({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:false});
    });
    clickedAt = Date.now();
    await profiler.send('Profiler.start');
    await card.click();
    await page.locator('.image-page-modal').waitFor({timeout:30000});
    const {profile} = await profiler.send('Profiler.stop');
    const counts = new Map();
    for (const id of profile.samples || []) counts.set(id,(counts.get(id)||0)+1);
    const hot = profile.nodes.map(node => ({...node.callFrame,samples:counts.get(node.id)||0})).sort((a,b)=>b.samples-a.samples).slice(0,20);
    await page.waitForFunction(() => document.querySelector('.image-page-photo.is-ready'),{},{timeout:15000}).catch(()=>{});
    const measurement = await page.evaluate(() => ({...window.photoProbe,url:location.href,image:document.querySelector('.image-page-photo')?.getAttribute('src'),imageReadyAt:performance.now(),ready:!!document.querySelector('.image-page-photo.is-ready'),preview:document.querySelector('.image-page-photo-preview')?.getAttribute('src')}));
    const result = {cpuRate,measurement,hot,errors,requests};
    fs.writeFileSync(path.resolve(__dirname,`../photo-live-probe-${cpuRate}.json`),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
