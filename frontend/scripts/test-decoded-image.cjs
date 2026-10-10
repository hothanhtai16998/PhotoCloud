const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsMock = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/watchDecodedImage.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsMock });
const { watchDecodedImage } = exportsMock;
function photo({ complete = false, broken = false, rejectDecode = false } = {}) {
  const listeners = new Map();
  let resolve, reject;
  const decoded = new Promise((a,b) => { resolve = a; reject = b; });
  const image = {
    complete, naturalWidth: broken ? 0 : 1200, naturalHeight: broken ? 0 : 800,
    addEventListener: (event, callback) => listeners.set(event, callback),
    removeEventListener: (event, callback) => { if (listeners.get(event) === callback) listeners.delete(event); },
    decode: () => rejectDecode ? Promise.reject(new Error('decode rejected')) : decoded,
  };
  return { image, listeners, resolve, reject, emit: event => listeners.get(event)?.() };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
async function main() {
  let ready = 0, error = 0;
  const pending = photo();
  const dispose = watchDecodedImage(pending.image, () => ready++, () => error++);
  pending.emit('load');
  assert.equal(ready, 0, 'load must wait for decode');
  pending.emit('load');
  pending.resolve();
  await flush();
  assert.equal(ready, 1, 'duplicate load events must settle once');
  dispose();
  assert.equal(pending.listeners.size, 0);
  const obsolete = photo();
  const cancel = watchDecodedImage(obsolete.image, () => ready++, () => error++);
  obsolete.emit('load');
  cancel();
  obsolete.resolve();
  await flush();
  assert.equal(ready, 1, 'decode completion after navigation/unmount must be ignored');
  const failure = photo({ broken: true });
  watchDecodedImage(failure.image, () => ready++, () => error++);
  failure.emit('error');
  failure.emit('error');
  assert.equal(error, 1);
  const cached = photo({ complete: true });
  watchDecodedImage(cached.image, () => ready++, () => error++);
  cached.resolve();
  await flush();
  assert.equal(ready, 2, 'cached complete images must be detected without a new request');
  const decodeRejected = photo({ complete: true, rejectDecode: true });
  watchDecodedImage(decodeRejected.image, () => ready++, () => error++);
  await flush();
  assert.equal(ready, 3, 'drawable images survive browser decode rejection');
  const cachedError = photo({ complete: true, broken: true });
  watchDecodedImage(cachedError.image, () => ready++, () => error++);
  assert.equal(error, 2, 'cached failed loads must stop waiting');
  console.log('Decoded image: waiting, duplicate events, cache, errors, decode rejection and unmount passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
