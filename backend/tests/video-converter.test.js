import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { writeFile, access } from 'node:fs/promises';
let fail = false,
  inputs = [],
  uploads = [];
mock.module('../src/services/media/mediaCommand.js', {
  namedExports: {
    runMediaCommand: async (tool, args) => {
      if (args[0] === '-version') return { stdout: '' };
      inputs.push(args[args.indexOf('-i') + 1] || args.at(-1));
      if (fail) throw new Error('fixture timeout');
      if (tool === 'ffmpeg')
        await writeFile(args.at(-1), Buffer.from('converted-fixture'));
      return { stdout: '12.5' };
    },
  },
});
mock.module('../src/services/storage/r2Objects.js', {
  namedExports: {
    uploadToR2: async (buffer, key) => {
      uploads.push(key);
      return 'https://test/' + key;
    },
  },
});
const video = await import('../src/services/media/videoConverter.js');
test('video processing retains results, size limits and fallbacks, and cleans workspaces', async () => {
  assert.equal(await video.convertGifToVideo(Buffer.alloc(1), 'small'), null);
  const result = await video.convertGifToVideo(
    Buffer.alloc(2 * 1024 * 1024),
    'filename',
    'folder'
  );
  assert.deepEqual(result, {
    videoUrl: 'https://test/folder/filename.mp4',
    thumbnailUrl: 'https://test/folder/filename-thumb.jpg',
    duration: 12.5,
  });
  assert.equal(
    await video.generateVideoThumbnail(Buffer.from('x'), 'filename', 'folder'),
    'https://test/folder/filename-thumb.jpg'
  );
  assert.equal(await video.getVideoDuration(Buffer.from('x')), 12.5);
  fail = true;
  assert.equal(await video.getVideoDuration(Buffer.from('x')), null);
  for (const path of inputs) await assert.rejects(access(path));
});
