import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import sharp from 'sharp';
let fail = false;
mock.module('../src/services/media/colorExtractor.js', {
  namedExports: {
    extractDominantColors: async () => {
      if (fail) throw new Error('fixture');
      return ['red'];
    },
  },
});
mock.module('../src/services/media/exifExtractor.js', {
  namedExports: {
    extractExifData: async () => {
      if (fail) throw new Error('fixture');
      return { cameraMake: 'fixture' };
    },
  },
});
const { extractImageMetadata } =
  await import('../src/services/media/imageMetadata.js');
test('shared metadata keeps direct-upload shape, optional dimensions and independent failure fallbacks', async () => {
  const input = await sharp({
    create: { width: 40, height: 20, channels: 3, background: 'red' },
  })
    .png()
    .toBuffer();
  const full = await extractImageMetadata(input);
  assert.deepEqual(full, {
    dominantColors: ['red'],
    exifData: { cameraMake: 'fixture' },
    dimensions: { width: 40, height: 20 },
  });
  const direct = await extractImageMetadata(input, {
    includeDimensions: false,
  });
  assert.deepEqual(direct, {
    dominantColors: ['red'],
    exifData: { cameraMake: 'fixture' },
  });
  fail = true;
  assert.deepEqual(await extractImageMetadata(input), {
    dominantColors: [],
    exifData: {},
    dimensions: { width: 40, height: 20 },
  });
});
