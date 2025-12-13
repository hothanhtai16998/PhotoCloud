import { apiConfig } from '@/config/apiConfig';
import { timingConfig } from '@/config/timingConfig';

/**
 * Service Worker registration for image caching and offline support
 */
export function registerServiceWorker(): void {
	if (!('serviceWorker' in navigator)) {
		return;
	}

	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register(apiConfig.serviceWorker.scriptPath)
			.then((registration) => {
				// Check for updates periodically
				setInterval(() => {
					registration.update();
				}, timingConfig.serviceWorker.updateCheckIntervalMs);

				// Handle service worker updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								// New service worker available
								// Could prompt user to refresh here if needed
								console.log('[SW] New service worker available');
							}
						});
					}
				});
			})
			.catch((error) => {
				console.error('[SW] Service Worker registration failed:', error);
			});

		// Handle service worker controller changes
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			// Service worker has been updated and is now controlling the page
			console.log('[SW] Service worker controller changed');
		});
	});
}

