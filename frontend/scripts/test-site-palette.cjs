const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const defaults = require('../../shared/sitePalette.json');
 const { validateSitePalette, publicSitePalette } = await import('../../backend/src/utils/sitePalette.js');
 assert.equal(validateSitePalette(defaults), null);
 for (const mutate of [p=>delete p.dark, p=>p.light['--bg-primary']='red;display:none', p=>p.light.unknown='#FFFFFF', p=>p.version=2]) {
  const p=structuredClone(defaults); mutate(p); assert.ok(validateSitePalette(p)); assert.deepEqual(publicSitePalette(p),defaults);
 }
 const server=require('./admin-preview.cjs');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  let settings={siteName:'PhotoCloud',allowedFileTypes:['jpg','png'],maxUploadSize:10,sitePalette:structuredClone(defaults)}, fail=true, puts=0;
  await context.route('**/api/**',async route=>{
   const req=route.request(), url=new URL(req.url());
   if(url.pathname.endsWith('/settings')) {
    if(req.method()==='PUT') { puts++; if(fail) return route.fulfill({status:503,json:{message:'Lỗi lưu thử nghiệm'}}); settings={...settings,...req.postDataJSON().settings}; }
    return route.fulfill({json:{settings}});
   }
   const response=await route.fetch({url:origin+url.pathname+url.search}); await route.fulfill({response});
  });
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/admin/settings');
  await page.getByLabel('Tên website',{exact:true}).waitFor();
  await page.screenshot({path:'qa-policy-checkbox/settings-general-light.png',fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.classList.add('dark-theme'));
  await page.screenshot({path:'qa-policy-checkbox/settings-general-dark.png',fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.classList.remove('dark-theme'));

  await page.getByRole('button',{name:'Giao diện Bảng màu sáng và tối',exact:true}).click();
  await page.getByRole('heading',{name:'Bảng màu website'}).waitFor();
  const field=page.locator('#palette-light-bg-primary');
  await page.getByRole('button',{name:'Chỉnh nền nút xóa',exact:true}).click();
  assert.equal(await page.locator('#palette-light-button-danger-bg').evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Chỉnh nền nút chính',exact:true}).focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#palette-light-button-primary-bg').evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Chỉnh nền trang',exact:true}).click();
  assert.equal(await field.evaluate(el=>el===document.activeElement),true);

  const globalColor=()=>page.evaluate(()=>getComputedStyle(document.body).getPropertyValue('--bg-primary').trim());
  const before=await globalColor();
  await page.getByLabel('Tìm màu trong nhóm',{exact:true}).fill('khôngtồntại');
  await page.getByText('Không tìm thấy màu. Thử từ khóa khác hoặc chuyển nhóm.').waitFor();
  await page.getByRole('button',{name:'Chỉnh nền trang',exact:true}).click();
  assert.equal(await page.getByLabel('Tìm màu trong nhóm',{exact:true}).inputValue(),'');
  await page.getByLabel('Tìm màu trong nhóm',{exact:true}).fill('chữ chính');
  assert.ok(await page.locator('#palette-component option').filter({hasText:'Chữ và đường viền'}).count());
  await page.getByLabel('Tìm màu trong nhóm',{exact:true}).fill('');

  await field.fill('#EEDDBB');
  await page.getByRole('button',{name:'Chỉnh nền nút chính',exact:true}).click();
  assert.equal(await page.locator('.palette-field').count(),3);
  await page.locator('#palette-light-button-primary-bg').fill('#112233');
  await page.locator('#palette-light-button-primary-fg').fill('#112233');
  await page.getByText('Chữ có thể khó đọc (dưới 4,5:1).').waitFor();
  await page.getByRole('button',{name:'Hoàn tác thành phần',exact:true}).click();
  assert.equal(await page.locator('#palette-light-button-primary-bg').inputValue(),defaults.light['--button-primary-bg']);
  assert.equal(await page.locator('#palette-light-button-primary-fg').inputValue(),defaults.light['--button-primary-fg']);
  await page.getByRole('button',{name:'Chỉnh nền trang',exact:true}).click();
  assert.equal(await field.inputValue(),'#EEDDBB');

  await page.getByRole('button',{name:'Cài đặt chung Thông tin, tải ảnh và bảo trì',exact:true}).click();
  await page.getByRole('button',{name:'Giao diện Bảng màu sáng và tối',exact:true}).click();
  assert.equal(await field.inputValue(),'#EEDDBB');
 assert.equal(await globalColor(),before); assert.equal(puts,0);
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Lỗi lưu thử nghiệm'}).waitFor(); assert.equal(await field.inputValue(),'#EEDDBB'); assert.equal(await globalColor(),before);
  fail=false; await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
  await page.waitForFunction(()=>getComputedStyle(document.body).getPropertyValue('--bg-primary').trim()==='#EEDDBB'); assert.equal(puts,2);
  await page.getByRole('button',{name:'Khôi phục màu mặc định'}).click(); assert.equal(await field.inputValue(),defaults.light['--bg-primary']); assert.equal(await globalColor(),'#EEDDBB');
  await page.getByRole('button',{name:'Hoàn tác',exact:true}).click(); assert.equal(await field.inputValue(),'#EEDDBB');
  await field.fill('broken'); await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click(); assert.equal(puts,2); assert.equal(await field.getAttribute('aria-invalid'),'true');
  await page.getByRole('button',{name:'Hoàn tác',exact:true}).click();
  await page.screenshot({path:'qa-policy-checkbox/palette-light.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Giao diện tối',exact:true}).click(); await page.getByRole('button',{name:'Nút & tương tác',exact:true}).click();
  await page.evaluate(()=>document.documentElement.classList.add('dark-theme'));
  await page.screenshot({path:'qa-policy-checkbox/palette-dark-preview.png',fullPage:true,animations:'disabled'});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.palette-sample-secondary')).backgroundColor==='rgb(51, 44, 33)');
  assert.equal(await page.locator('.palette-sample-secondary').evaluate(el=>getComputedStyle(el).color),'rgb(228, 188, 133)');
  await page.evaluate(()=>document.documentElement.classList.remove('dark-theme'));
  await page.reload(); await page.getByRole('button',{name:'Giao diện Bảng màu sáng và tối',exact:true}).click(); await field.waitFor(); assert.equal(await field.inputValue(),'#EEDDBB');
  await page.goto(origin+'/about'); await page.locator('h1').waitFor();
  const about={title:await page.title(),phone:await page.locator('a[href^="tel:"]').first().evaluateAll(els=>els[0]?.getAttribute('href') ?? null),errors};
  for(const theme of ['light','dark']) {
   await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);
   for(const section of await page.locator('.studio-reveal').all()) await section.scrollIntoViewIfNeeded();
   await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path:`qa-policy-checkbox/about-review-${theme}.png`,fullPage:true,animations:'disabled'});
  }
  const faq=page.locator('details').first(); await faq.locator('summary').click(); assert.equal(await faq.getAttribute('open'),'');
  assert.deepEqual(errors,[]);
  fs.writeFileSync('qa-policy-checkbox/palette-results.json',JSON.stringify({passed:true,puts,about,environment:'Edge headless 1440x1000, isolated API fixture; responsive not tested'},null,2));
  console.log('PASS palette validation, preview isolation, failed save retention, retry, reset, undo, invalid HEX, reload, About FAQ and light/dark captures');
 } finally { await browser?.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
