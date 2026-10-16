const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useHeaderSurface.ts'), 'utf8');
function mount(heroHeight = 0, route = '/photos/example') {
  let frame, cleanup;
  const events = new Map();
  const header = { dataset: {}, offsetHeight: 80 };
  const band = { getBoundingClientRect: () => ({ top: 80 - context.window.scrollY, height: heroHeight }) };
  const observer = class { observe() {} unobserve() {} disconnect() {} };
  const context = {
    exports: {}, require: () => ({ useLayoutEffect: fn => { cleanup = fn(); } }),
    document: { querySelector: selector => selector === '.PHOTOCLOUD-header' ? header : selector === '.homepage .hero-section' ? (heroHeight ? band : null) : selector.startsWith('.explore-hero') ? null : band, getElementById: () => ({}) },
    MutationObserver: observer, ResizeObserver: observer,
    requestAnimationFrame: fn => { frame = fn; return 1; }, cancelAnimationFrame: () => {},
    getComputedStyle: () => ({ backgroundSize: 'auto', backgroundImage: 'none' }),
    window: { scrollY: 0, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  context.exports.useHeaderSurface(route);
  const flush = () => { const pending = frame; frame = null; pending?.(); };
  flush();
  return { header, events, cleanup, scroll: y => { context.window.scrollY = y; events.get('scroll')?.(); flush(); } };
}
const photo = mount();
assert.equal(photo.header.dataset.surface ?? 'heading', 'heading');
for (let i = 0; i < 3; i++) {
  photo.scroll(120); assert.equal(photo.header.dataset.surface, 'canvas');
  photo.scroll(0); assert.equal(photo.header.dataset.surface, 'heading');
}
photo.cleanup(); assert.equal(photo.events.size, 0);
const hero = mount(400, '/');
hero.scroll(200); assert.equal(hero.header.dataset.surface ?? 'heading', 'heading');
hero.scroll(404); assert.equal(hero.header.dataset.surface, 'canvas');
hero.scroll(399); assert.equal(hero.header.dataset.surface, 'canvas');
hero.scroll(396); assert.equal(hero.header.dataset.surface, 'heading');
const admin = mount(0, '/admin/images');
assert.equal(admin.header.dataset.surface, 'canvas');
assert.equal(admin.events.size, 0);
admin.cleanup(); assert.equal(admin.header.dataset.surface, undefined);
console.log('Header surface: repeated top restoration, hero hysteresis, admin and cleanup passed.');
