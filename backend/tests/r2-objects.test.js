import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let commands = [],
  fail = false;
mock.module('../src/config/r2Client.js', {
  namedExports: {
    r2Client: {
      send: async (command) => {
        commands.push(command.input);
        if (fail) throw new Error('fixture storage failure');
        return { Body: 'stream', ContentLength: 7 };
      },
    },
  },
});
mock.module('../src/config/env.js', {
  namedExports: {
    env: {
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://images.example.test',
    },
  },
});
const objects = await import('../src/services/storage/r2Objects.js');
test('R2 object service retains keys, content types, public URLs and error propagation', async () => {
  assert.equal(
    await objects.uploadToR2(Buffer.from('x'), 'folder/file.png', 'image/png'),
    'https://images.example.test/folder/file.png'
  );
  assert.equal(commands[0].Bucket, 'test-bucket');
  assert.equal(commands[0].CacheControl, 'public, max-age=31536000, immutable');
  const image = await objects.getImageFromR2(
    'https://images.example.test/folder/file.png'
  );
  assert.equal(image.ContentType, 'image/webp');
  assert.equal(commands[1].Key, 'folder/file.png');
  await objects.getObjectFromR2('raw-key');
  assert.equal(commands[2].Key, 'raw-key');
  await objects.deleteObjectByKey('raw-key');
  assert.equal(commands[3].Key, 'raw-key');
  fail = true;
  await assert.rejects(
    objects.uploadToR2(Buffer.from('x'), 'key', 'image/png'),
    /Failed to upload to R2/
  );
});
