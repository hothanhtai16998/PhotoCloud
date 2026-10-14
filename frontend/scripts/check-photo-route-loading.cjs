const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  // Controlled import latency, not a measurement of the live API or CDN.
  const bundle = await esbuild.build({ stdin: { resolveDir: root, loader: 'tsx', contents: `
    import React, {lazy, Suspense, useState} from 'react';
    import {createRoot} from 'react-dom/client';
    let resolve;
    const Photo = lazy(() => new Promise(done => { resolve = done; }));
    function App() {
      const [open, setOpen] = useState(false);
      return <Suspense fallback={<div id="global">Global loading</div>}>
        <main id="gallery"><button id="open" onClick={() => setOpen(true)}>Open</button></main>
        {open && <Suspense fallback={null}><Photo /></Suspense>}
      </Suspense>;
    }
    window.finishImport = () => resolve({default: () => <div role="dialog">Photo</div>});
    createRoot(document.getElementById('root')).render(<App />);
  ` }, bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.setContent('<div id="root"></div>');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.locator('#open').click();
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#gallery').isVisible(), true);
      assert.equal(await page.locator('#global').count(), 0);
      await page.evaluate(() => window.finishImport());
      await page.getByRole('dialog').waitFor();
      console.log(JSON.stringify({width, backgroundVisibleDuringImport: true, globalLoaderAbsent: true, dialogAfterImport: true}));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
