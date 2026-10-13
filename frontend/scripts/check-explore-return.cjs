const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');

(async()=>{
  // Real scroll store and restore hook; navigation/data heights are isolated fixtures.
  const bundle=await esbuild.build({stdin:{resolveDir:root,loader:'tsx',contents:`
    import React,{useRef,useState,useEffect} from 'react';import{createRoot}from'react-dom/client';
    import{MemoryRouter,Routes,Route,useLocation,useNavigate,useNavigationType}from'react-router-dom';
    import{saveImagePageScroll}from'./src/utils/imagePageScroll';
    import{useImagePageScrollRestore}from'./src/hooks/useImagePageScrollRestore';
    let visits=0;
    function Grid(){const l=useLocation(),n=useNavigate(),type=useNavigationType(),ref=useRef(null);const[ready,setReady]=useState(()=>++visits===1);useImagePageScrollRestore(l,ref,ready&&type==='POP',false,undefined,ready?12:0);return <main ref={ref} style={{height:ready?6500:200}}><button id="load" style={{position:'fixed',top:0}} onClick={()=>setReady(true)}>Load</button><button id="open" style={{position:'fixed',top:30}} onClick={()=>{saveImagePageScroll(l,null);n('/photos/a')}}>Open</button></main>}
    function Photo(){const n=useNavigate();useEffect(()=>{window.scrollTo(0,0)},[]);return <div><button id="back" onClick={()=>n(-1)}>Back</button><button id="new" onClick={()=>n('/explore')}>New entry</button></div>}
    createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/explore']}><Routes><Route path="/explore" element={<Grid/>}/><Route path="/photos/a" element={<Photo/>}/></Routes></MemoryRouter>);
  `},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'alias',setup(b){b.onResolve({filter:/^@\//},a=>({path:path.join(root,'src',a.path.slice(2))+'.ts'}));}}]});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const results=[];
  try{
    for(const width of [390,768,1440]){
      const page=await browser.newPage({viewport:{width,height:844}});
      const mount=async()=>{await page.setContent('<style>body{margin:0}</style><div id="root"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.locator('#open').waitFor();};
      await mount();await page.evaluate(()=>window.scrollTo(0,4200));
      await page.locator('#open').click();await page.locator('#back').waitFor();
      assert.equal(await page.evaluate(()=>scrollY),0);
      await page.locator('#back').click();await page.locator('#load').waitFor();
      await page.locator('#load').click();await page.waitForFunction(()=>Math.abs(scrollY-4200)<2);
      await page.locator('#open').click();await page.locator('#new').click();await page.locator('#open').waitFor();
      assert.equal(await page.evaluate(()=>scrollY),0,'New history entry must not reuse previous position');
      await page.close();
      const fresh=await browser.newPage({viewport:{width,height:844}});
      await fresh.setContent('<style>body{margin:0}</style><div id="root"></div>');await fresh.addScriptTag({content:bundle.outputFiles[0].text});await fresh.locator('#open').waitFor();
      assert.equal(await fresh.evaluate(()=>scrollY),0,'Fresh document has no scroll snapshot');await fresh.close();
      results.push({width,backAfterDelayedContent:true,newEntryTop:true,freshDocumentTop:true});
    }
  }finally{await browser.close();fs.writeFileSync(path.join(root,'explore-return-checks.json'),JSON.stringify(results,null,2));}
  console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;});
