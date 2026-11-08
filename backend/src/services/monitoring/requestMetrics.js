/** Request/error counts share one rolling window; memory is bounded by window seconds. */
export function createRequestMetrics({
  now = Date.now,
  windowMs = 300_000,
} = {}) {
  const buckets = new Map();
  function prune(time) {
    const cutoff = Math.floor((time - windowMs) / 1000);
    for (const second of buckets.keys())
      if (second <= cutoff) buckets.delete(second);
  }
  return {
    recordRequest(isError = false) {
      const time = now();
      prune(time);
      const second = Math.floor(time / 1000);
      const bucket = buckets.get(second) || { requests: 0, errors: 0 };
      bucket.requests++;
      if (isError) bucket.errors++;
      buckets.set(second, bucket);
    },
    getErrorRate() {
      prune(now());
      let requests = 0,
        errors = 0;
      for (const bucket of buckets.values()) {
        requests += bucket.requests;
        errors += bucket.errors;
      }
      return requests ? Math.round((errors / requests) * 10_000) / 100 : 0;
    },
  };
}
