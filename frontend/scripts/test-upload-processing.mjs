import test from 'node:test';
import assert from 'node:assert/strict';
import { runUploadBatch, waitForProcessedUpload } from '../src/utils/uploadProcessing.ts';
import { markProcessedUpload, getProcessedUploadRevision } from '../src/utils/uploadRefresh.ts';

test('confirmed uploads invalidate only that owner’s profile cache and each completion changes its revision', () => {
  assert.equal(getProcessedUploadRevision('owner'), undefined);
  markProcessedUpload('owner');
  const first = getProcessedUploadRevision('owner');
  markProcessedUpload('owner');
  assert.ok(getProcessedUploadRevision('owner') > first);
  assert.equal(getProcessedUploadRevision('other'), undefined);
});

test('batch waits for all ten uploads, including slow later waves, and caps concurrency', async () => {
  let active = 0, peak = 0;
  const result = await runUploadBatch(10, 3, async index => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, index > 2 ? 20 : 1));
    active--;
    return index;
  });
  assert.deepEqual(result, Array.from({ length: 10 }, (_, i) => i));
  assert.equal(active, 0);
  assert.equal(peak, 3);
});

test('accepted and processing responses never count as success', async () => {
  const states = [{ success: true, status: 'queued' }, { success: true, status: 'processing' },
    { success: true, status: 'completed', image: { _id: 'real-image', moderationStatus: 'pending' } }];
  let calls = 0;
  const result = await waitForProcessedUpload(async () => states[calls++], undefined, 1000, 1);
  assert.equal(calls, 3);
  assert.equal(result.image._id, 'real-image');
});

test('temporary disconnection is retried, terminal processing failure is not success', async () => {
  let calls = 0;
  const result = await waitForProcessedUpload(async () => {
    if (++calls === 1) throw new Error('network');
    return { success: true, status: 'completed', image: { _id: 'same-upload' } };
  }, undefined, 1000, 1);
  assert.equal(result.image._id, 'same-upload');
  await assert.rejects(waitForProcessedUpload(async () => ({ success: true, status: 'failed', message: 'Ảnh lỗi' }), undefined, 1000, 1), /Ảnh lỗi/);
});

test('timeout retains an uncertain outcome, and abort/session changes stop polling', async () => {
  await assert.rejects(waitForProcessedUpload(async () => ({ success: true, status: 'processing' }), undefined, 10, 1), /vẫn đang được xử lý/);
  const controller = new AbortController();
  let calls = 0;
  const pending = waitForProcessedUpload(async () => { calls++;return { success: true, status: 'queued' }; }, controller.signal);
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(pending);
  assert.equal(calls, 1);
  await assert.rejects(waitForProcessedUpload(async () => { throw new DOMException('Session changed', 'AbortError'); }), /Session changed/);
});
