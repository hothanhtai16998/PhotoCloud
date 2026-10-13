const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const results=[];try{
for(const width of [390,440,768,1024,1440]){const p=await b.newPage({viewport:{width,height:956}});
const css=['components/NoFlashGrid/components/ImageModal.css','pages/ImagePage.css','components/NoFlashGrid/NoFlashGrid.css','pages/ExplorePage.css','components/ImagePagePhoto.css'].map(f=>fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');
await p.setContent(`<style>*{box-sizing:border-box}body{margin:0}.app-body{padding-top:80px}:root{--header-height:80px}${css}</style><main class="app-body"><div class="image-page"><div class="image-modal-container"><div class="image-modal-top-info"><button class="image-page-back-button">Back</button><span>Author</span></div><div class="image-modal-image-container" style="height:400px;min-height:400px;max-height:400px"><img class="image-page-photo" alt="" /></div><footer id="footer">Info</footer></div></div></main><div class="explore-grid-wrap"><div class="no-flash-grid-container">Grid</div></div>`);
const measure=()=>p.evaluate(()=>({top:document.querySelector('.image-modal-top-info').getBoundingClientRect().top,padding:getComputedStyle(document.querySelector('.no-flash-grid-container')).paddingTop,footer:document.querySelector('#footer').getBoundingClientRect().top}));
const before=await measure();assert.equal(before.top,80);assert.equal(before.padding,'0px');
await p.locator('img').evaluate(e=>{e.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"></svg>';});
const after=await measure();assert.equal(after.footer,before.footer);results.push({width,toolbarTop:before.top,gridPadding:before.padding,footerStable:true});await p.close();}
}finally{await b.close();fs.writeFileSync(path.join(root,'image-spacing-checks.json'),JSON.stringify(results,null,2));}console.log(JSON.stringify(results));})().catch(e=>{console.error(e);process.exitCode=1;});
