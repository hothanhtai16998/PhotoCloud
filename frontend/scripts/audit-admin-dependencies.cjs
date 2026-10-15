// Read-only dependency audit. Never deletes files automatically.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourceRoot = path.resolve(__dirname, '../src');
const projectRoot = path.resolve(__dirname, '..');
const config = ts.readConfigFile(path.join(projectRoot, 'tsconfig.app.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot);

function resolveImport(name, importer) {
  const resolved = ts.resolveModuleName(name, importer, parsed.options, ts.sys).resolvedModule;
  if (resolved) return resolved.resolvedFileName;
  if (!name.startsWith('.') && !name.startsWith('@/')) return null;
  const base = name.startsWith('@/')
    ? path.join(sourceRoot, name.slice(2))
    : path.resolve(path.dirname(importer), name);
  return [base, `${base}.ts`, `${base}.tsx`, `${base}.css`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
    .find(file => fs.existsSync(file) && fs.statSync(file).isFile());
}

function dependencies(entry) {
  const seen = new Set();
  function visit(input) {
    const file = path.resolve(input);
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    // Handles static imports, re-exports, literal dynamic imports and CSS imports.
    // Generated/nonliteral module loading must be checked manually before removal.
    const imports = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\brequire\s*\(\s*|@import\s*)['"]([^'"]+)['"]/g);
    for (const match of imports) {
      const target = resolveImport(match[1], file);
      if (target && path.resolve(target).startsWith(sourceRoot + path.sep)) visit(target);
    }
  }
  visit(entry);
  return seen;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

const reachable = dependencies(path.join(sourceRoot, 'main.tsx'));
const unusedAdmin = walk(path.join(sourceRoot, 'pages/admin')).filter(file => !reachable.has(file));
for (const file of unusedAdmin) console.log('UNREACHABLE', path.relative(sourceRoot, file));
console.log(`Admin files unreachable from main.tsx: ${unusedAdmin.length}`);

const target = process.argv[2] || 'pages/ExplorePage.tsx';
const targetPath = path.resolve(sourceRoot, target);
const exploreFiles = dependencies(targetPath);
let oversizedCount = 0;
for (const file of exploreFiles) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  if (lines > 1000) {
    oversizedCount++;
    console.log('OVER_1000', lines, path.relative(sourceRoot, file));
  }
}
console.log(`${target} dependency files over 1000 lines: ${oversizedCount}`);
console.log(target + ':', fs.readFileSync(targetPath, 'utf8').split('\n').length, 'lines');
