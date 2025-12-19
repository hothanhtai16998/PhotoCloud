import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import './index.css';
import './styles/theme.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import AuthInitializer from './components/auth/AuthInitializer.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
// Import verification utility (makes it available globally in dev mode)
import './utils/verifyAppearanceSettings';
// Initialize Unsplash-style refresh handler
import { initRefreshHandler } from './utils/refreshHandler';
// Import test utility (dev mode only)
if (import.meta.env.DEV) {
  import('./utils/testRefreshHandler');
}

// Enable Immer MapSet plugin for Map and Set support in Zustand stores
enableMapSet();

// Initialize refresh handler (debouncing, visual feedback, request cancellation)
// Wait for DOM to be ready before initializing
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initRefreshHandler();
      if (import.meta.env.DEV) {
        console.log('[RefreshHandler] Initialized');
      }
    });
  } else {
    // DOM already ready
    initRefreshHandler();
    if (import.meta.env.DEV) {
      console.log('[RefreshHandler] Initialized (DOM already ready)');
    }
  }
}

// Register Service Worker for image caching and offline support
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/sw.js')
			.then((registration) => {
				// Check for updates periodically
				setInterval(() => {
					registration.update();
				}, 60 * 60 * 1000); // Check every hour

				// Handle service worker updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								// New service worker available, prompt user to refresh
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
			// Optionally reload the page to use the new service worker
			// window.location.reload();
		});
	});
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<BrowserRouter>
				<AuthInitializer>
					<Toaster position="bottom-right" richColors />
					<App />
				</AuthInitializer>
			</BrowserRouter>
		</ErrorBoundary>
	</StrictMode>
);
