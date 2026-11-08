import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** Each operation owns its temporary directory, including failures and concurrent calls. */
export async function withMediaTempDirectory(operation) {
  const directory = await mkdtemp(join(tmpdir(), 'photocloud-media-'));
  try {
    return await operation(directory);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
  }
}
