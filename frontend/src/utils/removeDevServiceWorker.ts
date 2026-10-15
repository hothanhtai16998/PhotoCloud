import { reloadImmediately } from './immediateReload';

export async function removeDevServiceWorker(): Promise<void> {
  const isAppWorker = (worker: ServiceWorker | null) => {
    if (!worker) return false;
    const url = new URL(worker.scriptURL);
    return url.origin === location.origin && url.pathname === '/sw.js';
  };
  const controlledByApp = isAppWorker(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(registration => {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    return isAppWorker(worker) ? registration.unregister() : Promise.resolve(false);
  }));
  // Unregister does not release the current document or its already-injected CSS.
  if (controlledByApp) reloadImmediately();
}
