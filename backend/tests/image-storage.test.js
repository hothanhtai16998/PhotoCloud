import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import sharp from 'sharp';
let uploads = [],
  fail = false;
mock.module('../src/services/storage/r2Objects.js', {
  namedExports: {
    uploadToR2: async (buffer, key, type) => {
      if (fail) throw new Error('fixture failure');
      uploads.push({ buffer, key, type });
      return 'https://fixture/' + key;
    },
  },
});
const { uploadImageWithSizes, generateAvifFormats } =
  await import('../src/services/storage/imageStorage.js');
const { uploadAvatar } =
  await import('../src/services/storage/mediaStorage.js');
test('image storage preserves original bytes, variant keys, pending AVIF and avatar output', async () => {
  const original = await sharp({
    create: { width: 40, height: 20, channels: 3, background: 'blue' },
  })
    .png()
    .toBuffer();
  const result = await uploadImageWithSizes(
    original,
    'folder',
    'fixture',
    'image/png'
  );
  assert.equal(result.imageUrl, 'https://fixture/folder/fixture-original.png');
  assert.equal(
    result.thumbnailUrl,
    'https://fixture/folder/fixture-thumbnail.webp'
  );
  assert.equal(result.avifPending, true);
  assert.equal(result.imageAvifUrl, null);
  assert.deepEqual(
    uploads.find((x) => x.key.endsWith('-original.png')).buffer,
    original
  );
  assert.equal(uploads.length, 5);
  assert.match(result.base64Thumbnail, /^data:image\/png;base64,/);
  const avatar = await uploadAvatar(original, 'avatars', 'fixture');
  assert.deepEqual(avatar, {
    publicId: 'avatars/fixture',
    avatarUrl: 'https://fixture/avatars/fixture.webp',
  });
  const dimensions = await sharp(uploads.at(-1).buffer).metadata();
  assert.equal(dimensions.width, 200);
  assert.equal(dimensions.height, 200);
  fail = true;
  const optional = await generateAvifFormats(original, 'folder', 'fixture');
  assert.deepEqual(optional, {
    imageAvifUrl: null,
    thumbnailAvifUrl: null,
    smallAvifUrl: null,
    regularAvifUrl: null,
  });
});
