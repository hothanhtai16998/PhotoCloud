import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeriodicTask } from '../src/services/lifecycle/periodicTask.js';
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function harness(run, intervalMs = 1000) {
  const timers = new Map(),
    errors = [];
  let counter = 0;
  const task = createPeriodicTask({
    run,
    intervalMs,
    onError: (error) => errors.push(error),
    setTimer: (fn) => {
      const id = ++counter;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  return { task, timers, errors };
}

test('stop during asynchronous startup prevents a late timer; restarting keeps only the newest timer', async () => {
  const startup = deferred();
  let runs = 0;
  const h = harness(
    async () => runs++,
    () => startup.promise
  );
  h.task.start();
  h.task.stop();
  startup.resolve(1000);
  await flush();
  assert.equal(h.timers.size, 0);
  assert.equal(runs, 1);
  h.task.start();
  h.task.start();
  await flush();
  assert.equal(h.timers.size, 1);
  const oldTick = [...h.timers.values()][0];
  h.task.stop();
  oldTick();
  await flush();
  assert.equal(h.timers.size, 0);
});

test('slow tasks do not overlap across ticks or restarts; errors release the running guard', async () => {
  const pending = deferred();
  let runs = 0;
  const h = harness(() => {
    runs++;
    return runs === 1 ? pending.promise : Promise.reject(new Error('fixture'));
  });
  h.task.start();
  await flush();
  const tick = [...h.timers.values()][0];
  tick();
  h.task.start();
  await flush();
  assert.equal(runs, 1);
  pending.resolve();
  await flush();
  [...h.timers.values()][0]();
  await flush();
  assert.equal(runs, 2);
  assert.equal(h.errors.length, 1);
  [...h.timers.values()][0]();
  await flush();
  assert.equal(runs, 3);
  h.task.stop();
});

test('invalid intervals and failed setup are reported without leaving a timer', async () => {
  for (const interval of [
    0,
    -1,
    NaN,
    Infinity,
    2_147_483_648,
    () => Promise.reject(new Error('settings')),
  ]) {
    const h = harness(async () => {}, interval);
    h.task.start();
    await flush();
    assert.equal(h.timers.size, 0);
    assert.equal(h.errors.length, 1);
    h.task.stop();
  }
});
