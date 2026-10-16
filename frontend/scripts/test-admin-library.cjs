const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const source=fs.readFileSync('../backend/src/controllers/admin/adminImageController.js','utf8');
 const declaration=source.split('\n').find(line=>line.startsWith('const escapeRegex'));
 const escape=vm.runInNewContext(declaration+'; escapeRegex');
 for(const value of ['a.b','[x]','a+b','(x)','a\\b','^$','ảnh %']) {const pattern=new RegExp('^'+escape(value)+'$');assert.ok(pattern.test(value));assert.equal(pattern.test('other'),false);}
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  let failedDelete=true,failCategories=true,failUpdate=true,failList=false;
  let rows=[{_id:'one',imageTitle:'Ảnh thử tiếng Việt',imageUrl:origin+'/bad-photo.png',createdAt:'invalid',imageCategory:null,uploadedBy:null,moderationStatus:'pending'},{_id:'two',imageTitle:null,imageUrl:null,createdAt:'2026-10-16',imageCategory:null,uploadedBy:null,moderationStatus:'approved'}];const deletes=[];
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.endsWith('/admin/images')) {if(failList)return route.fulfill({status:503,json:{message:'Lỗi danh sách thử'}});const search=url.searchParams.get('search');if(search==='slow') {await new Promise(resolve=>setTimeout(resolve,350));return route.fulfill({json:{images:[{_id:'slow',imageTitle:'Kết quả cũ',createdAt:'2026-01-01'}],pagination:{page:1,pages:9,total:170}}});}return route.fulfill({json:{images:search==='none'?[]:rows,pagination:{page:1,pages:1,total:search==='none'?0:rows.length}}});}
   if(url.pathname.includes('/admin/images/') && req.method()==='DELETE') {const id=url.pathname.split('/').pop();deletes.push(id);if(id==='two' && failedDelete)return route.fulfill({status:503,json:{message:'Ảnh thứ hai chưa xóa được'}});rows=rows.filter(row=>row._id!==id);return route.fulfill({json:{message:'ok'}});}
   if(url.pathname.includes('/admin/images/') && req.method()==='PUT') {if(failUpdate)return route.fulfill({status:503,json:{message:'Lỗi lưu thử'}});return route.fulfill({json:{image:{...rows[0],...req.postDataJSON()}}});}
   if(url.pathname.includes('/categories/admin') && req.method()==='GET') {if(failCategories)return route.fulfill({status:503,json:{message:'Lỗi danh mục thử'}});return route.fulfill({json:{categories:[{_id:'cat',name:'Phong cảnh'}]}});}
   const response=await route.fetch({url:origin+url.pathname+url.search});return route.fulfill({response});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/admin/images');await page.getByRole('button',{name:'Sửa Ảnh chưa có tiêu đề',exact:true}).waitFor();
  await page.getByText('Chưa rõ ngày',{exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'Chọn Ảnh thử tiếng Việt',exact:true}).check();assert.equal(await page.getByRole('checkbox',{name:'Chọn tất cả ảnh trên trang'}).evaluate(el=>el.indeterminate),true);
  await page.getByRole('button',{name:'Đổi danh mục',exact:true}).click();await page.getByRole('button',{name:'Tải lại danh mục',exact:true}).waitFor();failCategories=false;await page.getByRole('button',{name:'Tải lại danh mục',exact:true}).click();await page.getByRole('option',{name:'Phong cảnh',exact:true}).waitFor({state:'attached'});await page.getByRole('button',{name:'Hủy',exact:true}).click();
  await page.getByRole('button',{name:'Sửa Ảnh chưa có tiêu đề',exact:true}).click();await page.getByLabel('Tiêu đề ảnh',{exact:true}).fill('Tên mới vẫn giữ');await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByText('Lỗi lưu thử',{exact:true}).waitFor();assert.equal(await page.getByLabel('Tiêu đề ảnh',{exact:true}).inputValue(),'Tên mới vẫn giữ');failUpdate=false;await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);await page.screenshot({path:`qa-policy-checkbox/library-${theme}.png`,fullPage:true,animations:'disabled'});}
  await page.getByRole('checkbox',{name:'Chọn tất cả ảnh trên trang'}).check();await page.getByRole('button',{name:'Xóa đã chọn',exact:true}).click();await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).click();await page.getByText('Ảnh thứ hai chưa xóa được',{exact:true}).waitFor();await page.getByText('1 ảnh đã chọn',{exact:true}).waitFor();failedDelete=false;await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});assert.deepEqual(deletes,['one','two','two']);
  failList=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await page.getByText('Lỗi danh sách thử',{exact:true}).waitFor();assert.equal(await page.getByText('Chưa có dữ liệu',{exact:true}).count(),0);failList=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByText('Chưa có dữ liệu',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Tìm kiếm',exact:true}).fill('none');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await page.getByText('Không tìm thấy kết quả',{exact:true}).waitFor();assert.ok(page.url().includes('q=none'));
  await page.getByRole('searchbox',{name:'Tìm kiếm',exact:true}).fill('slow');
  const slowResponse=page.waitForResponse(response=>response.url().includes('search=slow'));
  const slowRequest=page.waitForRequest(request=>request.url().includes('search=slow'));
  await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await slowRequest;
  await page.getByRole('searchbox',{name:'Tìm kiếm',exact:true}).fill('none');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await slowResponse;
  await page.getByText('Không tìm thấy kết quả',{exact:true}).waitFor();assert.equal(await page.getByText('Kết quả cũ',{exact:true}).count(),0);assert.ok(page.url().includes('q=none'));
  assert.deepEqual(errors,[]);fs.writeFileSync('qa-policy-checkbox/library-results.json',JSON.stringify({passed:true,deletes,environment:'Edge headless 1440x1000; local fixtures; responsive not tested'},null,2));console.log('PASS regex literals, indeterminate selection, category retry, edit failure retention/retry, partial delete retry only failed IDs, empty/error/search, light/dark');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
