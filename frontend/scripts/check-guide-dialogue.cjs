// Local HTTP fixture only; no production database or business writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const server = require('./admin-preview.cjs');

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let packageState = 'ready', collectionState='ready', collectionReads=0, writes = 0;
  async function context(options = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1705, height: 980 }, serviceWorkers: 'block', ...options });
    await ctx.route('https://example.test/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#a29178"/></svg>' }));
    await ctx.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/refresh') return route.fulfill({ status: 401, json: { message: 'Guest fixture' } });
      if (route.request().method() !== 'GET') {
        if (!url.pathname.startsWith('/api/auth/') && url.pathname !== '/api/admin/analytics/track') writes++;
        return route.fulfill({ json: { success: true } });
      }
      if (url.pathname === '/api/images') return route.fulfill({ json: { images: Array.from({ length: 6 }, (_, i) => ({ _id: 's' + i, imageTitle: 'Ảnh tham khảo ' + i, imageUrl: 'https://example.test/' + i + '.svg', width: 1200, height: 800, description: i === 1 ? 'Mô tả ảnh thật từ fixture.' : undefined, location: i === 1 ? 'Đà Lạt' : undefined, cameraMake: i === 1 ? 'Fujifilm' : undefined, cameraModel: i === 1 ? 'X-T5' : undefined, iso: i === 1 ? 160 : undefined, uploadedBy: {username:'tacgia-'+i}, imageCategory: 'Phong cảnh' })), pagination: { page: 1, pages: 1, total: 6 } } });
      if (url.pathname === '/api/hero-collections') { collectionReads++; if(collectionState==='error')return route.fulfill({status:503,json:{message:'Fixture collection unavailable'}}); return route.fulfill({json:{success:true,isAdminPicked:true,collections:[{_id:'album-1',name:'Bình minh',description:'Câu chuyện ánh sáng buổi sớm.',imageCount:12,updatedAt:'2026-10-29',coverImage:null,sampleImages:[]},{_id:'album-2',name:'Phố cũ',description:'Những con phố trong ký ức.',imageCount:8,updatedAt:'2026-10-29',coverImage:{_id:'b1',thumbnailUrl:'https://example.test/b1.svg'},sampleImages:[{_id:'b2',url:'https://example.test/b2.svg'}]}]}}); }
      if(url.pathname==='/api/collections/album-1')return route.fulfill({json:{success:true,collection:{_id:'album-1',name:'Bình minh',isPublic:true,images:[{_id:'fallback-cover',imageUrl:'https://example.test/real-cover.svg'}]}}});
      if (url.pathname === '/api/bookings/packages') {
        if (packageState === 'error') return route.fulfill({ status: 503, json: { message: 'Fixture unavailable' } });
        return route.fulfill({ json: { success: true, packages: packageState === 'empty' ? [] : (packageState==='single'?['Gói API fixture']:['Gói API fixture', 'Gói thứ hai']).map((name, i) => ({ _id: 'pkg-' + i, slug: 'package-' + i, name, description: 'Nội dung fixture', basePrice: 1900000, durationMinutes: 75, includedPhotos: 25, includedPeople: 1, deliveryDays: 10, category: 'portrait' })) } });
      }
      const response = await fetch(origin + url.pathname + url.search);
      return route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
    });
    return ctx;
  }
  async function scroll(page, selector, index) {
    await page.evaluate(selector => { const node = document.querySelector(selector); scrollTo({ top: node ? node.getBoundingClientRect().top + scrollY - 130 : 0, behavior: 'instant' }); }, selector);
    await page.waitForFunction(index => document.querySelector('.home-tour')?.dataset.scene === String(index), index, {timeout:7000}).catch(async error=>{console.log('SCENE',selector,index,await page.evaluate(()=>({scene:document.querySelector('.home-tour')?.dataset.scene,scroll:scrollY,height:innerHeight,nodes:[...document.querySelectorAll('.home-booking-flow,.testimonials-carousel,.home-booking-faq,.home-bottom-cta')].map(el=>({name:el.className,top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height}))})));throw error;});
    await page.waitForFunction(()=>document.querySelector('.home-tour').dataset.moving==='false');
    await page.waitForTimeout(80);
  }
  async function open(page) {
    if (await page.locator('.home-tour').getAttribute('data-mode') === 'portrait') {
      await page.locator('.home-tour-character').click();
      await page.getByRole('button',{name:'Giới thiệu phần đang xem',exact:true}).click();
    }
  }
  try {
    const ctx = await context();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/');
    await page.locator('.home-tour canvas.is-ready').waitFor({ state: 'attached' });
    await page.locator('.home-journey').waitFor();
    await open(page);
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('Ảnh tham khảo'));
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('tacgia-'));
    assert.equal(await page.locator('.home-tour-compact').count(),0);
    await page.screenshot({ path: 'qa-policy-checkbox/bot-dialogue-welcome.png' });
    assert.equal(await page.locator('.travel-stage .destination').count(),0);
    assert.equal(await page.locator('.slider-controls .bookmark').count(),1);
    const largeBubble=await page.locator('.home-tour-message').boundingBox();
    const largeType=await page.locator('.home-tour-message p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    assert.ok(largeType>=21,'intro text enlarged');
    await page.evaluate(()=>scrollTo({top:450,behavior:'instant'}));await page.waitForTimeout(150);
    const smallBubble=await page.locator('.home-tour-message').boundingBox();
    assert.ok(smallBubble.width<largeBubble.width-60,'bubble shrinks as visitor scrolls down');
    assert.equal(await page.locator('.home-tour-message p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),16);
    await page.screenshot({path:'qa-policy-checkbox/bubble-scrolled.png'});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(150);
    assert.ok((await page.locator('.home-tour-message').boundingBox()).width>=largeBubble.width-2,'reverse scroll restores intro');

    assert.equal(await page.locator('.homepage .hero-section,.homepage .home-wayfinding,.homepage .testimonials-carousel').count(),0,'no repeated hero/navigation or draft reviews');
    assert.equal(await page.locator('.homepage h1').count(),1,'one homepage content title');
    assert.equal(await page.locator('.homepage .home-moods').count(),1,'one choice of journey');
    const sections=await page.locator('.home-journey-gallery,#home-chapter-2,.home-journey-invitation,#home-packages,.home-booking-flow,.home-booking-faq,.home-bottom-cta').evaluateAll(nodes=>nodes.map(el=>({name:el.id||el.className,top:el.getBoundingClientRect().top+scrollY})));
    for(let i=1;i<sections.length;i++)assert.ok(sections[i].top>sections[i-1].top,'content follows the agreed sequence');
    assert.equal(await page.getByText('500+',{exact:true}).count(),0);
    console.log('PASS one introduction, one journey choice, ordered photo/collection/service/process/FAQ/contact; no draft reviews');
    const itinerary = [['.home-journey', 3, 'point'], ['.home-journey-gallery', 4, 'photo'], ['#home-chapter-2', 5, 'album'], ['.home-journey-invitation', 6, 'calendar'], ['#home-packages', 7, 'point'], ['.home-booking-flow', 8, 'calendar'], ['.home-booking-faq', 10, 'listen'], ['.home-bottom-cta', 11, 'calendar']];
    const captions = [];
    for (const [selector, index, pose] of itinerary) {
      await scroll(page, selector, index);
      assert.equal(await page.locator('.home-tour canvas').getAttribute('data-pose'), index === 6 ? 'calendar' : pose, 'pose at scene '+index+' / '+await page.locator('.home-tour-message p').innerText());
      captions.push(await page.locator('.home-tour-message p').innerText());
      assert.equal(await page.locator('.home-tour-character').isVisible(),true,'Paper remains visible at scene '+index);
      const rect = await page.locator('.home-tour').boundingBox();
      assert.ok(Math.abs(rect.y+rect.height-956)<2,'constant bottom at scene '+index);
      await page.screenshot({path:'qa-policy-checkbox/home-content-scene-'+index+'.png'});
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1705 && rect.y + rect.height <= 980, 'guide fits viewport at scene ' + index);
    }
    assert.ok(new Set(captions).size >= 7, 'scene-specific dialogue');
    const track=await page.evaluate(async()=>{const output=[];const limit=document.documentElement.scrollHeight-innerHeight;for(const direction of [1,-1]){for(let step=0;step<=60;step++){scrollTo({top:limit*(direction===1?step/60:1-step/60),behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const el=document.querySelector('.home-tour'),box=el.getBoundingClientRect(),foot=el.querySelector('.home-tour-character').getBoundingClientRect();output.push({direction,step,bottom:box.bottom,foot:foot.bottom,side:el.dataset.side,x:box.x});}}return output;});
    for(const sample of track){assert.ok(Math.abs(sample.bottom-956)<2,'bottom invariant through ALL section transitions '+JSON.stringify(sample));assert.ok(Math.abs(sample.foot-956)<2,'feet anchored even when speech changes');}
    fs.writeFileSync('qa-policy-checkbox/bottom-anchor-track.json',JSON.stringify(track,null,2));
    assert.deepEqual([...new Set(track.map(sample=>sample.side))].sort(),['left']);
    console.log('PASS 122 full-page forward/reverse scroll samples: root and feet remain 24px above viewport bottom; Paper remains on the left');

    assert.equal(collectionReads,1,'hero and story share one collection request');
    for (const [selector, index] of itinerary.toReversed()) await scroll(page, selector, index);
    console.log('PASS 9 content scenes including intro slider, poses/choices, fast jumps and reverse scroll');

    await scroll(page, '.home-journey-gallery', 4);
    assert.equal(await page.locator('.home-tour').getAttribute('data-mode'), 'full');
    const motion = await page.evaluate(async () => {
      const guide = document.querySelector('.home-tour');
      const canvas = guide.querySelector('canvas');
      const atlas = new Image(); atlas.src = '/images/home-guide/paper-guide-poses.png'; await atlas.decode();
      const expected = document.createElement('canvas');
      const poses = { wave: 0, point: 1, photo: 2, album: 3, listen: 4, calendar: 5 };
      const samples = [];
      for (const selector of ['.home-journey-gallery', '#home-chapter-2']) {
        const anchor = document.querySelector(selector).getBoundingClientRect().top + scrollY - 280;
        for (const direction of [1, -1]) {
          scrollTo({ top: anchor - direction * 160, behavior: 'instant' });
          for (let i = 0; i < 24; i++) await new Promise(resolve => requestAnimationFrame(resolve));
          for (let i = 0; i <= 16; i++) {
            scrollTo({ top: anchor + direction * (i * 20 - 160), behavior: 'instant' });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            expected.width = canvas.width; expected.height = canvas.height;
            const cell = poses[canvas.dataset.pose], size = Math.min(canvas.width, canvas.height);
            expected.getContext('2d').drawImage(atlas, cell % 3 * (atlas.naturalWidth/3), Math.floor(cell / 3) * (atlas.naturalHeight/2), atlas.naturalWidth/3, atlas.naturalHeight/2, (canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
            const reference = expected.getContext('2d').getImageData(0, 0, expected.width, expected.height).data;
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            let mismatch = 0, solid = 0, referenceSolid=0;
            for (let p = 3; p < pixels.length; p += 4) { if ((pixels[p]>180)!==(reference[p]>180)) { const point=(p-3)/4, px=point%canvas.width, py=Math.floor(point/canvas.width); let edge=false; for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const q=((py+dy)*canvas.width+px+dx)*4+3;if(px+dx>=0&&px+dx<canvas.width&&py+dy>=0&&py+dy<canvas.height&&(pixels[p]>180)===(reference[q]>180))edge=true;}if(!edge)mismatch++; } if (pixels[p] > 180) solid++; if(reference[p]>180) referenceSolid++; }
            const rect = guide.getBoundingClientRect();
            samples.push({ selector, direction, x: rect.x, y: rect.y, mismatch, solid, referenceSolid, pose:canvas.dataset.pose, w:canvas.width,h:canvas.height, visible: getComputedStyle(guide).visibility });
          }
        }
      }
      return samples;
    });
    fs.writeFileSync('qa-policy-checkbox/bot-dialogue-motion.json', JSON.stringify(motion, null, 2));
    for (const sample of motion) { assert.ok(sample.mismatch < 20, 'one opaque pose '+JSON.stringify(sample)); assert.ok(sample.solid > 150, 'no blank actor'); assert.ok(Math.abs(sample.solid-sample.referenceSolid)/sample.referenceSolid<.02,'no extra silhouette'); assert.equal(sample.visible, 'visible'); }
    for (let i = 1; i < motion.length; i++) { const a = motion[i - 1], b = motion[i]; if (a.selector === b.selector && a.direction === b.direction) assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 100, 'continuous position'); }
    fs.writeFileSync('qa-policy-checkbox/bot-dialogue-motion.json', JSON.stringify(motion, null, 2));
    console.log('PASS', motion.length, 'forward/reverse frames: one opaque pose, no disappearance or teleport');
    await scroll(page, '.home-journey-gallery', 4);
    await page.locator('.home-photo-select').nth(1).click();
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('Ảnh tham khảo 1'));
    const guide = await page.locator('.home-tour').boundingBox();
    const content = await page.locator('.home-journey-gallery').boundingBox();
    assert.ok(guide.x + guide.width < content.x, 'dialogue stays in reserved column');
    const bubble = await page.locator('.home-tour-message').boundingBox();
    const figure = await page.locator('.home-tour-character').boundingBox();
    assert.ok(bubble.x > figure.x + figure.width / 2 && bubble.y < figure.y + figure.height / 2, 'bubble next to head');
    await page.screenshot({ path: 'qa-policy-checkbox/bot-dialogue-photo.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.home-tour-message p').textContent.includes('Ảnh tham khảo'));
    assert.equal(await page.locator('.home-tour canvas.is-ready').count(), 1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.home-tour-character').click();
    assert.equal(await page.locator('.home-tour-character').getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: 'qa-policy-checkbox/bot-dialogue-menu.png' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.home-tour-character').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.home-tour-character').evaluate(el => el === document.activeElement), true);
    await page.locator('.home-tour-close').click();
    assert.equal(await page.locator('.home-tour-character').isVisible(),true);
    await page.locator('.home-tour-character').click();
    await page.keyboard.press('Escape');
    await page.locator('.home-tour-character').waitFor({ state: 'visible' });
    await page.locator('.home-tour-ask').click();
    await page.getByRole('button', { name: 'Giới thiệu phần đang xem', exact: true }).click();
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('Ảnh tham khảo'));
    console.log('PASS side dialogue, selected photo, menu, Escape/focus and hide/reopen');

    await scroll(page, '.home-journey-gallery', 4);
    await page.locator('.home-photo-select').nth(1).click();
    assert.ok((await page.locator('.home-photo-details').innerText()).includes('Đà Lạt'));
    assert.ok((await page.locator('.home-photo-details').innerText()).includes('Fujifilm X-T5'));
    assert.ok((await page.locator('.home-photo-details').innerText()).includes('160'));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{const el=document.querySelector('.home-photo-details');scrollTo({top:el.getBoundingClientRect().top+scrollY-130,behavior:'instant'});});
    await page.waitForFunction(()=>/Tác giả của|Chủ đề của|Địa điểm của|Máy ảnh của|ISO của|Kích thước của|Mô tả ảnh thật/.test(document.querySelector('.home-tour-message p').textContent),undefined,{timeout:6000}).catch(async error=>{console.log('DETAIL',await page.evaluate(()=>({scene:document.querySelector('.home-tour').dataset.scene,caption:document.querySelector('.home-tour-message p').textContent,rect:document.querySelector('.home-photo-details').getBoundingClientRect().toJSON(),facts:[...document.querySelectorAll('.home-photo-details [data-guide-step]')].map(el=>({top:el.getBoundingClientRect().top,text:el.dataset.guideCaption}))})));throw error;});
    await page.emulateMedia({reducedMotion:'no-preference'});

    await page.locator('.home-photo-select').nth(0).click();
    assert.ok(!(await page.locator('.home-photo-details').innerText()).includes('Fujifilm'));
    await scroll(page, '#home-chapter-2', 5);
    assert.equal(await page.locator('.home-collection-story').count(),2);
    await page.locator('.home-collection-cover img').nth(1).waitFor();
    assert.equal(await page.locator('.home-collection-cover img').count(),2);
    await page.locator('.home-collection-story').nth(1).hover();
    await page.waitForFunction(()=>document.querySelector('.home-tour-message p').textContent.includes('Phố cũ'));
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('8 ảnh'));
    assert.equal(await page.locator('.home-collection-open').nth(1).getAttribute('href'),'/collections/album-2');
    assert.equal(await page.locator('.home-collection-cover img').count(),2);
    await page.screenshot({path:'qa-policy-checkbox/home-single-side-collections.png'});
    assert.equal(await page.locator('.home-collection-help').getAttribute('open'),null);
    await page.locator('.home-collection-help summary').click();
    await page.locator('.home-collection-step').nth(1).click();
    assert.equal(await page.locator('.home-collection-step').nth(1).getAttribute('aria-pressed'),'true');
    await page.locator('.home-collection-help summary').click();
    await page.locator('#home-chapter-2 .home-chapter-next a').first().click();
    await page.waitForFunction(()=>document.querySelector('.home-tour').dataset.scene==='6');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.home-idea-checklist li').count(),4);
    assert.equal(await page.locator('.home-invitation-actions > a').getAttribute('href'),'#home-packages');
    assert.equal(await page.locator('.home-invitation-actions > button').count(),1);
    assert.equal(await page.locator('.home-journey-aside-title').count(),0);
    assert.equal(await page.locator('.home-journey-progress').count(),0);
    await page.screenshot({path:'qa-policy-checkbox/home-content-invitation.png'});
    console.log('PASS connected right-column flow, grouped actions and expandable collection help; left column preserved');
    await page.setViewportSize({width:1584,height:890});
    await scroll(page,'.home-journey-invitation',6);
    await page.evaluate(()=>scrollBy({top:300,behavior:'instant'}));await page.waitForTimeout(500);
    await page.locator('.home-idea-checklist summary').click();
    await page.locator('.home-idea-checklist li').first().hover();
    assert.equal(await page.locator('[data-guide-highlight]').count(),0);
    assert.equal(await page.locator('.home-idea-checklist li').first().evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await page.screenshot({path:'qa-policy-checkbox/home-guide-overlap-fixed.png'});
    await page.setViewportSize({width:1705,height:980});
    await scroll(page,'.home-booking-faq',10);
    const faq=page.locator('.home-faq-item button').nth(1);await faq.hover();
    assert.equal(await faq.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    assert.equal(await page.locator('[data-guide-highlight]').count(),0);
    await page.screenshot({path:'qa-policy-checkbox/home-guide-hover-fixed.png'});
    await faq.click();await page.keyboard.press('Tab');
    assert.equal(await page.locator('.home-faq-item button').nth(2).evaluate(el=>el.matches(':focus-visible')&&getComputedStyle(el).outlineStyle!=='none'),true,'keyboard focus stays visible');
    console.log('PASS no guide hover outlines; keyboard focus retained; actor avoids companion title at 1584x890');



    await scroll(page, '#home-packages', 7);
    assert.equal(await page.locator('.home-package-card:visible').count(),1);
    assert.equal(await page.locator('.home-package-card:visible h3').innerText(),'Gói API fixture');
    await page.evaluate(()=>{const track=document.querySelector('.home-package-track');scrollTo({top:track.getBoundingClientRect().top+scrollY-112+innerHeight*.75+4,behavior:'instant'});});
    await page.waitForFunction(()=>document.querySelector('.home-package-panel:not([hidden]) h3')?.textContent==='Gói thứ hai');
    assert.equal(await page.locator('.home-package-card:visible').count(),1);
    await page.evaluate(()=>{const track=document.querySelector('.home-package-track');scrollTo({top:track.getBoundingClientRect().top+scrollY-112,behavior:'instant'});});
    await page.waitForFunction(()=>document.querySelector('.home-package-panel:not([hidden]) h3')?.textContent==='Gói API fixture');
    await page.screenshot({path:'qa-policy-checkbox/home-single-side-package-first.png'});
    await page.getByRole('button',{name:'Gói tiếp theo',exact:true}).click();
    await page.screenshot({path:'qa-policy-checkbox/home-single-side-package-second.png'});
    await page.locator('.home-package-card').nth(1).hover();
    await page.waitForFunction(()=>document.querySelector('.home-tour-message p').textContent.includes('Gói thứ hai'));
    assert.ok((await page.locator('.home-tour-message p').innerText()).includes('75 phút'));
    await page.getByRole('button',{name:'Xem gồm những gì',exact:true}).click();
    assert.ok((await page.locator('.home-package-card').nth(1).innerText()).includes('Giao ảnh trong 10 ngày'));
    await page.screenshot({path:'qa-policy-checkbox/bot-presence-package.png'});
    await page.evaluate(() => document.addEventListener('click', event => { const card = event.target.closest?.('.home-package-card'); if (card) window.fixtureChosenPackage = card.querySelector('h3').textContent; }, { capture: true }));
    await open(page);
    await page.getByRole('button', { name: 'Chọn gói này', exact: true }).click();
    await page.locator('.booking-modal-backdrop').waitFor();
    assert.equal(await page.evaluate(() => window.fixtureChosenPackage), 'Gói thứ hai');
    await page.waitForFunction(() => document.querySelector('.home-tour').dataset.mode === 'portrait');
    assert.equal(await page.locator('.home-tour-character').isVisible(),true);
    assert.equal(await page.locator('.home-tour').evaluate(el => el.inert), true);
    await page.waitForTimeout(350); await page.screenshot({path:'qa-policy-checkbox/bot-presence-modal.png'});
    await page.locator('.booking-modal-close').click();
    await page.locator('.home-tour').waitFor({ state: 'visible' });
    await page.evaluate(() => { const field = document.createElement('input'); field.id = 'fixture-guide-focus'; document.body.append(field); field.focus(); });
    await page.waitForFunction(() => document.querySelector('.home-tour').dataset.mode === 'portrait');
    assert.equal(await page.locator('.home-tour-character').isVisible(),true);
    await page.evaluate(() => document.querySelector('#fixture-guide-focus').remove());
    await page.locator('.home-tour').waitFor({ state: 'visible' });
    console.log('PASS correct package delegation, modal and typing suppression');

    await scroll(page, '.home-journey-gallery', 4);
    await page.locator('.home-photo-select').nth(1).click();
    await page.getByRole('button', { name: 'Mở ảnh đang chọn', exact: true }).click();
    await page.waitForURL('**/photos/**s1');
    await page.locator('.home-tour').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.home-tour').count(), 0);
    assert.deepEqual(errors, []);
    await ctx.close();

    for (const state of ['empty', 'error']) {
      packageState = state;
      const stateCtx = await context({ reducedMotion: 'reduce' });
      const statePage = await stateCtx.newPage();
      await statePage.goto(origin + '/');
      await statePage.locator('#home-packages').waitFor();
      await scroll(statePage, '#home-packages', 7);
      await statePage.waitForFunction(state => document.querySelector('.home-tour-message p').textContent.includes(state === 'error' ? 'Chưa tải được' : 'chưa công bố'), state);
      await open(statePage);
      await statePage.screenshot({ path: 'qa-policy-checkbox/bot-dialogue-' + state + '.png' });
      if (state === 'error') {
        packageState = 'ready';
        await statePage.getByRole('button', { name: 'Thử lại', exact: true }).click();
        await statePage.getByRole('heading', { name: 'Gói API fixture', exact: true }).waitFor();
        await statePage.waitForFunction(() => !document.querySelector('.home-tour-message p').textContent.includes('Chưa tải được'));
      }
      await stateCtx.close();
    }
    packageState = 'ready';
    collectionState='error';
    const collectionCtx=await context({reducedMotion:'reduce'});const cp=await collectionCtx.newPage();await cp.goto(origin+'/');
    await scroll(cp,'#home-chapter-2',5);await cp.locator('.home-collection-preview [role="status"] button').waitFor();
    assert.ok((await cp.locator('.home-tour-message p').innerText()).includes('Chưa tải được bộ sưu tập'));
    collectionState='ready';await cp.locator('.home-tour-actions').getByRole('button',{name:'Thử tải bộ sưu tập',exact:true}).click();
    await cp.getByRole('heading',{name:'Bình minh',exact:true}).waitFor();await cp.waitForFunction(()=>document.querySelector('.home-tour-message p').textContent.includes('Bình minh'));
    await collectionCtx.close();
    const smallCtx = await context({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await smallCtx.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await smallCtx.route('**/images/home-guide/paper-guide-poses.png', route => route.abort());
    const small = await smallCtx.newPage();
    await small.goto(origin + '/');
    await small.locator('.home-tour-fallback').getByText('Cùng khám phá nhé.', { exact: true }).waitFor({ state: 'attached' });
    assert.equal(await small.locator('.home-tour-character').isVisible(),true);
    assert.equal(await small.locator('.home-tour').getAttribute('data-mode'),'portrait');
    await small.screenshot({path:'qa-policy-checkbox/bot-presence-dark-portrait.png'});
    await open(small);
    await small.waitForFunction(() => {
      const guide = document.querySelector('.home-tour').getBoundingClientRect();
      const nav = document.querySelector('.mobile-bottom-nav').getBoundingClientRect();
      return guide.bottom < nav.top;
    });
    await small.screenshot({ path: 'qa-policy-checkbox/bot-dialogue-dark-compact-fallback.png' });
    assert.equal(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await small.getByRole('button', { name: 'Khám phá ảnh', exact: true }).click();
    await small.waitForURL('**/explore');
    await small.locator('.home-tour').waitFor({ state: 'detached' });
    assert.equal(await small.locator('.home-tour').count(), 0);
    await smallCtx.close();
    packageState='single';const singleCtx=await context({reducedMotion:'reduce'}),single=await singleCtx.newPage();await single.goto(origin+'/');await scroll(single,'#home-packages',7);await single.locator('.home-package-card:visible').waitFor();
    assert.equal(await single.locator('.home-package-track').getAttribute('data-scroll-packages'),'false');assert.equal(await single.getByRole('button',{name:'Gói tiếp theo',exact:true}).isDisabled(),true);await singleCtx.close();packageState='ready';
    const narrowCtx=await context({viewport:{width:390,height:844},reducedMotion:'reduce'});const narrow=await narrowCtx.newPage();await narrow.goto(origin+'/');
    await narrow.locator('.home-tour canvas.is-ready').waitFor();await narrow.waitForTimeout(250);
    assert.equal(await narrow.locator('.home-tour-character').isVisible(),true);assert.equal(await narrow.locator('.home-tour').getAttribute('data-mode'),'portrait'); assert.equal(await narrow.locator('.home-tour-character').evaluate(el=>getComputedStyle(el).borderTopLeftRadius),'50%');
    await narrow.screenshot({path:'qa-policy-checkbox/bot-presence-narrow-paper.png'});
    await scroll(narrow,'#home-packages',7);await narrow.locator('.home-package-card:visible').waitFor();
    assert.equal(await narrow.locator('.home-package-track').getAttribute('data-scroll-packages'),'false');
    const nextNarrow=narrow.getByRole('button',{name:'Gói tiếp theo',exact:true});await nextNarrow.evaluate(el=>el.focus());await narrow.keyboard.press('Enter');
    assert.equal(await narrow.locator('.home-package-card:visible h3').innerText(),'Gói thứ hai');
    assert.equal(await narrow.locator('.home-package-card:visible').count(),1);
    assert.equal(await narrow.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await narrow.screenshot({path:'qa-policy-checkbox/home-single-side-mobile.png'});await narrowCtx.close();

    const categoryCtx=await context({reducedMotion:'reduce'});const categoryPage=await categoryCtx.newPage();await categoryPage.goto(origin+'/t/all');
    await categoryPage.locator('.homepage').waitFor();assert.equal(await categoryPage.locator('.home-tour').count(),0);assert.equal(await categoryPage.locator('.home-guide-scene').count(),0);await categoryCtx.close();
    assert.equal(writes, 0);
    console.log('PASS collection request sharing/error/retry; photo metadata omission; package facts; always visible Paper; empty/error/retry, reduced motion, dark narrow popup, failed atlas fallback, route cleanup; no business writes');
    fs.writeFileSync('qa-policy-checkbox/bot-dialogue-result.json', JSON.stringify({ captions, errors, writes, environment: 'Edge headless; local isolated API fixture; 1705x980 light and 390x844 dark/reduce; no real device or production acceptance' }, null, 2));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
