const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/utils/removeDevServiceWorker.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

(async () => {
  let reloads = 0; let removed = 0; let otherRemoved = 0;
  const appWorker = { scriptURL: 'http://localhost:5173/sw.js' };
  const serviceWorker = { controller: appWorker, getRegistrations: async () => [
    { active: appWorker, unregister: async () => { removed++; return true; } },
    { active: { scriptURL: 'http://localhost:5173/other-sw.js' }, unregister: async () => { otherRemoved++; } },
  ] };
  const exports = {};
  vm.runInNewContext(source, { exports, URL, location: { origin: 'http://localhost:5173' }, navigator: { serviceWorker },
    require: () => ({ reloadImmediately: () => { reloads++; } }),
  });
  await exports.removeDevServiceWorker();
  assert.equal(removed, 1); assert.equal(otherRemoved, 0); assert.equal(reloads, 1);
  serviceWorker.controller = null;
  serviceWorker.getRegistrations = async () => [];
  await exports.removeDevServiceWorker();
  assert.equal(reloads, 1, 'Fresh uncontrolled page must not reload again');
  serviceWorker.controller = appWorker;
  await exports.removeDevServiceWorker();
  assert.equal(reloads, 2, 'Already unregistered worker still controlling a document requires reload');
  console.log('PASS dev worker recovery: release controlled page, no loop after reload, preserve unrelated workers');
})().catch(error => { console.error(error); process.exitCode = 1; });
