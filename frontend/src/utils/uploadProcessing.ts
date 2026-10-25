/** Fixed workers await every item, including items started after the first wave. */
export async function runUploadBatch<T>(count: number, concurrency: number, run: (index: number) => Promise<T>): Promise<T[]> {
  if (concurrency < 1) throw new Error('Upload concurrency must be positive');
  const results = new Array<T>(count);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(count, concurrency) }, async () => {
    while (next < count) {
      const index = next++;
      results[index] = await run(index);
    }
  }));
  return results;
}

export async function waitForProcessedUpload<T extends { status?: string; success: boolean; image?: unknown; message?: string }>(
  read: () => Promise<T>, signal?: AbortSignal, timeoutMs = 300_000, intervalMs = 1500,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastNetworkError = false;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    let state: T | undefined;
    try { state = await read(); lastNetworkError = false; }
    catch (error) {
      signal?.throwIfAborted();
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      // Let the caller distinguish session errors from a transient disconnect.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) throw error;
      lastNetworkError = true;
    }
    signal?.throwIfAborted();
    if (state) {
      if (!state.success || state.status === 'failed') throw new Error(state.message || 'Không xử lý được ảnh. Vui lòng thử lại.');
      if (state.status === 'completed' && state.image) return state;
    }
    await new Promise<void>((resolve, reject) => {
      const finish = (): void => { signal?.removeEventListener('abort', abort); resolve(); };
      const timer = setTimeout(finish, intervalMs);
      const abort = (): void => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal?.reason); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
  throw new Error(lastNetworkError
    ? 'Chưa kiểm tra được kết quả do mất kết nối. Ảnh có thể vẫn đang xử lý; hãy kết nối lại và thử lại để kiểm tra.'
    : 'Ảnh vẫn đang được xử lý. Bạn có thể thử lại để kiểm tra cùng lượt đăng, không cần tải lại file.');
}
