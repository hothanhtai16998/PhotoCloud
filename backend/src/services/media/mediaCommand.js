import { execFile } from 'node:child_process';

/** Execute a media tool without a shell; Node owns timeout cleanup and child termination. */
export function runMediaCommand(file, args, timeout = 300_000) {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { timeout, killSignal: 'SIGKILL', windowsHide: true },
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      }
    );
  });
}
