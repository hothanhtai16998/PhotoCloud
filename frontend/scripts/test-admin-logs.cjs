const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const source=fs.readFileSync('../backend/src/controllers/admin/adminSystemController.js','utf8');
 const escape=vm.runInNewContext(source.split('\n').find(line=>line.startsWith('const escapeRegex'))+';escapeRegex');
 for(const value of ['a.b','[x]','a+b','a\\b','(x)','^$']){const regex=new RegExp('^'+escape(value)+'$');assert.ok(regex.test(value));assert.equal(regex.test('other'),false);assert.notEqual(escape(value),value);}
 const server=require('./admin-preview.cjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  let fail=false,empty=false,restricted=false;const calls=[];
  const logs=[{_id:'one',timestamp:'2026-10-16T00:00:00Z',level:'warn',message:'Nhật ký tiếng Việt <script>literal</script> '+ 'Nội dung dài '.repeat(30),userId:{displayName:'Quản trị thử'},metadata:{hidden:'not exported'}},{_id:'two',timestamp:'invalid',level:'custom',message:null,userId:null}];
  await context.route('**/api/**',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(restricted&&u.pathname.endsWith('/users/me'))return route.fulfill({json:{user:{_id:'limited',username:'limited',isAdmin:true,isSuperAdmin:false,permissions:{viewLogs:true,viewDashboard:true}}}});
   if(u.pathname.endsWith('/admin/logs')){calls.push(u.search);if(fail)return route.fulfill({status:503,json:{message:'Lỗi tải nhật ký thử'}});const search=u.searchParams.get('search'),page=Number(u.searchParams.get('page')||1);
    if(search==='slow'){await new Promise(r=>setTimeout(r,350));return route.fulfill({json:{logs:[{_id:'old',message:'Kết quả cũ',level:'info'}],pagination:{page,pages:1,total:1}}});}
    return route.fulfill({json:{logs:empty||search==='none'?[]:page===2?[{_id:'page2',message:'Nhật ký trang hai',level:'info'}]:logs,pagination:{page,pages:empty||search==='none'?0:2,total:empty||search==='none'?0:51}}});}
   const response=await route.fetch({url:origin+u.pathname+u.search});return route.fulfill({response});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/admin/logs');
  await page.getByText('Chưa rõ thời gian',{exact:true}).waitFor();assert.equal(calls.length,1);await page.getByText('Khác (custom)',{exact:true}).waitFor();await page.getByText('Không có thông tin người dùng',{exact:true}).waitFor();
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.classList.toggle('dark-theme',t==='dark'),theme);await page.screenshot({path:`qa-policy-checkbox/logs-${theme}.png`,fullPage:true,animations:'disabled'});}
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất trang JSON',exact:true}).click();const file=await download;const exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(exported.logs.length,2);assert.equal(exported.scope,'current_page');assert.equal(exported.logs[0].message,logs[0].message);assert.equal('metadata' in exported.logs[0],false);
  await page.getByRole('button',{name:'Sau',exact:true}).click();await page.getByText('Nhật ký trang hai',{exact:true}).waitFor();assert.ok(page.url().includes('page=2'));
  await page.reload();await page.getByText('Nhật ký trang hai',{exact:true}).waitFor();await page.goBack();await page.getByText('Chưa rõ thời gian',{exact:true}).waitFor();await page.goForward();await page.getByText('Nhật ký trang hai',{exact:true}).waitFor();
  await page.getByRole('searchbox',{name:'Tìm thông điệp nhật ký',exact:true}).fill('a.b');await page.getByRole('combobox',{name:'Loại',exact:true}).selectOption('warn');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await page.getByText('Chưa rõ thời gian',{exact:true}).waitFor();assert.ok(page.url().includes('q=a.b'));assert.ok(page.url().includes('level=warn'));assert.ok(!page.url().includes('page=2'));
  fail=true;await page.getByRole('button',{name:'Làm mới',exact:true}).click();await page.getByRole('button',{name:'Thử lại',exact:true}).waitFor();assert.equal(await page.getByText('Chưa có nhật ký',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Xuất trang JSON',exact:true}).isDisabled(),true);fail=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByText('Chưa rõ thời gian',{exact:true}).waitFor();
  const box=page.getByRole('searchbox',{name:'Tìm thông điệp nhật ký',exact:true});await box.fill('slow');const old=page.waitForResponse(r=>r.url().includes('search=slow'));const started=page.waitForRequest(r=>r.url().includes('search=slow'));await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await started;await box.fill('none');await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await old;await page.getByText('Không tìm thấy nhật ký',{exact:true}).waitFor();assert.equal(await page.getByText('Kết quả cũ',{exact:true}).count(),0);
  empty=true;await page.getByRole('button',{name:'Xóa lọc',exact:true}).click();await page.getByText('Chưa có nhật ký',{exact:true}).waitFor();
  restricted=true;empty=false;await page.reload();await page.getByText('Chưa rõ thời gian',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Xuất trang JSON',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS logs literal regex, one initial GET, missing/long content, themes, JSON download visible fields only, pagination/reload/history, search/level, error/retry, late response, empty, export permission');
 } finally {await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

