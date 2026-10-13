/** Socket.IO is mounted on the HTTP API server, not its /api endpoint. */
export function socketServerUrl(apiBaseURL: string | undefined, pageOrigin: string): string {
  return new URL(apiBaseURL || '/api', pageOrigin).origin;
}
