import test from 'node:test';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runMediaCommand } from '../src/services/media/mediaCommand.js';
import { withMediaTempDirectory } from '../src/services/media/mediaTempFiles.js';
import { createBlurThumbnail } from '../src/services/media/blurThumbnail.js';
import sharp from 'sharp';

test('media command keeps arguments literal, reports failures and terminates a timed-out child', async () => {
  const literal = 'a b; $(echo unexpected) "quoted"';
  const { stdout } = await runMediaCommand(process.execPath, [
    '-e',
    'console.log(process.argv[1])',
    literal,
  ]);
  assert.equal(stdout.trim(), literal);
  await assert.rejects(
    runMediaCommand(process.execPath, ['-e', 'process.exit(7)']),
    (e) => e.code === 7
  );
  await assert.rejects(
    runMediaCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], 100),
    (e) => e.killed === true
  );
});
test('temporary media directories are unique and removed on success and failure', async () => {
  const paths = [];
  await Promise.all(
    [1, 2].map(() =>
      withMediaTempDirectory(async (dir) => {
        paths.push(dir);
        await writeFile(join(dir, 'fixture'), 'test');
      })
    )
  );
  assert.notEqual(paths[0], paths[1]);
  let failedPath;
  await assert.rejects(
    withMediaTempDirectory(async (dir) => {
      failedPath = dir;
      throw new Error('fixture');
    }),
    /fixture/
  );
  for (const path of [...paths, failedPath]) await assert.rejects(access(path));
});
test('blur thumbnail preserves ratio and never enlarges a small image', async () => {
  for (const [width, height, expected] of [
    [80, 40, [20, 10]],
    [5, 3, [5, 3]],
  ]) {
    const input = await sharp({
      create: { width, height, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const uri = await createBlurThumbnail(input);
    assert.ok(uri.startsWith('data:image/png;base64,'));
    const metadata = await sharp(
      Buffer.from(uri.split(',')[1], 'base64')
    ).metadata();
    assert.deepEqual([metadata.width, metadata.height], expected);
  }
});
