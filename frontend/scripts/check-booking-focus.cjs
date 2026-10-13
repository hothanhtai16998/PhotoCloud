const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const bundle = await esbuild.build({
    stdin: {contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {BookingModal} from './src/components/BookingModal';createRoot(document.getElementById('root')).render(<MemoryRouter><button id="open" onClick={()=>window.dispatchEvent(new CustomEvent('photocloud:open-booking-modal'))}>Open</button><button id="behind">Background</button><BookingModal/></MemoryRouter>);`, resolveDir:root, loader:'tsx'},
    bundle:true, write:false, format:'iife', jsx:'automatic', define:{'process.env.NODE_ENV':'"development"'},
    plugins:[{name:'fixture',setup(build){
      build.onResolve({filter:/^@\//}, args => {
        if (args.path.includes('bookingService') || args.path.includes('useUserStore') || args.path.includes('lib/utils') || args.path.includes('constants/packages')) return {path:args.path,namespace:'mock'};
        return {path:path.join(root,'src',args.path.slice(2))+'.ts'};
      });
      build.onLoad({filter:/.*/,namespace:'mock'}, args=>({contents:
        args.path.includes('bookingService') ? `export const bookingService={getPackages:async()=>({packages:[{slug:'portrait',name:'Chân dung',basePrice:1,durationMinutes:60,includedPhotos:20}]}),create:async()=>{throw Error('Mutation forbidden in fixture')}};` :
        args.path.includes('useUserStore') ? 'export const useUserStore=()=>({user:null});' :
        args.path.includes('constants/packages') ? 'export const CORE_PACKAGES=[];' : 'export const getErrorMessage=()=>"Fixture error";', loader:'js'}));
      build.onLoad({filter:/\.css$/},()=>({contents:'',loader:'empty'}));
    }}], loader:{'.css':'empty'}, logLevel:'silent'
  });
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try {
    for (const width of [320,390,768,1024,1440]) {
      const page=await browser.newPage({viewport:{width,height:844}});
      await page.setContent(`<style>${fs.readFileSync(path.join(root,'src/components/BookingModal.css'),'utf8')}</style><div id="root"></div>`);
      await page.addScriptTag({content:bundle.outputFiles[0].text});
      await page.locator('#open').click();
      await page.getByRole('dialog').waitFor();
      const inside=()=>page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]'));
      assert.equal(await inside(),true,'Initial focus');
      if(width===390) await page.screenshot({path:path.join(root,'booking-focus-390.png')});
      for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await inside(),true,'Tab trap');}
      for(let i=0;i<8;i++){await page.keyboard.press('Shift+Tab');assert.equal(await inside(),true,'Reverse trap');}
      await page.locator('.booking-modal-packages button').click();
      await page.getByRole('button',{name:'Tiếp tục'}).click();
      assert.equal(await inside(),true,'Step focus');
      await page.locator('input[type=date]').fill('2099-10-22');
      await page.getByLabel('Địa chỉ / khu vực').fill('Địa điểm kiểm thử');
      await page.getByRole('button',{name:'Tiếp tục'}).click();
      await page.getByLabel('Họ và tên').fill('Người kiểm thử');
      await page.getByLabel('Email',{exact:true}).fill('test@example.com');
      await page.getByLabel('Số điện thoại',{exact:true}).fill('fdsa');
      await page.getByRole('button',{name:'Tiếp tục'}).click();
      assert.equal(await page.getByRole('heading',{name:'Thông tin liên hệ',exact:true}).count(),1,'Invalid phone stays on contact step');
      await page.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');
      await page.getByRole('button',{name:'Tiếp tục'}).click();
      await page.getByRole('heading',{name:'Xác nhận yêu cầu',exact:true}).waitFor({timeout:3000});
      assert.equal(await page.getByRole('heading',{name:'Xác nhận yêu cầu',exact:true}).count(),1,'Valid contact reaches summary');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'detached'});
      await page.locator('#open').waitFor({state:'visible'});
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'open','Return focus');
      await page.locator('#open').click();await page.getByRole('dialog').waitFor();
      await page.getByRole('button',{name:'Đóng',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'detached'});await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'open');
      results.push({width,initialFocus:true,tabTrap:true,stepFocus:true,escape:true,close:true,returnFocus:true});
      await page.close();
    }
  } finally {await browser.close();fs.writeFileSync(path.join(root,'booking-focus-checks.json'),JSON.stringify(results,null,2));}
  console.log(JSON.stringify(results));
})().catch(error=>{console.error(error);process.exitCode=1;});
