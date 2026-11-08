import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestMetrics } from '../src/services/monitoring/requestMetrics.js';
import { getStorageStatus } from '../src/services/monitoring/systemMetrics.js';

test('error rate uses requests and errors from the same window, expires idle data and stays bounded', () => {
  let time = 1_000_000;
  const metrics = createRequestMetrics({ now: () => time });
  assert.equal(metrics.getErrorRate(), 0);
  for (let i = 0; i < 100; i++) metrics.recordRequest(i < 10);
  assert.equal(metrics.getErrorRate(), 10);
  time += 301_000;
  assert.equal(metrics.getErrorRate(), 0);
  metrics.recordRequest(true);
  assert.equal(metrics.getErrorRate(), 100);
  metrics.recordRequest(false);
  assert.equal(metrics.getErrorRate(), 50);
  time += 300_000;
  assert.equal(metrics.getErrorRate(), 0);
});

test('storage status does not claim a connection without a probe', () => {
  assert.equal(getStorageStatus(), 'unknown');
});
