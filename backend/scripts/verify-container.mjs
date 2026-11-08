// Runs inside the final image via stdin; does not need application credentials.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import bcrypt from 'bcrypt';

assert.notEqual(process.getuid(), 0, 'Container must run non-root');
assert.equal(process.cwd(), '/app/backend');
for (const file of ['src/server.js', '../frontend/dist/index.html', '../shared/sitePalette.json']) {
  assert.ok(existsSync(file), `Missing runtime file: ${file}`);
}
assert.ok(readFileSync('../frontend/dist/index.html', 'utf8').includes('/assets/'));
assert.doesNotThrow(() => JSON.parse(readFileSync('../shared/sitePalette.json', 'utf8')));
const forbidden = new Set(['tests', 'scripts', 'coverage', '.git', '.npm', '.npmrc']);
function checkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    assert.ok(!forbidden.has(entry.name) && !entry.name.startsWith('.env'), `Unexpected file: ${dir}/${entry.name}`);
    if (entry.isDirectory() && entry.name !== 'node_modules') checkFiles(`${dir}/${entry.name}`);
  }
}
checkFiles('/app');
const require = createRequire('/app/backend/package.json');
for (const dependency of ['nodemon', 'prettier', 'cross-env']) {
  assert.throws(() => require.resolve(dependency), { code: 'MODULE_NOT_FOUND' });
}
const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
assert.equal((await sharp(png).metadata()).width, 2);
assert.ok(await bcrypt.compare('container-smoke', await bcrypt.hash('container-smoke', 4)));
console.log('PASS: non-root, runtime assets, no secrets/dev tools, sharp and bcrypt');
