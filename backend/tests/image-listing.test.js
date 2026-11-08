import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
let call,
  category = { _id: 'category-id' },
  images = [];
mock.module('../src/models/Category.js', {
  defaultExport: { findOne: async () => category },
});
mock.module('../src/services/search/imagePage.js', {
  namedExports: {
    fetchImagePage: async (query, sort, skip, limit) => {
      call = { query, sort, skip, limit };
      return [images, 4];
    },
  },
});
const { listImages } = await import('../src/services/search/imageListing.js');
test('image listing preserves search/filter/sort/pagination and serializes map fields', async () => {
  images = [
    {
      _id: 'a',
      imageCategory: { name: 'Travel', isActive: true },
      dailyViews: new Map([['today', 2]]),
    },
    { _id: 'b', imageCategory: null },
  ];
  const result = await listImages({
    page: '2',
    limit: '2',
    search: 'a+b',
    category: 'Travel',
    sortBy: 'views',
    order: 'asc',
    tags: 'red,blue',
    orientation: 'portrait',
    isoMin: '100',
  });
  assert.deepEqual(call.sort, { views: 1, createdAt: -1 });
  assert.equal(call.skip, 2);
  assert.equal(call.limit, 2);
  assert.equal(call.query.$and[0].imageCategory, 'category-id');
  assert.equal(call.query.$and[0].iso.$gte, 100);
  assert.equal(call.query.$and[0].$or[0].imageTitle.$regex.source, 'a\\+b');
  assert.equal(call.query.$and[0].tags.$all.length, 2);
  assert.deepEqual(result.images[0].dailyViews, { today: 2 });
  assert.deepEqual(result.images[0].dailyDownloads, {});
  assert.equal(result.images.length, 1);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 2,
    total: 4,
    pages: 2,
  });
  category = null;
  call = null;
  const empty = await listImages({ category: 'missing' });
  assert.equal(empty.missingCategory, true);
  assert.equal(call, null);
  assert.equal(empty.pagination.total, 0);
});
