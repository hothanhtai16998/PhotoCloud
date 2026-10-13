const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script id="reload-scroll-reset">([\s\S]*?)<\/script>/)[1];
for (const type of ['reload', 'navigate', 'back_forward']) {
  const calls = [];
  let onPageShow, frame;
  const history = { scrollRestoration: 'auto', state: { inlineModal: true, background: { pathname: '/' } } };
  vm.runInNewContext(script, {
    performance: { getEntriesByType: () => [{ type }] }, history,
    window: { scrollTo: options => calls.push(options), addEventListener: (event, fn, options) => { assert.equal(event, 'pageshow'); assert.equal(options.once, true); onPageShow = fn; } },
    requestAnimationFrame: fn => { frame = fn; },
  });
  if (type === 'reload') {
    assert.equal(history.scrollRestoration, 'manual');
    assert.equal(calls.length, 1);
    onPageShow(); frame();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].top, 0);
  } else {
    assert.equal(calls.length, 0);
    assert.equal(onPageShow, undefined);
  }
  assert.equal(history.scrollRestoration, 'auto');
  assert.equal(history.state.inlineModal, true);
  assert.equal(history.state.background.pathname, '/');
}
console.log('Passed: reload resets scroll; navigation, Back/Forward and modal state remain untouched.');
