import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestQueue } from '../src/middlewares/requestQueue.js';
test('request slots release once when both finish and close fire, preserving queued concurrency', () => {
  const entered = [],
    responses = [];
  for (let i = 0; i < 5; i++) {
    const res = new EventEmitter();
    responses.push(res);
    requestQueue(
      { method: 'GET', path: '/images', ip: 'fixture-queue-test' },
      res,
      () => entered.push(i)
    );
  }
  assert.deepEqual(entered, [0, 1, 2]);
  responses[0].emit('finish');
  assert.deepEqual(entered, [0, 1, 2, 3]);
  responses[0].emit('close');
  assert.deepEqual(entered, [0, 1, 2, 3]);
  responses[1].emit('finish');
  assert.deepEqual(entered, [0, 1, 2, 3, 4]);
  for (const res of responses) {
    res.emit('finish');
    res.emit('close');
  }
});

test('waiting requests detach their close listener on admission and cancellation', () => {
  const ip = 'fixture-queue-listeners';
  const entered = [],
    responses = [];
  for (let i = 0; i < 5; i++) {
    const res = new EventEmitter();
    responses.push(res);
    requestQueue({ method: 'GET', path: '/images', ip }, res, () =>
      entered.push(i)
    );
  }
  assert.equal(responses[3].listenerCount('close'), 1);
  responses[4].emit('close'); // Cancel a waiter before admission.
  responses[0].emit('finish');
  assert.deepEqual(entered, [0, 1, 2, 3]);
  assert.equal(responses[3].listenerCount('close'), 1); // Active listener only, no waiting listener.
  for (const res of responses) {
    res.emit('finish');
    res.emit('close');
  }
  assert.equal(responses[3].listenerCount('close'), 0);
});

test('waiting timeout is enforced while all active slots remain occupied', async () => {
  const ip = 'fixture-queue-timeout',
    responses = [];
  let entered = 0;
  for (let i = 0; i < 4; i++) {
    const res = new EventEmitter();
    res.status = function (code) {
      this.code = code;
      return this;
    };
    res.json = function () {
      this.writableEnded = true;
      return this;
    };
    responses.push(res);
    requestQueue({ method: 'GET', path: '/images', ip }, res, () => entered++);
  }
  const originalNow = Date.now;
  try {
    const future = originalNow() + 31_000;
    Date.now = () => future;
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(entered, 3);
    assert.equal(responses[3].code, 429);
    assert.equal(responses[3].listenerCount('close'), 0);
  } finally {
    Date.now = originalNow;
    for (const res of responses) {
      res.emit('finish');
      res.emit('close');
    }
  }
});
