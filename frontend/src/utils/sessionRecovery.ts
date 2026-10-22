interface Failure {
  code?: string;
  name?: string;
  response?: { status?: number; data?: { errorCode?: string }; headers?: Record<string, unknown> };
}
const failure = (error: unknown): Failure => typeof error === 'object' && error !== null ? error as Failure : {};

export function isSessionRejected(error: unknown): boolean {
  const { response } = failure(error);
  const code = response?.data?.errorCode;
  return (response?.status === 401 || response?.status === 403) && !(typeof code === 'string' && code.startsWith('CSRF_'));
}

export function isSessionCancelled(error: unknown): boolean {
  const value = failure(error);
  return value.code === 'ERR_CANCELED' || value.name === 'CanceledError';
}

// Two automatic retries. A long server cooldown requires an explicit later retry.
export function sessionRetryDelay(error: unknown, attempt: number): number | null {
  if (attempt >= 2 || isSessionCancelled(error)) return null;
  const header = failure(error).response?.headers?.['retry-after'];
  if (typeof header === 'string' || typeof header === 'number') {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(String(header)) - Date.now();
    if (Number.isFinite(delay)) return delay > 5000 ? null : Math.max(300, delay);
  }
  return [300, 900][attempt];
}
