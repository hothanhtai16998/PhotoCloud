/** One timer and one in-flight operation per scheduler, including async startup. */
export function createPeriodicTask({
  run,
  intervalMs,
  onError,
  setTimer = setInterval,
  clearTimer = clearInterval,
}) {
  let generation = 0;
  let timer = null;
  let running = false;

  async function tick(owner) {
    if (owner !== generation || running) return;
    running = true;
    try {
      await run();
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  }

  function stop() {
    generation++;
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  function start() {
    stop();
    const owner = generation;
    void tick(owner);
    void Promise.resolve()
      .then(() =>
        typeof intervalMs === 'function' ? intervalMs() : intervalMs
      )
      .then((interval) => {
        if (owner !== generation) return;
        if (
          !Number.isFinite(interval) ||
          interval < 1 ||
          interval > 2_147_483_647
        ) {
          throw new Error('Invalid periodic task interval');
        }
        timer = setTimer(() => {
          void tick(owner);
        }, interval);
        timer.unref?.();
      })
      .catch((error) => {
        if (owner === generation) onError(error);
      });
  }

  // stop prevents future runs; it does not cancel I/O already in progress.
  return { start, stop };
}
