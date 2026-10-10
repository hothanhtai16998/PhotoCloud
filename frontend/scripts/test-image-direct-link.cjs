const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../backend/src/controllers/image/imageCRUDController.js'), 'utf8');
const code = source.slice(source.indexOf('export const getImageById'), source.indexOf('// Download image -')).replace('export const', 'const') + '\nhandler = getImageById;';
let query, result = [], reads = 0;
const context = { asyncHandler: fn => fn, Image: { find: value => {
  reads++; query = value;
  const chain = { limit: n => { assert.equal(n, 2); return chain; }, populate: () => chain, lean: async () => result };
  return chain;
} } };
vm.runInNewContext(code, context);
async function request(id) {
  const response = { code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
  await context.handler({ params: { imageId: id } }, response);
  return response;
}
(async () => {
  assert.equal((await request('bad')).code, 400);
  assert.equal(reads, 0);
  const image = { _id: 'abcdef123456abcdef123456', imageTitle: 'Old photo' };
  result = [image];
  assert.equal((await request('ABCDEF123456')).body.image, image);
  assert.equal(query.$expr.$eq[1], 'abcdef123456');
  assert.equal(query.$expr.$eq[0].$substrBytes[1], 12);
  assert.equal(query.$or[0].moderationStatus, 'approved');
  await request(image._id);
  assert.equal(query._id, image._id);
  assert.equal(query.$expr, undefined);
  result = [];
  assert.equal((await request('abcdef123456')).code, 404);
  result = [image, { _id: '000000000000abcdef123456' }];
  assert.equal((await request('abcdef123456')).code, 409);
  const routes = fs.readFileSync(path.join(__dirname, '../../backend/src/routes/imageRoute.js'), 'utf8');
  assert.ok(routes.includes("router.get('/by-id/:imageId', getImageById)"));
  console.log('Direct image lookup: validation, public visibility, short/full IDs, missing and ambiguous IDs passed (no database).');
})().catch(error => { console.error(error); process.exitCode = 1; });
