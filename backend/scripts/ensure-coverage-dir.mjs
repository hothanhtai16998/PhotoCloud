/**
 * Creates the `coverage/` directory before the lcov reporter writes into it.
 *
 * The directory is gitignored, so it is missing on a fresh clone and on CI
 * runners. Node's lcov reporter does not create the destination directory
 * itself and fails with ENOENT when it is absent.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coverageDir = resolve(backendRoot, 'coverage');

try {
	mkdirSync(coverageDir, { recursive: true });
} catch (error) {
	console.error(`Could not create coverage directory at ${coverageDir}:`, error.message);
	process.exit(1);
}
