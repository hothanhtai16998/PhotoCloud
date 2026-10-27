const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { chromium } = require('C:/Users/Fenn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

// sessionStorage needs a real origin, so serve one blank document locally.
const PAGE_HTML = '<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><div id="root"></div>';

const FIXTURE = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { useRouteScrollReset } from './src/hooks/useRouteScrollReset';
import { saveScrollPosition, setModalActive, prepareModalNavigationState } from './src/utils/modalNavigation';

const TALL = 6000;
const NAV = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9, background: '#fff', display: 'flex', gap: '8px' };

function Tall({ id }) { return <main id={id} style={{ height: TALL }}>page</main>; }
function Blog() { return <Tall id="blog" />; }
function Collections() { return <Tall id="collections" />; }
function Photo() {
  // Stand-in for the real modal: the background page stays in place behind it.
  return <div id="photo" style={{ height: TALL }}>photo</div>;
}
function Explore() {
  const location = useLocation();
  const navigate = useNavigate();
  return <main id="explore" style={{ height: TALL }}>
    <button id="open-modal" style={{ position: 'fixed', top: 48, left: 0, zIndex: 8 }} onClick={() => {
      saveScrollPosition();
      setModalActive();
      const background = { pathname: location.pathname, search: '', hash: '', state: null, key: location.key };
      navigate('/photos/a', { state: { ...prepareModalNavigationState(background), images: [], image: { _id: 'a' }, fromGrid: true } });
    }}>open</button>
  </main>;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  useRouteScrollReset(location);
  const modalOpen = location.pathname.startsWith('/photos/');
  return (
    <div>
      <nav style={NAV}>
        <Link id="to-explore" to="/explore">explore</Link>
        <Link id="to-blog" to="/blog">blog</Link>
        <Link id="to-collections" to="/collections">collections</Link>
        <button id="back" onClick={() => navigate(-1)}>back</button>
      </nav>
      {/* Mirrors App.tsx: the modal is layered over the still-mounted grid. */}
      {modalOpen ? <Explore /> : (
        <Routes>
          <Route path="/explore" element={<Explore />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/collections" element={<Collections />} />
        </Routes>
      )}
      {modalOpen && <Routes><Route path="/photos/:slug" element={<Photo />} /></Routes>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/blog']}><Shell /></MemoryRouter>);
`;

(async () => {
  const bundle = await esbuild.build({
    stdin: { resolveDir: root, loader: 'tsx', contents: FIXTURE },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{
      name: 'alias',
      setup(build) {
        build.onResolve({ filter: /^@\// }, args => {
          const base = path.join(root, 'src', args.path.slice(2));
          const candidates = [base, `${base}.ts`, `${base}.tsx`,
            path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
          const found = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
          return { path: found || base };
        });
      },
    }],
  });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(PAGE_HTML);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const results = [];

  const openPage = async (width) => {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.on('pageerror', error => console.error('pageerror', error.message));
    await page.goto(`${origin}/`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.locator('#to-blog').waitFor();
    return page;
  };

  try {
    for (const width of [390, 1440]) {
      // 1. Header-style tab navigation starts the new page at the top edge.
      const page = await openPage(width);
      await page.evaluate(() => window.scrollTo(0, 3000));
      assert.equal(await page.evaluate(() => scrollY), 3000);
      await page.locator('#to-collections').click();
      await page.waitForFunction(() => scrollY === 0);
      assert.equal(await page.evaluate(() => scrollY), 0, 'forward tab must start at top');

      await page.evaluate(() => window.scrollTo(0, 2500));
      await page.locator('#to-explore').click();
      await page.waitForFunction(() => scrollY === 0);
      assert.equal(await page.evaluate(() => scrollY), 0, 'second forward tab must start at top');
      results.push({ width, forwardTabsReset: true });
      await page.close();

      // 2. Back (POP) must not be forced to the top by our reset. MemoryRouter
      // does not restore history scroll, so assert on the calls we make.
      const backPage = await openPage(width);
      await backPage.locator('#to-collections').click();
      await backPage.waitForFunction(() => document.querySelector('#collections'));
      await backPage.evaluate(() => window.scrollTo(0, 1600));
      await backPage.locator('#to-explore').click();
      await backPage.waitForFunction(() => scrollY === 0);
      // Let the pending rAF pass of the forward navigation finish first.
      await backPage.waitForTimeout(150);
      await backPage.evaluate(() => {
        const original = window.scrollTo.bind(window);
        window.__scrollCalls = [];
        window.scrollTo = (...args) => { window.__scrollCalls.push(args); return original(...args); };
      });
      await backPage.locator('#back').click();
      await backPage.waitForFunction(() => document.querySelector('#collections'));
      await backPage.waitForTimeout(120);
      const forcedOnBack = await backPage.evaluate(() => window.__scrollCalls.length);
      assert.equal(forcedOnBack, 0, 'Back must not be forced to the top by the reset');
      results.push({ width, backNotForced: true });
      await backPage.close();

      // 3. Opening the photo modal must not pull its background page to the top.
      const modalPage = await openPage(width);
      await modalPage.locator('#to-explore').click();
      await modalPage.locator('#open-modal').waitFor();
      await modalPage.evaluate(() => window.scrollTo(0, 2200));
      await modalPage.locator('#open-modal').click();
      await modalPage.locator('#photo').waitFor();
      const modalScroll = await modalPage.evaluate(() => scrollY);
      assert.equal(modalScroll, 2200, 'modal entry must keep the background position');
      await modalPage.locator('#back').click();
      await modalPage.waitForFunction(() => document.querySelector('#explore'));
      const returnedScroll = await modalPage.evaluate(() => scrollY);
      assert.equal(returnedScroll, 2200, 'closing the modal must keep the grid position');
      results.push({ width, modalKeptBackground: true, modalCloseKeptGrid: true });
      await modalPage.close();

      // 4. A fresh document always starts at the top.
      const fresh = await openPage(width);
      assert.equal(await fresh.evaluate(() => scrollY), 0);
      await fresh.close();
      results.push({ width, freshTop: true });
    }
  } finally {
    await browser.close();
    server.close();
    const logDir = path.join(root, 'qa-policy-checkbox');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, 'route-scroll-reset-checks.json'), JSON.stringify(results, null, 2));
  }
  console.log(JSON.stringify(results));
})();
