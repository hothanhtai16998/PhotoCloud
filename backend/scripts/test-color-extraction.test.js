import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { extractDominantColorsAdvanced } from '../src/utils/colorExtractorAdvanced.js';
import { extractDominantColors } from '../src/utils/colorExtractor.js';

const solid = background => sharp({ create: { width: 40, height: 40, channels: 3, background } }).png().toBuffer();

for (const mode of ['fast', 'accurate']) {
    test(`advanced extraction identifies solid colors in ${mode} mode`, async () => {
        for (const [background, expected] of [
            [{ r: 255, g: 0, b: 0 }, 'red'],
            [{ r: 0, g: 255, b: 0 }, 'green'],
            [{ r: 0, g: 100, b: 255 }, 'blue'],
            [{ r: 255, g: 255, b: 255 }, 'white'],
        ]) {
            assert.deepEqual(await extractDominantColorsAdvanced(await solid(background), 3, mode), [expected]);
        }
    });
}

test('advanced extraction preserves both colors in a two-color image', async () => {
    const pixels = Buffer.alloc(40 * 40 * 3);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
        pixels[(y * 40 + x) * 3 + (x < 20 ? 0 : 1)] = 255;
    }
    const image = await sharp(pixels, { raw: { width: 40, height: 40, channels: 3 } }).png().toBuffer();
    assert.deepEqual((await extractDominantColorsAdvanced(image, 2)).sort(), ['green', 'red']);
});

test('public extraction entry supports advanced and simple modes', async () => {
    const image = await solid({ r: 255, g: 0, b: 0 });
    for (const mode of [true, 'accurate', false]) {
        assert.deepEqual(await extractDominantColors(image, 3, mode), ['red']);
    }
    assert.deepEqual(await extractDominantColorsAdvanced(await solid({ r: 0, g: 0, b: 0 })), []);
});
