import { getSessionItem, setSessionItem } from './safeStorage.ts';

const revisions = new Map<string, number>();

/** Version only the affected owner's image URLs after confirmed processing. */
export function markProcessedUpload(userId: string): void {
  const revision = Math.max(Date.now(), (getProcessedUploadRevision(userId) || 0) + 1);
  revisions.set(userId, revision);
  setSessionItem(`upload-revision:${userId}`, String(revision));
}

export function getProcessedUploadRevision(userId: string): number | undefined {
  const stored = Number(getSessionItem(`upload-revision:${userId}`));
  return revisions.get(userId) ?? (Number.isFinite(stored) && stored > 0 ? stored : undefined);
}
