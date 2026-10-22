const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const ids = ['000000000000000000000011','000000000000000000000012'];
const collectionId = '000000000000000000000101';
const photo = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#8b7355"/><path d="M0 400L250 80L600 400" fill="#d8c7a6"/></svg>');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const server = require('./admin-preview.cjs');
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const report = [];
  try {
    browser = await chromium.launch({channel:'msedge',headless:true});
    for (const theme of ['light','dark']) {
      let viewer=false, guest=false, favoriteChecks=0, failRead=false, empty=false, failedDelete=true, coverCalls=0, exports=0, reorders=0;
      const deletions=[];
      const user = () => ({_id:'owner',username:'fixture',displayName:'Tài khoản kiểm thử',isAdmin:!viewer,isSuperAdmin:!viewer});
      let photos=ids.map((id,index)=>({_id:id,imageTitle:'Ảnh kiểm thử '+(index+1),imageUrl:photo,regularUrl:photo,thumbnailUrl:photo,width:600,height:400,uploadedBy:user(),createdAt:'2026-10-19'}));
      let cover=ids[0];
      const collection=()=>({_id:collectionId,name:'Bộ sưu tập kiểm thử — tiếng Việt',description:'Dữ liệu giả lập, không phải thông tin studio.',isPublic:true,createdBy:user(),images:empty?[]:photos,imageCount:empty?0:photos.length,coverImage:cover,createdAt:'2026-10-19',views:12});
      const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',acceptDownloads:true});
      await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
      await context.route('**/api/**',async route=>{
        const request=route.request(), u=new URL(request.url()), method=request.method();
        const fulfill=json=>route.fulfill({json});
        if(u.pathname==='/api/auth/refresh')return guest ? route.fulfill({status:401,json:{message:'No session'}}) : fulfill({accessToken:'fixture'});
        if(u.pathname==='/api/users/me')return fulfill({user:user()});
        if(u.pathname==='/api/collection-favorites/check'){favoriteChecks++;return fulfill({success:true,favorites:{[collectionId]:false}});}
        if(u.pathname==='/api/collection-favorites/'+collectionId)return fulfill({success:true,isFavorited:true});
        if(u.pathname==='/api/collections/'+collectionId+'/export') { exports++;await delay(250);return route.fulfill({contentType:'application/zip',body:Buffer.from('fixture zip')}); }
        if(u.pathname.endsWith('/images/reorder')) { reorders++;return route.fulfill({status:500,json:{message:'Lỗi sắp xếp giả lập'}}); }
        if(u.pathname.startsWith('/api/collections/'+collectionId+'/images/') && method==='DELETE') {
          const id=u.pathname.split('/').pop();deletions.push(id);await delay(180);
          if(id===ids[1] && failedDelete){failedDelete=false;return route.fulfill({status:500,json:{message:'Lỗi xóa giả lập'}});}
          photos=photos.filter(image=>image._id!==id);return fulfill({success:true,collection:collection()});
        }
        if(u.pathname==='/api/collections/'+collectionId) {
          if(method==='PATCH'){coverCalls++;await delay(180);cover=request.postDataJSON().coverImage;return fulfill({success:true,collection:collection()});}
          if(failRead)return route.fulfill({status:500,json:{message:'Không tải được dữ liệu kiểm thử'}});
          return fulfill({success:true,collection:collection()});
        }
        if(u.pathname==='/api/collections/missing')return route.fulfill({status:404,json:{message:'Không tìm thấy bộ sưu tập'}});
        if(u.pathname==='/api/collections')return fulfill({success:true,collections:[collection()]});
        if(u.pathname.startsWith('/api/images/by-id/'))return fulfill({image:photos.find(image=>image._id===u.pathname.split('/').pop())||photos[0]});
        if(u.pathname==='/api/images')return fulfill({images:photos,pagination:{page:1,pages:1,total:photos.length,limit:20}});
        if(method!=='GET')return fulfill({success:true}); // Never forward mutations.
        const response=await fetch(origin+u.pathname+u.search);
        return route.fulfill({status:response.status,body:await response.text(),contentType:'application/json'});
      });
      const page=await context.newPage(), errors=[];
      page.setDefaultTimeout(10000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/collections/'+collectionId);
      const wrappers=page.locator('.collection-detail-images .grid-item-wrapper');
      await wrappers.nth(1).waitFor();
      await page.locator('.collection-image-drag-handle').first().waitFor();
      assert.equal(await page.locator('.collection-grid-overlay').count(),2);
      assert.equal(await page.locator('.collection-image-cover-badge').count(),1);
      const setCover=page.locator('[data-image-id="'+ids[1]+'"] .collection-image-set-cover-btn');
      await setCover.focus();
      await page.waitForFunction(id=>getComputedStyle(document.querySelector('[data-image-id="'+id+'"] .collection-image-overlay')).opacity==='1',ids[1]);
      await setCover.press('Enter');
      await page.waitForFunction(id=>document.querySelector('[data-image-id="'+id+'"] .collection-grid-overlay.is-cover'),ids[1]);
      assert.equal(coverCalls,1);
      // Drag over the underlying image, not just the handle/overlay.
      await page.evaluate(()=>{
        const rows=document.querySelectorAll('.collection-detail-images .grid-item-wrapper');
        const dataTransfer=new DataTransfer();
        rows[0].querySelector('.collection-image-drag-handle').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));
      });
      await page.evaluate(()=>{
        const target=document.querySelectorAll('.collection-detail-images .grid-item-wrapper')[1].querySelector('.blur-up-image-container');
        target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));
        target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));
      });
      await page.waitForFunction(()=>!document.querySelector('.collection-grid-overlay.dragging'));
      await page.waitForTimeout(200);
      assert.equal(reorders,1);
      assert.equal(await wrappers.first().getAttribute('data-image-id'),ids[0]);
      await page.waitForFunction(id=>{const el=document.querySelector('[data-image-id="'+id+'"] .collection-image-set-cover-btn');return el && !el.disabled;},ids[0]);
      await page.getByRole('button',{name:'Yêu thích',exact:true}).click();
      await page.getByRole('button',{name:'Bỏ yêu thích',exact:true}).waitFor();
      const download=page.waitForEvent('download');
      await page.getByRole('button',{name:'Xuất bộ sưu tập',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Xuất bộ sưu tập',exact:true}).isDisabled(),true);
      await download;assert.equal(exports,1);
      await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/collection-detail-owner-'+theme+'.png')});
      await page.getByRole('button',{name:'Chọn nhiều ảnh',exact:true}).click();
      await page.getByRole('button',{name:'Chọn ảnh Ảnh kiểm thử 1',exact:true}).click();
      await page.getByRole('button',{name:'Chọn tất cả',exact:true}).click();
      assert.equal(await page.locator('.collection-grid-overlay.selected').count(),2);
      const remove=page.getByRole('button',{name:'Xóa khỏi bộ sưu tập',exact:true});
      await remove.click();
      const dialog=page.getByRole('alertdialog');await dialog.waitFor();
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(deletions.length,0);
      await remove.click();await dialog.waitFor();
      await dialog.getByRole('button',{name:'Xóa',exact:true}).click();
      await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'busy dialog cannot dismiss');
      await dialog.getByRole('alert').waitFor();
      assert.match(await dialog.getByRole('alert').innerText(),/1 ảnh chưa xóa/);
      assert.equal(await wrappers.count(),1);
      await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/collection-detail-retry-'+theme+'.png')});
      await dialog.getByRole('button',{name:'Xóa',exact:true}).click();await dialog.waitFor({state:'hidden'});
      await page.locator('.collection-detail-empty').waitFor();
      assert.equal(deletions.length,3);
      assert.equal(deletions.filter(id=>id===ids[0]).length,1,'successful deletion is not retried');
      assert.equal(deletions.filter(id=>id===ids[1]).length,2,'retry only the failed image');
      viewer=true;empty=false;photos=ids.map(id=>({_id:id,imageTitle:'Ảnh xem',imageUrl:photo,width:600,height:400,uploadedBy:user()}));
      await page.reload();await wrappers.nth(1).waitFor();
      assert.equal(await page.getByRole('button',{name:'Chọn nhiều ảnh',exact:true}).count(),0,'ordinary owner is still read only');
      assert.equal(await page.locator('.collection-image-set-cover-btn,.collection-image-drag-handle,.collection-bulk-action-bar').count(),0);
      await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/collection-detail-viewer-'+theme+'.png')});
      const image=page.locator('.collection-detail-images .blur-up-image-container').first();
      await image.click({position:{x:30,y:100}});await page.locator('.image-page-modal').waitFor();
      await page.goBack();await page.locator('.collection-detail-header').waitFor();
      assert.ok(page.url().endsWith('/collections/'+collectionId));
      await page.reload();await wrappers.nth(1).waitFor();
      failRead=true;await page.reload();await page.locator('.user-menu-trigger').waitFor();
      // Let the guest-to-account reload finish before recovering the mocked API.
      await page.waitForTimeout(150);await page.locator('.collection-load-error-actions').waitFor();
      assert.ok(page.url().endsWith(collectionId));failRead=false;
      await page.getByRole('button',{name:'Thử lại',exact:true}).click();await wrappers.nth(1).waitFor();
      await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
      await page.locator('.collection-load-error-actions').waitFor();
      await context.setOffline(false);await page.locator('.collection-load-error-actions').waitFor({state:'hidden'});await wrappers.nth(1).waitFor();
      empty=true;await page.reload();await page.locator('.collection-detail-empty').waitFor();
      await page.goto(origin+'/collections/missing');await page.locator('.collection-load-error-actions').waitFor();
      assert.match(await page.locator('.collection-detail-error').innerText(),/Không tìm thấy/);
      guest=true;empty=false;
      await page.goto(origin+'/collections');await wrappers.waitFor({state:'hidden'});
      await page.locator('.collection-card-link').waitFor();
      assert.ok(page.url().endsWith('/collections'),'guest is not redirected home');
      await page.getByRole('button',{name:'Menu người dùng',exact:true}).waitFor({state:'hidden'});
      const checksBefore=favoriteChecks;
      await page.locator('.collection-card-link').click();await wrappers.nth(1).waitFor();
      assert.equal(favoriteChecks,checksBefore,'guest does not request private favorite status');
      await page.reload();await wrappers.nth(1).waitFor();
      assert.ok(page.url().endsWith(collectionId),'guest can F5 public detail');
      assert.equal(await page.getByRole('button',{name:'Chọn nhiều ảnh',exact:true}).count(),0);
      await page.screenshot({path:path.resolve(__dirname,'../qa-policy-checkbox/collection-public-guest-'+theme+'.png')});
      assert.deepEqual(errors,[]);
      report.push({theme,viewport:'1440x900',browser:'Edge headless',fixture:true,coverCalls,reorders,exports,deletions,unhandledErrors:errors.length,result:'PASS'});
      await context.close();
    }
    fs.writeFileSync(path.resolve(__dirname,'../qa-policy-checkbox/collection-detail-browser.json'),JSON.stringify(report,null,2));
    console.log('PASS: desktop light/dark overlay, drag rollback, keyboard cover, favorite, export lock, delete cancel/busy/partial retry, viewer permission, photo modal/Back/F5, error/offline/retry, empty/404, guest public list/detail/F5 without private favorite requests.');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
