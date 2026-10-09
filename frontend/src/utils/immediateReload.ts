let immediateReloadPending = false;

/** Reload for a setting change without the manual refresh delay. */
export function reloadImmediately(): void {
  immediateReloadPending = true;
  window.location.reload();
}

export function consumeImmediateReload(): boolean {
  const pending = immediateReloadPending;
  immediateReloadPending = false;
  return pending;
}
