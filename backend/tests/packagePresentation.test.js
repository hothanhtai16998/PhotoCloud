import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePackagePresentation, readPackagePresentation } from '../src/utils/packagePresentation.js';
test('legacy clients preserve optional content', () => {
    assert.equal(validatePackagePresentation({}), null);
    assert.deepEqual(readPackagePresentation({ name: 'existing' }), {});
});
test('empty media is supported, entered content roundtrips', () => {
    const body = { detailDescription: '  Tiếng Việt\nChi tiết  ', coverUrl: '', includes: [' Tư vấn '], gallery: ['https://example.com/photo.avif'] };
    assert.equal(validatePackagePresentation(body), null);
    assert.deepEqual(readPackagePresentation(body), { ...body, detailDescription: 'Tiếng Việt\nChi tiết', includes: ['Tư vấn'] });
});
test('reject unsafe URLs, duplicates and oversized content', () => {
    for (const body of [{coverUrl:'javascript:alert(1)'},{gallery:['http://example.com/a']},{coverUrl:'https://u:pass@example.com/a'},{gallery:['https://example.com/a','https://example.com/a']},{includes:['']},{includes:Array(21).fill('a')},{gallery:Array(13).fill('https://example.com/a')},{detailDescription:'x'.repeat(5001)},{includes:[{}]},{gallery:'https://example.com/a'}]) assert.ok(validatePackagePresentation(body), JSON.stringify(body).slice(0,100));
});
