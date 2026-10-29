/**
 * Verifies the restructured backend:
 *  1. every relative import specifier resolves to a real file
 *  2. every `new URL(..., import.meta.url)` asset path resolves
 *  3. every compatibility shim exposes the same export names as its target
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const BACKEND = 'C:/Users/Fenn/Desktop/PhotoCloud/backend';
const norm = (p) => p.replace(/\\/g, '/');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js') || p.endsWith('.mjs')) out.push(norm(p));
  }
  return out;
}

const files = [].concat(
  walk(join(BACKEND, 'src')),
  walk(join(BACKEND, 'tests')),
  walk(join(BACKEND, 'scripts')),
).filter((f) => !f.includes('/node_modules/'))
  // Helper scripts embed shim templates as string literals; those are not imports.
  .filter((f) => !/[/\\]_[^/\\]+\.mjs$/.test(f));

let problems = 0;

// ---- 1. relative import specifiers -----------------------------------------
const SPEC_RE = /(['"])((?:\.\.?\/)[^'"\n]*?\.js)\1/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(SPEC_RE)) {
    const target = norm(resolve(dirname(f), m[2]));
    if (!existsSync(target)) {
      console.log(`BROKEN IMPORT  ${f.replace(BACKEND + '/', '')}  ->  ${m[2]}`);
      problems++;
    }
  }
}

// ---- 2. new URL(..., import.meta.url) asset paths ---------------------------
const URL_RE = /new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(URL_RE)) {
    const target = norm(resolve(dirname(f), m[1]));
    if (!existsSync(target)) {
      console.log(`BROKEN ASSET   ${f.replace(BACKEND + '/', '')}  ->  ${m[1]}`);
      problems++;
    }
  }
}

// ---- 3. shim export parity --------------------------------------------------
function exportNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:const|async function|function|let|var|class)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim();
      if (n) names.add(n);
    }
  }
  if (/^export\s+default\b/m.test(src)) names.add('default');
  return names;
}

const SHIM_RE = /^\/\/ Compatibility re-export\.[\s\S]*?export\s+\*\s+from\s+'([^']+)';/m;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const m = src.match(SHIM_RE);
  if (!m) continue;
  const targetAbs = norm(resolve(dirname(f), m[1]));
  if (!existsSync(targetAbs)) {
    console.log(`SHIM TARGET MISSING  ${f.replace(BACKEND + '/', '')}  ->  ${m[1]}`);
    problems++;
    continue;
  }
  const shimNames = exportNames(src);
  const targetNames = exportNames(readFileSync(targetAbs, 'utf8'));
  // `export * from` re-exports every named export; only `default` needs to be
  // re-exported explicitly.
  const reExportsAll = /export\s+\*\s+from/.test(src);
  for (const n of targetNames) {
    if (n === 'default') {
      if (!shimNames.has('default')) {
        console.log(`SHIM MISSING DEFAULT  ${f.replace(BACKEND + '/', '')}`);
        problems++;
      }
      continue;
    }
    if (reExportsAll) continue;
    if (!shimNames.has(n)) {
      console.log(`SHIM MISSING EXPORT  ${f.replace(BACKEND + '/', '')}  ->  ${n}`);
      problems++;
    }
  }
}

console.log(problems === 0 ? 'OK: 0 problems' : `${problems} problem(s) found`);
